import pg from "pg";
import type { Conversation } from "../src/types";

const { Pool } = pg;

let pool: pg.Pool;

export async function initDb(connectionString: string) {
  if (pool) {
    await pool.end().catch(() => {});
  }

  pool = new Pool({ connectionString });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      duration REAL NOT NULL DEFAULT 0,
      summary TEXT DEFAULT '',
      speaker_names JSONB DEFAULT '{}',
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS utterances (
      id SERIAL PRIMARY KEY,
      conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
      speaker INTEGER NOT NULL,
      text TEXT NOT NULL,
      start_time REAL NOT NULL,
      end_time REAL NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      id SERIAL PRIMARY KEY,
      conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
      topic TEXT NOT NULL,
      percentage REAL NOT NULL,
      color TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_utterances_conv ON utterances(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_topics_conv ON topics(conversation_id);

    ALTER TABLE conversations ADD COLUMN IF NOT EXISTS action_points JSONB DEFAULT '[]';
    ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sentiments JSONB DEFAULT '[]';
    ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
    ALTER TABLE conversations ADD COLUMN IF NOT EXISTS topic_segments JSONB DEFAULT '[]';
  `);
}

export async function getConversations(): Promise<Conversation[]> {
  const { rows } = await pool.query(
    `SELECT * FROM conversations ORDER BY created_at DESC`
  );
  const conversations: Conversation[] = [];
  for (const row of rows) {
    const conv = await hydrateConversation(row);
    conversations.push(conv);
  }
  return conversations;
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const { rows } = await pool.query(`SELECT * FROM conversations WHERE id = $1`, [id]);
  if (rows.length === 0) return null;
  return hydrateConversation(rows[0]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateConversation(row: any): Promise<Conversation> {
  const { rows: uttRows } = await pool.query(
    `SELECT speaker, text, start_time, end_time FROM utterances WHERE conversation_id = $1 ORDER BY sort_order`,
    [row.id]
  );

  const { rows: topicRows } = await pool.query(
    `SELECT topic, percentage, color FROM topics WHERE conversation_id = $1`,
    [row.id]
  );

  return {
    id: row.id,
    title: row.title,
    duration: row.duration,
    summary: row.summary,
    speakerNames: row.speaker_names || {},
    createdAt: Number(row.created_at),
    utterances: uttRows.map((u: { speaker: number; text: string; start_time: number; end_time: number }) => ({
      speaker: u.speaker,
      text: u.text,
      start: u.start_time,
      end: u.end_time,
    })),
    topics: topicRows.map((t: { topic: string; percentage: number; color: string }) => ({
      topic: t.topic,
      percentage: t.percentage,
      color: t.color,
    })),
    actionPoints: row.action_points || [],
    sentiments: row.sentiments || [],
    tags: row.tags || [],
    topicSegments: row.topic_segments || [],
  };
}

export async function createConversation(conv: Conversation): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO conversations (id, title, duration, summary, speaker_names, created_at, action_points, sentiments, tags, topic_segments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        conv.id, conv.title, conv.duration, conv.summary,
        JSON.stringify(conv.speakerNames), conv.createdAt,
        JSON.stringify(conv.actionPoints || []),
        JSON.stringify(conv.sentiments || []),
        JSON.stringify(conv.tags || []),
        JSON.stringify(conv.topicSegments || []),
      ]
    );

    for (let i = 0; i < conv.utterances.length; i++) {
      const u = conv.utterances[i];
      await client.query(
        `INSERT INTO utterances (conversation_id, speaker, text, start_time, end_time, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [conv.id, u.speaker, u.text, u.start, u.end, i]
      );
    }

    for (const t of conv.topics) {
      await client.query(
        `INSERT INTO topics (conversation_id, topic, percentage, color) VALUES ($1, $2, $3, $4)`,
        [conv.id, t.topic, t.percentage, t.color]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateConversation(conv: Conversation): Promise<void> {
  await pool.query(
    `UPDATE conversations SET title = $2, summary = $3, speaker_names = $4, action_points = $5, sentiments = $6, tags = $7, topic_segments = $8 WHERE id = $1`,
    [
      conv.id, conv.title, conv.summary,
      JSON.stringify(conv.speakerNames),
      JSON.stringify(conv.actionPoints || []),
      JSON.stringify(conv.sentiments || []),
      JSON.stringify(conv.tags || []),
      JSON.stringify(conv.topicSegments || []),
    ]
  );
}

export async function deleteConversation(id: string): Promise<void> {
  await pool.query(`DELETE FROM conversations WHERE id = $1`, [id]);
}
