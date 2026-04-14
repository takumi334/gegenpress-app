import fs from "node:fs";
import path from "node:path";

type LeagueCode = "PL" | "SA" | "BL1" | "FL1" | "PD" | "PPL";

type CheckResult = {
  code: LeagueCode;
  url: string;
  status: number;
  ok: boolean;
  competitionName: string | null;
  standingsCount: number;
  firstStandingTeams: number;
  rateLimitHeaders: Record<string, string>;
  errorBody: string | null;
};

function loadDotEnv(filePath: string) {
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickRateLimitHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (/rate|limit|request|remaining|retry/i.test(key)) {
      out[key] = value;
    }
  });
  return out;
}

function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getErrorBody(body: any, fallbackText: string): string | null {
  if (!body) return fallbackText ? fallbackText.slice(0, 400) : null;
  if (typeof body === "string") return body.slice(0, 400);
  if (typeof body?.message === "string") return body.message.slice(0, 400);
  if (typeof body?.error === "string") return body.error.slice(0, 400);
  return JSON.stringify(body).slice(0, 400);
}

async function checkLeague(baseUrl: string, apiKey: string, code: LeagueCode): Promise<CheckResult> {
  const url = `${baseUrl}/competitions/${code}/standings`;
  try {
    const res = await fetch(url, {
      headers: { "X-Auth-Token": apiKey },
    });
    const rawText = await res.text();
    const body = safeJsonParse(rawText);
    const standings = Array.isArray(body?.standings) ? body.standings : [];
    const firstTeams = Array.isArray(standings?.[0]?.table) ? standings[0].table.length : 0;
    return {
      code,
      url,
      status: res.status,
      ok: res.ok,
      competitionName: typeof body?.competition?.name === "string" ? body.competition.name : null,
      standingsCount: standings.length,
      firstStandingTeams: firstTeams,
      rateLimitHeaders: pickRateLimitHeaders(res.headers),
      errorBody: res.ok ? null : getErrorBody(body, rawText),
    };
  } catch (error) {
    return {
      code,
      url,
      status: 0,
      ok: false,
      competitionName: null,
      standingsCount: 0,
      firstStandingTeams: 0,
      rateLimitHeaders: {},
      errorBody: String(error),
    };
  }
}

async function main() {
  const root = process.cwd();
  loadDotEnv(path.join(root, ".env.local"));
  loadDotEnv(path.join(root, ".env"));

  const apiKey = process.env.FOOTBALL_DATA_API_KEY ?? "";
  const baseUrl = process.env.FD_BASE ?? "https://api.football-data.org/v4";
  const targets: LeagueCode[] = ["PL", "SA", "BL1", "FL1", "PD", "PPL"];

  if (!apiKey) {
    console.error("FOOTBALL_DATA_API_KEY is missing (.env.local or .env)");
    process.exit(1);
  }

  console.log(`Checking ${targets.length} leagues against ${baseUrl}`);
  console.log("----");

  const results: CheckResult[] = [];
  for (const code of targets) {
    const r = await checkLeague(baseUrl, apiKey, code);
    results.push(r);

    const rateLimit = Object.keys(r.rateLimitHeaders).length
      ? Object.entries(r.rateLimitHeaders)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")
      : "-";
    const errorText = r.errorBody ? ` error=${r.errorBody}` : "";
    console.log(
      `[${r.code}] status=${r.status} ok=${r.ok} competition=${r.competitionName ?? "-"} standings=${r.standingsCount} teams=${r.firstStandingTeams}${errorText}`
    );
    console.log(`  url=${r.url}`);
    console.log(`  rateLimitHeaders=${rateLimit}`);

    await sleep(1500);
  }

  console.log("\n=== Table ===");
  console.table(
    results.map((r) => ({
      league: r.code,
      status: r.status,
      ok: r.ok,
      competition: r.competitionName ?? "-",
      standings: r.standingsCount,
      teams: r.firstStandingTeams,
      error: r.errorBody ?? "",
    }))
  );

  const success = results.filter((r) => r.ok && r.standingsCount > 0);
  const fail = results.filter((r) => !r.ok || r.standingsCount === 0);
  const maybeCodeIssue = fail.filter(
    (r) =>
      r.status === 400 ||
      /invalid|not found|unknown|malformed/i.test(r.errorBody ?? "")
  );
  const maybePlanLimit = fail.filter(
    (r) => r.status === 403 || r.status === 429 || /limit|plan|quota/i.test(r.errorBody ?? "")
  );

  console.log("\n=== Summary ===");
  console.log(`Returned leagues: ${success.map((r) => r.code).join(", ") || "(none)"}`);
  console.log(`Not returned leagues: ${fail.map((r) => r.code).join(", ") || "(none)"}`);
  console.log(`Possible code mismatch: ${maybeCodeIssue.map((r) => r.code).join(", ") || "(none)"}`);
  console.log(`Possible free-plan/rate-limit: ${maybePlanLimit.map((r) => r.code).join(", ") || "(none)"}`);
}

main().catch((e) => {
  console.error("Unexpected failure:", e);
  process.exit(1);
});

