import { contextBridge, ipcRenderer } from "electron";
import type { Conversation, Profile, Folder } from "../src/types";

interface DiscoveredHost {
  ip: string;
  port: number;
  responseTimeMs: number;
}

interface UpdateProgress {
  percent: number;
  transferred: number;
  total: number;
}

const api = {
  updates: {
    check: (): Promise<void> => ipcRenderer.invoke("update:check"),
    install: (): Promise<void> => ipcRenderer.invoke("update:install"),
    getVersion: (): Promise<string> => ipcRenderer.invoke("update:get-version"),
    onAvailable: (cb: (info: { version: string }) => void) => {
      ipcRenderer.removeAllListeners("update:available");
      ipcRenderer.on("update:available", (_e, info) => cb(info));
    },
    onProgress: (cb: (p: UpdateProgress) => void) => {
      ipcRenderer.removeAllListeners("update:progress");
      ipcRenderer.on("update:progress", (_e, p) => cb(p));
    },
    onDownloaded: (cb: (info: { version: string }) => void) => {
      ipcRenderer.removeAllListeners("update:downloaded");
      ipcRenderer.on("update:downloaded", (_e, info) => cb(info));
    },
  },

  nas: {
    discover: (): Promise<DiscoveredHost[]> =>
      ipcRenderer.invoke("nas:discover"),
    test: (ip: string): Promise<boolean> =>
      ipcRenderer.invoke("nas:test", ip),
    connect: (ip: string): Promise<boolean> =>
      ipcRenderer.invoke("nas:connect", ip),
    loadConfig: (): Promise<{ connected: boolean; ip: string | null }> =>
      ipcRenderer.invoke("nas:load-config"),
  },

  profiles: {
    list: (): Promise<Profile[]> =>
      ipcRenderer.invoke("profiles:list"),
    verifyPin: (profileId: string, pin: string): Promise<boolean> =>
      ipcRenderer.invoke("profiles:verify-pin", profileId, pin),
    updatePin: (profileId: string, newPin: string): Promise<void> =>
      ipcRenderer.invoke("profiles:update-pin", profileId, newPin),
    updateName: (profileId: string, name: string): Promise<void> =>
      ipcRenderer.invoke("profiles:update-name", profileId, name),
  },

  pickAudioFile: (): Promise<string | null> =>
    ipcRenderer.invoke("pick-audio-file"),

  transcribe: (filePath: string): Promise<{ utterances: Conversation["utterances"]; duration: number }> =>
    ipcRenderer.invoke("transcribe", filePath),

  parseTranscript: (rawText: string): Promise<{ utterances: Conversation["utterances"]; speakerNames: Record<string, string>; duration: number }> =>
    ipcRenderer.invoke("parse-transcript", rawText),

  analyze: (transcript: string, duration: number): Promise<{ topics: Conversation["topics"]; summary: string }> =>
    ipcRenderer.invoke("analyze", transcript, duration),

  db: {
    list: (profileId: string): Promise<Conversation[]> =>
      ipcRenderer.invoke("db:list", profileId),
    get: (id: string): Promise<Conversation | null> =>
      ipcRenderer.invoke("db:get", id),
    create: (conv: Conversation): Promise<void> =>
      ipcRenderer.invoke("db:create", conv),
    update: (conv: Conversation): Promise<void> =>
      ipcRenderer.invoke("db:update", conv),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke("db:delete", id),
    moveToFolder: (convId: string, folderId: string | null): Promise<void> =>
      ipcRenderer.invoke("db:move-to-folder", convId, folderId),
  },

  folders: {
    list: (profileId: string): Promise<Folder[]> =>
      ipcRenderer.invoke("folders:list", profileId),
    create: (folder: Folder): Promise<void> =>
      ipcRenderer.invoke("folders:create", folder),
    rename: (id: string, name: string): Promise<void> =>
      ipcRenderer.invoke("folders:rename", id, name),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke("folders:delete", id),
  },
};

contextBridge.exposeInMainWorld("api", api);

export type Api = typeof api;
