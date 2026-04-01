import { app } from "electron";
import { readFile, writeFile, mkdir } from "fs/promises";
import * as path from "path";

interface AppConfig {
  nasIp: string;
  nasPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
}

const DEFAULT_CONFIG: Omit<AppConfig, "nasIp"> = {
  nasPort: 5432,
  dbName: "meet_transcriber",
  dbUser: "meet",
  dbPassword: "meet",
};

function getConfigPath(): string {
  return path.join(app.getPath("userData"), "config.json");
}

export async function loadConfig(): Promise<AppConfig | null> {
  try {
    const raw = await readFile(getConfigPath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveConfig(nasIp: string): Promise<AppConfig> {
  const config: AppConfig = { nasIp, ...DEFAULT_CONFIG };
  const configPath = getConfigPath();
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2));
  return config;
}

export function buildConnectionString(config: AppConfig): string {
  return `postgresql://${config.dbUser}:${config.dbPassword}@${config.nasIp}:${config.nasPort}/${config.dbName}`;
}
