import type { TopicSegment } from "../types";

interface TopicTimelineProps {
  segments: TopicSegment[];
  duration: number;
  onSeekTo: (timeSeconds: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TopicTimeline({ segments, duration, onSeekTo }: TopicTimelineProps) {
  if (segments.length === 0) return null;

  const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Topic Timeline
        </h3>
        <p className="text-[10px] text-zinc-600 mt-0.5">
          {formatTime(duration)} total
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col">
          {sorted.map((segment, i) => (
            <button
              key={i}
              onClick={() => onSeekTo(segment.startTime)}
              className="flex items-start gap-2.5 px-2 py-2.5 rounded-lg hover:bg-zinc-800/60 transition-colors text-left group"
            >
              {/* Timeline dot + line */}
              <div className="flex flex-col items-center shrink-0 pt-1">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: segment.color }}
                />
                {i < sorted.length - 1 && (
                  <div className="w-px flex-1 min-h-[20px] bg-zinc-700/50 mt-1" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-1">
                <p className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100 truncate transition-colors">
                  {segment.topic}
                </p>
                <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                  {formatTime(segment.startTime)} – {formatTime(segment.endTime)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
