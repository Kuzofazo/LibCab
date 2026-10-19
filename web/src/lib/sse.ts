import { EventEmitter } from "events";

export type RideEventType = 
    | "RIDE_UPDATED" 
    | "LOCATION_UPDATED" 
    | "DRIVER_ASSIGNED" 
    | "RIDE_CREATED" 
    | "RIDE_REQUESTED" 
    | "RIDE_OFFER_RECEIVED"
    | "RIDE_TAKEN"
    | "RIDE_OFFER_EXPIRED"
    | "RIDE_ACCEPTED" 
    | "DRIVER_ARRIVED"
    | "RIDE_STARTED"
    | "DEPOSIT_INITIATED"
    | "DEPOSIT_CONFIRMED"
    | "DEPOSIT_FAILED"
    | "DRIVER_ONLINE" 
    | "DRIVER_OFFLINE"
    | "RIDE_CANCELLED"
    | "WALLET_UPDATED"
    | "DRIVER_APPROVAL_UPDATED"
    | "NEW_DRIVER_SIGNUP"
    | "SOS_ALERT";

export interface RideEventPayload {
    type: RideEventType;
    rideId?: string;
    driverId?: string;
    data: unknown;
    timestamp: string;
}

class RideStreamManager {
    private static instance: RideStreamManager;
    private emitter: EventEmitter;

    private constructor() {
        this.emitter = new EventEmitter();
        // Allow high number of concurrent client streams
        this.emitter.setMaxListeners(500);
    }

    public static getInstance(): RideStreamManager {
        if (!RideStreamManager.instance) {
            RideStreamManager.instance = new RideStreamManager();
        }
        return RideStreamManager.instance;
    }

    public publish(event: RideEventPayload) {
        this.emitter.emit("ride_event", event);
        if (event.rideId) {
            this.emitter.emit(`ride_${event.rideId}`, event);
        }
        if (event.driverId) {
            this.emitter.emit(`driver_${event.driverId}`, event);
        }
    }

    public subscribeAll(listener: (event: RideEventPayload) => void) {
        this.emitter.on("ride_event", listener);
        return () => {
            this.emitter.off("ride_event", listener);
        };
    }

    public subscribeToRide(rideId: string, listener: (event: RideEventPayload) => void) {
        const channel = `ride_${rideId}`;
        this.emitter.on(channel, listener);
        return () => {
            this.emitter.off(channel, listener);
        };
    }

    public subscribeToDriver(driverId: string, listener: (event: RideEventPayload) => void) {
        const channel = `driver_${driverId}`;
        this.emitter.on(channel, listener);
        return () => {
            this.emitter.off(channel, listener);
        };
    }
}

export const rideStreamManager = RideStreamManager.getInstance();

