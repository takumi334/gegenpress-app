// app/lib/prisma.ts — server only (Prisma must not run in browser)
import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getRuntimeDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);
    if (!url.hostname.endsWith(".pooler.supabase.com")) return rawUrl;

    // Vercel では Supavisor Transaction mode を使い、各インスタンスの接続を 1 本に抑える。
    url.port = "6543";
    url.searchParams.set("pgbouncer", "true");
    url.searchParams.set("connection_limit", "1");
    url.searchParams.set("sslmode", "require");
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const runtimeDatabaseUrl = getRuntimeDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(runtimeDatabaseUrl ? { datasourceUrl: runtimeDatabaseUrl } : {}),
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** 接続切断系エラーかどうか */
function isConnectionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /closed|connection|ECONNRESET|EPIPE|connect/i.test(msg) || (e as { kind?: string })?.kind === "Closed";
}

/**
 * DB アクセスを 1 回だけリトライする（接続切断時）。
 * ログ用に routeAndOp を渡すと "[GET /api/threads] listThreads" のように出る。
 */
export async function withPrismaRetry<T>(
  routeAndOp: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (!isConnectionError(e)) throw e;
    console.warn(`[prisma] connection error in ${routeAndOp}, reconnecting and retrying once`, e);
    await prisma.$connect();
    return await fn();
  }
}

export default prisma;

