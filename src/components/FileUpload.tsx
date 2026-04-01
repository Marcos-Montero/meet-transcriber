interface FileUploadProps {
  onUpload: () => void;
  isProcessing: boolean;
}

export default function FileUpload({ onUpload, isProcessing }: FileUploadProps) {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
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
    </div>
  );
}
