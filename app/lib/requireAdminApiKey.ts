import "server-only";
import type { NextRequest } from "next/server";

export function requireAdminApiKey(req: NextRequest): void {
  const got = (req.headers.get("x-admin-key") ?? "").trim();
  const expected = (process.env.ADMIN_KEY ?? "").trim();
  if (!got) throw new Error("UNAUTHORIZED");
  if (!expected) throw new Error("UNAUTHORIZED");
  if (got !== expected) throw new Error("UNAUTHORIZED");
}
