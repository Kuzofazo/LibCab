import AsyncStorage from "@react-native-async-storage/async-storage";

export interface QueuedRequest {
    id: string;
    url: string;
    method: "POST" | "PATCH" | "PUT" | "DELETE";
    headers?: Record<string, string>;
    body?: any;
    timestamp: number;
}

const QUEUE_KEY = "libcab_offline_request_queue";

export class OfflineQueueManager {
    public static async enqueue(req: Omit<QueuedRequest, "id" | "timestamp">): Promise<void> {
        try {
            const currentQueue = await this.getQueue();
            const newItem: QueuedRequest = {
                ...req,
                id: Math.random().toString(36).substring(2, 9),
                timestamp: Date.now(),
            };
            currentQueue.push(newItem);
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(currentQueue));
        } catch (e) {
            console.error("Failed to enqueue offline request", e);
        }
    }

    public static async getQueue(): Promise<QueuedRequest[]> {
        try {
            const data = await AsyncStorage.getItem(QUEUE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    public static async clearQueue(): Promise<void> {
        try {
            await AsyncStorage.removeItem(QUEUE_KEY);
        } catch (e) {
            console.error("Failed to clear offline queue", e);
        }
    }

    public static async processQueue(fetchFn: (url: string, init?: RequestInit) => Promise<Response>): Promise<number> {
        const queue = await this.getQueue();
        if (queue.length === 0) return 0;

        let processedCount = 0;
        const remaining: QueuedRequest[] = [];

        for (const item of queue) {
            try {
                const res = await fetchFn(item.url, {
                    method: item.method,
                    headers: item.headers,
                    body: item.body ? JSON.stringify(item.body) : undefined,
                });
                if (res.ok) {
                    processedCount++;
                } else {
                    remaining.push(item);
                }
            } catch (e) {
                remaining.push(item);
            }
        }

        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
        return processedCount;
    }
}
