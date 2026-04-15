import { useState, useCallback, useEffect } from "react";
import type { Conversation, Folder } from "../types";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onLogout: () => void;
  profileId: string;
  profileName: string;
  onProfileNameChanged: (name: string) => void;
  onRefresh: () => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onLogout,
  profileId,
  profileName,
  onProfileNameChanged,
  onRefresh,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"name" | "pin">("name");
  const [newName, setNewName] = useState(profileName);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  // Folders
  const [folders, setFolders] = useState<Folder[]>([]);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderEditValue, setFolderEditValue] = useState("");
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  useEffect(() => {
    window.api.folders.list(profileId).then(setFolders);
  }, [profileId, conversations]); // refresh folders when conversations change

  const toggleFolder = (id: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCreateFolder = async () => {
    const folder: Folder = {
      id: crypto.randomUUID(),
      name: "New Folder",
      profileId,
      parentId: null,
      createdAt: Date.now(),
    };
    await window.api.folders.create(folder);
    setFolders((prev) => [...prev, folder]);
    setEditingFolderId(folder.id);
    setFolderEditValue("New Folder");
  };

  // Check if potentialAncestor is an ancestor of folderId (or same folder)
  const isFolderAncestor = (folderId: string, potentialAncestor: string): boolean => {
    if (folderId === potentialAncestor) return true;
    const folder = folders.find((f) => f.id === folderId);
    if (!folder || !folder.parentId) return false;
    return isFolderAncestor(folder.parentId, potentialAncestor);
  };

  const handleDropFolder = async (folderId: string, targetParentId: string | null) => {
    // Prevent dropping a folder into itself or its descendants
    if (targetParentId && isFolderAncestor(targetParentId, folderId)) {
      setDragOverFolderId(null);
      return;
    }
    await window.api.folders.move(folderId, targetParentId);
    setFolders((prev) => prev.map((f) => f.id === folderId ? { ...f, parentId: targetParentId } : f));
    setDragOverFolderId(null);
  };

  const commitFolderRename = async () => {
    if (editingFolderId && folderEditValue.trim()) {
      await window.api.folders.rename(editingFolderId, folderEditValue.trim());
      setFolders((prev) => prev.map((f) => f.id === editingFolderId ? { ...f, name: folderEditValue.trim() } : f));
    }
    setEditingFolderId(null);
  };

  const handleDeleteFolder = async (id: string) => {
    await window.api.folders.delete(id);
    setFolders((prev) => prev.filter((f) => f.id !== id));
    onRefresh();
  };

  const handleDrop = async (convId: string, folderId: string | null) => {
    await window.api.db.moveToFolder(convId, folderId);
    setDragOverFolderId(null);
    onRefresh();
  };

  const startRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditValue(currentTitle);
  };

  const commitRename = () => {
    if (editingId && editValue.trim()) onRename(editingId, editValue.trim());
    setEditingId(null);
  };

  const confirmDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  const renderConversation = (conv: Conversation) => (
    <div
      key={conv.id}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("convId", conv.id); e.stopPropagation(); }}
      onClick={() => onSelect(conv.id)}
      className={`group px-3 py-2.5 cursor-pointer border-b border-zinc-800/30 transition-colors ${
        activeId === conv.id ? "bg-zinc-800" : "hover:bg-zinc-800/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {editingId === conv.id ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingId(null); }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-zinc-700 text-zinc-200 text-sm px-2 py-0.5 rounded outline-none border border-zinc-500 focus:border-indigo-400"
          />
        ) : (
          <p className="text-sm text-zinc-200 truncate flex-1 font-medium">{conv.title}</p>
        )}
        <span className="text-[10px] text-zinc-500 shrink-0 mt-0.5">{formatDate(conv.createdAt)}</span>
      </div>

      {conv.tags && conv.tags.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {conv.tags.slice(0, 3).map((tag, ti) => (
            <span key={ti} className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-700/80 text-zinc-400">{tag}</span>
          ))}
          {conv.tags.length > 3 && <span className="text-[9px] text-zinc-600">+{conv.tags.length - 3}</span>}
        </div>
      )}

      <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); startRename(conv.id, conv.title); }} className="text-[10px] text-zinc-400 hover:text-zinc-200">Rename</button>
        {conv.folderId && (
          <button onClick={(e) => { e.stopPropagation(); handleDrop(conv.id, null); }} className="text-[10px] text-zinc-400 hover:text-zinc-200">Unfolder</button>
        )}
        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(conv.id); }} className="text-[10px] text-red-400 hover:text-red-300">Delete</button>
      </div>
    </div>
  );

  const renderFolder = (folder: Folder) => {
    const childFolders = folders.filter((f) => f.parentId === folder.id);
    const folderItems = conversations.filter((c) => c.folderId === folder.id);
    const isCollapsed = collapsedFolders.has(folder.id);
    const isDragOver = dragOverFolderId === folder.id;
    const hasChildren = childFolders.length > 0 || folderItems.length > 0;

    return (
      <div key={folder.id}>
        <div
          draggable
          onDragStart={(e) => { e.dataTransfer.setData("folderId", folder.id); e.stopPropagation(); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-colors group ${
            isDragOver ? "bg-indigo-500/10" : "hover:bg-zinc-800/50"
          }`}
          onClick={() => toggleFolder(folder.id)}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverFolderId(folder.id); }}
          onDragLeave={(e) => { e.stopPropagation(); setDragOverFolderId(null); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const convId = e.dataTransfer.getData("convId");
            const draggedFolderId = e.dataTransfer.getData("folderId");
            if (convId) handleDrop(convId, folder.id);
            else if (draggedFolderId && draggedFolderId !== folder.id) {
              handleDropFolder(draggedFolderId, folder.id);
            }
          }}
        >
          <svg className={`w-3 h-3 text-zinc-500 transition-transform ${isCollapsed ? "" : "rotate-90"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <svg className="w-3.5 h-3.5 text-amber-500/70 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>

          {editingFolderId === folder.id ? (
            <input
              autoFocus
              value={folderEditValue}
              onChange={(e) => setFolderEditValue(e.target.value)}
              onBlur={commitFolderRename}
              onKeyDown={(e) => { if (e.key === "Enter") commitFolderRename(); if (e.key === "Escape") setEditingFolderId(null); }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-zinc-700 text-zinc-200 text-[11px] px-1.5 py-0.5 rounded outline-none border border-zinc-500 focus:border-indigo-400"
            />
          ) : (
            <span className="text-[11px] text-zinc-300 font-medium flex-1 truncate">{folder.name}</span>
          )}

          <span className="text-[9px] text-zinc-600">{folderItems.length + childFolders.length}</span>

          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); setFolderEditValue(folder.name); }} className="text-[9px] text-zinc-500 hover:text-zinc-300">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }} className="text-[9px] text-red-400 hover:text-red-300">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {!isCollapsed && hasChildren && (
          <div className="ml-[13px] border-l border-zinc-700/40">
            {childFolders.map(renderFolder)}
            {folderItems.map(renderConversation)}
          </div>
        )}
      </div>
    );
  };

  // Root-level items (no parent)
  const rootFolders = folders.filter((f) => !f.parentId);
  const rootConvs = conversations.filter((c) => !c.folderId);

  return (
    <>
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900 flex flex-col h-full shrink-0">
        <div data-drag-region className="pt-8 px-3 pb-3 border-b border-zinc-800 flex gap-2">
          <button
            onClick={onNew}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors"
          >
            + Transcription
          </button>
          <button
            onClick={handleCreateFolder}
            className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-medium py-2 px-3 rounded-lg transition-colors"
            title="New folder"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.06-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto"
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => {
            e.preventDefault();
            const convId = e.dataTransfer.getData("convId");
            const draggedFolderId = e.dataTransfer.getData("folderId");
            if (convId) handleDrop(convId, null);
            else if (draggedFolderId) handleDropFolder(draggedFolderId, null);
          }}
        >
          {conversations.length === 0 && folders.length === 0 && (
            <p className="text-zinc-500 text-xs text-center mt-8 px-4">
              No conversations yet. Upload a meeting recording to get started.
            </p>
          )}

          {rootFolders.map(renderFolder)}
          {rootConvs.map(renderConversation)}
        </div>

        {/* Profile footer */}
        <div className="px-3 py-3 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">{profileName}</span>
            <button
              onClick={() => { setNewName(profileName); setCurrentPin(""); setNewPin(""); setSettingsMsg(null); setSettingsTab("name"); setShowSettings(true); }}
              className="text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.004.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <button onClick={onLogout} className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">Switch profile</button>
        </div>
      </aside>

      {/* Profile settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-base font-semibold text-zinc-100 mb-4">Profile Settings</h3>
            <div className="flex gap-1 mb-5 bg-zinc-900 rounded-lg p-1">
              <button onClick={() => { setSettingsTab("name"); setSettingsMsg(null); }} className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${settingsTab === "name" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>Change Name</button>
              <button onClick={() => { setSettingsTab("pin"); setSettingsMsg(null); }} className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${settingsTab === "pin" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>Change PIN</button>
            </div>
            {settingsTab === "name" && (
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Display name</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg outline-none border border-zinc-600 focus:border-indigo-500 text-sm mb-4" />
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowSettings(false)} className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-lg transition-colors">Cancel</button>
                  <button onClick={async () => { if (!newName.trim()) return; await window.api.profiles.updateName(profileId, newName.trim()); onProfileNameChanged(newName.trim()); setShowSettings(false); }} className="text-sm text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition-colors font-medium">Save</button>
                </div>
              </div>
            )}
            {settingsTab === "pin" && (
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Current PIN</label>
                <input type="password" inputMode="numeric" maxLength={4} value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))} className="w-full bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg outline-none border border-zinc-600 focus:border-indigo-500 text-sm mb-3 font-mono tracking-widest" placeholder="0000" />
                <label className="text-xs text-zinc-400 mb-1.5 block">New PIN</label>
                <input type="password" inputMode="numeric" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} className="w-full bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg outline-none border border-zinc-600 focus:border-indigo-500 text-sm mb-4 font-mono tracking-widest" placeholder="1234" />
                {settingsMsg && <p className={`text-xs mb-3 ${settingsMsg.includes("Wrong") || settingsMsg.includes("Failed") ? "text-red-400" : "text-emerald-400"}`}>{settingsMsg}</p>}
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowSettings(false)} className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-lg transition-colors">Cancel</button>
                  <button onClick={async () => { if (currentPin.length !== 4 || newPin.length !== 4) return; try { const ok = await window.api.profiles.verifyPin(profileId, currentPin); if (!ok) { setSettingsMsg("Wrong current PIN"); return; } await window.api.profiles.updatePin(profileId, newPin); setShowSettings(false); } catch { setSettingsMsg("Failed to update PIN"); } }} disabled={currentPin.length !== 4 || newPin.length !== 4} className="text-sm text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 px-4 py-2 rounded-lg transition-colors font-medium">Save</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-base font-semibold text-zinc-100 mb-2">Delete conversation?</h3>
            <p className="text-sm text-zinc-400 mb-5">This will permanently delete this conversation and all its data.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirmId(null)} className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-lg transition-colors">Cancel</button>
              <button onClick={() => confirmDelete(deleteConfirmId)} className="text-sm text-white bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
