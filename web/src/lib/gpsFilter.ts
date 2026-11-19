/**
 * GPS Position Filter — AfriCab Live Tracking
 *
 * Rejects inaccurate readings and smooths GPS coordinates using
 * an exponential moving-average (EMA) filter. This prevents:
 *   - Wild teleportation on poor GPS signal
 *   - Excessive jitter from momentary satellite interference
 *   - Stale / outdated position reads being used
 */

export interface FilteredPosition {
    lat: number;
    lng: number;
    heading: number;
    speed: number;      // km/h
    accuracy: number;   // metres
    timestamp: number;
}

// Maximum acceptable GPS accuracy in metres (reject anything worse)
const MAX_ACCURACY_METRES = 80;

// Minimum movement in metres to register an update (avoid micro-jitter)
const MIN_MOVEMENT_METRES = 2;

// Maximum plausible speed in km/h for a vehicle in Monrovia traffic
const MAX_PLAUSIBLE_SPEED_KMH = 180;

// EMA smoothing factor: 0 = no smoothing, 1 = only new value
const ALPHA = 0.4;

// Max age of a position we'll accept (ms)
const MAX_POSITION_AGE_MS = 15_000;

function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6_371_000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
    const x =
        Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
        Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

/** Smooth-angle interpolation that handles 0°/360° wraparound */
function smoothAngle(prev: number, next: number, alpha: number): number {
    let diff = next - prev;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (prev + alpha * diff + 360) % 360;
}

export class GpsFilter {
    private last: FilteredPosition | null = null;

    /**
     * Submit a raw GeolocationPosition. Returns a smoothed FilteredPosition,
     * or null if the reading should be discarded.
     */
    process(raw: GeolocationPosition): FilteredPosition | null {
        const { latitude, longitude, accuracy, speed: rawSpeed, heading: rawHeading } = raw.coords;
        const now = raw.timestamp;

        // ── Reject stale positions ──────────────────────────────────────────
        if (Date.now() - now > MAX_POSITION_AGE_MS) return null;

        // ── Reject poor-accuracy readings ───────────────────────────────────
        if (accuracy > MAX_ACCURACY_METRES) return null;

        // ── Bootstrap: accept first valid reading ───────────────────────────
        if (!this.last) {
            this.last = {
                lat: latitude,
                lng: longitude,
                heading: rawHeading ?? 0,
                speed: rawSpeed ? rawSpeed * 3.6 : 0,
                accuracy,
                timestamp: now,
            };
            return { ...this.last };
        }

        // ── Reject teleportation (implausibly fast movement) ────────────────
        const dist = haversineMetres(this.last.lat, this.last.lng, latitude, longitude);
        const dtSec = Math.max((now - this.last.timestamp) / 1000, 0.1);
        const impliedSpeedKmh = (dist / dtSec) * 3.6;

        if (impliedSpeedKmh > MAX_PLAUSIBLE_SPEED_KMH) return null;

        // ── Reject micro-jitter ─────────────────────────────────────────────
        if (dist < MIN_MOVEMENT_METRES) {
            // Update timestamp but keep old coords
            this.last = { ...this.last, accuracy, timestamp: now };
            return { ...this.last };
        }

        // ── Compute heading from movement (more reliable than device heading) ─
        const computedHeading = bearingDeg(this.last.lat, this.last.lng, latitude, longitude);
        const deviceHeading = rawHeading ?? computedHeading;
        // Blend device heading (if available) with computed movement heading
        const blendedHeading = rawHeading != null
            ? smoothAngle(this.last.heading, deviceHeading, 0.5)
            : computedHeading;

        // ── EMA smoothing ───────────────────────────────────────────────────
        const smoothLat = this.last.lat + ALPHA * (latitude - this.last.lat);
        const smoothLng = this.last.lng + ALPHA * (longitude - this.last.lng);
        const smoothHeading = smoothAngle(this.last.heading, blendedHeading, ALPHA);
        const speedKmh = rawSpeed ? rawSpeed * 3.6 : impliedSpeedKmh;

        this.last = {
            lat: smoothLat,
            lng: smoothLng,
            heading: smoothHeading,
            speed: speedKmh,
            accuracy,
            timestamp: now,
        };

        return { ...this.last };
    }

    /** Reset the filter (e.g. when driver goes offline) */
    reset() {
        this.last = null;
    }

    get lastKnown(): FilteredPosition | null {
        return this.last;
    }
}

/**
 * Linearly interpolate between two positions for smooth marker animation.
 * t must be in [0, 1].
 */
export function interpolatePosition(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    t: number
): { lat: number; lng: number } {
    return {
        lat: from.lat + (to.lat - from.lat) * t,
        lng: from.lng + (to.lng - from.lng) * t,
    };
}
