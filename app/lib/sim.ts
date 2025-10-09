// app/lib/sim.ts
import { fdGet } from "./fd";

// 鬨ｾ・ｶ繝ｻ・ｴ鬮ｴ鮃ｹ・ｮ・ｮ鬮ｫ・ｧ繝ｻ・ｦ髯ｷ・ｷ陋ｹ・ｻ・ゑｽｰ驛｢・ｧ騾包ｽｻ陋ｻ・､髯橸ｽｳ闔・･鬲假ｽｨ驛｢・ｧ陷ｻ驛・・ｳ髯橸ｽｳ郢晢ｽｻ
export async function estimateStrength(teamId: number, sample = 10) {
  const qs = `status=FINISHED&limit=${sample}`;
  const data = await fdGet<{ matches: any[] }>(`/teams/${teamId}/matches?${qs}`);

  if (!data.matches || data.matches.length === 0) {
    // 驛｢譏ｴ繝ｻ郢晢ｽｻ驛｢・ｧ繝ｻ・ｿ驍ｵ・ｺ隶吝ｯゆｼｯ驍ｵ・ｺ郢晢ｽｻ遶雁､・ｸ・ｺ鬮ｦ・ｪ郢晢ｽｻ髯晢ｽｷ繝ｻ・ｳ髯懶ｽｮ郢晢ｽｻ.2髯滓・・､・ｼ邵ｺ繝ｻ1.2髯樊ｻゑｽｽ・ｱ髴難ｽ､繝ｻ・ｹ驍ｵ・ｺ闕ｳ螂・ｽｽ閾･・ｸ・ｺ郢晢ｽｻ邵ｲ螳壼初繝ｻ・ｭ鬩包ｽｶ陋ｹ・ｺ隴ｯ・ｶ驍ｵ・ｺ郢晢ｽｻ
    return { att: 1.2, def: 1.2 };
  }

  let gf = 0; // goals for
  let ga = 0; // goals against
  for (const m of data.matches) {
    const isHome = m.homeTeam.id === teamId;
    const f = isHome ? m.score.fullTime.home : m.score.fullTime.away;
    const a = isHome ? m.score.fullTime.away : m.score.fullTime.home;
    if (typeof f === "number") gf += f;
    if (typeof a === "number") ga += a;
  }
  const n = data.matches.length || 1;
  // 髫ｰ・ｾ繝ｻ・ｻ髫ｰ・ｦ郢晢ｽｻ鬲假ｽｨ=髯晢ｽｷ繝ｻ・ｳ髯懶ｽｮ郢晢ｽｻ繝ｻ・ｾ驕会ｽｼ邵ｺ蟶ｷ・ｸ・ｲ遶乗劼・ｽ・ｮ闔・･繝ｻ蜻ｵ・ｰ謇假ｽｽ・ｱ驍ｵ・ｺ郢晢ｽｻ髯晢ｽｷ繝ｻ・ｳ髯懶ｽｮ郢晢ｽｻ繝ｻ・､繝ｻ・ｱ髴難ｽ､繝ｻ・ｹ郢晢ｽｻ闔・･繝ｻ・ｰ闕ｳ螂・ｽｼ繝ｻ・ｸ・ｺ郢晢ｽｻ遶薙・・ｸ・ｺ繝ｻ・ｩ髯滓汚・ｽ・ｷ驍ｵ・ｺ郢晢ｽｻ繝ｻ・ｼ郢晢ｽｻ
  return { att: gf / n, def: Math.max(ga / n, 0.1) };
}

// Poisson 繝ｻ雜｣・ｽ・ｻ驛｢・ｧ陷代・・ｽ・ｽ隲帛･・ｽｽ荵昴・髢ｧ・ｲ陟咲霜・ｬ繝ｻ蜚ｱ繝ｻ・ｮ闔・･繝ｻ蜥擾ｽｸ・ｺ繝ｻ・ｨ驍ｵ・ｺ繝ｻ・ｮ鬨ｾ・ｶ繝ｻ・ｸ髫ｲ・､繝ｻ・ｧ驛｢・ｧ郢ｧ繝ｻ・ｽ・ｰ闔会ｽ｣繝ｻ・ｰ鬮ｫ遨ゑｽｹ譎｢・ｽ荵昴・郢晢ｽｻ
function lambda(att: number, oppDef: number) {
  // 1.0 驛｢・ｧ陷代・・ｽ・ｸ繝ｻ・ｭ鬩包ｽｶ陷ｿ・･・つ繝ｻ・､驍ｵ・ｺ繝ｻ・ｫ驍ｵ・ｺ陷会ｽｱ遯ｶ・ｻ驍ｵ・ｲ郢晢ｽｻ驍・・諱・・・ｰ驍ｵ・ｺ繝ｻ・ｫ髫ｴ莨夲ｽｽ・ｴ驛｢・ｧ陟募ｨｯ繝ｻ驍ｵ・ｺ郢晢ｽｻ繝ｻ閧ｲ・ｸ・ｺ郢晢ｽｻ遶企豪・ｹ譎・§・取ｨ抵ｽｹ譎｢・ｽ・ｳ驛｢譏ｴ繝ｻ
  return Math.max(0.05, 0.7 * att + 0.3 * (1.2 / oppDef));
}

// 髯ｷ髮・・｡陋ｹ・ｱ鬮ｫ・ｧ繝ｻ・ｦ髯ｷ・ｷ陋ｹ・ｻ邵ｺ蟶ｷ・ｹ・ｧ繝ｻ・ｳ驛｢・ｧ繝ｻ・｢驛｢・ｧ陋幢ｽｵ邵ｺ遉ｼ・ｹ譎｢・ｽ・ｳ驛｢譎丞ｹｲ・弱・
function samplePoisson(mean: number) {
  // Knuth 髮手ｼ斐・
  const L = Math.exp(-mean);
  let p = 1.0, k = 0;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

export async function simulateMatch(homeId: number, awayId: number, sims = 2000) {
  const [h, a] = await Promise.all([
    estimateStrength(homeId),
    estimateStrength(awayId),
  ]);

  const lamH = lambda(h.att, a.def) * 1.10; // 驛｢譎擾ｽｸ蜷ｶ繝ｻ驛｢譎｢・｣・ｰ鬮ｯ・ｬ隲幄肩・ｽ・ｭ繝ｻ・｣
  const lamA = lambda(a.att, h.def) * 0.95; // 驛｢・ｧ繝ｻ・｢驛｢・ｧ繝ｻ・ｦ驛｢・ｧ繝ｻ・ｧ驛｢・ｧ繝ｻ・､鬮ｯ・ｬ隲幄肩・ｽ・ｭ繝ｻ・｣

  let hw = 0, dr = 0, aw = 0;
  const scoreMap = new Map<string, number>();

  for (let i = 0; i < sims; i++) {
    const gh = samplePoisson(lamH);
    const ga = samplePoisson(lamA);
    if (gh > ga) hw++; else if (gh === ga) dr++; else aw++;
    const key = `${gh}-${ga}`;
    scoreMap.set(key, (scoreMap.get(key) || 0) + 1);
  }

  const favScores = [...scoreMap.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 3)
    .map(([k, v]) => ({ score: k, p: v / sims }));

  return {
    lambdaHome: lamH, lambdaAway: lamA,
    homeWin: hw / sims,
    draw: dr / sims,
    awayWin: aw / sims,
    topScores: favScores,
    samples: sims,
  };
}
