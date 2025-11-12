// app/components/AdOverlay.tsx
"use client";

type Props = {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
};

export default function AdOverlay({ open, onClose, children }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="rounded-xl bg-white text-black p-6 max-w-md w-[90%] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-semibold mb-2">お知らせ</div>
        <div className="text-sm mb-4">
          {children ?? "広告またはプロモーションメッセージが入ります。"}
        </div>
        <button
          className="border rounded px-3 py-1"
          onClick={onClose}
          data-i18n
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

