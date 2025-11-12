// app/lib/translate-client.ts
export async function translateText(text: string, target: string) {
  const r = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: [text], target, format: 'text' }),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error('translate failed');
  const data = await r.json();
  return (data?.translations?.[0] as string) ?? text;
}

