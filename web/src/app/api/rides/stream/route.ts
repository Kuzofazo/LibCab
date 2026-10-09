import { NextResponse } from "next/server";
import { rideStreamManager, RideEventPayload } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const rideId = searchParams.get("rideId");

    const encoder = new TextEncoder();

    const customReadable = new ReadableStream({
        start(controller) {
            // Send initial ping connection established message
            const initMsg = `data: ${JSON.stringify({ type: "CONNECTED", timestamp: new Date().toISOString() })}\n\n`;
            controller.enqueue(encoder.encode(initMsg));

            const listener = (event: RideEventPayload) => {
                try {
                    const data = `data: ${JSON.stringify(event)}\n\n`;
                    controller.enqueue(encoder.encode(data));
                } catch (err) {
                    console.error("Error streaming SSE event:", err);
                }
            };

            let unsubscribe: () => void;
            if (rideId) {
                unsubscribe = rideStreamManager.subscribeToRide(rideId, listener);
            } else {
                unsubscribe = rideStreamManager.subscribeAll(listener);
            }

            // Keep-alive heartbeat interval every 25 seconds
            const heartbeat = setInterval(() => {
                try {
                    const ping = `: heartbeat ${new Date().toISOString()}\n\n`;
                    controller.enqueue(encoder.encode(ping));
                } catch {
                    clearInterval(heartbeat);
                }
            }, 25000);

            req.signal.addEventListener("abort", () => {
                clearInterval(heartbeat);
                if (unsubscribe) unsubscribe();
                controller.close();
            });
        },
    });

    return new NextResponse(customReadable, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
