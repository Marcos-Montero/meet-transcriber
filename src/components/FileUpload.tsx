interface FileUploadProps {
  onUpload: () => void;
  onImport: () => void;
  isProcessing: boolean;
}

export default function FileUpload({ onUpload, onImport, isProcessing }: FileUploadProps) {
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg">
      <button
        onClick={onUpload}
        disabled={isProcessing}
        className="w-full border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all border-zinc-600 hover:border-zinc-400 bg-zinc-800/50 hover:bg-zinc-700/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="text-4xl mb-3">🎙️</div>
        <p className="text-zinc-300 text-lg font-medium">
          {isProcessing ? "Processing..." : "Choose a meeting recording"}
        </p>
        <p className="text-zinc-500 text-sm mt-1">
          MP3, WAV, M4A, WebM supported
        </p>
      </button>

      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs text-zinc-600 uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      <button
        onClick={onImport}
        disabled={isProcessing}
        className="w-full bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-xl py-3 px-4 text-sm text-zinc-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        Import existing transcript
      </button>
    </div>
  );
}
