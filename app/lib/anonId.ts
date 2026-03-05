const STORAGE_KEY = "gegenpress_anon_id";

/**
 * 匿名ユーザーIDを取得または生成する（localStorage）。
 * サーバーでは空文字を返す。
 */
export function getOrCreateAnonId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = "anon_" + Math.random().toString(36).slice(2) + "_" + Date.now();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
