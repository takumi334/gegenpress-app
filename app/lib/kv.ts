// app/lib/kv.ts
// SSR側だけで使うメモリKV（開発用）。プロセス生存中のみ保持。
const mem = new Map<string, string>();

export function kvGet(key: string): string | undefined {
  return mem.get(key);
}

export function kvSet(key: string, value: string): void {
  mem.set(key, value);
}

export function kvDelete(key: string): void {
  mem.delete(key);
}

export function kvClear(): void {
  mem.clear();
}

