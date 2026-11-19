import { describe, it, expect, beforeEach } from "vitest";
import { GpsFilter, interpolatePosition } from "../lib/gpsFilter";
import { calculateDistanceKm, calculateBearing, calculateEtaMinutes } from "../lib/geo";

describe("GPS Filter & Geo Utilities", () => {
    let filter: GpsFilter;

    beforeEach(() => {
        filter = new GpsFilter();
    });

    it("accepts valid initial GPS reading", () => {
        const rawPos = {
            coords: {
                latitude: 6.3156,
                longitude: -10.8074,
                accuracy: 15,
                altitude: null,
                altitudeAccuracy: null,
                heading: 45,
                speed: 5.5, // m/s = 19.8 km/h
            },
            timestamp: Date.now(),
        } as unknown as GeolocationPosition;

        const result = filter.process(rawPos);
        expect(result).not.toBeNull();
        expect(result?.lat).toBeCloseTo(6.3156, 4);
        expect(result?.lng).toBeCloseTo(-10.8074, 4);
        expect(result?.speed).toBeCloseTo(19.8, 1);
        expect(result?.accuracy).toBe(15);
    });

    it("rejects inaccurate readings with accuracy > 80m", () => {
        const rawPos = {
            coords: {
                latitude: 6.3156,
                longitude: -10.8074,
                accuracy: 120, // poor accuracy
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
            },
            timestamp: Date.now(),
        } as unknown as GeolocationPosition;

        const result = filter.process(rawPos);
        expect(result).toBeNull();
    });

    it("rejects stale readings older than 15 seconds", () => {
        const rawPos = {
            coords: {
                latitude: 6.3156,
                longitude: -10.8074,
                accuracy: 10,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
            },
            timestamp: Date.now() - 25_000, // 25s old
        } as unknown as GeolocationPosition;

        const result = filter.process(rawPos);
        expect(result).toBeNull();
    });

    it("rejects teleportation / implausible speeds (> 180 km/h)", () => {
        // First valid position
        filter.process({
            coords: {
                latitude: 6.3156,
                longitude: -10.8074,
                accuracy: 10,
                altitude: null,
                altitudeAccuracy: null,
                heading: 0,
                speed: 0,
            },
            timestamp: Date.now() - 1000,
        } as unknown as GeolocationPosition);

        // 1 second later, jumped 50km away
        const teleportPos = {
            coords: {
                latitude: 6.7000,
                longitude: -10.8074,
                accuracy: 10,
                altitude: null,
                altitudeAccuracy: null,
                heading: 0,
                speed: 0,
            },
            timestamp: Date.now(),
        } as unknown as GeolocationPosition;

        const result = filter.process(teleportPos);
        expect(result).toBeNull();
    });

    it("smooths minor micro-jitter and applies EMA smoothing", () => {
        const t0 = Date.now() - 3000;
        filter.process({
            coords: {
                latitude: 6.3150,
                longitude: -10.8070,
                accuracy: 10,
                altitude: null,
                altitudeAccuracy: null,
                heading: 90,
                speed: 8.33,
            },
            timestamp: t0,
        } as unknown as GeolocationPosition);

        const next = filter.process({
            coords: {
                latitude: 6.3152,
                longitude: -10.8072,
                accuracy: 12,
                altitude: null,
                altitudeAccuracy: null,
                heading: 95,
                speed: 8.33,
            },
            timestamp: t0 + 2000,
        } as unknown as GeolocationPosition);

        expect(next).not.toBeNull();
        // EMA smoothing: value should be between prev and next
        expect(next!.lat).toBeGreaterThan(6.3150);
        expect(next!.lat).toBeLessThan(6.3152);
    });

    it("interpolates position accurately between two coordinates", () => {
        const from = { lat: 6.3000, lng: -10.8000 };
        const to = { lat: 6.4000, lng: -10.7000 };

        const mid = interpolatePosition(from, to, 0.5);
        expect(mid.lat).toBeCloseTo(6.3500, 4);
        expect(mid.lng).toBeCloseTo(-10.7500, 4);
    });

    it("calculates accurate distances and bearings", () => {
        const dist = calculateDistanceKm(6.3156, -10.8074, 6.3000, -10.7900);
        expect(dist).toBeGreaterThan(1);
        expect(dist).toBeLessThan(5);

        const eta = calculateEtaMinutes(dist);
        expect(eta).toBeGreaterThanOrEqual(1);

        const bearing = calculateBearing(6.3156, -10.8074, 6.3000, -10.7900);
        expect(bearing).toBeGreaterThanOrEqual(0);
        expect(bearing).toBeLessThanOrEqual(360);
    });
});
