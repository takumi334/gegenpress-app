import "server-only";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const FALLBACK_ADMIN_EMAIL = "example@gmail.com";

function getAllowedAdminEmails(): Set<string> {
  const raw = (process.env.ADMIN_ALLOWED_EMAILS ?? process.env.ADMIN_EMAIL ?? FALLBACK_ADMIN_EMAIL).trim();
  return new Set(
    raw
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowedAdminEmails().has(email.trim().toLowerCase());
}

export async function requireAdminUserEmail(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.email) throw new Error("UNAUTHORIZED");

  const email = user.email.trim().toLowerCase();
  if (!isAllowedAdminEmail(email)) {
    throw new Error("FORBIDDEN");
  }
  return email;
}
