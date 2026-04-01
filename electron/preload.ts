import { contextBridge, ipcRenderer } from "electron";
import type { Conversation } from "../src/types";

interface DiscoveredHost {
  ip: string;
  port: number;
  responseTimeMs: number;
}

const api = {
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

  pickAudioFile: (): Promise<string | null> =>
    ipcRenderer.invoke("pick-audio-file"),

  transcribe: (filePath: string): Promise<{ utterances: Conversation["utterances"]; duration: number }> =>
    ipcRenderer.invoke("transcribe", filePath),

  analyze: (transcript: string, duration: number): Promise<{ topics: Conversation["topics"]; summary: string }> =>
    ipcRenderer.invoke("analyze", transcript, duration),

  db: {
    list: (): Promise<Conversation[]> =>
      ipcRenderer.invoke("db:list"),
    get: (id: string): Promise<Conversation | null> =>
      ipcRenderer.invoke("db:get", id),
    create: (conv: Conversation): Promise<void> =>
      ipcRenderer.invoke("db:create", conv),
    update: (conv: Conversation): Promise<void> =>
      ipcRenderer.invoke("db:update", conv),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke("db:delete", id),
  },
};

contextBridge.exposeInMainWorld("api", api);

export type Api = typeof api;
