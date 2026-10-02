import { createHash } from "node:crypto";
import { withPrismaRetry } from "@/lib/prisma";

export class SubmissionError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export function submissionKey(req: { headers: Headers }): string {
  const key = req.headers.get("Idempotency-Key");
  if (!key || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) {
    throw new SubmissionError("Valid Idempotency-Key required; reload the form", 400);
  }
  return key.toLowerCase();
}

// DB uniqueness arbitrates concurrent instances. Retry the lookup too, so a lost
// commit acknowledgement never turns a successful INSERT into a second post.
export async function saveSubmissionOnce<T extends { submissionHash: string | null }>(
  key: string,
  input: unknown,
  find: () => Promise<T | null>,
  create: (metadata: { submissionKey: string; submissionHash: string }) => Promise<T>
): Promise<Omit<T, "submissionHash">> {
  const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const result = (row: T) => {
    if (row.submissionHash !== hash) {
      throw new SubmissionError("Idempotency-Key was already used for another submission", 409);
    }
    const { submissionHash: _hash, ...publicRow } = row;
    void _hash;
    return publicRow;
  };
  return withPrismaRetry("saveSubmissionOnce", async () => {
    const existing = await find();
    if (existing) return result(existing);
    try {
      return result(await create({ submissionKey: key, submissionHash: hash }));
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
        const winner = await find();
        if (winner) return result(winner);
      }
      throw error;
    }
  });
}
