// app/lib/teamIndex.ts
export const teamIndex: Record<string, number> = {
  sanfrecce: 102,   // Sanfrecce Hiroshima の ID
  antlers: 95,      // Kashima Antlers の ID
  frontale: 113,    // Kawasaki Frontale の ID
  // 必要なチームをここに追加
};

export function getTeamIdBySlug(slug: string): number | null {
  return teamIndex[slug] ?? null;
}

