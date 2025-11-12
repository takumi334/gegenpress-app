// app/lib/next-compat.ts
// 14/15 互換ユーティリティ（params, searchParams, 型, ガード, 小物まとめ）

/** 14: T / 15: Promise<T> の両対応 */
export async function unwrapParams<T>(p: T | Promise<T>): Promise<T> {
  return p instanceof Promise ? await p : p;
}

/** 14/15 両対応で searchParams をオブジェクトへ正規化 */
export function normalizeSearchParams(
  sp: URLSearchParams | Record<string, string | string[] | undefined> | undefined | null
): Record<string, string> {
  if (!sp) return {};
  // Next.js の page 引数の searchParams は基本 Record<string, string | string[]>
  if (typeof (sp as any).get === "function") {
    // URLSearchParams
    const out: Record<string, string> = {};
    for (const [k, v] of (sp as URLSearchParams).entries()) out[k] = v;
    return out;
  }
  const rec = sp as Record<string, string | string[] | undefined>;
  const out: Record<string, string> = {};
  for (const k of Object.keys(rec)) {
    const v = rec[k];
    if (Array.isArray(v)) out[k] = v[0] ?? "";
    else out[k] = v ?? "";
  }
  return out;
}

/** number への安全変換（失敗は null） */
export function toNumberSafe(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 必須チェック + notFound 代替 throw */
export function assertDefined<T>(v: T | null | undefined, msg = "required"): T {
  if (v == null) throw new Error(msg);
  return v;
}

/** ルート用の id を string へ統一（UI/Fetchの整合が取りやすい） */
export function toIdString(v: string | number): string {
  return String(v);
}

/** サーバー/クライアント環境チェック */
export const isBrowser = () => typeof window !== "undefined";

/** 簡易キャッシュキー作成（クエリもどき） */
export function makeKey(base: string, kv: Record<string, string | number | undefined>) {
  const q = Object.entries(kv)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return q ? `${base}?${q}` : base;
}

/* =======================
   使用例（14/15 両対応）
   ======================= */

/*
 // app/board/[team]/page.tsx
 import { unwrapParams, toNumberSafe, toIdString } from "@/lib/next-compat";
 import { getTeamNameFromFD } from "@lib/team-resolver";
 import BoardClient from "@board/components/BoardClient";
 import { notFound } from "next/navigation";

 export default async function TeamBoardPage({
   params,
   // searchParams, // 必要なら受け取って normalizeSearchParams へ
 }: {
   params: { team: string } | Promise<{ team: string }>;
   // searchParams?: URLSearchParams | Record<string, string | string[] | undefined>;
 }) {
   // ✅ 14/15差分を吸収
   const { team } = await unwrapParams(params);

   // ✅ string → number 安全変換
   const teamNum = toNumberSafe(team);
   if (teamNum == null) notFound();

   const teamId = toIdString(teamNum); // 以降は string 統一
   const teamName = await getTeamNameFromFD(teamId);

   return (
     <main className="p-6 space-y-8">
       <h1 className="text-2xl font-bold">{teamName}</h1>
       <BoardClient team={teamId} initialTab="tweet" />
     </main>
   );
 }
*/

/*
 // searchParams の正規化例
 import { normalizeSearchParams } from "@/lib/next-compat";

 export default async function Page({
   params,
   searchParams,
 }: {
   params: { id: string } | Promise<{ id: string }>;
   searchParams?: URLSearchParams | Record<string, string | string[] | undefined>;
 }) {
   const p = await unwrapParams(params);
   const q = normalizeSearchParams(searchParams);
   const tab = q.tab || "tweet";
   // ...
 }
*/

