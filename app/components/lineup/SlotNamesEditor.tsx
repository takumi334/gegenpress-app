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
            <input
              type="text"
              value={slotNames[slot.code] ?? ""}
              onChange={(e) => {
                const next = e.target.value;
                onChange(slot.code, next);
                onSelectPlayer?.(slot.code, next);
              }}
              list={`slot-candidates-${slot.code}`}
              placeholder={lineupBuilderUi.namePlaceholder}
              className="flex-1 min-w-0 rounded px-2 py-1 bg-white/10 border border-white/20 text-white text-xs placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <datalist id={`slot-candidates-${slot.code}`}>
              {(slotCandidates[slot.code] ?? []).map((name) => (
                <option key={`${slot.code}-${name}`} value={name} />
              ))}
            </datalist>
          </label>
        ))}
      </div>
    </div>
  );
}
