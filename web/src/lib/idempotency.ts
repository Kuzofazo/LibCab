interface CachedResponse {
    status: number;
    body: any;
    createdAt: number;
}

class IdempotencyStore {
    private static instance: IdempotencyStore;
    private cache: Map<string, CachedResponse> = new Map();
    private ttlMs: number = 24 * 60 * 60 * 1000; // 24 Hours

    private constructor() {
        // Cleanup expired keys periodically
        setInterval(() => this.cleanup(), 60 * 60 * 1000);
    }

    public static getInstance(): IdempotencyStore {
        if (!IdempotencyStore.instance) {
            IdempotencyStore.instance = new IdempotencyStore();
        }
        return IdempotencyStore.instance;
    }

    public get(key: string): CachedResponse | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.createdAt > this.ttlMs) {
            this.cache.delete(key);
            return null;
        }
        return entry;
    }

    public set(key: string, status: number, body: any) {
        this.cache.set(key, {
            status,
            body,
            createdAt: Date.now(),
        });
    }

    private cleanup() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.createdAt > this.ttlMs) {
                this.cache.delete(key);
            }
        }
    }
}

export const idempotencyStore = IdempotencyStore.getInstance();
