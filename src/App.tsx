import { useState, useCallback, useEffect } from "react";
import FileUpload from "./components/FileUpload";
import ChatView from "./components/ChatView";
import TabBar from "./components/TabBar";
import ActionPointsView from "./components/ActionPointsView";
import TopicsView from "./components/TopicsView";
import SummaryView from "./components/SummaryView";
import TopicTimeline from "./components/TopicTimeline";
import Sidebar from "./components/Sidebar";
import NasSetup from "./components/NasSetup";
import type { Utterance, Conversation, ConversationTab } from "./types";

type ConnectionState = "checking" | "setup" | "connected";
type AppState = "idle" | "transcribing" | "analyzing";

export default function App() {
  const [connState, setConnState] = useState<ConnectionState>("checking");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ConversationTab>("conversation");
  const [scrollToTime, setScrollToTime] = useState<number | null>(null);

  // Reset tab when switching conversations
  useEffect(() => {
    setActiveTab("conversation");
    setScrollToTime(null);
  }, [activeId]);

  // On mount: try loading saved NAS config
  useEffect(() => {
    window.api.nas.loadConfig().then(async ({ connected }) => {
      if (connected) {
        const loaded = await window.api.db.list();
        setConversations(loaded);
        if (loaded.length > 0) setActiveId(loaded[0].id);
        setConnState("connected");
      } else {
        setConnState("setup");
      }
    });
  }, []);

  const handleNasConnected = useCallback(async () => {
    const loaded = await window.api.db.list();
    setConversations(loaded);
    if (loaded.length > 0) setActiveId(loaded[0].id);
    setConnState("connected");
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  const handleRenameSpeaker = useCallback(
    async (speaker: number, name: string) => {
      if (!activeConversation) return;
      const updated = {
        ...activeConversation,
        speakerNames: { ...activeConversation.speakerNames, [speaker]: name },
      };
      await window.api.db.update(updated);
      const refreshed = await window.api.db.list();
      setConversations(refreshed);
    },
    [activeConversation]
  );

  const handleRenameConversation = useCallback(async (id: string, title: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    await window.api.db.update({ ...conv, title });
    const refreshed = await window.api.db.list();
    setConversations(refreshed);
  }, [conversations]);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await window.api.db.delete(id);
      const refreshed = await window.api.db.list();
      setConversations(refreshed);
      if (activeId === id) {
        setActiveId(refreshed.length > 0 ? refreshed[0].id : null);
      }
    },
    [activeId]
  );

  const handleNew = useCallback(() => {
    setActiveId(null);
    setError(null);
  }, []);

  const [retrying, setRetrying] = useState(false);

  const handleRetryAnalysis = useCallback(async () => {
    if (!activeConversation || retrying) return;
    setRetrying(true);

    try {
      const fullText = activeConversation.utterances
        .map((u) => `[${u.start.toFixed(1)}-${u.end.toFixed(1)}] Speaker ${u.speaker + 1}: ${u.text}`)
        .join("\n");

      const analysis = await window.api.analyze(fullText, activeConversation.duration);

      const updated: Conversation = {
        ...activeConversation,
        topics: analysis.topics || activeConversation.topics,
        summary: analysis.summary || activeConversation.summary,
        actionPoints: analysis.actionPoints || activeConversation.actionPoints,
        sentiments: analysis.sentiments || activeConversation.sentiments,
        tags: analysis.tags || activeConversation.tags,
        topicSegments: analysis.topicSegments || activeConversation.topicSegments,
      };

      await window.api.db.update(updated);
      const refreshed = await window.api.db.list();
      setConversations(refreshed);
    } catch (err) {
      console.error("Retry analysis failed:", err);
    } finally {
      setRetrying(false);
    }
  }, [activeConversation, retrying]);

  const handleSeekTo = useCallback((timeSeconds: number) => {
    setActiveTab("conversation");
    // Use setTimeout to ensure tab switch renders before scroll
    setTimeout(() => setScrollToTime(timeSeconds), 50);
  }, []);

  const handleUpload = useCallback(async () => {
    setError(null);

    const filePath = await window.api.pickAudioFile();
    if (!filePath) return;

    setAppState("transcribing");

    try {
      const { utterances, duration } = await window.api.transcribe(filePath);

      setAppState("analyzing");

      const fullText = utterances
        .map((u: Utterance) => `[${u.start.toFixed(1)}-${u.end.toFixed(1)}] Speaker ${u.speaker + 1}: ${u.text}`)
        .join("\n");

      let analysis: {
        topics?: Conversation["topics"];
        summary?: string;
        actionPoints?: Conversation["actionPoints"];
        sentiments?: Conversation["sentiments"];
        tags?: Conversation["tags"];
        topicSegments?: Conversation["topicSegments"];
      } = {};

      try {
        analysis = await window.api.analyze(fullText, duration);
      } catch {
        // Analysis is optional
      }

      const fileName = filePath.split("/").pop()?.replace(/\.[^/.]+$/, "") || "Untitled";

      const conversation: Conversation = {
        id: crypto.randomUUID(),
        title: fileName,
        utterances,
        duration,
        topics: analysis.topics || [],
        summary: analysis.summary || "",
        actionPoints: analysis.actionPoints || [],
        sentiments: analysis.sentiments || [],
        tags: analysis.tags || [],
        topicSegments: analysis.topicSegments || [],
        speakerNames: {},
        createdAt: Date.now(),
      };

      await window.api.db.create(conversation);
      const refreshed = await window.api.db.list();
      setConversations(refreshed);
      setActiveId(conversation.id);
      setAppState("idle");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setAppState("idle");
    }
  }, []);

  // ── Checking connection ──────────────────────────────────
  if (connState === "checking") {
    return (
      <div className="flex h-screen bg-[#0a0a0a] text-[#ededed] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400">Connecting to database...</p>
        </div>
      </div>
    );
  }

  // ── NAS Setup ────────────────────────────────────────────
  if (connState === "setup") {
    return (
      <div className="flex h-screen bg-[#0a0a0a] text-[#ededed]">
        <NasSetup onConnected={handleNasConnected} />
      </div>
    );
  }

  // ── Main app ─────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#0a0a0a] text-[#ededed]">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNew}
        onDelete={handleDeleteConversation}
        onRename={handleRenameConversation}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {(!activeConversation || appState !== "idle") && (
          <main className="flex-1 flex flex-col items-center justify-center px-4">
            {appState === "idle" && (
              <>
                <h1 className="text-3xl font-bold text-zinc-100 mb-2">
                  Meet Transcriber
                </h1>
                <p className="text-zinc-400 mb-8">
                  Upload a meeting recording to get a speaker-identified transcript
                </p>
                <FileUpload onUpload={handleUpload} isProcessing={false} />
                {error && (
                  <p className="text-red-400 mt-4 text-sm">{error}</p>
                )}
              </>
            )}

            {appState === "transcribing" && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-300">Transcribing audio with Deepgram...</p>
                <p className="text-zinc-500 text-sm">This may take a moment depending on file size</p>
              </div>
            )}

            {appState === "analyzing" && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-300">Analyzing topics with Claude...</p>
              </div>
            )}
          </main>
        )}

        {activeConversation && appState === "idle" && (
          <>
            <header data-drag-region className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-zinc-100">
                  {activeConversation.title}
                </h1>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                  {activeConversation.utterances.length} utterances
                </span>
              </div>
            </header>

            <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="flex-1 flex overflow-hidden">
              {/* Tab content */}
              <div className="flex-1 overflow-y-auto bg-zinc-950">
                {activeTab === "conversation" && (
                  <ChatView
                    utterances={activeConversation.utterances}
                    speakerNames={activeConversation.speakerNames}
                    onRenameSpeaker={handleRenameSpeaker}
                    scrollToTime={scrollToTime}
                  />
                )}

                {activeTab === "action-points" && (
                  <ActionPointsView
                    actionPoints={activeConversation.actionPoints || []}
                    onRetry={handleRetryAnalysis}
                    retrying={retrying}
                  />
                )}

                {activeTab === "topics" && (
                  <TopicsView
                    topics={activeConversation.topics}
                    duration={activeConversation.duration}
                    onRetry={handleRetryAnalysis}
                    retrying={retrying}
                  />
                )}

                {activeTab === "summary" && (
                  <SummaryView
                    summary={activeConversation.summary}
                    sentiments={activeConversation.sentiments || []}
                    tags={activeConversation.tags || []}
                    duration={activeConversation.duration}
                    onRetry={handleRetryAnalysis}
                    retrying={retrying}
                  />
                )}
              </div>

              {/* Right sidebar: Topic Timeline */}
              {(activeConversation.topicSegments?.length ?? 0) > 0 && (
                <aside className="w-64 border-l border-zinc-800 bg-zinc-900 shrink-0">
                  <TopicTimeline
                    segments={activeConversation.topicSegments || []}
                    duration={activeConversation.duration}
                    onSeekTo={handleSeekTo}
                  />
                </aside>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
