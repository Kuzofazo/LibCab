/**
 * Haversine formula for calculating distance between two coordinates in kilometers.
 */
export function calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
}

function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
    return (rad * 180) / Math.PI;
}

/**
 * Calculate initial bearing / heading (0-360 degrees) from point 1 to point 2.
 */
export function calculateBearing(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaLambda = toRad(lon2 - lon1);

    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x =
        Math.cos(phi1) * Math.sin(phi2) -
        Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

    const theta = Math.atan2(y, x);
    const bearing = (toDeg(theta) + 360) % 360;
    return parseFloat(bearing.toFixed(1));
}

/**
 * Calculate estimated arrival time (ETA) in minutes based on distance and average urban speed (default: 28 km/h for Monrovia traffic).
 */
export function calculateEtaMinutes(
    distanceKm: number,
    averageSpeedKmh: number = 28
): number {
    if (distanceKm <= 0) return 1;
    const hours = distanceKm / Math.max(averageSpeedKmh, 5);
    const minutes = Math.ceil(hours * 60);
    return Math.max(1, minutes);
}

/**
 * Format distance in a human-readable string (e.g. "450 m" or "2.4 km").
 */
export function formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
}

/**
 * Format ETA in a friendly format (e.g. "2 mins" or "1 hr 15 mins").
 */
export function formatEta(etaMinutes: number): string {
    if (etaMinutes < 1) return "Under 1 min";
    if (etaMinutes === 1) return "1 min";
    if (etaMinutes < 60) return `${etaMinutes} mins`;
    const hours = Math.floor(etaMinutes / 60);
    const remainingMins = etaMinutes % 60;
    if (remainingMins === 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
    return `${hours} hr ${remainingMins} min${remainingMins > 1 ? "s" : ""}`;
}

export interface DriverCoordinate {
    id: string;
    userId: string;
    lat: number;
    lng: number;
    rating: number;
    isOnline: boolean;
    vehicleType?: string | null;
    vehicleModel?: string | null;
    vehicleColor?: string | null;
    licensePlate?: string | null;
    driverNumber?: string | null;
    name?: string | null;
    phone?: string | null;
    speed?: number | null;
    heading?: number | null;
    reviewCount?: number | null;
}

export interface NearbyDriverResult extends DriverCoordinate {
    distanceKm: number;
    etaMinutes: number;
    formattedDistance: string;
    formattedEta: string;
    driverNumber: string;
    displayName: string;
}

/**
 * Filter, enrich, and sort nearby available drivers within a radius, prioritized by proximity (closest first).
 */
export function findNearbyDrivers(
    originLat: number,
    originLng: number,
    drivers: DriverCoordinate[],
    radiusKm: number = 10
): NearbyDriverResult[] {
    return drivers
        .filter((d) => d.isOnline && d.lat !== null && d.lat !== undefined && d.lng !== null && d.lng !== undefined)
        .map((d) => {
            const distanceKm = calculateDistanceKm(originLat, originLng, d.lat, d.lng);
            const etaMinutes = calculateEtaMinutes(distanceKm);
            const shortId = d.id ? d.id.slice(-4).toUpperCase() : Math.floor(1000 + Math.random() * 9000).toString();
            const driverNumber = d.driverNumber || `DRV-${shortId}`;
            const displayName = d.name || `Driver ${driverNumber}`;

            return {
                ...d,
                distanceKm,
                etaMinutes,
                formattedDistance: formatDistance(distanceKm),
                formattedEta: formatEta(etaMinutes),
                driverNumber,
                displayName,
            };
        })
        .filter((d) => d.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Realistic Monrovia simulated nearby drivers for fallback / demo testing.
 */
export function getMonroviaSampleDrivers(
    centerLat: number = 6.3156,
    centerLng: number = -10.8074
): DriverCoordinate[] {
    return [
        {
            id: "drv_seed_1",
            userId: "usr_seed_1",
            driverNumber: "DRV-1024",
            name: "Emmanuel Tarkpor",
            phone: "+231 77 123 4567",
            vehicleType: "Car",
            vehicleModel: "Toyota Corolla (AC)",
            vehicleColor: "Silver",
            licensePlate: "LB-8841-C",
            lat: centerLat + 0.0052,
            lng: centerLng - 0.0038,
            rating: 4.95,
            reviewCount: 238,
            isOnline: true,
            speed: 28,
            heading: 45,
        },
        {
            id: "drv_seed_2",
            userId: "usr_seed_2",
            driverNumber: "DRV-2048",
            name: "Josephine Weah",
            phone: "+231 88 987 6543",
            vehicleType: "Car",
            vehicleModel: "Hyundai Elantra (Comfort)",
            vehicleColor: "Midnight Blue",
            licensePlate: "LB-4920-A",
            lat: centerLat - 0.0075,
            lng: centerLng + 0.0062,
            rating: 4.88,
            reviewCount: 164,
            isOnline: true,
            speed: 34,
            heading: 120,
        },
        {
            id: "drv_seed_3",
            userId: "usr_seed_3",
            driverNumber: "DRV-3096",
            name: "Moses Kollie",
            phone: "+231 77 555 0192",
            vehicleType: "Bike",
            vehicleModel: "Yamaha Crux 110",
            vehicleColor: "Red & Black",
            licensePlate: "LB-M-319",
            lat: centerLat + 0.0031,
            lng: centerLng + 0.0044,
            rating: 4.92,
            reviewCount: 310,
            isOnline: true,
            speed: 40,
            heading: 210,
        },
        {
            id: "drv_seed_4",
            userId: "usr_seed_4",
            driverNumber: "DRV-4112",
            name: "Garmai Johnson",
            phone: "+231 88 444 8811",
            vehicleType: "Car",
            vehicleModel: "Toyota RAV4 (VIP Luxury)",
            vehicleColor: "Pearl White",
            licensePlate: "LB-VIP-07",
            lat: centerLat - 0.0112,
            lng: centerLng - 0.0089,
            rating: 5.0,
            reviewCount: 94,
            isOnline: true,
            speed: 22,
            heading: 90,
        },
        {
            id: "drv_seed_5",
            userId: "usr_seed_5",
            driverNumber: "DRV-5220",
            name: "Amos Freeman",
            phone: "+231 77 333 1290",
            vehicleType: "Tricycle",
            vehicleModel: "Bajaj RE 4S (Keke)",
            vehicleColor: "Yellow & Green",
            licensePlate: "LB-K-902",
            lat: centerLat + 0.0084,
            lng: centerLng - 0.0071,
            rating: 4.85,
            reviewCount: 182,
            isOnline: true,
            speed: 25,
            heading: 330,
        }
    ];
}

