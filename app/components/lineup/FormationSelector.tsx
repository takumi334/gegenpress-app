"use client";

import type { FormationId } from "@/lib/formations";
import { useT } from "@/lib/NativeLangProvider";

type FormationSelectorProps = {
  value: FormationId;
  onChange: (id: FormationId) => void;
};

const OPTIONS: { id: FormationId; label: string }[] = [
  { id: "4-3-3", label: "4-3-3" },
  { id: "4-4-2", label: "4-4-2" },
  { id: "3-5-2", label: "3-5-2" },
];

export default function FormationSelector({ value, onChange }: FormationSelectorProps) {
  const t = useT();
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("tactics.formation")}</span>
      <div className="flex gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors
              ${value === opt.id ? "border-green-600 bg-green-600/20 text-green-400 dark:bg-green-900/40 dark:text-green-300" : "border-gray-500 bg-gray-700 text-gray-300 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"}
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
