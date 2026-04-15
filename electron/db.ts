import pg from "pg";
import type { Conversation, Profile, Folder } from "../src/types";

const { Pool } = pg;

let pool: pg.Pool;

export async function initDb(connectionString: string) {
  if (pool) {
    await pool.end().catch(() => {});
  }

  pool = new Pool({ connectionString });

  // Test connection first
  await pool.query("SELECT 1");
  console.log("[db] Connected to PostgreSQL");

  const migrations = [
    `CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL, pin TEXT NOT NULL, color TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, title TEXT NOT NULL, duration REAL NOT NULL DEFAULT 0, summary TEXT DEFAULT '', speaker_names JSONB DEFAULT '{}', created_at BIGINT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS utterances (id SERIAL PRIMARY KEY, conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE, speaker INTEGER NOT NULL, text TEXT NOT NULL, start_time REAL NOT NULL, end_time REAL NOT NULL, sort_order INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS topics (id SERIAL PRIMARY KEY, conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE, topic TEXT NOT NULL, percentage REAL NOT NULL, color TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_utterances_conv ON utterances(conversation_id)`,
    `CREATE INDEX IF NOT EXISTS idx_topics_conv ON topics(conversation_id)`,
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS action_points JSONB DEFAULT '[]'`,
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sentiments JSONB DEFAULT '[]'`,
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'`,
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS topic_segments JSONB DEFAULT '[]'`,
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS profile_id TEXT DEFAULT 'marcos'`,
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS folder_id TEXT`,
    `CREATE TABLE IF NOT EXISTS folders (id TEXT PRIMARY KEY, name TEXT NOT NULL, profile_id TEXT NOT NULL, created_at BIGINT NOT NULL)`,
    `ALTER TABLE folders ADD COLUMN IF NOT EXISTS parent_id TEXT`,
  ];

  for (const sql of migrations) {
    await pool.query(sql);
  }
  console.log("[db] Schema ready");

  // Seed profiles if they don't exist
  await pool.query(`
    INSERT INTO profiles (id, name, pin, color)
    VALUES ('marcos', 'Marcos', '0000', '#6366f1'),
           ('dasha', 'Dasha', '0000', '#ec4899')
    ON CONFLICT (id) DO NOTHING;
  `);
}

// ── Profiles ─────────────────────────────────────────────────
export async function getProfiles(): Promise<Profile[]> {
  const { rows } = await pool.query(`SELECT * FROM profiles ORDER BY name`);
  return rows;
}

export async function verifyPin(profileId: string, pin: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM profiles WHERE id = $1 AND pin = $2`,
    [profileId, pin]
  );
  return rows.length > 0;
}

export async function updatePin(profileId: string, newPin: string): Promise<void> {
  await pool.query(`UPDATE profiles SET pin = $1 WHERE id = $2`, [newPin, profileId]);
}

export async function updateProfileName(profileId: string, name: string): Promise<void> {
  await pool.query(`UPDATE profiles SET name = $1 WHERE id = $2`, [name, profileId]);
}

// ── Conversations ────────────────────────────────────────────
export async function getConversations(profileId: string): Promise<Conversation[]> {
  const { rows } = await pool.query(
    `SELECT * FROM conversations WHERE profile_id = $1 ORDER BY created_at DESC`,
    [profileId]
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
    folderId: row.folder_id || null,
    profileId: row.profile_id || "marcos",
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
      `INSERT INTO conversations (id, title, duration, summary, speaker_names, created_at, action_points, sentiments, tags, topic_segments, profile_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        conv.id, conv.title, conv.duration, conv.summary,
        JSON.stringify(conv.speakerNames), conv.createdAt,
        JSON.stringify(conv.actionPoints || []),
        JSON.stringify(conv.sentiments || []),
        JSON.stringify(conv.tags || []),
        JSON.stringify(conv.topicSegments || []),
        conv.profileId,
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

export async function moveConversationToFolder(convId: string, folderId: string | null): Promise<void> {
  await pool.query(`UPDATE conversations SET folder_id = $2 WHERE id = $1`, [convId, folderId]);
}

// ── Folders ──────────────────────────────────────────────────
export async function getFolders(profileId: string): Promise<Folder[]> {
  const { rows } = await pool.query(
    `SELECT * FROM folders WHERE profile_id = $1 ORDER BY created_at`,
    [profileId]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    profileId: r.profile_id,
    parentId: r.parent_id ?? null,
    createdAt: Number(r.created_at),
  }));
}

export async function createFolder(folder: Folder): Promise<void> {
  await pool.query(
    `INSERT INTO folders (id, name, profile_id, parent_id, created_at) VALUES ($1, $2, $3, $4, $5)`,
    [folder.id, folder.name, folder.profileId, folder.parentId ?? null, folder.createdAt]
  );
}

export async function renameFolder(id: string, name: string): Promise<void> {
  await pool.query(`UPDATE folders SET name = $1 WHERE id = $2`, [name, id]);
}

export async function moveFolder(id: string, parentId: string | null): Promise<void> {
  await pool.query(`UPDATE folders SET parent_id = $1 WHERE id = $2`, [parentId, id]);
}

export async function deleteFolder(id: string): Promise<void> {
  // Find this folder's parent so we can reparent children up one level
  const { rows } = await pool.query(`SELECT parent_id FROM folders WHERE id = $1`, [id]);
  const grandparent = rows[0]?.parent_id ?? null;

  // Move sub-folders up to the grandparent (or root)
  await pool.query(`UPDATE folders SET parent_id = $1 WHERE parent_id = $2`, [grandparent, id]);

  // Move conversations into the grandparent (or out of folders if grandparent is null)
  await pool.query(`UPDATE conversations SET folder_id = $1 WHERE folder_id = $2`, [grandparent, id]);

  await pool.query(`DELETE FROM folders WHERE id = $1`, [id]);
}
