import fs from "node:fs";
import path from "node:path";

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^"(.*)"$/, "$1");
    if (!(k in process.env)) process.env[k] = v;
  }
}

const root = process.cwd();
loadDotEnv(path.join(root, ".env.local"));
loadDotEnv(path.join(root, ".env"));

const FD_BASE = process.env.FD_BASE ?? "https://api.football-data.org/v4";
const FD_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";
const APISPORTS_HOST = process.env.APISPORTS_HOST ?? "";
const APISPORTS_KEY = process.env.APISPORTS_KEY ?? "";

const TARGET = ["PL", "PD", "SA", "BL1", "FL1", "DED", "PPL"];
const COMPETITIONS = {
  PL: 2021,
  PD: 2014,
  SA: 2019,
  BL1: 2002,
  FL1: 2015,
  DED: 2003,
  PPL: 2017,
};
const APISPORTS_LEAGUE_ID = {
  PL: "39",
  PD: "140",
  SA: "135",
  BL1: "78",
  FL1: "61",
  DED: "88",
  PPL: "94",
};
const APISPORTS_SEASON = "2024";
const FD_SEASON = "2024";

async function getJson(url, init = {}) {
  try {
    const res = await fetch(url, init);
    const contentType = res.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await res.json()
      : await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: String(e?.message ?? e) };
  }
}

function summarizeFdStandings(body) {
  const standings = Array.isArray(body?.standings) ? body.standings : [];
  const total = standings.find((s) => s?.type === "TOTAL");
  const table = Array.isArray(total?.table) ? total.table : [];
  const visible = table.filter((r) => r?.team?.id && r?.team?.name).length;
  return {
    tableLen: table.length,
    visibleLen: visible,
    hasCompetition: Boolean(body?.competition?.name),
    shapeOk: standings.length > 0,
  };
}

function summarizeFdFixtures(body) {
  const matches = Array.isArray(body?.matches) ? body.matches : [];
  const visible = matches.filter((m) => m?.homeTeam?.name && m?.awayTeam?.name).length;
  return { len: matches.length, visibleLen: visible, shapeOk: Array.isArray(body?.matches) };
}

function summarizeFdTeams(body) {
  const teams = Array.isArray(body?.teams) ? body.teams : [];
  const visible = teams.filter((t) => t?.id && t?.name).length;
  return { len: teams.length, visibleLen: visible, shapeOk: Array.isArray(body?.teams) };
}

function summarizeApiSportsStandings(body) {
  const response = Array.isArray(body?.response) ? body.response : [];
  const table = Array.isArray(response?.[0]?.league?.standings?.[0])
    ? response[0].league.standings[0]
    : [];
  return { len: table.length, shapeOk: table.length > 0 };
}

function summarizeApiSportsFixtures(body) {
  const response = Array.isArray(body?.response) ? body.response : [];
  return { len: response.length, shapeOk: Array.isArray(body?.response) };
}

function summarizeApiSportsTeams(body) {
  const response = Array.isArray(body?.response) ? body.response : [];
  return { len: response.length, shapeOk: Array.isArray(body?.response) };
}

const results = [];
for (const code of TARGET) {
  const competitionId = COMPETITIONS[code];
  const apiLeague = APISPORTS_LEAGUE_ID[code];

  const fdStandings = await getJson(`${FD_BASE}/competitions/${competitionId}/standings?season=${FD_SEASON}`, {
    headers: { "X-Auth-Token": FD_KEY },
  });
  const fdFixtures = await getJson(`${FD_BASE}/competitions/${competitionId}/matches?status=SCHEDULED&limit=8`, {
    headers: { "X-Auth-Token": FD_KEY },
  });
  const fdTeams = await getJson(`${FD_BASE}/competitions/${competitionId}/teams`, {
    headers: { "X-Auth-Token": FD_KEY },
  });

  const fdSummary = {
    standings: fdStandings.ok ? summarizeFdStandings(fdStandings.body) : null,
    fixtures: fdFixtures.ok ? summarizeFdFixtures(fdFixtures.body) : null,
    teams: fdTeams.ok ? summarizeFdTeams(fdTeams.body) : null,
  };
  const hasFdData =
    (fdSummary.standings?.tableLen ?? 0) > 0 ||
    (fdSummary.fixtures?.len ?? 0) > 0 ||
    (fdSummary.teams?.len ?? 0) > 0;

  let apiSports = null;
  if (!hasFdData && APISPORTS_HOST && APISPORTS_KEY) {
    const s = await getJson(`https://${APISPORTS_HOST}/standings?league=${apiLeague}&season=${APISPORTS_SEASON}`, {
      headers: { "x-apisports-key": APISPORTS_KEY },
    });
    const f = await getJson(`https://${APISPORTS_HOST}/fixtures?league=${apiLeague}&season=${APISPORTS_SEASON}&next=8`, {
      headers: { "x-apisports-key": APISPORTS_KEY },
    });
    const t = await getJson(`https://${APISPORTS_HOST}/teams?league=${apiLeague}&season=${APISPORTS_SEASON}`, {
      headers: { "x-apisports-key": APISPORTS_KEY },
    });
    apiSports = {
      standings: s.ok ? summarizeApiSportsStandings(s.body) : null,
      fixtures: f.ok ? summarizeApiSportsFixtures(f.body) : null,
      teams: t.ok ? summarizeApiSportsTeams(t.body) : null,
      statuses: { s: s.status, f: f.status, t: t.status },
    };
  }

  // Mimic /api/news stub usage in leagues page
  const newsItems = [
    { title: `${code} latest match report`, link: "https://www.bbc.com/sport" },
    { title: `${code} transfer news roundup`, link: "https://www.goal.com" },
  ];

  results.push({
    code,
    competitionId,
    fdSeason: FD_SEASON,
    apiSportsSeason: APISPORTS_SEASON,
    fdStatus: {
      standings: fdStandings.status,
      fixtures: fdFixtures.status,
      teams: fdTeams.status,
    },
    fdSummary,
    usedFallbackApiSports: !hasFdData,
    apiSports,
    news: { len: newsItems.length, ok: newsItems.length > 0 },
  });
}

const outPath = path.join(root, "tmp-leagues-diagnosis.json");
fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
console.log(`Wrote ${outPath}`);
