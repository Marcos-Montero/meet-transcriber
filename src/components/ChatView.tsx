import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { Utterance, SpeakerBlock } from "../types";

const SPEAKER_COLORS: Record<number, { bg: string; label: string }> = {
  0: { bg: "rgba(99,102,241,0.15)", label: "text-indigo-400" },
  1: { bg: "rgba(16,185,129,0.15)", label: "text-emerald-400" },
  2: { bg: "rgba(244,63,94,0.15)", label: "text-rose-400" },
  3: { bg: "rgba(245,158,11,0.15)", label: "text-amber-400" },
  4: { bg: "rgba(139,92,246,0.15)", label: "text-violet-400" },
  5: { bg: "rgba(6,182,212,0.15)", label: "text-cyan-400" },
  6: { bg: "rgba(236,72,153,0.15)", label: "text-pink-400" },
  7: { bg: "rgba(249,115,22,0.15)", label: "text-orange-400" },
};

interface ChatViewProps {
  utterances: Utterance[];
  speakerNames: Record<number, string>;
  onRenameSpeaker: (speaker: number, name: string) => void;
  scrollToTime?: number | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function groupUtterances(utterances: Utterance[]): SpeakerBlock[] {
  const blocks: SpeakerBlock[] = [];
  for (const u of utterances) {
    const last = blocks[blocks.length - 1];
    if (last && last.speaker === u.speaker) {
      last.texts.push(u.text);
      last.end = u.end;
    } else {
      blocks.push({
        speaker: u.speaker,
        texts: [u.text],
        start: u.start,
        end: u.end,
      });
    }
  }
  return blocks;
}

export default function ChatView({
  utterances,
  speakerNames,
  onRenameSpeaker,
  scrollToTime,
}: ChatViewProps) {
  const [editingSpeaker, setEditingSpeaker] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const blocks = useMemo(() => groupUtterances(utterances), [utterances]);

  // Scroll to time when requested
  useEffect(() => {
    if (scrollToTime == null || !containerRef.current) return;
    const els = containerRef.current.querySelectorAll<HTMLElement>("[data-start-time]");
    let closest: HTMLElement | null = null;
    let closestDist = Infinity;
    els.forEach((el) => {
      const t = parseFloat(el.dataset.startTime || "0");
      const dist = Math.abs(t - scrollToTime);
      if (dist < closestDist) {
        closestDist = dist;
        closest = el;
      }
    });
    if (closest) {
      (closest as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [scrollToTime]);

  const startEditing = useCallback(
    (speaker: number) => {
      setEditingSpeaker(speaker);
      setEditValue(speakerNames[speaker] || `Speaker ${speaker + 1}`);
    },
    [speakerNames]
  );

  const commitEdit = useCallback(() => {
    if (editingSpeaker !== null && editValue.trim()) {
      onRenameSpeaker(editingSpeaker, editValue.trim());
    }
    setEditingSpeaker(null);
  }, [editingSpeaker, editValue, onRenameSpeaker]);

  const getColor = (speaker: number) =>
    SPEAKER_COLORS[speaker % Object.keys(SPEAKER_COLORS).length] ??
    SPEAKER_COLORS[0];

  const isRightAligned = (speaker: number) => speaker % 2 === 1;

  return (
    <div ref={containerRef} className="flex flex-col gap-4 p-6 max-w-3xl mx-auto">
      {blocks.map((block, i) => {
        const color = getColor(block.speaker);
        const right = isRightAligned(block.speaker);
        const name =
          speakerNames[block.speaker] || `Speaker ${block.speaker + 1}`;

        return (
          <div
            key={i}
            data-start-time={block.start}
            className={`flex flex-col ${right ? "items-end" : "items-start"}`}
          >
            <div className={`mb-1 ${right ? "text-right" : "text-left"}`}>
              {editingSpeaker === block.speaker ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit();
                    if (e.key === "Escape") setEditingSpeaker(null);
                  }}
                  className="bg-zinc-700 text-zinc-200 text-xs px-2 py-1 rounded outline-none border border-zinc-500 focus:border-indigo-400"
                />
              ) : (
                <button
                  onClick={() => startEditing(block.speaker)}
                  className={`text-xs font-semibold ${color.label} hover:underline cursor-pointer`}
                >
                  {name}
                </button>
              )}
            </div>
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                right ? "rounded-tr-sm" : "rounded-tl-sm"
              }`}
              style={{ backgroundColor: color.bg }}
            >
              <p className="text-zinc-200 text-sm leading-relaxed">
                {block.texts.join(" ")}
              </p>
              <p className={`text-zinc-500 text-[10px] mt-2 ${right ? "text-right" : ""}`}>
                {formatTime(block.start)} – {formatTime(block.end)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
