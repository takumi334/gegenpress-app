"use client";

import { lineupBuilderUi } from "@/lib/lineupBuilderUiCopy";
import type { FormationDef, Slot } from "@/lib/formations";
import type { SlotNames } from "./PitchBoard";

type SlotNamesEditorProps = {
  formation: FormationDef;
  slotNames: SlotNames;
  onChange: (slotCode: string, name: string) => void;
  onSelectPlayer?: (slotCode: string, name: string) => void;
  slotCandidates?: Record<string, string[]>;
  candidateNotice?: string | null;
};

export default function SlotNamesEditor({
  formation,
  slotNames,
  onChange,
  onSelectPlayer,
  slotCandidates = {},
  candidateNotice = null,
}: SlotNamesEditorProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {lineupBuilderUi.namesByPosition}
      </h3>
      {candidateNotice ? (
        <p className="text-[11px] text-amber-600">{candidateNotice}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-1.5 max-h-[240px] overflow-y-auto p-1 border border-white/10 rounded-lg bg-white/5 dark:bg-white/[0.06]">
        {formation.slots.map((slot: Slot) => (
          <label
            key={slot.code}
            className="flex items-center gap-1.5 text-xs"
          >
            <span className="w-8 shrink-0 font-medium text-white/80">
              {slot.label}
            </span>
            {(slotCandidates[slot.code] ?? []).length > 0 ? (
              <div className="hidden md:flex flex-wrap gap-1">
                {(slotCandidates[slot.code] ?? []).slice(0, 4).map((name) => (
                  <button
                    key={`${slot.code}-quick-${name}`}
                    type="button"
                    onClick={() => {
                      onChange(slot.code, name);
                      onSelectPlayer?.(slot.code, name);
                    }}
                    className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-white/80 hover:bg-white/10"
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={slotNames[slot.code] ?? ""}
                onChange={(e) => {
                  const next = e.target.value;
                  onChange(slot.code, next);
                  onSelectPlayer?.(slot.code, next);
                }}
                placeholder="手入力"
                className="w-20 min-w-0 rounded px-1.5 py-0.5 bg-white/10 border border-white/20 text-white text-[10px] placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
