"use client";

import type { FormationDef, Slot } from "@/lib/formations";
import type { SlotNames } from "./PitchBoard";

type SlotNamesEditorProps = {
  formation: FormationDef;
  slotNames: SlotNames;
  onChange: (slotCode: string, name: string) => void;
};

export default function SlotNamesEditor({
  formation,
  slotNames,
  onChange,
}: SlotNamesEditorProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        ポジション別 選手名
      </h3>
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
              onChange={(e) => onChange(slot.code, e.target.value)}
              placeholder="名前"
              className="flex-1 min-w-0 rounded px-2 py-1 bg-white/10 border border-white/20 text-white text-xs placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
