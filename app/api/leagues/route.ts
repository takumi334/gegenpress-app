import { NextResponse } from "next/server";

const host = process.env.APISPORTS_HOST!;
const key = process.env.APISPORTS_KEY!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "";
  const country = searchParams.get("country") ?? "";

  const url = new URL(`https://${host}/leagues`);
  if (name) url.searchParams.set("name", name);
  if (country) url.searchParams.set("country", country);

  const res = await fetch(url, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });

  const data = await res.json();
  return NextResponse.json(data);
}

