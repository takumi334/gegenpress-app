// app/api/test/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const url = "https://api.football-data.org/v4/competitions";
  try {
    const res = await fetch(url, {
      headers: {
        "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY ?? "",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `${res.status} ${res.statusText}`, detail: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data); // ← これで competitions 一覧が出ればOK
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

