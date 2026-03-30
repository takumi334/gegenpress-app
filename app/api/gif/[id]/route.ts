import { buildGifResponseById } from "@/lib/server/lineupGif";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return buildGifResponseById(id);
}
