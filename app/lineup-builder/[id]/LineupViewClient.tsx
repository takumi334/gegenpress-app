"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getFormation, type FormationId } from "@/lib/formations";
import type { PlayerLite } from "@/lib/lineupPlayers";
import type {
  SlotAssignments,
  SlotPositions,
  SlotNames,
  Ball,
} from "@components/lineup/PitchBoard";
import PitchBoard from "@components/lineup/PitchBoard";
import { usePostTranslation } from "@/lib/PostTranslationContext";
import { lineupBuilderUi } from "@/lib/lineupBuilderUiCopy";

type LineupDetail = {
  id: number;
  formation: string;
  title: string | null;
  createdAt: string;
  players: Array<{
    positionCode: string;
    sortOrder: number;
    player: PlayerLite;
  }>;
};

function parseRouteId(raw: string | string[] | undefined): string | null {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].trim()) return raw[0].trim();
  return null;
}

function normalizeLineupDetail(raw: unknown): LineupDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = Number(o.id);
  if (!Number.isFinite(id)) return null;

  const formationRaw = o.formation;
  const formation =
    formationRaw === "4-4-2" || formationRaw === "3-5-2" || formationRaw === "4-3-3"
      ? formationRaw
      : typeof formationRaw === "string" && formationRaw
        ? formationRaw
        : "4-3-3";

  const playersRaw = Array.isArray(o.players) ? o.players : [];
  const players: LineupDetail["players"] = [];

  for (const entry of playersRaw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const positionCode = typeof e.positionCode === "string" ? e.positionCode : "";
    const sortOrder = Number.isFinite(Number(e.sortOrder)) ? Number(e.sortOrder) : 0;
    const pl = e.player;
    if (!pl || typeof pl !== "object") continue;
    const p = pl as Record<string, unknown>;
    const pid = Number(p.id);
    if (!Number.isFinite(pid)) continue;
    const name = typeof p.name === "string" ? p.name : "";
    const cat = p.positionCategory;
    const positionCategory =
      cat === "GK" || cat === "DF" || cat === "MF" || cat === "FW" ? cat : ("MF" as const);
    players.push({
      positionCode,
      sortOrder,
      player: {
        id: pid,
        name,
        ...(typeof p.translatedName === "string" ? { translatedName: p.translatedName } : {}),
        positionCategory,
        teamName: p.teamName == null ? null : String(p.teamName),
        shirtNumber: (() => {
          if (p.shirtNumber == null || p.shirtNumber === "") return null;
          const n = Number(p.shirtNumber);
          return Number.isFinite(n) ? n : null;
        })(),
      },
    });
  }

  return {
    id,
    formation,
    title: o.title == null ? null : String(o.title),
    createdAt: typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString(),
    players,
  };
}

export default function LineupViewClient() {
  const routeParams = useParams();
  const resolvedId = useMemo(
    () => parseRouteId(routeParams?.id as string | string[] | undefined),
    [routeParams?.id]
  );

  const { targetLang, sameLanguage, translationTrigger } = usePostTranslation();
  const [data, setData] = useState<LineupDetail | null>(null);
  const [dataWithTranslation, setDataWithTranslation] = useState<LineupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ball, setBall] = useState<Ball>({ id: "ball", x: 50, y: 50 });

  useEffect(() => {
    if (!resolvedId) {
      setLoading(false);
      setError(lineupBuilderUi.errorGeneric);
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/lineup/${resolvedId}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(lineupBuilderUi.loadFailed);
        return r.json();
      })
      .then((raw: unknown) => {
        const normalized = normalizeLineupDetail(raw);
        if (!cancelled) {
          if (!normalized) {
            setError(lineupBuilderUi.loadFailed);
            setData(null);
          } else {
            setData(normalized);
          }
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? lineupBuilderUi.errorGeneric);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedId]);

  useEffect(() => {
    if (!data?.players?.length || sameLanguage || translationTrigger === 0) {
      setDataWithTranslation(data ?? null);
      return;
    }
    let cancelled = false;
    setDataWithTranslation(data);
    const rows = Array.isArray(data.players) ? data.players : [];
    const uniqueNames = [
      ...new Set(
        rows
          .map(({ player }) => player?.name)
          .filter((n): n is string => typeof n === "string" && n.length > 0)
      ),
    ];
    if (uniqueNames.length === 0) return;
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
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
          setDataWithTranslation({
            ...data,
            players: rows.map(({ positionCode, sortOrder, player }) => ({
              positionCode,
              sortOrder,
              player: {
                ...player,
                translatedName: nameToTranslated.get(player?.name ?? "") ?? player?.name ?? "",
              },
            })),
          });
        }
      })
      .catch(() => {
        if (!cancelled) setDataWithTranslation(data);
      });
    return () => {
      cancelled = true;
    };
  }, [data, targetLang, sameLanguage, translationTrigger]);

  const displayData = dataWithTranslation ?? data;

  const assignments: SlotAssignments = useMemo(() => {
    const rows = displayData?.players ?? [];
    return rows.reduce<SlotAssignments>((acc, row) => {
      if (row?.positionCode && row?.player != null && row.player.id != null) {
        acc[row.positionCode] = row.player;
      }
      return acc;
    }, {});
  }, [displayData]);

  const slotNames: SlotNames = useMemo(() => {
    const rows = displayData?.players ?? [];
    return rows.reduce<SlotNames>((acc, { positionCode, player }) => {
      if (positionCode && player) {
        acc[positionCode] = player.translatedName ?? player.name ?? "";
      }
      return acc;
    }, {});
  }, [displayData]);

  const formationId: FormationId = useMemo(() => {
    const f = displayData?.formation;
    if (f === "4-4-2" || f === "3-5-2") return f;
    return "4-3-3";
  }, [displayData?.formation]);

  const formationDef = useMemo(() => getFormation(formationId), [formationId]);

  const slotPositions: SlotPositions = useMemo(
    () =>
      Object.fromEntries(formationDef.slots.map((s) => [s.code, { x: s.x, y: s.y }])),
    [formationDef]
  );

  if (loading) {
    return (
      <main className="p-4 max-w-6xl mx-auto">
        <p className="text-sm text-gray-500">{lineupBuilderUi.loading}</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="p-4 max-w-6xl mx-auto">
        <p className="text-sm text-red-600">{error ?? "見つかりません"}</p>
        <Link
          href="/lineup-builder"
          className="text-sm text-blue-600 hover:underline mt-2 inline-block"
        >
          スタメンビルダーへ
        </Link>
      </main>
    );
  }

  const createdLabel = (() => {
    try {
      return new Date(data.createdAt).toLocaleString("en-US");
    } catch {
      return "";
    }
  })();

  return (
    <main className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/lineup-builder" className="text-sm text-gray-600 hover:underline">
          {lineupBuilderUi.backToBuilder}
        </Link>
        <h1 className="text-xl font-bold">
          {data.title ?? lineupBuilderUi.lineupTitleFallback(data.id)}
        </h1>
      </div>
      <p className="text-xs text-gray-500 mb-2">
        {data.formation ?? "4-3-3"}
        {createdLabel ? ` · ${createdLabel}` : ""}
      </p>
      <div className="w-full max-w-xl mx-auto">
        <PitchBoard
          formation={formationDef}
          assignments={assignments}
          slotPositions={slotPositions}
          slotNames={slotNames}
          ball={ball}
          onBallChange={setBall}
          onSlotPositionChange={() => {}}
        />
      </div>
    </main>
  );
}
