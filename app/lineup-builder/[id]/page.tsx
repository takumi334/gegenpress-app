"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getFormation, type FormationId } from "@/lib/formations";
import type { PlayerLite } from "@/lib/lineupPlayers";
import type { SlotAssignments, SlotPositions, SlotNames } from "@components/lineup/PitchBoard";
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

export default function LineupViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { targetLang, sameLanguage, translationTrigger } = usePostTranslation();
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [data, setData] = useState<LineupDetail | null>(null);
  const [dataWithTranslation, setDataWithTranslation] = useState<LineupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setResolvedId(p.id));
  }, [params]);

  useEffect(() => {
    if (!resolvedId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/lineup/${resolvedId}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(lineupBuilderUi.loadFailed);
        return r.json();
      })
      .then((d: LineupDetail) => {
        if (!cancelled) setData(d);
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
    const uniqueNames = [...new Set(data.players.map(({ player }) => player.name).filter(Boolean))];
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
            players: data.players.map(({ positionCode, sortOrder, player }) => ({
              positionCode,
              sortOrder,
              player: {
                ...player,
                translatedName: nameToTranslated.get(player.name) ?? player.name,
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
    if (!displayData) return {};
    return displayData.players.reduce<SlotAssignments>((acc, { positionCode, player }) => {
      acc[positionCode] = player;
      return acc;
    }, {});
  }, [displayData]);

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
        <Link href="/lineup-builder" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          スタメンビルダーへ
        </Link>
      </main>
    );
  }

  const formationId: FormationId =
    displayData?.formation === "4-4-2" || displayData?.formation === "3-5-2"
      ? (displayData.formation as FormationId)
      : "4-3-3";
  const formationDef = getFormation(formationId);
  const slotPositions: SlotPositions = Object.fromEntries(
    formationDef.slots.map((s) => [s.code, { x: s.x, y: s.y }])
  );
  const slotNames: SlotNames = useMemo(() => {
    if (!displayData) return {};
    return displayData.players.reduce<SlotNames>((acc, { positionCode, player }) => {
      acc[positionCode] = player.translatedName ?? player.name;
      return acc;
    }, {});
  }, [displayData]);

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
        {data.formation} · {new Date(data.createdAt).toLocaleString("en-US")}
      </p>
      <div className="w-full max-w-xl mx-auto">
        <PitchBoard
          formation={formationDef}
          assignments={assignments}
          slotPositions={slotPositions}
          slotNames={slotNames}
          onSlotPositionChange={() => {}}
        />
      </div>
    </main>
  );
}
