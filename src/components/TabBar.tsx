import type { ConversationTab } from "../types";

const TABS: { key: ConversationTab; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "action-points", label: "Action Points" },
  { key: "conversation", label: "Conversation" },
];

interface TabBarProps {
  activeTab: ConversationTab;
  onTabChange: (tab: ConversationTab) => void;
  disabledTabs?: ConversationTab[];
}

export default function TabBar({ activeTab, onTabChange, disabledTabs = [] }: TabBarProps) {
  return (
    <div className="flex border-b border-zinc-800 bg-zinc-900/50 px-6 shrink-0">
      {TABS.map((tab) => {
        const disabled = disabledTabs.includes(tab.key);
        return (
          <button
            key={tab.key}
            onClick={() => !disabled && onTabChange(tab.key)}
            disabled={disabled}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              disabled
                ? "text-zinc-600 cursor-not-allowed"
                : activeTab === tab.key
                  ? "text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {disabled && (
                <span className="w-3 h-3 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
              )}
            </span>
            {activeTab === tab.key && !disabled && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
