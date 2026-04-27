import "server-only";
import type { NextRequest } from "next/server";
import { FIXED_ADMIN_PASSCODE } from "@/lib/adminPasscode";

export function requireAdminApiKey(req: NextRequest): void {
  const got = (req.headers.get("x-admin-key") ?? "").trim();
  const expected = FIXED_ADMIN_PASSCODE;
  if (!got) throw new Error("UNAUTHORIZED");
  if (got !== expected) throw new Error("UNAUTHORIZED");
}
