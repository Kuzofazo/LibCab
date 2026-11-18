"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface Vehicle3DMarkerProps {
    type?: string;          // "Car" | "Comfort" | "Bike" | "Tricycle" | "VIP"
    heading?: number;       // 0 - 360 degrees
    isAssigned?: boolean;   // Active / assigned driver to current user
    isSelected?: boolean;   // Selected by customer
    etaText?: string;       // e.g. "7 min" or "3 min"
    rating?: number;        // e.g. 4.9
    driverName?: string;    // e.g. "Oscar"
    className?: string;
    onClick?: () => void;
}

/**
 * High-definition 3D Top-Down Taxi / Vehicle SVG
 * Matches the realistic isometric 3D taxi view from top-tier ride-hailing apps (Uber, Bolt).
 */
export function getTaxi3DSvg({
    primaryColor = "#F59E0B",
    roofColor = "#0F172A",
    isComfort = false,
}: {
    primaryColor?: string;
    roofColor?: string;
    isComfort?: boolean;
} = {}) {
    if (isComfort) {
        // Sleek Silver-Platinum / Dark Executive Sedan
        return `
        <svg width="34" height="64" viewBox="0 0 34 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 6px 10px rgba(0,0,0,0.45));">
            <!-- Ground Contact Shadow -->
            <ellipse cx="17" cy="33" rx="15" ry="29" fill="rgba(0,0,0,0.35)" filter="blur(2px)" />
            
            <!-- Wheels / Tires -->
            <rect x="0.5" y="11" width="4" height="11" rx="2" fill="#0F172A" />
            <rect x="29.5" y="11" width="4" height="11" rx="2" fill="#0F172A" />
            <rect x="0.5" y="43" width="4" height="11" rx="2" fill="#0F172A" />
            <rect x="29.5" y="43" width="4" height="11" rx="2" fill="#0F172A" />
            
            <!-- Main Car Body (Executive Silver/Slate) -->
            <path d="M4 14C4 7 8 2 17 2C26 2 30 7 30 14V50C30 57 26 62 17 62C8 62 4 57 4 50V14Z" fill="url(#silverGrad)" stroke="#334155" stroke-width="1.2" />
            
            <!-- Headlights with Beam Glow -->
            <path d="M6 3.5C7.5 3 9 3 10 3" stroke="#FDE047" stroke-width="2" stroke-linecap="round" />
            <path d="M24 3C25 3 26.5 3 28 3.5" stroke="#FDE047" stroke-width="2" stroke-linecap="round" />
            
            <!-- Front Windshield -->
            <path d="M7 16C7 13 10 11 17 11C24 11 27 13 27 16V22H7V16Z" fill="#0F172A" />
            <!-- Windshield Reflection Glare -->
            <path d="M9 13.5L14 21H11L7.5 15.5C8 14.5 8.5 14 9 13.5Z" fill="rgba(255,255,255,0.4)" />
            
            <!-- Panoramic Glass Roof / Sunroof -->
            <rect x="7" y="24" width="20" height="18" rx="2" fill="#020617" stroke="#475569" stroke-width="0.8" />
            <line x1="8" y1="32" x2="26" y2="32" stroke="rgba(255,255,255,0.2)" stroke-width="0.8" />
            
            <!-- Side Mirrors -->
            <path d="M2.5 17C1.5 17 1 18 1 19.5C1 21 2 21.5 3.5 21" fill="#475569" />
            <path d="M31.5 17C32.5 17 33 18 33 19.5C33 21 32 21.5 30.5 21" fill="#475569" />
            
            <!-- Rear Windshield -->
            <path d="M7 44H27V49C27 52 24 53.5 17 53.5C10 53.5 7 52 7 49V44Z" fill="#0F172A" />
            
            <!-- Rear Brake Lights -->
            <rect x="5.5" y="58.5" width="4" height="2" rx="1" fill="#EF4444" />
            <rect x="24.5" y="58.5" width="4" height="2" rx="1" fill="#EF4444" />
            
            <defs>
                <linearGradient id="silverGrad" x1="4" y1="2" x2="30" y2="62" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#F1F5F9" />
                    <stop offset="50%" stop-color="#CBD5E1" />
                    <stop offset="100%" stop-color="#94A3B8" />
                </linearGradient>
            </defs>
        </svg>`;
    }

    // Authentic Yellow-and-Black AfriCab Taxi (as shown in reference screenshot)
    return `
    <svg width="34" height="64" viewBox="0 0 34 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 7px 12px rgba(0,0,0,0.5));">
        <!-- Ground Contact Shadow -->
        <ellipse cx="17" cy="33" rx="15" ry="29" fill="rgba(0,0,0,0.38)" filter="blur(2px)" />
        
        <!-- Wheels / Tires -->
        <rect x="0.5" y="11" width="4" height="11" rx="2" fill="#0A0A0A" />
        <rect x="29.5" y="11" width="4" height="11" rx="2" fill="#0A0A0A" />
        <rect x="0.5" y="43" width="4" height="11" rx="2" fill="#0A0A0A" />
        <rect x="29.5" y="43" width="4" height="11" rx="2" fill="#0A0A0A" />
        
        <!-- Main Taxi Body (Vibrant Yellow with 3D Bevel/Lighting) -->
        <path d="M4 14C4 7 8 2 17 2C26 2 30 7 30 14V50C30 57 26 62 17 62C8 62 4 57 4 50V14Z" fill="url(#taxiYellow)" stroke="#B45309" stroke-width="1.2" />
        
        <!-- Hood Contour Highlight Lines -->
        <path d="M10 6C11.5 9 12 11 12 13" stroke="rgba(255,255,255,0.4)" stroke-width="1" stroke-linecap="round" />
        <path d="M24 6C22.5 9 22 11 22 13" stroke="rgba(255,255,255,0.4)" stroke-width="1" stroke-linecap="round" />
        
        <!-- Front Headlights (Illuminated Halogen/LED) -->
        <path d="M6 3.5C7.5 3 9 3 10.5 3" stroke="#FEF08A" stroke-width="2.5" stroke-linecap="round" />
        <path d="M23.5 3C25 3 26.5 3 28 3.5" stroke="#FEF08A" stroke-width="2.5" stroke-linecap="round" />
        
        <!-- Front Windshield (Deep Tint with Specular Reflection) -->
        <path d="M7 16C7 13 10 11 17 11C24 11 27 13 27 16V22H7V16Z" fill="#0F172A" />
        <path d="M9 13.5L14 21H11L7.5 15.5C8 14.5 8.5 14 9 13.5Z" fill="rgba(255,255,255,0.45)" />
        
        <!-- Black Taxi Roof -->
        <rect x="7" y="22" width="20" height="21" rx="2" fill="${roofColor}" />
        
        <!-- Side Mirrors -->
        <path d="M2.5 17C1.5 17 1 18 1 19.5C1 21 2 21.5 3.5 21" fill="#F59E0B" stroke="#B45309" stroke-width="0.5" />
        <path d="M31.5 17C32.5 17 33 18 33 19.5C33 21 32 21.5 30.5 21" fill="#F59E0B" stroke="#B45309" stroke-width="0.5" />
        
        <!-- 3D Illuminated TAXI Roof Light Bar / Beacon (Yellow Taxi Sign) -->
        <rect x="11.5" y="30" width="11" height="5.5" rx="1.5" fill="#FEF08A" stroke="#CA8A04" stroke-width="0.8" />
        <text x="17" y="34.2" font-size="3.2" font-family="system-ui, sans-serif" font-weight="900" fill="#713F12" text-anchor="middle" letter-spacing="0.5">TAXI</text>
        
        <!-- Rear Windshield -->
        <path d="M7 43H27V48.5C27 51.5 24 53 17 53C10 53 7 51.5 7 48.5V43Z" fill="#0F172A" />
        <path d="M9 44.5L12 51H10.5L8 46C8.3 45.3 8.6 44.8 9 44.5Z" fill="rgba(255,255,255,0.3)" />
        
        <!-- Rear Taillights (Red) -->
        <rect x="5.5" y="58.5" width="4" height="2" rx="1" fill="#DC2626" />
        <rect x="24.5" y="58.5" width="4" height="2" rx="1" fill="#DC2626" />
        
        <defs>
            <linearGradient id="taxiYellow" x1="4" y1="2" x2="30" y2="62" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#FCD34D" />
                <stop offset="40%" stop-color="#F59E0B" />
                <stop offset="100%" stop-color="#D97706" />
            </linearGradient>
        </defs>
    </svg>`;
}

/**
 * 3D Top-Down Motorcycle (Okada) SVG
 */
export function getOkada3DSvg() {
    return `
    <svg width="26" height="52" viewBox="0 0 26 52" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 5px 8px rgba(0,0,0,0.45));">
        <ellipse cx="13" cy="26" rx="9" ry="24" fill="rgba(0,0,0,0.3)" filter="blur(2px)" />
        <!-- Front & Back Wheels -->
        <rect x="11" y="2" width="4" height="12" rx="2" fill="#0A0A0A" />
        <rect x="11" y="38" width="4" height="12" rx="2" fill="#0A0A0A" />
        <!-- Handlebars -->
        <line x1="4" y1="14" x2="22" y2="14" stroke="#475569" stroke-width="3" stroke-linecap="round" />
        <circle cx="4" cy="14" r="2" fill="#0A0A0A" />
        <circle cx="22" cy="14" r="2" fill="#0A0A0A" />
        <!-- Headlight Beam -->
        <circle cx="13" cy="6" r="3" fill="#FEF08A" />
        <!-- Fuel Tank / Body -->
        <path d="M9 16C9 13 17 13 17 16V28C17 31 9 31 9 28V16Z" fill="#DC2626" />
        <!-- Driver Helmet (Top-Down Yellow/Black) -->
        <circle cx="13" cy="24" r="6" fill="#FBBF24" stroke="#B45309" stroke-width="1.2" />
        <path d="M8 22C8 19 18 19 18 22V24H8V22Z" fill="#0F172A" />
        <!-- Passenger Seat / Luggage Rack -->
        <rect x="10" y="31" width="6" height="8" rx="2" fill="#1E293B" />
    </svg>`;
}

/**
 * 3D Top-Down Tricycle (Kehkeh) SVG
 */
export function getKehkeh3DSvg() {
    return `
    <svg width="34" height="54" viewBox="0 0 34 54" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 6px 10px rgba(0,0,0,0.45));">
        <ellipse cx="17" cy="27" rx="14" ry="24" fill="rgba(0,0,0,0.35)" filter="blur(2px)" />
        <!-- Front Wheel (Single) -->
        <rect x="15" y="1" width="4" height="10" rx="2" fill="#0A0A0A" />
        <!-- Rear Wheels (Two) -->
        <rect x="2" y="36" width="4" height="11" rx="2" fill="#0A0A0A" />
        <rect x="28" y="36" width="4" height="11" rx="2" fill="#0A0A0A" />
        <!-- Tricycle Body (Yellow Kehkeh) -->
        <path d="M10 11L17 4L24 11V47C24 50 21 52 17 52C13 52 10 50 10 47V11Z" fill="#F59E0B" stroke="#B45309" stroke-width="1" />
        <!-- Black Canvas Roof -->
        <rect x="7" y="14" width="20" height="28" rx="4" fill="#0F172A" />
        <rect x="9" y="16" width="16" height="24" rx="2" fill="#1E293B" />
        <!-- Windshield -->
        <path d="M10 11C12 9 22 9 24 11V14H10V11Z" fill="#38BDF8" opacity="0.6" />
    </svg>`;
}

/**
 * Generates the full HTML markup for Leaflet L.divIcon
 */
export function renderVehicle3DMarkerHTML({
    type = "Car",
    heading = 0,
    isAssigned = false,
    etaText,
    rating,
    driverName,
}: {
    type?: string;
    heading?: number;
    isAssigned?: boolean;
    etaText?: string;
    rating?: number;
    driverName?: string;
}): string {
    const norm = (type || "").toLowerCase();
    let svg: string;
    if (norm.includes("bike") || norm.includes("motor") || norm.includes("okada")) {
        svg = getOkada3DSvg();
    } else if (norm.includes("tri") || norm.includes("keke") || norm.includes("kehkeh")) {
        svg = getKehkeh3DSvg();
    } else if (norm.includes("comfort") || norm.includes("vip") || norm.includes("business")) {
        svg = getTaxi3DSvg({ isComfort: true });
    } else {
        svg = getTaxi3DSvg();
    }

    const etaBadge = etaText ? `
        <div style="
            position: absolute;
            top: -26px;
            left: 50%;
            transform: translateX(-50%);
            background: #ffffff;
            color: #0f172a;
            font-size: 11px;
            font-weight: 900;
            padding: 3px 8px;
            border-radius: 9999px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            border: 1px solid rgba(0,0,0,0.08);
            z-index: 100;
        ">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 9999px; background: #22c55e;"></span>
            ${etaText}
        </div>
    ` : "";

    const radarRing = isAssigned ? `
        <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            width: 70px;
            height: 70px;
            margin-top: -35px;
            margin-left: -35px;
            border-radius: 9999px;
            background: rgba(16, 185, 129, 0.25);
            border: 2px solid #10b981;
            pointer-events: none;
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
    ` : "";

    return `
    <div style="position: relative; width: 34px; height: 64px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        ${radarRing}
        ${etaBadge}
        <div style="
            transform: rotate(${heading || 0}deg);
            transform-origin: center center;
            transition: transform 0.4s ease-out;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            ${svg}
        </div>
    </div>`;
}

/**
 * React Component for Google Maps / Mapbox
 */
export default function Vehicle3DMarker({
    type = "Car",
    heading = 0,
    isAssigned = false,
    isSelected = false,
    etaText,
    rating,
    driverName,
    className,
    onClick,
}: Vehicle3DMarkerProps) {
    const norm = (type || "").toLowerCase();
    let SvgComponent: React.ReactNode;

    if (norm.includes("bike") || norm.includes("motor") || norm.includes("okada")) {
        SvgComponent = <div dangerouslySetInnerHTML={{ __html: getOkada3DSvg() }} />;
    } else if (norm.includes("tri") || norm.includes("keke") || norm.includes("kehkeh")) {
        SvgComponent = <div dangerouslySetInnerHTML={{ __html: getKehkeh3DSvg() }} />;
    } else if (norm.includes("comfort") || norm.includes("vip") || norm.includes("business")) {
        SvgComponent = <div dangerouslySetInnerHTML={{ __html: getTaxi3DSvg({ isComfort: true }) }} />;
    } else {
        SvgComponent = <div dangerouslySetInnerHTML={{ __html: getTaxi3DSvg() }} />;
    }

    return (
        <div
            onClick={onClick}
            className={cn(
                "relative flex items-center justify-center cursor-pointer select-none transition-transform hover:scale-110",
                className
            )}
            style={{ width: 34, height: 64 }}
        >
            {/* Radar Pulse when assigned or selected */}
            {(isAssigned || isSelected) && (
                <span className="absolute -inset-4 rounded-full bg-emerald-500/25 border-2 border-emerald-500 animate-ping pointer-events-none" />
            )}

            {/* Floating ETA Badge (matches reference image pill) */}
            {etaText && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white text-slate-900 font-black text-[11px] px-2.5 py-1 rounded-full shadow-lg border border-slate-200/80 whitespace-nowrap flex items-center gap-1.5 z-30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{etaText}</span>
                </div>
            )}

            {/* Rotated 3D Vehicle */}
            <div
                style={{
                    transform: `rotate(${heading || 0}deg)`,
                    transformOrigin: "center center",
                    transition: "transform 0.4s ease-out",
                }}
                className="flex items-center justify-center drop-shadow-md"
            >
                {SvgComponent}
            </div>
        </div>
    );
}
