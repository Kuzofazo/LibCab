import { formatUSD, formatLRD } from "./currency";

export const DEFAULT_WHATSAPP_DISPATCH_PHONE = "231770000000";

export interface MonroviaLandmark {
    id: string;
    name: string;
    area: string;
    lat: number;
    lng: number;
    aliases: string[];
}

export const MONROVIA_LANDMARKS: MonroviaLandmark[] = [
    {
        id: "sinkor-tubman",
        name: "Sinkor (Tubman Blvd / 12th St)",
        area: "Sinkor",
        lat: 6.3006,
        lng: -10.7969,
        aliases: ["sinkor", "12th st", "tubman", "20th st", "9th st", "old road"]
    },
    {
        id: "broad-st",
        name: "Broad Street (Downtown Monrovia)",
        area: "Downtown / Snapper Hill",
        lat: 6.3156,
        lng: -10.8074,
        aliases: ["broad", "snapper hill", "crown hill", "center st", "randall st", "waterside"]
    },
    {
        id: "mamba-point",
        name: "Mamba Point (Diplomatic Quarter)",
        area: "Mamba Point",
        lat: 6.3180,
        lng: -10.8160,
        aliases: ["mamba", "embassy", "ducor", "united nations", "us embassy"]
    },
    {
        id: "elwa-junction",
        name: "ELWA Junction (Paynesville)",
        area: "Paynesville",
        lat: 6.2730,
        lng: -10.7300,
        aliases: ["elwa", "elwa junction", "rehab", "cooper clinic"]
    },
    {
        id: "red-light",
        name: "Red Light Market (Paynesville)",
        area: "Paynesville",
        lat: 6.2625,
        lng: -10.7050,
        aliases: ["red light", "redlight", "market", "gobachop", "omega"]
    },
    {
        id: "congotown-skd",
        name: "Congo Town / SKD Boulevard",
        area: "Congo Town",
        lat: 6.2750,
        lng: -10.7580,
        aliases: ["congo town", "skd", "ministerial complex", "chinese clinic"]
    },
    {
        id: "freeport-bushrod",
        name: "Freeport of Monrovia",
        area: "Bushrod Island",
        lat: 6.3450,
        lng: -10.7950,
        aliases: ["freeport", "port", "bushrod", "st paul", "jamaica road"]
    },
    {
        id: "duala-market",
        name: "Duala Market",
        area: "Bushrod Island",
        lat: 6.3620,
        lng: -10.7800,
        aliases: ["duala", "duala market", "brewerville", "waterfront"]
    },
    {
        id: "vamoma-junction",
        name: "Vamoma Junction (Airfield)",
        area: "Sinkor / Airfield",
        lat: 6.2910,
        lng: -10.7850,
        aliases: ["vamoma", "airfield", "matadi", "old airfield"]
    },
    {
        id: "ria-airport",
        name: "Roberts International Airport (RIA)",
        area: "Harbel / Margibi",
        lat: 6.2337,
        lng: -10.3623,
        aliases: ["ria", "roberts", "airport", "harbel", "firestone"]
    }
];

/**
 * Attempt to match a free-form string to known Monrovia coordinates.
 */
export function resolveLandmark(query: string): MonroviaLandmark | null {
    if (!query) return null;
    const lower = query.toLowerCase().trim();
    for (const lm of MONROVIA_LANDMARKS) {
        if (lm.name.toLowerCase().includes(lower) || lower.includes(lm.name.toLowerCase())) {
            return lm;
        }
        for (const alias of lm.aliases) {
            if (lower.includes(alias)) {
                return lm;
            }
        }
    }
    return null;
}

export function resolveCoordinates(
    address: string,
    fallbackLat: number = 6.3156,
    fallbackLng: number = -10.8074
): { lat: number; lng: number; matchedLandmark?: MonroviaLandmark } {
    const lm = resolveLandmark(address);
    if (lm) {
        return { lat: lm.lat, lng: lm.lng, matchedLandmark: lm };
    }
    return { lat: fallbackLat, lng: fallbackLng };
}

export type WhatsAppVehicleType = "Car" | "Bike" | "Tricycle";
export type WhatsAppRideCategory = "Standard" | "Comfort" | "VIP";
export type WhatsAppPaymentMethod = "MOMO" | "ORANGE" | "CASH" | "CARD";

export interface WhatsAppBookingParams {
    name: string;
    phone: string;
    pickup: string;
    destination: string;
    vehicleType?: WhatsAppVehicleType;
    rideCategory?: WhatsAppRideCategory;
    paymentMethod?: WhatsAppPaymentMethod;
    passengers?: number;
    notes?: string;
    rideId?: string;
    trackingUrl?: string;
    estimatedFareUsd?: number;
}

/**
 * Estimate approximate fare between two points based on distance & tier
 */
export function estimateWhatsAppBookingFare(
    pickup: string,
    destination: string,
    category: WhatsAppRideCategory = "Standard",
    vehicleType: WhatsAppVehicleType = "Car"
): { fareUsd: number; distanceKm: number; etaMins: number } {
    const p1 = resolveCoordinates(pickup, 6.3156, -10.8074);
    const p2 = resolveCoordinates(destination, 6.2730, -10.7300);

    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLon = (p2.lng - p1.lng) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = Math.max(1.5, Math.round(6371 * c * 10) / 10);

    // RIA Airport check
    const isAirport = pickup.toLowerCase().includes("ria") || destination.toLowerCase().includes("ria") ||
                      pickup.toLowerCase().includes("airport") || destination.toLowerCase().includes("airport");

    if (isAirport) {
        if (category === "VIP") return { fareUsd: 65, distanceKm: 55, etaMins: 50 };
        if (category === "Comfort") return { fareUsd: 50, distanceKm: 55, etaMins: 50 };
        return { fareUsd: 40, distanceKm: 55, etaMins: 50 };
    }

    let baseRate = 3.0; // Base flag-drop USD
    let perKm = 0.55;

    if (vehicleType === "Bike") {
        baseRate = 1.5;
        perKm = 0.35;
    } else if (vehicleType === "Tricycle") {
        baseRate = 2.0;
        perKm = 0.40;
    } else if (category === "Comfort") {
        baseRate = 4.5;
        perKm = 0.75;
    } else if (category === "VIP") {
        baseRate = 8.0;
        perKm = 1.30;
    }

    const calculated = Math.round((baseRate + distanceKm * perKm) * 2) / 2;
    const fareUsd = Math.max(category === "VIP" ? 10 : 3.0, calculated);
    const etaMins = Math.max(3, Math.round((distanceKm / 28) * 60));

    return { fareUsd, distanceKm, etaMins };
}

/**
 * Format the official structured WhatsApp dispatch text
 */
export function formatWhatsAppDispatchMessage(params: WhatsAppBookingParams): string {
    const {
        name,
        phone,
        pickup,
        destination,
        vehicleType = "Car",
        rideCategory = "Standard",
        paymentMethod = "MOMO",
        passengers = 1,
        notes = "",
        rideId,
        trackingUrl,
        estimatedFareUsd
    } = params;

    const shortId = rideId ? rideId.slice(-6).toUpperCase() : Math.floor(100000 + Math.random() * 900000).toString();
    const fare = estimatedFareUsd !== undefined ? estimatedFareUsd : estimateWhatsAppBookingFare(pickup, destination, rideCategory, vehicleType).fareUsd;

    const paymentLabel = paymentMethod === "MOMO" ? "MTN Mobile Money (MoMo)" :
                         paymentMethod === "ORANGE" ? "Orange Money" :
                         paymentMethod === "CARD" ? "Card / Stripe" : "Cash on Arrival";

    const tierEmoji = rideCategory === "VIP" ? "🌟 VIP Executive SUV" :
                      rideCategory === "Comfort" ? "❄️ Comfort (Air-Con)" :
                      vehicleType === "Bike" ? "🛵 AfriCab Express Bike" :
                      vehicleType === "Tricycle" ? "🛺 Keke Tricycle" : "🚕 Standard Taxi";

    let text = `🚕 *AFRICAB 24/7 DISPATCH REQUEST*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📋 *Booking Reference:* #AFR-WA-${shortId}\n`;
    text += `👤 *Passenger:* ${name.trim() || "Customer"} (${phone.trim() || "On file"})\n`;
    text += `📍 *Pickup Point:* ${pickup.trim()}\n`;
    text += `🏁 *Destination:* ${destination.trim()}\n`;
    text += `🚗 *Vehicle Tier:* ${tierEmoji}\n`;
    text += `👥 *Passengers:* ${passengers}\n`;
    text += `💳 *Payment Method:* ${paymentLabel}\n`;
    text += `💰 *Est. Fare:* ${formatUSD(fare)} (~${formatLRD(fare)})\n`;

    if (notes && notes.trim()) {
        text += `📝 *Rider Note:* "${notes.trim()}"\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;

    if (trackingUrl) {
        text += `🛰️ *Live Web Radar Tracking:*\n${trackingUrl}\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    text += `_⚡ Fast-Track Dispatch: Please confirm the closest available driver and estimated arrival time._`;

    return text;
}

/**
 * Generate full wa.me link with encoded text
 */
export function buildWhatsAppLink(
    message: string,
    targetPhone?: string
): string {
    const rawPhone = targetPhone || process.env.NEXT_PUBLIC_WHATSAPP_DISPATCH_PHONE || DEFAULT_WHATSAPP_DISPATCH_PHONE;
    const cleanPhone = rawPhone.replace(/\D/g, "");
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
