interface RetryButtonProps {
  onRetry: () => void;
  retrying: boolean;
  label?: string;
}

export default function RetryButton({ onRetry, retrying, label = "Retry analysis" }: RetryButtonProps) {
  return (
    <button
      onClick={onRetry}
      disabled={retrying}
      className="text-xs text-indigo-400 hover:text-indigo-300 disabled:text-zinc-600 transition-colors flex items-center gap-1.5"
    >
      {retrying ? (
        <>
          <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Analyzing...
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
