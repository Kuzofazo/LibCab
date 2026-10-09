"use client";

/**
 * MapComponent — Universal Map Router for AfriCab
 *
 * Auto-selects map engine based on available API keys:
 *   1. Google Maps  (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)   → best quality, uses quota
 *   2. Mapbox       (NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN)   → great quality, generous free tier
 *   3. Leaflet/OSM  (no key needed)                     → completely free, always available
 *
 * All engines accept identical props — zero changes required in callers.
 */

import React, { useEffect, useState, useRef, Suspense } from "react";
import { Map, Marker, Popup, Source, Layer, NavigationControl, MapRef } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

let mapboxCssLoaded = false;
function ensureMapboxCSS() {
    if (mapboxCssLoaded || typeof document === "undefined") return;
    mapboxCssLoaded = true;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.css";
    document.head.appendChild(link);
}

// Lazy-load the two alternative engines (avoids SSR issues)
const GoogleMapEngine = dynamic(() => import("@/components/map/GoogleMapEngine"), { ssr: false });
const LeafletMapEngine = dynamic(() => import("@/components/map/LeafletMapEngine"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MapMarker {
    id: string;
    lat: number;
    lng: number;
    title: string;
    subtitle?: string;
    type: "AVAILABLE_DRIVER" | "ASSIGNED_DRIVER" | "BUSY_DRIVER" | "PICKUP" | "DESTINATION" | "CUSTOMER";
    vehicleType?: string;
    vehicleModel?: string;
    licensePlate?: string;
    driverNumber?: string;
    rating?: number;
    etaText?: string;
    distanceText?: string;
    heading?: number;
    onSelect?: () => void;
}

export interface MapRoute {
    id: string;
    origin: [number, number];
    destination: [number, number];
    color: string;
    dashArray?: string;
    geojson?: {
        type: "Feature";
        geometry: {
            type: string;
            coordinates: unknown;
        };
        properties: Record<string, unknown>;
    };
}

export interface MapStep {
    distance: number;
    duration: number;
    name?: string;
    maneuver?: { type: string; modifier?: string };
}

export interface MapProps {
    center?: [number, number];
    zoom?: number;
    markers?: MapMarker[];
    routes?: MapRoute[];
    onRouteCalculated?: (data: { distance: string; eta: string; steps: MapStep[] }) => void;
    onMarkerClick?: (marker: MapMarker) => void;
    fullScreen?: boolean;
    className?: string;
}

// ─── Custom marker icons for Mapbox engine ─────────────────────────────────

const VehicleMarkerIcon = ({
    type = "Car",
    color = "#22c55e",
    heading = 0,
    isAssigned = false,
}: {
    type?: string;
    color?: string;
    heading?: number;
    isAssigned?: boolean;
}) => {
    const normType = (type || "car").toLowerCase();
    const isBike = normType.includes("bike") || normType.includes("motor");
    const isTricycle = normType.includes("tri") || normType.includes("keke");

    return (
        <div className="relative flex items-center justify-center transition-transform hover:scale-125 duration-300">
            {isAssigned && <span className="absolute -inset-2 rounded-full bg-emerald-500/30 animate-ping" />}
            <div
                className={cn(
                    "relative p-2 rounded-2xl border-2 shadow-2xl backdrop-blur-md transition-all flex items-center justify-center",
                    isAssigned
                        ? "bg-emerald-600 text-white border-white ring-4 ring-emerald-500/40 scale-110"
                        : color === "#22c55e"
                        ? "bg-slate-900 text-emerald-400 border-emerald-500/80"
                        : "bg-slate-900 text-red-400 border-red-500/80"
                )}
                style={{ transform: heading ? `rotate(${heading}deg)` : undefined }}
            >
                {isBike ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="5.5" cy="17.5" r="3.5" /><circle cx="18.5" cy="17.5" r="3.5" />
                        <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5L9 9l3-3 3 2 3-2" />
                        <path d="m14 11.5 4.5 6" />
                    </svg>
                ) : isTricycle ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="5" cy="18" r="3" /><circle cx="19" cy="18" r="3" />
                        <path d="M12 4v4l-4 7h11l-3-6h-3" /><circle cx="12" cy="4" r="1.5" />
                    </svg>
                ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.7 7.8c-.2-.5-.7-.8-1.2-.8H6.5c-.5 0-1 .3-1.2.8L3.5 11.1c-.8.2-1.5 1-1.5 1.9v3c0 .6.4 1 1 1h2" />
                        <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /><path d="M5 17h10" />
                    </svg>
                )}
            </div>
        </div>
    );
};

const PinIcon = ({ type }: { type: string }) => {
    const isPickup = type === "PICKUP";
    return (
        <div className="relative flex flex-col items-center justify-center transition-transform hover:scale-125 duration-300">
            <span className={cn("absolute -inset-1 rounded-full animate-ping opacity-60", isPickup ? "bg-emerald-400" : "bg-red-400")} />
            <div className={cn("p-2 rounded-2xl border-2 shadow-2xl flex items-center justify-center", isPickup ? "bg-emerald-600 text-white border-white ring-4 ring-emerald-500/30" : "bg-red-600 text-white border-white ring-4 ring-red-500/30")}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="white" strokeWidth="1.5">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
                </svg>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-white bg-black/80 px-2 py-0.5 rounded-full mt-1 shadow-md border border-white/20">
                {isPickup ? "Pickup" : "Destination"}
            </span>
        </div>
    );
};

// ─── Mapbox Engine (kept as default fallback) ──────────────────────────────

function MapboxEngine({
    center = [6.3156, -10.8074],
    zoom = 13,
    markers = [],
    routes = [],
    onRouteCalculated,
    onMarkerClick,
    fullScreen = false,
    className = "",
}: MapProps) {
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (MAPBOX_TOKEN && typeof window !== "undefined") {
        try { mapboxgl.accessToken = MAPBOX_TOKEN; } catch {}
    }

    const mapRef = useRef<MapRef>(null);
    const [isClient, setIsClient] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const [mapError, setMapError] = useState(false);
    const [fetchedRoutes, setFetchedRoutes] = useState<MapRoute[]>([]);
    const [activePopupMarker, setActivePopupMarker] = useState<MapMarker | null>(null);

    useEffect(() => {
        setIsClient(true);
        ensureMapboxCSS();
        try {
            if (typeof window !== "undefined" && mapboxgl && typeof mapboxgl.supported === "function") {
                setIsSupported(mapboxgl.supported());
            }
        } catch { setIsSupported(false); }
    }, []);

    useEffect(() => {
        if (!routes || routes.length === 0) { setFetchedRoutes([]); return; }
        let isMounted = true;
        const fetchAllRoutes = async () => {
            const newRoutes: MapRoute[] = [];
            for (const route of routes) {
                let success = false;
                if (MAPBOX_TOKEN) {
                    try {
                        const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${route.origin[1]},${route.origin[0]};${route.destination[1]},${route.destination[0]}?geometries=geojson&steps=true&access_token=${MAPBOX_TOKEN}`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data.routes?.length > 0) {
                                const r = data.routes[0];
                                newRoutes.push({ ...route, geojson: { type: "Feature" as const, properties: {}, geometry: r.geometry } });
                                success = true;
                                if (onRouteCalculated && isMounted) {
                                    onRouteCalculated({ distance: `${(r.distance / 1000).toFixed(2)} km`, eta: `${Math.ceil(r.duration / 60)} min`, steps: r.legs[0]?.steps || [] });
                                }
                            }
                        }
                    } catch {}
                }
                if (!success) {
                    try {
                        const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${route.origin[1]},${route.origin[0]};${route.destination[1]},${route.destination[0]}?overview=full&geometries=geojson&steps=true`);
                        if (osrmRes.ok) {
                            const osrmData = await osrmRes.json();
                            if (osrmData.routes?.length > 0) {
                                const r = osrmData.routes[0];
                                newRoutes.push({ ...route, geojson: { type: "Feature" as const, properties: {}, geometry: r.geometry } });
                                success = true;
                                if (onRouteCalculated && isMounted) {
                                    onRouteCalculated({ distance: `${(r.distance / 1000).toFixed(2)} km`, eta: `${Math.ceil(r.duration / 60)} min`, steps: r.legs[0]?.steps || [] });
                                }
                            }
                        }
                    } catch {}
                }
                if (!success) {
                    newRoutes.push({ ...route, geojson: { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [[route.origin[1], route.origin[0]], [route.destination[1], route.destination[0]]] } } });
                }
            }
            if (isMounted) setFetchedRoutes(newRoutes);
        };
        fetchAllRoutes();
        return () => { isMounted = false; };
    }, [routes, onRouteCalculated, MAPBOX_TOKEN]);

    useEffect(() => {
        if (!mapRef.current || !isSupported || mapError) return;
        try {
            const validMarkers = markers.filter(m => m.lat && m.lng);
            if (validMarkers.length === 0 && fetchedRoutes.length === 0) return;
            const bounds = new mapboxgl.LngLatBounds();
            validMarkers.forEach(m => bounds.extend([m.lng, m.lat]));
            fetchedRoutes.forEach(r => {
                if (r.geojson?.geometry) {
                    const coords = r.geojson.geometry.coordinates;
                    if (Array.isArray(coords)) {
                        if (typeof coords[0] === "number") bounds.extend(coords as [number, number]);
                        else (coords as [number, number][]).forEach(c => bounds.extend(c));
                    }
                }
            });
            if (!bounds.isEmpty()) mapRef.current.fitBounds(bounds, { padding: 100, duration: 1500 });
        } catch {}
    }, [markers, fetchedRoutes, isSupported, mapError]);

    if (!isClient) return <div className="h-full w-full bg-slate-100 animate-pulse rounded-3xl" />;

    if (!MAPBOX_TOKEN || !isSupported || mapError) {
        // Fallback to OSM when Mapbox unavailable
        return <LeafletMapEngine center={center} zoom={zoom} markers={markers} routes={routes} onRouteCalculated={onRouteCalculated} onMarkerClick={onMarkerClick} fullScreen={fullScreen} className={className} />;
    }

    return (
        <div className={cn("relative transition-all duration-700 overflow-hidden", fullScreen ? "fixed inset-0 z-0 h-screen w-screen" : "h-full w-full rounded-3xl", className)}>
            <Map
                ref={mapRef}
                initialViewState={{ latitude: center[0], longitude: center[1], zoom }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={MAPBOX_TOKEN}
                style={{ width: "100%", height: "100%" }}
                attributionControl={false}
                onError={() => setMapError(true)}
            >
                <NavigationControl position="bottom-right" showCompass={false} />
                {fetchedRoutes.map((route) => route.geojson && (
                    <Source key={`route-${route.id}`} type="geojson" data={route.geojson as unknown as string}>
                        <Layer
                            id={`line-${route.id}`}
                            type="line"
                            layout={{ "line-join": "round", "line-cap": "round" }}
                            paint={{ "line-color": route.color, "line-width": 5, "line-opacity": 0.85 }}
                        />
                    </Source>
                ))}
                {markers.map((marker) => (
                    <React.Fragment key={`${marker.type}-${marker.id}`}>
                        <Marker
                            latitude={marker.lat}
                            longitude={marker.lng}
                            anchor="center"
                            onClick={(e) => { e.originalEvent.stopPropagation(); setActivePopupMarker(marker); if (onMarkerClick) onMarkerClick(marker); }}
                        >
                            <div className="cursor-pointer" onClick={() => { setActivePopupMarker(marker); if (onMarkerClick) onMarkerClick(marker); }}>
                                {marker.type.includes("DRIVER") ? (
                                    <VehicleMarkerIcon type={marker.vehicleType} color={marker.type === "AVAILABLE_DRIVER" || marker.type === "ASSIGNED_DRIVER" ? "#22c55e" : "#ef4444"} heading={marker.heading} isAssigned={marker.type === "ASSIGNED_DRIVER"} />
                                ) : (
                                    <PinIcon type={marker.type} />
                                )}
                            </div>
                        </Marker>
                        {activePopupMarker?.id === marker.id && (
                            <Popup latitude={marker.lat} longitude={marker.lng} anchor="top" closeButton={true} onClose={() => setActivePopupMarker(null)} className="z-50">
                                <div className="p-3 min-w-[200px] text-slate-900 space-y-2">
                                    <div className="flex items-center justify-between border-b pb-1.5">
                                        <h4 className="font-black text-sm text-slate-900">{marker.title}</h4>
                                        {marker.rating && <span className="text-[10px] font-black bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">★ {marker.rating.toFixed(1)}</span>}
                                    </div>
                                    {marker.subtitle && <p className="text-xs text-slate-600 font-medium">{marker.subtitle}</p>}
                                    {marker.licensePlate && <div className="flex items-center justify-between text-[10px] font-bold text-slate-500"><span>Plate:</span><span className="font-mono text-slate-800 font-black">{marker.licensePlate}</span></div>}
                                    {(marker.distanceText || marker.etaText) && (
                                        <div className="flex items-center justify-between pt-1 text-[11px] font-black text-emerald-700 bg-emerald-50 p-1.5 rounded-lg">
                                            <span>{marker.distanceText || "Nearby"}</span>
                                            <span>ETA: {marker.etaText || "2 min"}</span>
                                        </div>
                                    )}
                                    {marker.onSelect && (
                                        <button type="button" onClick={(e) => { e.stopPropagation(); marker.onSelect?.(); setActivePopupMarker(null); }} className="w-full py-2 bg-black hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow">
                                            Select This Driver
                                        </button>
                                    )}
                                </div>
                            </Popup>
                        )}
                    </React.Fragment>
                ))}
            </Map>
            <div className="absolute bottom-4 right-4 z-10 text-[8px] text-gray-500/50 pointer-events-none uppercase tracking-widest font-bold">
                AfriCab Precision Telemetry
            </div>
        </div>
    );
}

// ─── Main MapComponent — Engine Router ─────────────────────────────────────

export default function MapComponent(props: MapProps) {
    const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    // Engine 1: Google Maps (best — uses real roads for Monrovia)
    if (GOOGLE_KEY) {
        return (
            <Suspense fallback={<div className="h-full w-full bg-slate-100 animate-pulse rounded-3xl" />}>
                <GoogleMapEngine {...props} />
            </Suspense>
        );
    }

    // Engine 2: Mapbox (great quality, generous free tier)
    if (MAPBOX_TOKEN) {
        return <MapboxEngine {...props} />;
    }

    // Engine 3: Leaflet / OpenStreetMap (free, no key, always works)
    return (
        <Suspense fallback={<div className="h-full w-full bg-slate-100 animate-pulse rounded-3xl" />}>
            <LeafletMapEngine {...props} />
        </Suspense>
    );
}
