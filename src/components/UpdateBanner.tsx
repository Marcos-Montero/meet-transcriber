import { useState, useEffect } from "react";

type UpdateStatus = "idle" | "available" | "downloading" | "ready";

export default function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    window.api.updates.onAvailable((info) => {
      setVersion(info.version);
      setStatus("downloading");
    });
    window.api.updates.onProgress((p) => {
      setStatus("downloading");
      setProgress(Math.round(p.percent));
    });
    window.api.updates.onDownloaded((info) => {
      setVersion(info.version);
      setStatus("ready");
    });
  }, []);

  if (status === "idle") return null;

  const handleInstall = () => {
    window.api.updates.install();
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-xs">
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl p-4">
        {status === "downloading" && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-xs font-medium text-zinc-200">
                Downloading update {version && `v${version}`}
              </p>
            </div>
            <div className="w-full h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">{progress}%</p>
          </>
        )}

        {status === "ready" && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full shrink-0 animate-pulse" />
              <p className="text-xs font-medium text-zinc-200">
                Update ready {version && `v${version}`}
              </p>
            </div>
            <p className="text-[11px] text-zinc-400 mb-3">
              Restart to install the new version.
            </p>
            <button
              onClick={handleInstall}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
            >
              Restart & install
            </button>
          </>
        )}
      </div>
    </div>
  );
}
