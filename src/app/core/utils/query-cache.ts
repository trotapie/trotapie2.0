/** In-flight deduplication and short-lived, memory-only caching. */
export class QueryCache {
  private entries = new Map<string, { promise: Promise<unknown>; expires: number }>();
  private generation = 0;
  async get<T>(key: string, load: () => Promise<T>, ttl = 60_000): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && hit.expires > Date.now()) return hit.promise as Promise<T>;
    const generation = this.generation;
    const entry = { promise: Promise.resolve().then(load) as Promise<unknown>, expires: Infinity };
    this.entries.set(key, entry);
    entry.promise.then(() => {
      if (this.generation === generation && this.entries.get(key) === entry) entry.expires = Date.now() + ttl;
    }, () => { if (this.entries.get(key) === entry) this.entries.delete(key); });
    return entry.promise as Promise<T>;
  }
  invalidate(prefix = '') { for (const key of this.entries.keys()) if (key.startsWith(prefix)) this.entries.delete(key); }
  clear() { this.generation++; this.entries.clear(); }
}
