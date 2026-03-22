import { createHmac, timingSafeEqual } from "node:crypto";

const VERSION = 1;
const DEFAULT_TTL_SEC = 7 * 24 * 3600; // 7 日

export type AdminDeleteType = "thread" | "post";

export type AdminDeletePayload = {
  v: typeof VERSION;
  reportId: number;
  targetId: number;
  type: AdminDeleteType;
  exp: number; // unix seconds
};

function getSecret(): string {
  const s = (process.env.ADMIN_DELETE_SECRET ?? "").trim();
  if (!s || s.length < 16) {
    throw new Error("ADMIN_DELETE_SECRET_MISSING_OR_SHORT");
  }
  return s;
}

function signPayloadB64(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

/**
 * メール用の署名付き削除トークン（推測不能・期限付き）
 */
export function createAdminDeleteToken(
  input: {
    reportId: number;
    targetId: number;
    type: AdminDeleteType;
    ttlSeconds?: number;
  },
  nowSec = Math.floor(Date.now() / 1000)
): string {
  const secret = getSecret();
  const ttl = input.ttlSeconds ?? DEFAULT_TTL_SEC;
  const payload: AdminDeletePayload = {
    v: VERSION,
    reportId: input.reportId,
    targetId: input.targetId,
    type: input.type,
    exp: nowSec + ttl,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = signPayloadB64(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export function verifyAdminDeleteToken(
  token: string,
  nowSec = Math.floor(Date.now() / 1000)
): AdminDeletePayload | null {
  const secret = (process.env.ADMIN_DELETE_SECRET ?? "").trim();
  if (!secret || secret.length < 16) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;

  const expected = signPayloadB64(payloadB64, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as AdminDeletePayload).v !== VERSION
  ) {
    return null;
  }

  const p = parsed as AdminDeletePayload;
  if (
    typeof p.reportId !== "number" ||
    typeof p.targetId !== "number" ||
    (p.type !== "thread" && p.type !== "post") ||
    typeof p.exp !== "number"
  ) {
    return null;
  }

  if (p.exp < nowSec) return null;

  return p;
}
