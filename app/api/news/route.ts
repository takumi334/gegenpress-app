
import { NextResponse } from "next/server";
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  return NextResponse.json({
    items: [
      { title: `${q} latest match report`, link: "https://www.bbc.com/sport" },
      { title: `${q} transfer news roundup`, link: "https://www.goal.com" },
    ],
  });
}
