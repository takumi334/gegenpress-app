import "server-only";

import { prisma, withPrismaRetry } from "@/lib/prisma";

const CACHE_TABLE = "football_data_cache";

let ensured = false;

async function ensureTable(): Promise<void> {
  if (ensured) return;
  await withPrismaRetry("football_data_cache ensure table", () =>
    prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${CACHE_TABLE} (
        cache_key TEXT PRIMARY KEY,
        cache_kind TEXT NOT NULL,
        payload JSONB NOT NULL,
        fetched_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      )
    `)
  );
  ensured = true;
}

type CacheRow = {
  payload: unknown;
  fetched_at: Date;
  expires_at: Date;
};

const memoryCache = new Map<
  string,
  { payload: unknown; fetchedAt: Date; expiresAt: Date }
>();

export type DbCacheState<T> = {
  payload: T;
  fetchedAt: Date;
  expiresAt: Date;
  isFresh: boolean;
  source: "db" | "memory";
};

export async function getDbCacheState<T>(key: string): Promise<DbCacheState<T> | null> {
  await ensureTable();
  const rows = await withPrismaRetry("football_data_cache read", () =>
    prisma.$queryRawUnsafe<CacheRow[]>(
      `
        SELECT payload, fetched_at, expires_at
        FROM ${CACHE_TABLE}
        WHERE cache_key = $1
        LIMIT 1
      `,
      key
    )
  );
  const row = rows[0];
  if (row) {
    const state: DbCacheState<T> = {
      payload: row.payload as T,
      fetchedAt: new Date(row.fetched_at),
      expiresAt: new Date(row.expires_at),
      isFresh: new Date(row.expires_at).getTime() > Date.now(),
      source: "db",
    };
    memoryCache.set(key, {
      payload: state.payload,
      fetchedAt: state.fetchedAt,
      expiresAt: state.expiresAt,
    });
    return state;
  }

  const mem = memoryCache.get(key);
  if (!mem) return null;
  return {
    payload: mem.payload as T,
    fetchedAt: mem.fetchedAt,
    expiresAt: mem.expiresAt,
    isFresh: mem.expiresAt.getTime() > Date.now(),
    source: "memory",
  };
}

export async function getDbCache<T>(key: string): Promise<T | null> {
  const state = await getDbCacheState<T>(key);
  if (!state?.isFresh) return null;
  return state.payload;
}

export async function setDbCache<T>(
  key: string,
  kind: "teams" | "standings" | "team_page" | "league_snapshot" | "squad",
  payload: T,
  ttlSeconds: number
): Promise<void> {
  await ensureTable();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  await withPrismaRetry("football_data_cache upsert", () =>
    prisma.$executeRawUnsafe(
      `
        INSERT INTO ${CACHE_TABLE} (cache_key, cache_kind, payload, fetched_at, expires_at)
        VALUES ($1, $2, $3::jsonb, $4, $5)
        ON CONFLICT (cache_key)
        DO UPDATE SET
          cache_kind = EXCLUDED.cache_kind,
          payload = EXCLUDED.payload,
          fetched_at = EXCLUDED.fetched_at,
          expires_at = EXCLUDED.expires_at
      `,
      key,
      kind,
      JSON.stringify(payload),
      now,
      expiresAt
    )
  );
  memoryCache.set(key, {
    payload,
    fetchedAt: now,
    expiresAt,
  });
}
