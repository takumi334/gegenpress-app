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
 * debug=true の時だけログを出す
 */
export function requireAdminFromRequest(req: Request, debug = false) {
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

  if (debug) {
    console.log("[admin] cookie header length:", cookieHeader.length);
    console.log("[admin] has gp_admin:", Boolean(m));
    console.log("[admin] gp_admin length:", v.length);
  }

  if (!verifyAdminCookieValue(v)) throw new Error("UNAUTHORIZED");
}

