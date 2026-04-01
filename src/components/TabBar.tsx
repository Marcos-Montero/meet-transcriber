import type { ConversationTab } from "../types";

const TABS: { key: ConversationTab; label: string }[] = [
  { key: "conversation", label: "Conversation" },
  { key: "action-points", label: "Action Points" },
  { key: "topics", label: "Topics" },
  { key: "summary", label: "Summary" },
];

interface TabBarProps {
  activeTab: ConversationTab;
  onTabChange: (tab: ConversationTab) => void;
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex border-b border-zinc-800 bg-zinc-900/50 px-6 shrink-0">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === tab.key
              ? "text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {tab.label}
          {activeTab === tab.key && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
