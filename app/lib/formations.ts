/**
 * フォーメーション定義（ピッチ上のポジション座標）
 * x, y は 0〜100 の割合（ピッチ幅・高さに対する）。左上が (0,0)、右下が (100,100)。
 */

export type Slot = {
  code: string;
  label: string;
  x: number;
  y: number;
};

export type FormationId = "4-3-3" | "4-4-2" | "3-5-2" | "3-2-4-1";

export type FormationDef = {
  id: FormationId;
  name: string;
  slots: Slot[];
};

const FORMATIONS: FormationDef[] = [
  {
    id: "4-3-3",
    name: "4-3-3",
    slots: [
      { code: "GK", label: "GK", x: 50, y: 92 },
      { code: "LB", label: "LB", x: 15, y: 72 },
      { code: "CB1", label: "CB", x: 35, y: 78 },
      { code: "CB2", label: "CB", x: 65, y: 78 },
      { code: "RB", label: "RB", x: 85, y: 72 },
      { code: "CM1", label: "CM", x: 25, y: 52 },
      { code: "CM2", label: "CM", x: 50, y: 55 },
      { code: "CM3", label: "CM", x: 75, y: 52 },
      { code: "LW", label: "LW", x: 18, y: 18 },
      { code: "ST", label: "ST", x: 50, y: 12 },
      { code: "RW", label: "RW", x: 82, y: 18 },
    ],
  },
  {
    id: "4-4-2",
    name: "4-4-2",
    slots: [
      { code: "GK", label: "GK", x: 50, y: 92 },
      { code: "LB", label: "LB", x: 15, y: 72 },
      { code: "CB1", label: "CB", x: 35, y: 78 },
      { code: "CB2", label: "CB", x: 65, y: 78 },
      { code: "RB", label: "RB", x: 85, y: 72 },
      { code: "LM", label: "LM", x: 20, y: 48 },
      { code: "CM1", label: "CM", x: 42, y: 52 },
      { code: "CM2", label: "CM", x: 58, y: 52 },
      { code: "RM", label: "RM", x: 80, y: 48 },
      { code: "ST1", label: "ST", x: 38, y: 14 },
      { code: "ST2", label: "ST", x: 62, y: 14 },
    ],
  },
  {
    id: "3-5-2",
    name: "3-5-2",
    slots: [
      { code: "GK", label: "GK", x: 50, y: 92 },
      { code: "CB1", label: "CB", x: 25, y: 78 },
      { code: "CB2", label: "CB", x: 50, y: 80 },
      { code: "CB3", label: "CB", x: 75, y: 78 },
      { code: "LWB", label: "LWB", x: 12, y: 58 },
      { code: "CM1", label: "CM", x: 30, y: 52 },
      { code: "CM2", label: "CM", x: 50, y: 54 },
      { code: "CM3", label: "CM", x: 70, y: 52 },
      { code: "RWB", label: "RWB", x: 88, y: 58 },
      { code: "ST1", label: "ST", x: 38, y: 14 },
      { code: "ST2", label: "ST", x: 62, y: 14 },
    ],
  },
  {
    id: "3-2-4-1",
    name: "3-2-4-1",
    slots: [
      { code: "GK", label: "GK", x: 50, y: 92 },
      { code: "CB1", label: "CB", x: 26, y: 78 },
      { code: "CB2", label: "CB", x: 50, y: 80 },
      { code: "CB3", label: "CB", x: 74, y: 78 },
      { code: "DM1", label: "DM", x: 40, y: 62 },
      { code: "DM2", label: "DM", x: 60, y: 62 },
      { code: "LW", label: "LW", x: 16, y: 40 },
      { code: "AM1", label: "AM", x: 40, y: 38 },
      { code: "AM2", label: "AM", x: 60, y: 38 },
      { code: "RW", label: "RW", x: 84, y: 40 },
      { code: "ST", label: "ST", x: 50, y: 16 },
    ],
  },
];

export function getFormation(id: FormationId): FormationDef {
  const f = FORMATIONS.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown formation: ${id}`);
  return f;
}

export function getAllFormations(): FormationDef[] {
  return [...FORMATIONS];
}

export function getFormationIds(): FormationId[] {
  return FORMATIONS.map((f) => f.id);
}
