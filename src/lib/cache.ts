type CacheItem<T> = {
    data: T;
    timestamp: number;
};

const cache = new Map<string, CacheItem<any>>();

/**
 * Get highly optimized server-side cache
 * @param key Unique key for the cache
 * @param fetcher Async function to fetch data if cache is missing or expired
 * @param ttl Time to live in milliseconds (default 5 minutes)
 */
export async function getWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 5 * 60 * 1000
): Promise<T> {
    const cached = cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp < ttl)) {
        console.log(`[Cache] HIT: ${key}`);
        return cached.data;
    }

    console.log(`[Cache] MISS: ${key}`);
    const data = await fetcher();

    // Only cache if data is valid (not null/undefined/empty)
    if (data !== null && data !== undefined) {
        cache.set(key, { data, timestamp: now });
    }

    return data;
}

export function clearCache(key?: string) {
    if (key) {
        cache.delete(key);
    } else {
        cache.clear();
    }
}
