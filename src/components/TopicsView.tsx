import type { TopicStat } from "../types";
import PieChart from "./PieChart";
import RetryButton from "./RetryButton";

interface TopicsViewProps {
  topics: TopicStat[];
  duration: number;
  onRetry: () => void;
  retrying: boolean;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function TopicsView({ topics, duration, onRetry, retrying }: TopicsViewProps) {
  if (topics.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-zinc-500 text-sm">No topic analysis available.</p>
        <RetryButton onRetry={onRetry} retrying={retrying} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex justify-end mb-4">
        <RetryButton onRetry={onRetry} retrying={retrying} />
      </div>
      <div className="flex flex-col items-center mb-8">
        <PieChart topics={topics} size={220} />
        <p className="text-xs text-zinc-500 mt-3">
          Total duration: {formatDuration(duration)}
        </p>
      </div>

      {/* Legend / breakdown */}
      <div className="flex flex-col gap-3">
        {topics.map((topic, i) => (
          <div key={i}>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: topic.color }}
                />
                <span className="text-sm text-zinc-200">{topic.topic}</span>
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                {topic.percentage}%
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden ml-5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${topic.percentage}%`,
                  backgroundColor: topic.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
