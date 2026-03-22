import "server-only";
import type { NextRequest } from "next/server";

/**
 * Route Handler 用: `x-admin-key` と `process.env.ADMIN_KEY` を照合。
 * - `ADMIN_KEY` が設定されているとき: ヘッダ値と `ADMIN_KEY` が一致すれば OK
 * - さらに development かつヘッダが `admin` なら OK（localStorage デフォルトと合わせる）
 * - `ADMIN_KEY` 未設定のとき: ヘッダが `admin` のみ許可
 */
export function requireAdminApiKey(req: NextRequest): void {
  const got = (req.headers.get("x-admin-key") ?? "").trim();
  const expected = (process.env.ADMIN_KEY ?? "").trim();
  const isDev = process.env.NODE_ENV !== "production";

  if (!got) throw new Error("UNAUTHORIZED");

  if (expected && got === expected) return;
  if (isDev && got === "admin") return;
  if (!expected && got === "admin") return;

  throw new Error("UNAUTHORIZED");
}
