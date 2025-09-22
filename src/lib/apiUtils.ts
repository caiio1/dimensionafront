// Small helpers to unwrap API responses that may be wrapped in { data: ... }
export function unwrapData<T>(r: unknown): T | undefined {
  if (r === undefined || r === null) return undefined;
  if (Array.isArray(r)) return r as unknown as T;
  if (typeof r === "object") {
    const rec = r as Record<string, unknown>;
    if ("data" in rec) return rec.data as T;
  }
  return r as T;
}

export function normalizeList<T>(r: unknown): T[] {
  if (!r) return [];
  if (Array.isArray(r)) return r as T[];
  if (typeof r === "object") {
    const rec = r as Record<string, unknown>;
    const d = rec.data;
    if (Array.isArray(d)) return d as T[];
  }
  return [];
}
