// Native-SQL data layer for «Голос в текст».
// Self-contained on purpose: this is the public entry consumed by the Next app
// (webpack), the worker (NodeNext/tsx) and per-package tsc, so it must have no
// relative imports and stay valid under every module resolution mode.

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import pg from "pg";
import dotenv from "dotenv";
import type { PoolClient, QueryResultRow } from "pg";

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Enums & row types (mirror migrations/0001_init.sql)
// ---------------------------------------------------------------------------

export type UserRole = "USER" | "ADMIN";
export type PlanType = "FREE" | "PRO" | "BUSINESS";
export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED";
export type BillingInterval = "MONTH" | "YEAR";
export type PaymentStatus = "PENDING" | "SUCCEEDED" | "CANCELED" | "REFUNDED";
export type TranscriptionStatus =
  | "PENDING"
  | "DOWNLOADING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";
export type TranscriptionSource = "UPLOAD" | "URL";

export interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  emailVerified: Date | null;
  image: string | null;
  role: UserRole;
  privacyAcceptedAt: Date | null;
  personalDataAcceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: PlanType;
  status: SubscriptionStatus;
  interval: BillingInterval;
  periodStart: Date;
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  yookassaPaymentMethodId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transcription {
  id: string;
  userId: string;
  title: string;
  source: TranscriptionSource;
  status: TranscriptionStatus;
  sourceUrl: string | null;
  fileKey: string | null;
  mimeType: string | null;
  fileSize: number | null;
  durationSec: number | null;
  language: string | null;
  progress: number;
  text: string | null;
  segments: Segment[] | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export type TranscriptionListItem = Pick<
  Transcription,
  | "id"
  | "title"
  | "source"
  | "status"
  | "progress"
  | "durationSec"
  | "language"
  | "createdAt"
  | "completedAt"
>;

export interface UsageRecord {
  id: string;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  secondsUsed: number;
}

// ---------------------------------------------------------------------------
// Environment & connection pool
// ---------------------------------------------------------------------------

let envLoaded = false;

/** Loads the nearest .env walking up from cwd. The Next app loads env itself,
 *  so this is mainly for the worker and the db scripts (run via tsx). */
export function loadEnv(): void {
  if (envLoaded) return;
  envLoaded = true;
  let dir = process.cwd();
  for (;;) {
    const candidate = join(dir, ".env");
    if (existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

const globalForPool = globalThis as unknown as { __pgPool?: pg.Pool };

export function getPool(): pg.Pool {
  if (!globalForPool.__pgPool) {
    globalForPool.__pgPool = new Pool({
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_DATABASE ?? "transcribe_saas",
      user: process.env.DB_USERNAME ?? "postgres",
      password: process.env.DB_PASSWORD,
      max: Number(process.env.DB_POOL_MAX ?? 10),
    });
  }
  return globalForPool.__pgPool;
}

/** Runs a parameterised query and returns the rows. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query<T>(text, params as unknown[] | undefined);
  return result.rows;
}

/** Runs `fn` inside a single transaction. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (globalForPool.__pgPool) {
    await globalForPool.__pgPool.end();
    globalForPool.__pgPool = undefined;
  }
}

// ---------------------------------------------------------------------------
// Column projections (snake_case → camelCase aliases)
// ---------------------------------------------------------------------------

const USER_COLS = `
  id, email, name, password_hash AS "passwordHash", email_verified AS "emailVerified",
  image, role, privacy_accepted_at AS "privacyAcceptedAt",
  personal_data_accepted_at AS "personalDataAcceptedAt",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

const SUBSCRIPTION_COLS = `
  id, user_id AS "userId", plan, status, interval, period_start AS "periodStart",
  period_end AS "periodEnd", cancel_at_period_end AS "cancelAtPeriodEnd",
  yookassa_payment_method_id AS "yookassaPaymentMethodId",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

const TRANSCRIPTION_COLS = `
  id, user_id AS "userId", title, source, status, source_url AS "sourceUrl",
  file_key AS "fileKey", mime_type AS "mimeType", file_size AS "fileSize",
  duration_sec AS "durationSec", language, progress, text, segments, error,
  created_at AS "createdAt", updated_at AS "updatedAt", completed_at AS "completedAt"`;

const TRANSCRIPTION_LIST_COLS = `
  id, title, source, status, progress, duration_sec AS "durationSec", language,
  created_at AS "createdAt", completed_at AS "completedAt"`;

const USAGE_COLS = `
  id, user_id AS "userId", period_start AS "periodStart",
  period_end AS "periodEnd", seconds_used AS "secondsUsed"`;

// ---------------------------------------------------------------------------
// Repositories
// ---------------------------------------------------------------------------

export interface CreateUserInput {
  email: string;
  name?: string | null;
  passwordHash: string;
  privacyAcceptedAt?: Date | null;
  personalDataAcceptedAt?: Date | null;
}

export const users = {
  async findByEmail(email: string): Promise<User | null> {
    const rows = await query<User>(`SELECT ${USER_COLS} FROM users WHERE email = $1`, [email]);
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const rows = await query<User>(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async create(input: CreateUserInput): Promise<User> {
    const rows = await query<User>(
      `INSERT INTO users (email, name, password_hash, privacy_accepted_at, personal_data_accepted_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${USER_COLS}`,
      [
        input.email,
        input.name ?? null,
        input.passwordHash,
        input.privacyAcceptedAt ?? null,
        input.personalDataAcceptedAt ?? null,
      ]
    );
    return rows[0];
  },
};

export const subscriptions = {
  async findByUserId(userId: string): Promise<Subscription | null> {
    const rows = await query<Subscription>(
      `SELECT ${SUBSCRIPTION_COLS} FROM subscriptions WHERE user_id = $1`,
      [userId]
    );
    return rows[0] ?? null;
  },

  /** Creates a FREE subscription for the user if none exists yet. */
  async ensureFree(userId: string): Promise<void> {
    await query(
      `INSERT INTO subscriptions (user_id, plan) VALUES ($1, 'FREE')
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
  },
};

export interface CreateTranscriptionInput {
  userId: string;
  title: string;
  source: TranscriptionSource;
  language?: string | null;
  fileKey?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  sourceUrl?: string | null;
}

export interface UpdateTranscriptionInput {
  status?: TranscriptionStatus;
  progress?: number;
  text?: string | null;
  segments?: Segment[];
  durationSec?: number | null;
  language?: string | null;
  error?: string | null;
  completedAt?: Date | null;
  title?: string;
}

export interface TranscriptionFilter {
  userId: string;
  status?: TranscriptionStatus;
  statuses?: TranscriptionStatus[];
  query?: string;
  skip?: number;
  take?: number;
}

const TRANSCRIPTION_UPDATABLE: Record<string, string> = {
  status: "status",
  progress: "progress",
  text: "text",
  durationSec: "duration_sec",
  language: "language",
  error: "error",
  completedAt: "completed_at",
  title: "title",
};

function buildTranscriptionFilter(filter: TranscriptionFilter): {
  where: string;
  values: unknown[];
} {
  const conditions = ["user_id = $1"];
  const values: unknown[] = [filter.userId];
  if (filter.status) {
    values.push(filter.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filter.statuses && filter.statuses.length > 0) {
    values.push(filter.statuses);
    conditions.push(`status = ANY($${values.length})`);
  }
  if (filter.query) {
    values.push(`%${filter.query}%`);
    conditions.push(`title ILIKE $${values.length}`);
  }
  return { where: conditions.join(" AND "), values };
}

export const transcriptions = {
  async findOwned(id: string, userId: string): Promise<Transcription | null> {
    const rows = await query<Transcription>(
      `SELECT ${TRANSCRIPTION_COLS} FROM transcriptions WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<Transcription | null> {
    const rows = await query<Transcription>(
      `SELECT ${TRANSCRIPTION_COLS} FROM transcriptions WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async create(input: CreateTranscriptionInput): Promise<Transcription> {
    const rows = await query<Transcription>(
      `INSERT INTO transcriptions (user_id, title, source, language, file_key, mime_type, file_size, source_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${TRANSCRIPTION_COLS}`,
      [
        input.userId,
        input.title,
        input.source,
        input.language ?? null,
        input.fileKey ?? null,
        input.mimeType ?? null,
        input.fileSize ?? null,
        input.sourceUrl ?? null,
      ]
    );
    return rows[0];
  },

  async update(id: string, patch: UpdateTranscriptionInput): Promise<Transcription | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [key, column] of Object.entries(TRANSCRIPTION_UPDATABLE)) {
      const value = (patch as Record<string, unknown>)[key];
      if (value !== undefined) {
        values.push(value);
        sets.push(`${column} = $${values.length}`);
      }
    }
    if (patch.segments !== undefined) {
      values.push(JSON.stringify(patch.segments));
      sets.push(`segments = $${values.length}::jsonb`);
    }
    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const rows = await query<Transcription>(
      `UPDATE transcriptions SET ${sets.join(", ")} WHERE id = $${values.length}
       RETURNING ${TRANSCRIPTION_COLS}`,
      values
    );
    return rows[0] ?? null;
  },

  async remove(id: string): Promise<void> {
    await query(`DELETE FROM transcriptions WHERE id = $1`, [id]);
  },

  async list(filter: TranscriptionFilter): Promise<TranscriptionListItem[]> {
    const { where, values } = buildTranscriptionFilter(filter);
    values.push(filter.take ?? 10);
    const limitIdx = values.length;
    values.push(filter.skip ?? 0);
    const offsetIdx = values.length;
    return query<TranscriptionListItem>(
      `SELECT ${TRANSCRIPTION_LIST_COLS} FROM transcriptions
       WHERE ${where} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values
    );
  },

  async count(filter: TranscriptionFilter): Promise<number> {
    const { where, values } = buildTranscriptionFilter(filter);
    const rows = await query<{ count: number }>(
      `SELECT count(*)::int AS count FROM transcriptions WHERE ${where}`,
      values
    );
    return rows[0]?.count ?? 0;
  },
};

export const usageRecords = {
  async find(userId: string, periodStart: Date): Promise<UsageRecord | null> {
    const rows = await query<UsageRecord>(
      `SELECT ${USAGE_COLS} FROM usage_records WHERE user_id = $1 AND period_start = $2`,
      [userId, periodStart]
    );
    return rows[0] ?? null;
  },

  /** Adds `seconds` to the user's current period (upsert + increment). */
  async addSeconds(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
    seconds: number
  ): Promise<void> {
    await query(
      `INSERT INTO usage_records (user_id, period_start, period_end, seconds_used)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, period_start)
       DO UPDATE SET seconds_used = usage_records.seconds_used + EXCLUDED.seconds_used`,
      [userId, periodStart, periodEnd, Math.ceil(seconds)]
    );
  },
};
