"use client";

import React, { useEffect, useRef, useState } from "react";
import { APIProvider, Map as GoogleMap, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { cn } from "@/lib/utils";
import type { MapMarker, MapRoute, MapProps } from "@/components/MapComponent";
import Vehicle3DMarker from "@/components/map/Vehicle3DMarker";

// ─── Route cache ───────────────────────────────────────────────────────────
type LatLng = { lat: number; lng: number };
const routeCache = new Map<string, LatLng[]>();

function routeKey(origin: [number, number], dest: [number, number]): string {
    return `${origin[0].toFixed(4)},${origin[1].toFixed(4)}-${dest[0].toFixed(4)},${dest[1].toFixed(4)}`;
}

async function fetchOSRMRoute(
    origin: [number, number],
    dest: [number, number]
): Promise<LatLng[] | null> {
    const key = routeKey(origin, dest);
    if (routeCache.has(key)) return routeCache.get(key)!;

    try {
        const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson`
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.routes?.[0]) return null;
        const coords = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => ({ lat, lng })
        );
        routeCache.set(key, coords);
        return coords;
    } catch {
        return null;
    }
}

// ─── Smooth driver marker animation (Google AdvancedMarker via DOM) ────────
const ANIMATE_DURATION_MS = 1200;

function animateLatLng(
    setPos: (p: { lat: number; lng: number }) => void,
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
) {
    const start = performance.now();
    function step(now: number) {
        const t = Math.min((now - start) / ANIMATE_DURATION_MS, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        setPos({
            lat: from.lat + (to.lat - from.lat) * ease,
            lng: from.lng + (to.lng - from.lng) * ease,
        });
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ─── Single driver marker with smooth position animation ──────────────────
function AnimatedDriverMarker({
    marker,
    onMarkerClick,
    isActive,
    onClose,
}: {
    marker: MapMarker;
    onMarkerClick?: (m: MapMarker) => void;
    isActive: boolean;
    onClose: () => void;
}) {
    const [pos, setPos] = useState({ lat: marker.lat, lng: marker.lng });
    const prevRef = useRef({ lat: marker.lat, lng: marker.lng });
    const isAssigned = marker.type === "ASSIGNED_DRIVER";

    useEffect(() => {
        const from = prevRef.current;
        const to = { lat: marker.lat, lng: marker.lng };
        if (Math.abs(from.lat - to.lat) > 0.00001 || Math.abs(from.lng - to.lng) > 0.00001) {
            animateLatLng(setPos, from, to);
            prevRef.current = to;
        }
    }, [marker.lat, marker.lng]);

    return (
        <React.Fragment>
            <AdvancedMarker
                position={pos}
                onClick={() => {
                    if (onMarkerClick) onMarkerClick(marker);
                }}
            >
                <Vehicle3DMarker
                    type={marker.vehicleType}
                    heading={marker.heading || 0}
                    isAssigned={isAssigned}
                    etaText={marker.etaText}
                    rating={marker.rating}
                    driverName={marker.title}
                />
            </AdvancedMarker>

            {isActive && (
                <InfoWindow position={pos} onCloseClick={onClose}>
                    <div style={{ fontFamily: "system-ui,sans-serif", minWidth: "190px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", marginBottom: "6px" }}>
                            <b style={{ fontSize: "13px", color: "#0f172a" }}>{marker.title}</b>
                            {marker.rating && (
                                <span style={{ background: "#fef9c3", color: "#854d0e", fontSize: "10px", fontWeight: 800, padding: "2px 6px", borderRadius: "6px" }}>
                                    ★ {marker.rating.toFixed(1)}
                                </span>
                            )}
                        </div>
                        {marker.subtitle && <p style={{ fontSize: "11px", color: "#475569", margin: "2px 0" }}>{marker.subtitle}</p>}
                        {marker.licensePlate && <p style={{ fontSize: "10px", fontFamily: "monospace", color: "#64748b", margin: "3px 0" }}>🪪 {marker.licensePlate}</p>}
                        {(marker.distanceText || marker.etaText) && (
                            <div style={{ background: "#f0fdf4", color: "#166534", fontSize: "11px", fontWeight: 700, padding: "5px 8px", borderRadius: "8px", marginTop: "6px" }}>
                                {marker.distanceText || ""} {marker.etaText ? `• ETA ${marker.etaText}` : ""}
                            </div>
                        )}
                    </div>
                </InfoWindow>
            )}
        </React.Fragment>
    );
}

// ─── Inner map with route drawing ─────────────────────────────────────────
function InnerGoogleMap({
    markers,
    routes,
    onRouteCalculated,
    onMarkerClick,
}: {
    markers: MapMarker[];
    routes: MapRoute[];
    onRouteCalculated?: MapProps["onRouteCalculated"];
    onMarkerClick?: MapProps["onMarkerClick"];
}) {
    const map = useMap();
    const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
    const polylinesRef = useRef<google.maps.Polyline[]>([]);
    const prevRouteKeysRef = useRef<string>("");

    // ─── Fit bounds ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!map || markers.length === 0) return;
        const bounds = new google.maps.LatLngBounds();
        markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
        if (markers.length === 1) {
            map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
        } else {
            map.fitBounds(bounds, 80);
        }
    }, [map, markers]);

    // ─── Route drawing (cached) ──────────────────────────────────────────────
    useEffect(() => {
        if (!map || routes.length === 0) return;

        // Build a key representing all routes — only re-fetch if routes actually changed
        const newKey = routes.map(r => routeKey(r.origin, r.destination)).join("|");
        if (newKey === prevRouteKeysRef.current) return;
        prevRouteKeysRef.current = newKey;

        // Remove old polylines
        polylinesRef.current.forEach(p => p.setMap(null));
        polylinesRef.current = [];

        routes.forEach(async (route) => {
            const coords = await fetchOSRMRoute(route.origin, route.destination);

            const path = coords || [
                { lat: route.origin[0], lng: route.origin[1] },
                { lat: route.destination[0], lng: route.destination[1] },
            ];

            const poly = new google.maps.Polyline({
                path,
                map,
                strokeColor: route.color || "#0f172a",
                strokeWeight: 5,
                strokeOpacity: 0.9,
            });
            polylinesRef.current.push(poly);

            if (onRouteCalculated && coords) {
                let totalMetres = 0;
                for (let i = 1; i < coords.length; i++) {
                    const dLat = (coords[i].lat - coords[i-1].lat) * Math.PI / 180;
                    const dLng = (coords[i].lng - coords[i-1].lng) * Math.PI / 180;
                    const a = Math.sin(dLat/2)**2 + Math.cos(coords[i-1].lat*Math.PI/180)*Math.cos(coords[i].lat*Math.PI/180)*Math.sin(dLng/2)**2;
                    totalMetres += 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                }
                const distKm = totalMetres / 1000;
                const eta = Math.ceil((distKm / 28) * 60);
                onRouteCalculated({ distance: `${distKm.toFixed(2)} km`, eta: `${eta} min`, steps: [] });
            }
        });

        return () => {
            polylinesRef.current.forEach(p => p.setMap(null));
            polylinesRef.current = [];
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, routes]);

    const driverMarkers = markers.filter(
        m => m.type === "ASSIGNED_DRIVER" || m.type === "AVAILABLE_DRIVER" || m.type === "BUSY_DRIVER"
    );
    const staticMarkers = markers.filter(
        m => m.type !== "ASSIGNED_DRIVER" && m.type !== "AVAILABLE_DRIVER" && m.type !== "BUSY_DRIVER"
    );

    return (
        <>
            {/* Animated driver markers */}
            {driverMarkers.map((m) => (
                <AnimatedDriverMarker
                    key={`driver-${m.id}`}
                    marker={m}
                    onMarkerClick={(mk) => {
                        setActiveMarkerId(mk.id);
                        if (onMarkerClick) onMarkerClick(mk);
                    }}
                    isActive={activeMarkerId === m.id}
                    onClose={() => setActiveMarkerId(null)}
                />
            ))}

            {/* Static markers: pickup, destination, my_location */}
            {staticMarkers.map((m) => {
                const isPickup = m.type === "PICKUP";
                const isMyLocation = m.type === "MY_LOCATION";

                return (
                    <React.Fragment key={`static-${m.type}-${m.id}`}>
                        <AdvancedMarker
                            position={{ lat: m.lat, lng: m.lng }}
                            onClick={() => {
                                setActiveMarkerId(m.id);
                                if (onMarkerClick) onMarkerClick(m);
                            }}
                        >
                            {isMyLocation ? (
                                /* Pulsing blue dot for customer's own location */
                                <div className="relative w-5 h-5">
                                    <div className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping" />
                                    <div className="absolute inset-[3px] rounded-full bg-blue-600 border-2 border-white shadow-md" />
                                </div>
                            ) : m.type === "STOP" ? (
                                <div className="relative flex flex-col items-center justify-center cursor-pointer group">
                                    <div className="w-6 h-6 rounded-full bg-amber-500 border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-[11px] transition-transform group-hover:scale-110">
                                        {m.order || "•"}
                                    </div>
                                </div>
                            ) : isPickup ? (
                                <div className="relative flex flex-col items-center justify-center cursor-pointer group">
                                    {m.etaText && (
                                        <div className="absolute -top-7 bg-white text-slate-900 font-black text-[11px] px-2.5 py-0.5 rounded-full shadow-lg border border-slate-200 whitespace-nowrap flex items-center gap-1.5 z-30">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>{m.etaText}</span>
                                        </div>
                                    )}
                                    <div className="w-6 h-6 rounded-full bg-black border-2 border-white shadow-xl flex items-center justify-center transition-transform group-hover:scale-110">
                                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                    </div>
                                </div>
                            ) : (
                                <div className="relative flex flex-col items-center justify-center cursor-pointer group">
                                    <div className="w-6 h-6 rounded-md bg-black border-2 border-white shadow-xl flex items-center justify-center transition-transform group-hover:scale-110">
                                        <div className="w-2.5 h-2.5 rounded-xs bg-white" />
                                    </div>
                                </div>
                            )}
                        </AdvancedMarker>

                        {activeMarkerId === m.id && (
                            <InfoWindow
                                position={{ lat: m.lat, lng: m.lng }}
                                onCloseClick={() => setActiveMarkerId(null)}
                            >
                                <div style={{ fontFamily: "system-ui,sans-serif", minWidth: "190px" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", marginBottom: "6px" }}>
                                        <b style={{ fontSize: "13px", color: "#0f172a" }}>{m.title}</b>
                                    </div>
                                    {m.subtitle && <p style={{ fontSize: "11px", color: "#475569", margin: "2px 0" }}>{m.subtitle}</p>}
                                    {(m.distanceText || m.etaText) && (
                                        <div style={{ background: "#f0fdf4", color: "#166534", fontSize: "11px", fontWeight: 700, padding: "5px 8px", borderRadius: "8px", marginTop: "6px" }}>
                                            {m.distanceText || ""} {m.etaText ? `• ETA ${m.etaText}` : ""}
                                        </div>
                                    )}
                                </div>
                            </InfoWindow>
                        )}
                    </React.Fragment>
                );
            })}
        </>
    );
}

// ─── GoogleMapEngine (exported) ───────────────────────────────────────────
export default function GoogleMapEngine({
    center = [6.3156, -10.8074],
    zoom = 14,
    markers = [],
    routes = [],
    onRouteCalculated,
    onMarkerClick,
    fullScreen = false,
    className = "",
}: MapProps) {
    const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

    return (
        <div
            className={cn(
                "relative overflow-hidden",
                fullScreen ? "fixed inset-0 z-0 h-screen w-screen" : "h-full w-full rounded-3xl",
                className
            )}
        >
            <APIProvider apiKey={GOOGLE_KEY} libraries={["places", "geometry"]}>
                <GoogleMap
                    defaultCenter={{ lat: center[0], lng: center[1] }}
                    defaultZoom={zoom}
                    mapId="africab-live-map"
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    zoomControl={true}
                    streetViewControl={false}
                    fullscreenControl={false}
                    mapTypeControl={false}
                    tilt={45}
                    heading={0}
                    style={{ width: "100%", height: "100%" }}
                >
                    <InnerGoogleMap
                        markers={markers}
                        routes={routes}
                        onRouteCalculated={onRouteCalculated}
                        onMarkerClick={onMarkerClick}
                    />
                </GoogleMap>
            </APIProvider>

            {/* Attribution */}
            <div className="absolute bottom-2 left-2 z-10 text-[8px] text-gray-500/60 pointer-events-none uppercase tracking-widest font-bold">
                AfriCab Precision Telemetry
            </div>
        </div>
    );
}
