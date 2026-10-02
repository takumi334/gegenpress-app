"use client";

import { useRef } from "react";

// Keep the key on errors/retries/double clicks. A changed or cleared draft starts
// a separate submission; identical text from another form/user is NOT deduped.
export function useSubmissionFetch(draft: string) {
  const ref = useRef<{ draft: string; key?: string }>({ draft });
  if (ref.current.draft !== draft) ref.current = { draft };
  const attempt = ref.current;
  return (url: string, init: RequestInit) => {
    attempt.key ??= crypto.randomUUID();
    const headers = new Headers(init.headers);
    headers.set("Idempotency-Key", attempt.key);
    return fetch(url, { ...init, headers });
  };
}
