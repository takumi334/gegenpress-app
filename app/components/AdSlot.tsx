"use client";

/** ダミー広告枠（AdSenseがまだ無い環境向け） */
export default function AdSlot() {
  return (
    <div className="border rounded-lg p-3 text-center text-sm bg-white text-black/70">
      広告枠（300×250 / 728×90 等）
    </div>
  );
}

