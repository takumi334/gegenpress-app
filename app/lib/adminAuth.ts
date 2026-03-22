import "server-only";
import { cookies } from "next/headers";
import { verifyAdminCookieValue } from "@/lib/adminSession";

const COOKIE_NAME = "admin_key";


/**
 * Server Component / Server Action 用
 */
export async function requireAdmin() {
  const c = await cookies(); // Nextの型に合わせて await
  const v = c.get(COOKIE_NAME)?.value ?? "";
  if (!verifyAdminCookieValue(v)) throw new Error("UNAUTHORIZED");
}

/**
 * Route Handler 用（Request から cookie ヘッダを拾う）
 */
export function requireAdminFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));

  let v = "";
  if (m?.[1]) {
    try {
      v = decodeURIComponent(m[1]);
    } catch {
      v = m[1];
    }
  }

  if (!verifyAdminCookieValue(v)) throw new Error("UNAUTHORIZED");
}

