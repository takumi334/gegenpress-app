"use client";

/**
 * 本物に近いサッカーピッチ
 * 縦横比 68:105 (FIFA規格)、必要なライン・マークをすべて表示
 */
export default function SoccerPitch({ className = "" }: { className?: string }) {
  // viewBox: 幅68, 高さ105 (縦長ピッチ)
  // ペナルティエリア: 幅40.32, 奥行16.5 → 幅59.3%, 奥行15.7%
  // ゴールエリア: 幅18.32, 奥行5.5 → 幅26.9%, 奥行5.2%
  // センターサークル: 半径9.15 → 8.7%
  // ペナルティスポット: ゴールから11m → 10.5%

  return (
    <svg
      viewBox="0 0 68 105"
      className={`block w-full h-auto ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="pitch-grass" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2d7a3e" />
          <stop offset="50%" stopColor="#276633" />
          <stop offset="100%" stopColor="#1e4d26" />
        </linearGradient>
      </defs>
      {/* 芝生 */}
      <rect width="68" height="105" fill="url(#pitch-grass)" />
      {/* 外枠 */}
      <rect x="0.8" y="0.8" width="66.4" height="103.4" fill="none" stroke="white" strokeWidth="0.7" />
      {/* ハーフウェーライン */}
      <line x1="0.8" y1="52.5" x2="67.2" y2="52.5" stroke="white" strokeWidth="0.6" />
      {/* センターサークル */}
      <circle cx="34" cy="52.5" r="9.2" fill="none" stroke="white" strokeWidth="0.6" />
      {/* センタースポット */}
      <circle cx="34" cy="52.5" r="0.6" fill="white" />
      {/* 上側ペナルティエリア */}
      <rect x="13.84" y="0" width="40.32" height="16.5" fill="none" stroke="white" strokeWidth="0.35" />
      {/* 上側ゴールエリア */}
      <rect x="24.84" y="0" width="18.32" height="5.5" fill="none" stroke="white" strokeWidth="0.35" />
      {/* 上側ペナルティスポット */}
      <circle cx="34" cy="11" r="0.6" fill="white" />
      {/* 上側ゴール（ゴール線上のバー） */}
      <rect x="29.5" y="0" width="9" height="0.4" fill="white" />
      <line x1="29.5" y1="0" x2="29.5" y2="2" stroke="white" strokeWidth="0.2" />
      <line x1="38.5" y1="0" x2="38.5" y2="2" stroke="white" strokeWidth="0.2" />
      {/* 下側ペナルティエリア */}
      <rect x="13.84" y="88.5" width="40.32" height="16.5" fill="none" stroke="white" strokeWidth="0.35" />
      {/* 下側ゴールエリア */}
      <rect x="24.84" y="99.5" width="18.32" height="5.5" fill="none" stroke="white" strokeWidth="0.35" />
      {/* 下側ペナルティスポット */}
      <circle cx="34" cy="94" r="0.6" fill="white" />
      {/* 下側ゴール（ゴール線上のバー） */}
      <rect x="29.5" y="104" width="9" height="0.4" fill="white" />
      <line x1="29.5" y1="103" x2="29.5" y2="105" stroke="white" strokeWidth="0.2" />
      <line x1="38.5" y1="103" x2="38.5" y2="105" stroke="white" strokeWidth="0.2" />
    </svg>
  );
}
