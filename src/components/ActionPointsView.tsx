import type { ActionPoint } from "../types";
import RetryButton from "./RetryButton";

interface ActionPointsViewProps {
  actionPoints: ActionPoint[];
  onRetry: () => void;
  retrying: boolean;
}

export default function ActionPointsView({ actionPoints, onRetry, retrying }: ActionPointsViewProps) {
  if (actionPoints.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-zinc-500 text-sm">No action points identified in this meeting.</p>
        <RetryButton onRetry={onRetry} retrying={retrying} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex justify-end mb-4">
        <RetryButton onRetry={onRetry} retrying={retrying} />
      </div>
      <div className="flex flex-col gap-3">
        {actionPoints.map((ap, i) => (
          <div
            key={i}
            className="flex gap-3 px-4 py-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/30"
          >
            <div className="w-5 h-5 rounded-full border-2 border-zinc-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-200">
                <span className="font-semibold text-indigo-400">{ap.who}</span>
                {" "}{ap.what}
              </p>
              {ap.deadline && (
                <span className="inline-block mt-1.5 text-[11px] text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded-full">
                  {ap.deadline}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
