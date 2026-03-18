/**
 * スタメンビルダー用 選手型と仮データ
 * 将来的に DB の Player や試合スレ連携に差し替えやすい形にする。
 */

export type PositionCategory = "GK" | "DF" | "MF" | "FW";

export type PlayerLite = {
  id: number;
  name: string;
  /** 翻訳後の表示名（スレッド翻訳と同じAPIで生成。未設定時は name を使用） */
  translatedName?: string;
  positionCategory: PositionCategory;
  teamName?: string | null;
  shirtNumber?: number | null;
};

/** MVP 用の仮選手一覧（1チーム分＋α。DB に選手が居れば API から取得する想定） */
export const MOCK_PLAYERS: PlayerLite[] = [
  { id: 1, name: "ゴールキーパー", positionCategory: "GK", teamName: "サンプルFC", shirtNumber: 1 },
  { id: 2, name: "左SB", positionCategory: "DF", teamName: "サンプルFC", shirtNumber: 2 },
  { id: 3, name: "CB・左", positionCategory: "DF", teamName: "サンプルFC", shirtNumber: 4 },
  { id: 4, name: "CB・右", positionCategory: "DF", teamName: "サンプルFC", shirtNumber: 5 },
  { id: 5, name: "右SB", positionCategory: "DF", teamName: "サンプルFC", shirtNumber: 3 },
  { id: 6, name: "ボランチ左", positionCategory: "MF", teamName: "サンプルFC", shirtNumber: 6 },
  { id: 7, name: "ボランチ右", positionCategory: "MF", teamName: "サンプルFC", shirtNumber: 8 },
  { id: 8, name: "トップ下", positionCategory: "MF", teamName: "サンプルFC", shirtNumber: 10 },
  { id: 9, name: "左ウィング", positionCategory: "FW", teamName: "サンプルFC", shirtNumber: 11 },
  { id: 10, name: "センターフォワード", positionCategory: "FW", teamName: "サンプルFC", shirtNumber: 9 },
  { id: 11, name: "右ウィング", positionCategory: "FW", teamName: "サンプルFC", shirtNumber: 7 },
  { id: 12, name: "控えGK", positionCategory: "GK", teamName: "サンプルFC", shirtNumber: 13 },
  { id: 13, name: "控えDF", positionCategory: "DF", teamName: "サンプルFC", shirtNumber: 14 },
  { id: 14, name: "控えMF", positionCategory: "MF", teamName: "サンプルFC", shirtNumber: 15 },
  { id: 15, name: "控えFW", positionCategory: "FW", teamName: "サンプルFC", shirtNumber: 17 },
];
