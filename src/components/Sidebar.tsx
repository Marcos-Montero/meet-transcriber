import { useState } from "react";
import type { Conversation } from "../types";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const startRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditValue(currentTitle);
  };

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const confirmDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  return (
    <>
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900 flex flex-col h-full shrink-0">
        {/* Top padding for macOS traffic lights */}
        <div data-drag-region className="pt-8 px-3 pb-3 border-b border-zinc-800">
          <button
            onClick={onNew}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
          >
            + New transcription
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="text-zinc-500 text-xs text-center mt-8 px-4">
              No conversations yet. Upload a meeting recording to get started.
            </p>
          )}

          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`group px-3 py-3 cursor-pointer border-b border-zinc-800/50 transition-colors ${
                activeId === conv.id
                  ? "bg-zinc-800"
                  : "hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                {editingId === conv.id ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-zinc-700 text-zinc-200 text-sm px-2 py-0.5 rounded outline-none border border-zinc-500 focus:border-indigo-400"
                  />
                ) : (
                  <p className="text-sm text-zinc-200 truncate flex-1 font-medium">
                    {conv.title}
                  </p>
                )}
                <span className="text-[10px] text-zinc-500 shrink-0 mt-0.5">
                  {formatDate(conv.createdAt)}
                </span>
              </div>

              {conv.tags && conv.tags.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {conv.tags.slice(0, 3).map((tag, ti) => (
                    <span
                      key={ti}
                      className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-700/80 text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                  {conv.tags.length > 3 && (
                    <span className="text-[9px] text-zinc-600">
                      +{conv.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {conv.summary && !conv.tags?.length && (
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                  {conv.summary}
                </p>
              )}

              <div className="flex gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(conv.id, conv.title);
                  }}
                  className="text-[10px] text-zinc-400 hover:text-zinc-200"
                >
                  Rename
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(conv.id);
                  }}
                  className="text-[10px] text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-base font-semibold text-zinc-100 mb-2">
              Delete conversation?
            </h3>
            <p className="text-sm text-zinc-400 mb-5">
              This will permanently delete this conversation and all its data. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(deleteConfirmId)}
                className="text-sm text-white bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
