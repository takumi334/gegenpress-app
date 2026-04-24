import "server-only";
import type { NextRequest } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Route Handler 用: `x-admin-key` と `process.env.ADMIN_KEY` を照合。
 * - `ADMIN_KEY` が設定されているとき: ヘッダ値と `ADMIN_KEY` が一致すれば OK
 * - それ以外は UNAUTHORIZED
 */
export function requireAdminApiKey(req: NextRequest): void {
  const got = (req.headers.get("x-admin-key") ?? "").trim();
  const candidates = resolveAdminKeyCandidates();
  const matched = candidates.includes(got);
  console.log("[requireAdminApiKey] auth check", {
    cwd: process.cwd(),
    hasEnv: !!process.env.ADMIN_KEY,
    envLen: process.env.ADMIN_KEY?.length ?? 0,
    candidateLens: candidates.map((x) => x.length),
    candidateMasks: candidates.map((x) => x.replace(/[A-Za-z0-9]/g, "*")),
    gotLen: got?.length ?? 0,
    headerExists: !!got,
    matched,
  });

  if (!got) throw new Error("UNAUTHORIZED");
  if (candidates.length === 0) throw new Error("UNAUTHORIZED");
  if (matched) return;

  throw new Error("UNAUTHORIZED");
}

function resolveAdminKeyCandidates(): string[] {
  const envRaw = (process.env.ADMIN_KEY ?? "").trim();
  const envNormalized = normalizeAdminKey(envRaw);
  const localRaw = process.env.NODE_ENV === "production" ? "" : readAdminKeyFromDotEnvLocal();
  const localNormalized = normalizeAdminKey(localRaw);
  return [envRaw, envNormalized, localRaw, localNormalized].filter((v, i, a) => v.length > 0 && a.indexOf(v) === i);
}

function readAdminKeyFromDotEnvLocal(): string {
  try {
    const file = join(process.cwd(), ".env.local");
    if (!existsSync(file)) return "";
    const text = readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("ADMIN_KEY=")) continue;
      return trimmed.slice("ADMIN_KEY=".length).trim();
    }
    return "";
  } catch {
    return "";
  }
}

function normalizeAdminKey(v: string): string {
  return v.replace(/["'\\]/g, "").trim();
}
