/** Fixed-window per-key counter. Returns true when the call is allowed. */
export function createLimiter(max: number, windowMs: number, now: () => Date) {
  const hits = new Map<string, { windowStart: number; count: number }>();
  return (key: string): boolean => {
    const t = now().getTime();
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (t - v.windowStart >= windowMs) hits.delete(k);
    }
    const cur = hits.get(key);
    if (!cur || t - cur.windowStart >= windowMs) {
      hits.set(key, { windowStart: t, count: 1 });
      return true;
    }
    cur.count++;
    return cur.count <= max;
  };
}
