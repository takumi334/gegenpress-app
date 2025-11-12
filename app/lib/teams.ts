// app/lib/teams.ts
import { resolveTeamId, toTeamSlug } from "./team-resolver";
import { teamIndex } from "./teamIndex";
import { fdFetch } from "./fd";

/** 文字列が純粋な数値か */
function isNumericId(s: string): boolean {
  return /^\d+$/.test(s);
}

/** ルートの [team] パラメータから teamId を解決（数値 / 既存マップ / 代表的スラッグ） */
export async function getTeamIdFromParam(param: string): Promise<number | null> {
  // 1) すでに数値ID
  if (isNumericId(param)) return Number(param);

  // 2) 事前に持っているインデックス（あなたの teamIndex.ts）
  if (teamIndex[param] != null) return teamIndex[param];

  // 3) 代表的スラッグ表
  const bySlug = resolveTeamId(param);
  if (bySlug != null) return bySlug;

  // 4) ここで外部検索などを入れたければ拡張（今は null）
  return null;
}

/** Football-Data からチーム名を取得（失敗時は元の param を返す） */
export async function getTeamNameFromFD(param: string): Promise<string> {
  const id = await getTeamIdFromParam(param);
  if (!id) return param;

  try {
    const data = await fdFetch<{ id: number; name?: string }>(`/teams/${id}`, {
      // 30分キャッシュ（適宜調整）
      next: { revalidate: 1800 },
    });
    return data?.name ?? param;
  } catch {
    return param;
  }
}

/** スラッグ化を公開（必要なら使う） */
export { toTeamSlug };

