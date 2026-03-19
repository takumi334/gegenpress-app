/**
 * 戦術ボード用の仮選手データ
 * 名前のみ配置でOK。将来的に試合スレ連携で実選手に差し替え。
 */

export type TacticsPlayer = {
  id: string;
  name: string;
  teamName?: string | null;
};

export const TACTICS_MOCK_PLAYERS: TacticsPlayer[] = [
  { id: "p1", name: "GK", teamName: "ホーム" },
  { id: "p2", name: "LB", teamName: "ホーム" },
  { id: "p3", name: "CB1", teamName: "ホーム" },
  { id: "p4", name: "CB2", teamName: "ホーム" },
  { id: "p5", name: "RB", teamName: "ホーム" },
  { id: "p6", name: "CM1", teamName: "ホーム" },
  { id: "p7", name: "CM2", teamName: "ホーム" },
  { id: "p8", name: "CM3", teamName: "ホーム" },
  { id: "p9", name: "LW", teamName: "ホーム" },
  { id: "p10", name: "ST", teamName: "ホーム" },
  { id: "p11", name: "RW", teamName: "ホーム" },
  { id: "p12", name: "控え1", teamName: "ホーム" },
  { id: "p13", name: "控え2", teamName: "ホーム" },
  { id: "p14", name: "控え3", teamName: "ホーム" },
  { id: "p15", name: "控え4", teamName: "ホーム" },
];
