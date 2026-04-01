import type { SpeakerSentiment } from "../types";
import RetryButton from "./RetryButton";

const TAG_COLORS = [
  "bg-indigo-500/15 text-indigo-300",
  "bg-emerald-500/15 text-emerald-300",
  "bg-rose-500/15 text-rose-300",
  "bg-amber-500/15 text-amber-300",
  "bg-violet-500/15 text-violet-300",
  "bg-cyan-500/15 text-cyan-300",
];

const SENTIMENT_COLORS: Record<string, string> = {
  enthusiastic: "bg-emerald-500/15 text-emerald-300",
  positive: "bg-emerald-500/15 text-emerald-300",
  supportive: "bg-emerald-500/15 text-emerald-300",
  neutral: "bg-zinc-500/15 text-zinc-300",
  analytical: "bg-cyan-500/15 text-cyan-300",
  focused: "bg-indigo-500/15 text-indigo-300",
  concerned: "bg-amber-500/15 text-amber-300",
  skeptical: "bg-amber-500/15 text-amber-300",
  frustrated: "bg-rose-500/15 text-rose-300",
  negative: "bg-rose-500/15 text-rose-300",
};

function getSentimentColor(sentiment: string): string {
  const lower = sentiment.toLowerCase();
  for (const [key, val] of Object.entries(SENTIMENT_COLORS)) {
    if (lower.includes(key)) return val;
  }
  return "bg-zinc-500/15 text-zinc-300";
}

interface SummaryViewProps {
  summary: string;
  sentiments: SpeakerSentiment[];
  tags: string[];
  duration: number;
  onRetry: () => void;
  retrying: boolean;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SummaryView({ summary, sentiments, tags, duration, onRetry, retrying }: SummaryViewProps) {
  if (!summary && sentiments.length === 0 && tags.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-zinc-500 text-sm">No summary available.</p>
        <RetryButton onRetry={onRetry} retrying={retrying} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-8">
      <div className="flex justify-end">
        <RetryButton onRetry={onRetry} retrying={retrying} />
      </div>
      {/* Duration + Tags */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-zinc-100">
            {formatDuration(duration)}
          </span>
          {tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${TAG_COLORS[i % TAG_COLORS.length]}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Summary
          </h3>
          <p className="text-sm text-zinc-300 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Sentiments */}
      {sentiments.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Participant Sentiment
          </h3>
          <div className="flex flex-col gap-2.5">
            {sentiments.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-3 rounded-xl bg-zinc-800/40 border border-zinc-700/20"
              >
                <div className="shrink-0">
                  <span className="text-sm font-semibold text-zinc-200">
                    {s.speaker}
                  </span>
                </div>
                <div className="flex-1">
                  <span
                    className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full mb-1 ${getSentimentColor(s.sentiment)}`}
                  >
                    {s.sentiment}
                  </span>
                  <p className="text-xs text-zinc-400">{s.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
