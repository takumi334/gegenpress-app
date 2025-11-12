// app/api/shape/route.ts
import { NextRequest } from "next/server";
import { buildRadar, type TacticKind } from "@/lib/predict";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const home = Number(searchParams.get("home"));
  const away = Number(searchParams.get("away"));
  const kind = (searchParams.get("kind") as TacticKind) || "gd";

  if (!home || !away) {
    return new Response(JSON.stringify({ error: "invalid params" }), { status: 400 });
  }
  try {
    const data = await buildRadar(home, away, kind);
    return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500 });
  }
}

