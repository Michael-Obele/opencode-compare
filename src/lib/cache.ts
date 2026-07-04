/** In-memory TTL cache for model data. No DB, no static JSON. */

interface CacheEntry<T> {
	data: T;
	/** Unix timestamp when this entry was created */
	createdAt: number;
	/** TTL in milliseconds */
	ttl: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get from cache if fresh. Returns { data, stale } — stale=true means it's past TTL
 * but still usable for stale-while-revalidate.
 */
export function cacheGet<T>(key: string): { data: T; stale: boolean } | null {
	const entry = cache.get(key) as CacheEntry<T> | undefined;
	if (!entry) return null;
	const age = Date.now() - entry.createdAt;
	const stale = age > entry.ttl;
	return { data: entry.data, stale };
}

/** Store in cache with a TTL in milliseconds. */
export function cacheSet<T>(key: string, data: T, ttl: number): void {
	cache.set(key, { data, createdAt: Date.now(), ttl });
}

/** Clear a specific cache key. */
export function cacheDelete(key: string): void {
	cache.delete(key);
}

/** Invalidate all cached data. */
export function cacheClear(): void {
	cache.clear();
}

/** Default TTL for model data: 6 hours. */
export const MODELS_TTL = 6 * 60 * 60 * 1000;
