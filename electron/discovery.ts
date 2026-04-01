import * as net from "net";
import * as os from "os";

export interface DiscoveredHost {
  ip: string;
  port: number;
  responseTimeMs: number;
}

function getLocalSubnets(): string[] {
  const subnets: string[] = [];
  const interfaces = os.networkInterfaces();

  for (const name in interfaces) {
    for (const iface of interfaces[name] ?? []) {
      // Skip loopback, internal, and non-IPv4
      if (iface.internal || iface.family !== "IPv4") continue;
      // Get the base subnet (assumes /24)
      const parts = iface.address.split(".");
      if (parts.length === 4) {
        subnets.push(`${parts[0]}.${parts[1]}.${parts[2]}`);
      }
    }
  }

  return subnets;
}

function tryConnect(ip: string, port: number, timeoutMs: number): Promise<DiscoveredHost | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();

    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      const responseTimeMs = Date.now() - start;
      socket.destroy();
      resolve({ ip, port, responseTimeMs });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });

    socket.on("error", () => {
      socket.destroy();
      resolve(null);
    });

    socket.connect(port, ip);
  });
}

export async function scanForPostgres(
  port = 5432,
  timeoutMs = 500,
  onProgress?: (scanned: number, total: number) => void
): Promise<DiscoveredHost[]> {
  const subnets = getLocalSubnets();
  if (subnets.length === 0) return [];

  const allIps: string[] = [];
  for (const subnet of subnets) {
    for (let i = 1; i <= 254; i++) {
      allIps.push(`${subnet}.${i}`);
    }
  }

  const found: DiscoveredHost[] = [];
  let scanned = 0;

  // Scan in batches of 50 to avoid overwhelming the network
  const batchSize = 50;
  for (let i = 0; i < allIps.length; i += batchSize) {
    const batch = allIps.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((ip) => tryConnect(ip, port, timeoutMs))
    );

    for (const result of results) {
      if (result) found.push(result);
    }

    scanned += batch.length;
    onProgress?.(scanned, allIps.length);
  }

  // Sort by response time (fastest first)
  return found.sort((a, b) => a.responseTimeMs - b.responseTimeMs);
}

export async function testPostgresConnection(ip: string, port = 5432): Promise<boolean> {
  const result = await tryConnect(ip, port, 2000);
  return result !== null;
}
