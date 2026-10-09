interface CacheItem<T> {
    data: T;
    expiry: number;
}

class MemoryCache {
    private static instance: MemoryCache;
    private store: Map<string, CacheItem<any>> = new Map();

    private constructor() {}

    public static getInstance(): MemoryCache {
        if (!MemoryCache.instance) {
            MemoryCache.instance = new MemoryCache();
        }
        return MemoryCache.instance;
    }

    public get<T>(key: string): T | null {
        const item = this.store.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
            this.store.delete(key);
            return null;
        }
        return item.data as T;
    }

    public set<T>(key: string, data: T, ttlSeconds: number = 300): void {
        this.store.set(key, {
            data,
            expiry: Date.now() + ttlSeconds * 1000,
        });
    }

    public invalidate(key: string): void {
        this.store.delete(key);
    }

    public clear(): void {
        this.store.clear();
    }
}

export const memoryCache = MemoryCache.getInstance();
