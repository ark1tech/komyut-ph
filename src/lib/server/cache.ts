type CacheEntry<T> = {
	value: T;
	expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_MAX_ENTRIES = 200;
const maxEntries = DEFAULT_MAX_ENTRIES;

function now() {
	return Date.now();
}

function pruneIfNeeded() {
	if (cache.size <= maxEntries) return;
	// Simple LRU: delete the oldest entry (Map preserves insertion order)
	const firstKey = cache.keys().next().value as string | undefined;
	if (firstKey !== undefined) {
		cache.delete(firstKey);
	}
}

export function getCached<T>(key: string): T | null {
	const entry = cache.get(key);
	if (!entry) return null;

	if (entry.expiresAt <= now()) {
		cache.delete(key);
		return null;
	}

	// Refresh LRU order
	cache.delete(key);
	cache.set(key, entry);

	return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
	const expiresAt = now() + ttlMs;
	cache.set(key, { value, expiresAt });
	pruneIfNeeded();
}

export async function getOrSetCached<T>(
	key: string,
	ttlMs: number,
	loader: () => Promise<T>
): Promise<T> {
	const existing = getCached<T>(key);
	if (existing !== null) return existing;

	const value = await loader();
	setCached(key, value, ttlMs);
	return value;
}

export function invalidateCache(keyOrPrefix: string): void {
	if (!keyOrPrefix) return;
	if (cache.has(keyOrPrefix)) {
		cache.delete(keyOrPrefix);
		return;
	}

	for (const key of cache.keys()) {
		if (key.startsWith(keyOrPrefix)) {
			cache.delete(key);
		}
	}
}

