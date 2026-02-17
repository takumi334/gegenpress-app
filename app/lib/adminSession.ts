import crypto from "crypto";

const COOKIE_NAME = "gp_admin";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7日

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET is missing");
  return s;
}

export function makeAdminCookieValue() {
  const payload = JSON.stringify({ v: 1, exp: Date.now() + MAX_AGE_SEC * 1000 });
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return Buffer.from(payload).toString("base64url") + "." + sig;
}

export function verifyAdminCookieValue(value?: string | null): boolean {
  if (!value) return false;
  const [b64, sig] = value.split(".");
  if (!b64 || !sig) return false;

  const payload = Buffer.from(b64, "base64url").toString("utf8");
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("hex");

  // timing-safe compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;

  try {
    const obj = JSON.parse(payload);
    return typeof obj?.exp === "number" && Date.now() < obj.exp;
  } catch {
    return false;
  }
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_COOKIE_MAX_AGE = MAX_AGE_SEC;
