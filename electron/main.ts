import { config } from "dotenv";
import { app, BrowserWindow, ipcMain, dialog } from "electron";
import * as path from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from app root (dev) or resources (prod)
config({ path: path.join(app.isPackaged ? process.resourcesPath : process.cwd(), ".env.local") });
import { DeepgramClient } from "@deepgram/sdk";
import Anthropic from "@anthropic-ai/sdk";
import {
  initDb,
  getConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
} from "./db";
import { scanForPostgres, testPostgresConnection } from "./discovery";
import { loadConfig, saveConfig, buildConnectionString } from "./config";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ── NAS Discovery & Config ──────────────────────────────────
ipcMain.handle("nas:discover", async () => {
  const hosts = await scanForPostgres();
  return hosts;
});

ipcMain.handle("nas:test", async (_e, ip: string) => {
  return testPostgresConnection(ip);
});

ipcMain.handle("nas:connect", async (_e, ip: string) => {
  const cfg = await saveConfig(ip);
  const connStr = buildConnectionString(cfg);
  await initDb(connStr);
  return true;
});

ipcMain.handle("nas:load-config", async () => {
  const cfg = await loadConfig();
  if (!cfg) return { connected: false, ip: null };

  try {
    const connStr = buildConnectionString(cfg);
    await initDb(connStr);
    return { connected: true, ip: cfg.nasIp };
  } catch {
    return { connected: false, ip: cfg.nasIp };
  }
});

ipcMain.handle("nas:disconnect", async () => {
  return true;
});

// ── File picker ──────────────────────────────────────────────
ipcMain.handle("pick-audio-file", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "Audio", extensions: ["mp3", "wav", "m4a", "webm", "ogg", "aac", "mp4"] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// ── Transcribe ───────────────────────────────────────────────
ipcMain.handle("transcribe", async (_event, filePath: string) => {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY not set");

  const buffer = await readFile(filePath);
  const deepgram = new DeepgramClient({
    apiKey,
    timeoutInSeconds: 600, // 10 min for large files
  });

  const result = await deepgram.listen.v1.media.transcribeFile(buffer, {
    model: "nova-3",
    language: "multi",
    smart_format: true,
    diarize: true,
    utterances: true,
    punctuate: true,
  }, {
    timeoutInSeconds: 600,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = result as any;

  const utterances =
    body.results?.utterances?.map(
      (u: { speaker?: number; transcript: string; start: number; end: number }) => ({
        speaker: u.speaker ?? 0,
        text: u.transcript,
        start: u.start,
        end: u.end,
      })
    ) ?? [];

  const duration = body.metadata?.duration ?? 0;
  return { utterances, duration };
});

// ── Analyze topics ───────────────────────────────────────────
const TOPIC_COLORS = [
  "#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
];

ipcMain.handle("analyze", async (_event, transcript: string, duration: number) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Analyze this meeting transcript comprehensively. The meeting lasted ${Math.round(duration)} seconds. Timestamps are in [start-end] format in seconds.

Extract ALL of the following and respond ONLY with valid JSON:

{
  "topics": [
    { "topic": "Topic Name", "percentage": 35 }
  ],
  "topicSegments": [
    { "topic": "Topic Name", "startTime": 0, "endTime": 120 }
  ],
  "summary": "1-2 sentence meeting summary.",
  "actionPoints": [
    { "who": "Speaker 1", "what": "Description of action item", "deadline": "by Friday" }
  ],
  "sentiments": [
    { "speaker": "Speaker 1", "sentiment": "enthusiastic", "summary": "Was excited about the new project direction" }
  ],
  "tags": ["Strategy", "Technical", "Q2 Planning"]
}

Rules:
- topics: main topics discussed, percentages must sum to 100
- topicSegments: map each topic to the time range(s) where it was discussed, using the timestamps from the transcript. A topic can appear multiple times if revisited.
- actionPoints: concrete action items with who is responsible. Use "deadline": "" if no deadline mentioned. Only include real action items, not general discussion.
- sentiments: one entry per speaker, describing their overall tone/attitude
- tags: 3-5 short categorical tags describing the meeting (e.g. "Strategy", "Technical", "Urgent", "Brainstorming", "Decision Making")

Transcript:
${transcript}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = JSON.parse(text);

  const topicColorMap: Record<string, string> = {};
  const topics = (parsed.topics || []).map(
    (t: { topic: string; percentage: number }, i: number) => {
      const color = TOPIC_COLORS[i % TOPIC_COLORS.length];
      topicColorMap[t.topic] = color;
      return { topic: t.topic, percentage: t.percentage, color };
    }
  );

  const topicSegments = (parsed.topicSegments || []).map(
    (s: { topic: string; startTime: number; endTime: number }) => ({
      topic: s.topic,
      startTime: s.startTime,
      endTime: s.endTime,
      color: topicColorMap[s.topic] || TOPIC_COLORS[0],
    })
  );

  return {
    topics,
    topicSegments,
    summary: parsed.summary || "",
    actionPoints: parsed.actionPoints || [],
    sentiments: parsed.sentiments || [],
    tags: parsed.tags || [],
  };
});

// ── Database CRUD ────────────────────────────────────────────
ipcMain.handle("db:list", () => getConversations());
ipcMain.handle("db:get", (_e, id: string) => getConversation(id));
ipcMain.handle("db:create", (_e, conv) => createConversation(conv));
ipcMain.handle("db:update", (_e, conv) => updateConversation(conv));
ipcMain.handle("db:delete", (_e, id: string) => deleteConversation(id));
