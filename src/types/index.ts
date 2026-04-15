export interface Utterance {
  speaker: number;
  text: string;
  start: number;
  end: number;
}

export interface SpeakerBlock {
  speaker: number;
  texts: string[];
  start: number;
  end: number;
}

export interface TopicStat {
  topic: string;
  percentage: number;
  color: string;
}

export interface ActionPoint {
  who: string;
  what: string;
  deadline: string;
}

export interface SpeakerSentiment {
  speaker: string;
  sentiment: string;
  summary: string;
}

export interface TopicSegment {
  topic: string;
  startTime: number;
  endTime: number;
  color: string;
}

export type ConversationTab = "summary" | "action-points" | "conversation";

export interface Profile {
  id: string;
  name: string;
  pin: string;
  color: string;
}

export interface Folder {
  id: string;
  name: string;
  profileId: string;
  parentId: string | null;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  folderId?: string | null;
  utterances: Utterance[];
  duration: number;
  topics: TopicStat[];
  summary: string;
  speakerNames: Record<number, string>;
  profileId: string;
  createdAt: number;
  actionPoints?: ActionPoint[];
  sentiments?: SpeakerSentiment[];
  tags?: string[];
  topicSegments?: TopicSegment[];
}
