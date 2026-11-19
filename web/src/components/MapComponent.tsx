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
import Vehicle3DMarker from "@/components/map/Vehicle3DMarker";

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
    type: "AVAILABLE_DRIVER" | "ASSIGNED_DRIVER" | "BUSY_DRIVER" | "PICKUP" | "DESTINATION" | "CUSTOMER" | "MY_LOCATION";
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

const PinIcon = ({ type, etaText }: { type: string; etaText?: string }) => {
    const isPickup = type === "PICKUP";
    if (isPickup) {
        return (
            <div className="relative flex flex-col items-center justify-center cursor-pointer group">
                {etaText && (
                    <div className="absolute -top-7 bg-white text-slate-900 font-black text-[11px] px-2.5 py-0.5 rounded-full shadow-lg border border-slate-200 whitespace-nowrap flex items-center gap-1.5 z-30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{etaText}</span>
                    </div>
                )}
                <div className="w-6 h-6 rounded-full bg-black border-2 border-white shadow-xl flex items-center justify-center transition-transform group-hover:scale-110">
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                </div>
            </div>
        );
    }
    return (
        <div className="relative flex flex-col items-center justify-center cursor-pointer group">
            <div className="w-6 h-6 rounded-md bg-black border-2 border-white shadow-xl flex items-center justify-center transition-transform group-hover:scale-110">
                <div className="w-2.5 h-2.5 rounded-xs bg-white" />
            </div>
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
                initialViewState={{ latitude: center[0], longitude: center[1], zoom, pitch: 45, bearing: 0 }}
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
                                    <Vehicle3DMarker
                                        type={marker.vehicleType}
                                        heading={marker.heading || 0}
                                        isAssigned={marker.type === "ASSIGNED_DRIVER"}
                                        etaText={marker.etaText}
                                        rating={marker.rating}
                                        driverName={marker.title}
                                    />
                                ) : (
                                    <PinIcon type={marker.type} etaText={marker.etaText} />
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

// ─── Map Error Boundary: Graceful fallback to Leaflet / OSM ──────────────

class MapErrorBoundary extends React.Component<
    { fallback: React.ReactNode; children: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.warn("Map engine encountered an issue, gracefully rendering backup map:", error);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

// ─── Main MapComponent — Engine Router ─────────────────────────────────────

export default function MapComponent(props: MapProps) {
    const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    const fallbackLeaflet = (
        <Suspense fallback={<div className="h-full w-full bg-slate-100 animate-pulse rounded-3xl" />}>
            <LeafletMapEngine {...props} />
        </Suspense>
    );

    // Engine 1: Google Maps with automatic resilient fallback
    if (GOOGLE_KEY) {
        return (
            <MapErrorBoundary fallback={fallbackLeaflet}>
                <Suspense fallback={<div className="h-full w-full bg-slate-100 animate-pulse rounded-3xl" />}>
                    <GoogleMapEngine {...props} />
                </Suspense>
            </MapErrorBoundary>
        );
    }

    // Engine 2: Mapbox (great quality, generous free tier)
    if (MAPBOX_TOKEN) {
        return (
            <MapErrorBoundary fallback={fallbackLeaflet}>
                <MapboxEngine {...props} />
            </MapErrorBoundary>
        );
    }

    // Engine 3: Leaflet / OpenStreetMap (free, no key, always works)
    return fallbackLeaflet;
}
