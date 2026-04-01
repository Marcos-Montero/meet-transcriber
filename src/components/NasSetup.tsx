import { useState, useCallback, useEffect } from "react";

interface DiscoveredHost {
  ip: string;
  port: number;
  responseTimeMs: number;
}

interface NasSetupProps {
  onConnected: () => void;
}

export default function NasSetup({ onConnected }: NasSetupProps) {
  const [scanning, setScanning] = useState(true);
  const [hosts, setHosts] = useState<DiscoveredHost[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [manualIp, setManualIp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const runScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const found = await window.api.nas.discover();
      setHosts(found);
    } catch {
      setError("Failed to scan network");
    } finally {
      setScanning(false);
    }
  }, []);

  // Auto-scan on mount
  useEffect(() => {
    runScan();
  }, [runScan]);

  const handleConnect = useCallback(
    async (ip: string) => {
      setConnecting(ip);
      setError(null);
      try {
        await window.api.nas.connect(ip);
        onConnected();
      } catch {
        setError(`Could not connect to ${ip}. Check that PostgreSQL is running.`);
      } finally {
        setConnecting(null);
      }
    },
    [onConnected]
  );

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-13.5 0a3 3 0 0 1-3-3m3 3h13.5m-13.5 0a3 3 0 0 0-3 3m18 0a3 3 0 0 0-3-3m3 3a3 3 0 0 1-3 3m3-3h-13.5m13.5 0a3 3 0 0 1-3 3m-3-6V6a3 3 0 0 0-3-3H9a3 3 0 0 0-3 3v6" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 mb-1.5">
            Connect to your NAS
          </h1>
          <p className="text-sm text-zinc-500">
            Select a database on your local network
          </p>
        </div>

        {/* Discovered hosts */}
        <div className="mb-6">
          {scanning && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="text-sm text-zinc-400">Scanning your network...</span>
            </div>
          )}

          {!scanning && hosts.length > 0 && (
            <div className="flex flex-col gap-2">
              {hosts.map((host) => (
                <button
                  key={host.ip}
                  onClick={() => handleConnect(host.ip)}
                  disabled={connecting !== null}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/50 hover:border-zinc-600 disabled:opacity-50 transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 font-mono">
                      {host.ip}
                    </p>
                    <p className="text-xs text-zinc-500">
                      PostgreSQL &middot; {host.responseTimeMs}ms
                    </p>
                  </div>
                  {connecting === host.ip ? (
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          {!scanning && hosts.length === 0 && (
            <div className="text-center py-6 px-4 rounded-xl bg-zinc-800/30 border border-zinc-800">
              <p className="text-sm text-zinc-500 mb-3">
                No databases found on your network
              </p>
              <button
                onClick={runScan}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Manual IP */}
        <div className="border-t border-zinc-800/50 pt-5">
          <p className="text-xs text-zinc-500 mb-2.5">Or connect manually</p>
          <div className="flex gap-2">
            <input
              value={manualIp}
              onChange={(e) => setManualIp(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualIp.trim()) handleConnect(manualIp.trim());
              }}
              placeholder="192.168.1.100"
              className="flex-1 bg-zinc-800/80 text-zinc-200 px-3.5 py-2 rounded-lg outline-none border border-zinc-700/50 focus:border-indigo-500/50 font-mono text-sm placeholder:text-zinc-600"
            />
            <button
              onClick={() => manualIp.trim() && handleConnect(manualIp.trim())}
              disabled={!manualIp.trim() || connecting !== null}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Connect
            </button>
          </div>
        </div>

        {error && (
          <p className="text-red-400/80 text-xs mt-4 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
