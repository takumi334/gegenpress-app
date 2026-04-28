"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import LineupBuilder from "@components/lineup/LineupBuilder";
import type { PlayerLite } from "@/lib/lineupPlayers";
import type { SlotAssignments } from "@components/lineup/PitchBoard";
import type { FormationId } from "@/lib/formations";
import { usePostTranslation } from "@/lib/PostTranslationContext";
import { lineupBuilderUi } from "@/lib/lineupBuilderUiCopy";

type SavedLineup = { id: number; formation: string; title: string | null; createdAt: string };
type CandidateGroup = {
  GK?: string[];
  DF?: string[];
  MF?: string[];
  FW?: string[];
  OTHER?: string[];
};

function categoryForSlot(slotCode: string): keyof CandidateGroup {
  const c = slotCode.toUpperCase();
  if (c === "GK") return "GK";
  if (c.includes("CB") || c.includes("LB") || c.includes("RB") || c.includes("WB")) return "DF";
  if (c.includes("CM") || c.includes("DM") || c.includes("AM") || c === "LM" || c === "RM") return "MF";
  if (c.includes("ST") || c === "LW" || c === "RW" || c.includes("FW")) return "FW";
  return "OTHER";
}

export default function LineupBuilderPage() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const teamId = searchParams.get("teamId");
  const { targetLang, sameLanguage, translationTrigger } = usePostTranslation();
  const [players, setPlayers] = useState<PlayerLite[]>([]);
  const [playersWithTranslation, setPlayersWithTranslation] = useState<PlayerLite[]>([]);
  const [savedList, setSavedList] = useState<SavedLineup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [candidateGrouped, setCandidateGrouped] = useState<CandidateGroup>({});
  const [candidateNotice, setCandidateNotice] = useState<string | null>(null);

  const loadSaved = useCallback(() => {
    fetch("/api/lineup")
      .then((r) => r.json())
      .then((data: SavedLineup[]) => setSavedList(Array.isArray(data) ? data : []))
      .catch(() => setSavedList([]));
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/lineup/players")
      .then((r) => r.json())
      .then((data: PlayerLite[]) => {
        if (!cancelled) setPlayers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setPlayers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!players.length) {
      setPlayersWithTranslation(players);
      return;
    }
    if (sameLanguage || translationTrigger === 0) {
      setPlayersWithTranslation(players);
      return;
    }
    let cancelled = false;
    setPlayersWithTranslation(players);
    const uniqueNames = [...new Set(players.map((p) => p.name).filter(Boolean))];
    if (uniqueNames.length === 0) return;
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: uniqueNames, target: targetLang }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("translate failed"))))
      .then((j: { translations?: string[] }) => {
        const trs = Array.isArray(j?.translations) ? j.translations : [];
        const nameToTranslated = new Map<string, string>();
        uniqueNames.forEach((name, i) => {
          nameToTranslated.set(name, trs[i] ?? name);
        });
        if (!cancelled) {
          setPlayersWithTranslation(
            players.map((p) => ({
              ...p,
              translatedName: nameToTranslated.get(p.name) ?? p.name,
            }))
          );
        }
      })
      .catch(() => {
        if (!cancelled) setPlayersWithTranslation(players);
      });
    return () => {
      cancelled = true;
    };
  }, [players, targetLang, sameLanguage, translationTrigger]);

  useEffect(() => {
    const tid = Number(teamId ?? "");
    if (!Number.isInteger(tid) || tid <= 0) {
      setCandidateGrouped({});
      setCandidateNotice(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/lineup/squad?teamId=${tid}`)
      .then((r) => r.json())
      .then((data: { grouped?: CandidateGroup; meta?: { message?: string | null } }) => {
        if (cancelled) return;
        setCandidateGrouped(data?.grouped ?? {});
        const msg = data?.meta?.message;
        setCandidateNotice(typeof msg === "string" && msg.length > 0 ? msg : null);
      })
      .catch(() => {
        if (cancelled) return;
        setCandidateGrouped({});
        setCandidateNotice("選手候補はありません。手入力できます。");
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const slotCandidates = useMemo(() => {
    const gk = candidateGrouped.GK ?? [];
    const df = candidateGrouped.DF ?? [];
    const mf = candidateGrouped.MF ?? [];
    const fw = candidateGrouped.FW ?? [];
    const other = candidateGrouped.OTHER ?? [];
    const bucket: Record<string, string[]> = {};
    const allSlots = [
      "GK",
      "LB",
      "RB",
      "CB1",
      "CB2",
      "CB3",
      "LWB",
      "RWB",
      "LM",
      "RM",
      "CM1",
      "CM2",
      "CM3",
      "LW",
      "RW",
      "ST",
      "ST1",
      "ST2",
    ];
    for (const slot of allSlots) {
      const cat = categoryForSlot(slot);
      if (cat === "GK") bucket[slot] = gk;
      else if (cat === "DF") bucket[slot] = [...df, ...other];
      else if (cat === "MF") bucket[slot] = [...mf, ...other];
      else if (cat === "FW") bucket[slot] = [...fw, ...other];
      else bucket[slot] = other;
    }
    return bucket;
  }, [candidateGrouped]);

  const handleSave = useCallback(
    async (formation: FormationId, assignments: SlotAssignments) => {
      setSaveStatus("saving");
      const body = {
        formation,
        title: lineupBuilderUi.defaultLineupTitle,
        assignments: Object.fromEntries(
          Object.entries(assignments)
            .filter(([, p]) => p != null)
            // datalist fallback の仮ID（負数）は保存対象から除外
            .filter(([, p]) => (p?.id ?? 0) > 0)
            .map(([code, p]) => [code, p!.id])
        ),
      };
      try {
        const res = await fetch("/api/lineup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error ?? lineupBuilderUi.saveFailed);
        }
        setSaveStatus("ok");
        loadSaved();
      } catch (e) {
        console.error(e);
        setSaveStatus("error");
      }
    },
    [loadSaved]
  );

  if (loading) {
    return (
      <main className="p-4 max-w-6xl mx-auto">
        <p className="text-sm text-gray-500">{lineupBuilderUi.loading}</p>
      </main>
    );
  }

  return (
    <main className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <Link
          href="/"
          className="text-sm text-gray-600 hover:underline"
        >
          {lineupBuilderUi.backToTop}
        </Link>
        <h1 className="text-xl font-bold">{lineupBuilderUi.pageTitle}</h1>
      </div>
      <p className="text-sm text-gray-600 mb-4">{lineupBuilderUi.pageIntro}</p>
      <LineupBuilder
        players={playersWithTranslation}
        slotCandidates={slotCandidates}
        candidateNotice={candidateNotice}
        onSave={handleSave}
        saveLabel={lineupBuilderUi.saveLineupButton}
        returnTo={returnTo ?? undefined}
      />
      {saveStatus === "saving" && (
        <p className="mt-2 text-sm text-gray-500">{lineupBuilderUi.saving}</p>
      )}
      {saveStatus === "ok" && (
        <p className="mt-2 text-sm text-green-600">{lineupBuilderUi.saved}</p>
      )}
      {saveStatus === "error" && (
        <p className="mt-2 text-sm text-red-600">{lineupBuilderUi.saveFailedLong}</p>
      )}
      {savedList.length > 0 && (
        <section className="mt-8 border-t pt-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">保存したスタメン</h2>
          <ul className="space-y-1">
            {savedList.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/lineup-builder/${s.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {s.title ?? lineupBuilderUi.lineupTitleFallback(s.id)} — {s.formation} (
                  {new Date(s.createdAt).toLocaleDateString("en-US")})
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
