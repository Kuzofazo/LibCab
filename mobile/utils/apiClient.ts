import AsyncStorage from "@react-native-async-storage/async-storage";
import { OfflineQueueManager } from "./offlineQueue";

// Default API URL (Falls back to local dev or env variable)
const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:3001";

interface ApiOptions extends RequestInit {
    retries?: number;
    backoffMs?: number;
    skipOfflineQueue?: boolean;
}

export async function apiClient(endpoint: string, options: ApiOptions = {}): Promise<Response> {
    const { retries = 2, backoffMs = 1000, skipOfflineQueue = false, ...fetchOptions } = options;

    const fullUrl = endpoint.startsWith("http") ? endpoint : `${DEFAULT_API_URL}${endpoint}`;

    // Get stored auth token
    const token = await AsyncStorage.getItem("token");

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(fetchOptions.headers as Record<string, string>),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // Generate automatic idempotency key for mutation operations
    if (fetchOptions.method && ["POST", "PATCH", "PUT"].includes(fetchOptions.method.toUpperCase())) {
        if (!headers["x-idempotency-key"]) {
            headers["x-idempotency-key"] = `mob_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        }
    }

    let attempt = 0;
    while (attempt <= retries) {
        try {
            const response = await fetch(fullUrl, {
                ...fetchOptions,
                headers,
            });

            if (response.ok || response.status < 500) {
                // Background process queued offline requests on successful connection
                OfflineQueueManager.processQueue((url, init) => fetch(url, init)).catch(() => {});
                return response;
            }

            attempt++;
            if (attempt <= retries) {
                await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1)));
            } else {
                return response;
            }
        } catch (error) {
            attempt++;
            if (attempt > retries) {
                // If offline and request is a mutation, enqueue for background sync
                if (!skipOfflineQueue && fetchOptions.method && ["POST", "PATCH", "PUT"].includes(fetchOptions.method.toUpperCase())) {
                    await OfflineQueueManager.enqueue({
                        url: fullUrl,
                        method: fetchOptions.method.toUpperCase() as any,
                        headers,
                        body: fetchOptions.body ? JSON.parse(fetchOptions.body as string) : undefined,
                    });
                }
                throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1)));
        }
    }

    throw new Error("API request failed after retries");
}
