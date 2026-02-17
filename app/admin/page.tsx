"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";

type ReportItem = {
  id: number;
  kind: string;
  targetId: number;
  reason: string | null;
  detail: string | null;
  pageUrl: string | null;
  ua: string | null;
  ip: string | null;
  createdAt: string;
};

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hasKey = useMemo(() => adminKey.trim().length > 0, [adminKey]);

  useEffect(() => {
    const saved = localStorage.getItem("ADMIN_KEY") ?? "";
    if (saved) setAdminKey(saved);
  }, []);

  const saveKey = () => {
    localStorage.setItem("ADMIN_KEY", adminKey.trim());
    setErr(null);
  };

  async function fetchReports() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "GET",
        headers: { "x-admin-key": adminKey.trim() },
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json?.message ?? "failed to load");
      }

      setItems((json.items ?? []) as ReportItem[]);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function deleteReportRecord(reportId: number) {
    const res = await fetch(`/api/admin/reports?id=${reportId}`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey.trim() },
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      throw new Error(json?.message ?? "failed to delete report record");
    }
  }

  async function handleResolveOnly(r: ReportItem) {
    if (!confirm(`この通報を対応済みにしますか？\nReportId=${r.id}`)) return;

    setLoading(true);
    setErr(null);
    try {
      await deleteReportRecord(r.id);
      setItems((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTarget(r: ReportItem) {
    if (
      !confirm(
        `対象を削除しますか？\nkind=${r.kind}\ntargetId=${r.targetId}\n（削除後、通報も対応済みにします）`
      )
    ) {
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      if (r.kind === "post") {
        // 既存の投稿削除API
        const res = await fetch(`/api/posts/${r.targetId}`, {
          method: "DELETE",
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          throw new Error(json?.message ?? "failed to delete post");
        }

        // 通報レコードも消す（対応済み）
        await deleteReportRecord(r.id);

        setItems((prev) => prev.filter((x) => x.id !== r.id));
        return;
      }

      if (r.kind === "thread") {
        // 後で DELETE /api/threads/:id を作ったらここに追加
        throw new Error("thread削除APIが未実装です");
      }

      throw new Error(`unknown kind: ${r.kind}`);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin</h1>

      <section
        style={{
          marginTop: 16,
          padding: 12,
          border: "1px solid #333",
          borderRadius: 8,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>ADMIN_KEY</h2>

        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <input
            type="password"
            placeholder="ADMIN_KEY"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            style={{
              width: 360,
              padding: 8,
              borderRadius: 6,
              border: "1px solid #444",
              background: "#111",
              color: "#fff",
            }}
          />

          <button
            onClick={saveKey}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #444",
              background: "#222",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            保存
          </button>

          <button
            onClick={fetchReports}
            disabled={!hasKey || loading}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #444",
              background: hasKey ? "#222" : "#111",
              color: "#fff",
              cursor: hasKey ? "pointer" : "not-allowed",
            }}
          >
            通報一覧を取得
          </button>
        </div>

        {err && (
          <p style={{ marginTop: 10, color: "#ff6b6b" }}>Error: {err}</p>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>
          通報一覧（最新50件）
        </h2>

        {loading && <p style={{ marginTop: 8 }}>loading...</p>}

        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 980,
            }}
          >
            <thead>
              <tr>
                {[
                  "id",
                  "createdAt",
                  "kind",
                  "targetId",
                  "reason/detail",
                  "pageUrl",
                  "actions",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: 8,
                      borderBottom: "1px solid #333",
                      fontSize: 12,
                      color: "#bbb",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: 8, borderBottom: "1px solid #222" }}>
                    {r.id}
                  </td>
                  <td style={{ padding: 8, borderBottom: "1px solid #222" }}>
                    {new Date(r.createdAt).toLocaleString("ja-JP")}
                  </td>
                  <td style={{ padding: 8, borderBottom: "1px solid #222" }}>
                    {r.kind}
                  </td>
                  <td style={{ padding: 8, borderBottom: "1px solid #222" }}>
                    {r.targetId}
                  </td>
                  <td style={{ padding: 8, borderBottom: "1px solid #222" }}>
                    <div style={{ fontSize: 12 }}>
                      <div>
                        <b>{r.reason ?? "-"}</b>
                      </div>
                      {r.detail ? (
                        <div style={{ color: "#bbb", marginTop: 4 }}>
                          {r.detail}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td style={{ padding: 8, borderBottom: "1px solid #222" }}>
                    {r.pageUrl ? (
                      <a
                        href={r.pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#8ab4ff" }}
                      >
                        open
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={{ padding: 8, borderBottom: "1px solid #222" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={() => handleDeleteTarget(r)}
                        disabled={loading}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid #444",
                          background: "#2a1a1a",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        対象を削除
                      </button>

                      <button
                        onClick={() => handleResolveOnly(r)}
                        disabled={loading}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid #444",
                          background: "#1a2a1a",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        通報だけ消す（対応済）
                      </button>

                      {r.kind === "thread" && (
                        <span style={{ fontSize: 12, color: "#bbb" }}>
                          ※thread削除API未実装
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 12, color: "#bbb" }}>
                    （まだ取得していない / 件数0）
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}


