/**
 * スレッド種別の定義と戦術ボード表示・投稿可否の判定
 * PRE_MATCH / LIVE_MATCH / POST_MATCH / GENERAL に統一し、
 * 旧値（lineup, halftime, postmatch, prematch）は読み取り時に正規化する。
 */

export const THREAD_TYPE = {
  PRE_MATCH: "PRE_MATCH",
  LIVE_MATCH: "LIVE_MATCH",
  POST_MATCH: "POST_MATCH",
  GENERAL: "GENERAL",
} as const;

export type ThreadType = (typeof THREAD_TYPE)[keyof typeof THREAD_TYPE];

const LEGACY_TO_CANONICAL: Record<string, ThreadType> = {
  prematch: THREAD_TYPE.PRE_MATCH,
  lineup: THREAD_TYPE.LIVE_MATCH,
  halftime: THREAD_TYPE.LIVE_MATCH,
  postmatch: THREAD_TYPE.POST_MATCH,
  pre_match: THREAD_TYPE.PRE_MATCH,
  live_match: THREAD_TYPE.LIVE_MATCH,
  post_match: THREAD_TYPE.POST_MATCH,
  general: THREAD_TYPE.GENERAL,
};

/**
 * DB の threadType 文字列を正規化（旧値対応）
 */
export function normalizeThreadType(raw: string | null | undefined): ThreadType {
  if (!raw || typeof raw !== "string") return THREAD_TYPE.GENERAL;
  const key = raw.trim().toLowerCase();
  const legacy = LEGACY_TO_CANONICAL[key];
  if (legacy) return legacy;
  const upper = raw.toUpperCase();
  if (upper === THREAD_TYPE.PRE_MATCH || upper === THREAD_TYPE.LIVE_MATCH ||
      upper === THREAD_TYPE.POST_MATCH || upper === THREAD_TYPE.GENERAL) {
    return upper as ThreadType;
  }
  return THREAD_TYPE.GENERAL;
}

/** 戦術ボードの新規作成が可能なスレッド種別 */
const TACTICS_BOARD_CREATE_TYPES: ThreadType[] = [THREAD_TYPE.PRE_MATCH, THREAD_TYPE.LIVE_MATCH];

/**
 * このスレッド種別で戦術ボードを新規投稿できるか
 */
export function canCreateTacticsBoard(threadType: string | null | undefined): boolean {
  // threadType が未設定（null / undefined）の初期状態でも導線を消さない
  // （ただし値が存在する場合は従来どおり作成可能タイプのみ許可）
  if (threadType == null || String(threadType).trim() === "") return true;
  return TACTICS_BOARD_CREATE_TYPES.includes(normalizeThreadType(threadType));
}

/**
 * 既存の戦術ボードを閲覧可能か（POST_MATCH では新規投稿不可だが閲覧は可）
 */
export function canViewTacticsBoards(_threadType: string | null | undefined): boolean {
  return true;
}

/**
 * 戦術ボード投稿ボタンのラベル（PRE_MATCH / LIVE_MATCH 以外では使わない）
 */
export function getTacticsBoardButtonLabel(threadType: string | null | undefined): string {
  const t = normalizeThreadType(threadType);
  switch (t) {
    case THREAD_TYPE.PRE_MATCH:
      return "戦術ボードを投稿";
    case THREAD_TYPE.LIVE_MATCH:
      return "ライブ戦術メモを投稿";
    default:
      return "戦術ボードを投稿";
  }
}

/**
 * 戦術ボード投稿ボタン下の説明文
 */
export function getTacticsBoardDescription(threadType: string | null | undefined): string {
  const t = normalizeThreadType(threadType);
  switch (t) {
    case THREAD_TYPE.PRE_MATCH:
      return "試合前の狙いどころや配置予想を書き込む";
    case THREAD_TYPE.LIVE_MATCH:
      return "試合中の気づきや配置変化を書き込む";
    default:
      return "";
  }
}

/**
 * 戦術ボード作成ページを表示してよいか（アクセス制御用）
 */
export function isTacticsBoardCreateAllowed(threadType: string | null | undefined): boolean {
  return canCreateTacticsBoard(threadType);
}

export const TACTICS_BOARD_MODE = {
  PRE_MATCH: "PRE_MATCH",
  LIVE_MATCH: "LIVE_MATCH",
} as const;

export type TacticsBoardMode = (typeof TACTICS_BOARD_MODE)[keyof typeof TACTICS_BOARD_MODE];

/**
 * スレッド種別から TacticsBoard.mode を決定
 */
export function threadTypeToTacticsBoardMode(
  threadType: string | null | undefined
): TacticsBoardMode | null {
  const t = normalizeThreadType(threadType);
  if (t === THREAD_TYPE.PRE_MATCH) return TACTICS_BOARD_MODE.PRE_MATCH;
  if (t === THREAD_TYPE.LIVE_MATCH) return TACTICS_BOARD_MODE.LIVE_MATCH;
  return null;
}
