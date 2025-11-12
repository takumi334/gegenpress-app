// app/board/components/SideTabs.tsx
"use client";
import { useState, type ReactNode } from "react";

type TabKey = "predict" |  "videos";
export default function SideTabs({
  children,
  defaultTab = null,
}: {
  children: ReactNode;          // data-tab を持つ子を並べる
  defaultTab?: TabKey | null;   // null なら初期は何も表示しない
}) {
  const [active, setActive] = useState<TabKey | null>(defaultTab);

  // data-tab の値と一致する子だけ表示
  const panes = Array.isArray(children) ? children : [children];
  const visible = panes.filter((el: any) => el?.props?.["data-tab"] === active);

  return (
    <div className="rounded-lg border bg-white dark:bg-zinc-900 shadow-sm">
      <div className="flex justify-around border-b text-sm font-medium">
        {(["predict","videos"] as TabKey[]).map(key => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`py-2 px-4 border-b-2 ${
              active === key ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500"
            }`}
          >
            {key === "predict" ? "Predict" : key === "news" ? "News" : "Videos"}
          </button>
        ))}
      </div>
      <div className="p-4">
        {active ? visible : null}
      </div>
    </div>
  );
}

