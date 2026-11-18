"use client";

import React, { useEffect, useRef, useState } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { cn } from "@/lib/utils";
import type { MapMarker, MapRoute, MapProps } from "@/components/MapComponent";
import Vehicle3DMarker from "@/components/map/Vehicle3DMarker";

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
    const [activeMarker, setActiveMarker] = useState<MapMarker | null>(null);
    const polylinesRef = useRef<google.maps.Polyline[]>([]);

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

    // ─── Route drawing ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!map || routes.length === 0) return;

        // Remove old polylines
        polylinesRef.current.forEach(p => p.setMap(null));
        polylinesRef.current = [];

        routes.forEach(async (route) => {
            // Primary: OSRM open-source routing (no legacy API key needed)
            try {
                const res = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${route.origin[1]},${route.origin[0]};${route.destination[1]},${route.destination[0]}?overview=full&geometries=geojson`
                );
                const data = await res.json();
                if (data.routes?.[0]) {
                    const coords = data.routes[0].geometry.coordinates.map(
                        ([lng, lat]: [number, number]) => ({ lat, lng })
                    );
                    const poly = new google.maps.Polyline({
                        path: coords,
                        map,
                        strokeColor: route.color || "#0f172a",
                        strokeWeight: 5,
                        strokeOpacity: 0.9,
                    });
                    polylinesRef.current.push(poly);

                    if (onRouteCalculated) {
                        const r = data.routes[0];
                        onRouteCalculated({
                            distance: `${(r.distance / 1000).toFixed(2)} km`,
                            eta: `${Math.ceil(r.duration / 60)} min`,
                            steps: r.legs?.[0]?.steps || [],
                        });
                    }
                    return;
                }
            } catch {
                // Fallback below
            }

            // Fallback: straight-line polyline
            const poly = new google.maps.Polyline({
                path: [
                    { lat: route.origin[0], lng: route.origin[1] },
                    { lat: route.destination[0], lng: route.destination[1] },
                ],
                map,
                strokeColor: route.color || "#0f172a",
                strokeWeight: 5,
                strokeOpacity: 0.85,
            });
            polylinesRef.current.push(poly);
        });

        return () => {
            polylinesRef.current.forEach(p => p.setMap(null));
            polylinesRef.current = [];
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, routes]);

    return (
        <>
            {/* Render Markers */}
            {markers.map((m) => {
                const isDriver = m.type.includes("DRIVER");
                const isAssigned = m.type === "ASSIGNED_DRIVER";
                const isPickup = m.type === "PICKUP";

                return (
                    <React.Fragment key={`${m.type}-${m.id}`}>
                        <AdvancedMarker
                            position={{ lat: m.lat, lng: m.lng }}
                            onClick={() => {
                                setActiveMarker(m);
                                if (onMarkerClick) onMarkerClick(m);
                            }}
                        >
                            {isDriver ? (
                                <Vehicle3DMarker
                                    type={m.vehicleType}
                                    heading={m.heading || 0}
                                    isAssigned={isAssigned}
                                    etaText={m.etaText}
                                    rating={m.rating}
                                    driverName={m.title}
                                />
                            ) : isPickup ? (
                                /* Uber/Bolt Style Black Circle Pickup Pin with ETA */
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
                                /* Clean Black Square Destination Pin */
                                <div className="relative flex flex-col items-center justify-center cursor-pointer group">
                                    <div className="w-6 h-6 rounded-md bg-black border-2 border-white shadow-xl flex items-center justify-center transition-transform group-hover:scale-110">
                                        <div className="w-2.5 h-2.5 rounded-xs bg-white" />
                                    </div>
                                </div>
                            )}
                        </AdvancedMarker>

                        {/* InfoWindow popup when clicked */}
                        {activeMarker?.id === m.id && (
                            <InfoWindow
                                position={{ lat: m.lat, lng: m.lng }}
                                onCloseClick={() => setActiveMarker(null)}
                            >
                                <div style={{ fontFamily: "system-ui,sans-serif", minWidth: "190px" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", marginBottom: "6px" }}>
                                        <b style={{ fontSize: "13px", color: "#0f172a" }}>{m.title}</b>
                                        {m.rating && (
                                            <span style={{ background: "#fef9c3", color: "#854d0e", fontSize: "10px", fontWeight: 800, padding: "2px 6px", borderRadius: "6px" }}>
                                                ★ {m.rating.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                    {m.subtitle && <p style={{ fontSize: "11px", color: "#475569", margin: "2px 0" }}>{m.subtitle}</p>}
                                    {m.licensePlate && <p style={{ fontSize: "10px", fontFamily: "monospace", color: "#64748b", margin: "3px 0" }}>🪪 {m.licensePlate}</p>}
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
                <Map
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
                </Map>
            </APIProvider>

            {/* Attribution */}
            <div className="absolute bottom-2 left-2 z-10 text-[8px] text-gray-500/60 pointer-events-none uppercase tracking-widest font-bold">
                AfriCab Precision Telemetry
            </div>
        </div>
    );
}
