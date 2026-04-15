import { useState, useCallback, useRef } from "react";

interface ImportTranscriptProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rawText: string, title: string) => void;
  isProcessing: boolean;
}

export default function ImportTranscript({ isOpen, onClose, onImport, isProcessing }: ImportTranscriptProps) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  }, [title]);

  const handleSubmit = useCallback(() => {
    if (!text.trim()) return;
    const finalTitle = title.trim() || "Imported transcript";
    onImport(text, finalTitle);
  }, [text, title, onImport]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-100 mb-1">Import transcript</h3>
            <p className="text-xs text-zinc-400">Paste text from Zoom, Meet, Teams, or any format. We'll parse it automatically.</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 -mt-1 -mr-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <label className="text-xs text-zinc-400 mb-1.5 block">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Meeting title"
          disabled={isProcessing}
          className="w-full bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg outline-none border border-zinc-600 focus:border-indigo-500 text-sm mb-4 disabled:opacity-50"
        />

        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-zinc-400">Transcript text</label>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
          >
            Load from file (.txt, .vtt, .srt)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.vtt,.srt,.md,text/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your transcript here...&#10;&#10;Example formats:&#10;• Alice: Hi everyone&#10;  Bob: Hi Alice&#10;&#10;• [00:01:30] Alice: Hi everyone&#10;  [00:01:35] Bob: Hi Alice&#10;&#10;• WEBVTT format from Zoom/Meet"
          disabled={isProcessing}
          className="flex-1 bg-zinc-900 text-zinc-200 px-3 py-2 rounded-lg outline-none border border-zinc-700 focus:border-indigo-500 text-sm font-mono resize-none min-h-[240px] disabled:opacity-50"
        />

        <div className="flex gap-3 justify-end mt-5">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isProcessing}
            className="text-sm text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            {isProcessing && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isProcessing ? "Parsing..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
