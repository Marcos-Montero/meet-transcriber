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

export type ConversationTab = "conversation" | "action-points" | "topics" | "summary";

export interface Conversation {
  id: string;
  title: string;
  utterances: Utterance[];
  duration: number;
  topics: TopicStat[];
  summary: string;
  speakerNames: Record<number, string>;
  createdAt: number;
  actionPoints?: ActionPoint[];
  sentiments?: SpeakerSentiment[];
  tags?: string[];
  topicSegments?: TopicSegment[];
}
