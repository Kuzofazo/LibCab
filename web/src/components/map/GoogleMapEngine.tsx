"use client";

import React, { useEffect, useRef, useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { cn } from "@/lib/utils";
import type { MapMarker, MapRoute, MapProps } from "@/components/MapComponent";

// ─── Vehicle emoji ─────────────────────────────────────────────────────────
function vehicleEmoji(type?: string) {
    const t = (type || "").toLowerCase();
    if (t.includes("bike") || t.includes("motor")) return "🏍";
    if (t.includes("tri") || t.includes("keke")) return "🛺";
    return "🚗";
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
                        strokeOpacity: 0.85,
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

            // Ultimate fallback: straight-line arrow polyline
            const poly = new google.maps.Polyline({
                path: [
                    { lat: route.origin[0], lng: route.origin[1] },
                    { lat: route.destination[0], lng: route.destination[1] },
                ],
                map,
                strokeColor: route.color || "#0f172a",
                strokeWeight: 4,
                strokeOpacity: 0.6,
                icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW }, offset: "50%" }],
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
                                <div
                                    style={{
                                        background: isAssigned ? "#059669" : "#0f172a",
                                        color: "#fff",
                                        padding: "7px 10px",
                                        borderRadius: "14px",
                                        fontSize: "16px",
                                        border: "2px solid #fff",
                                        boxShadow: isAssigned ? "0 0 0 4px rgba(5,150,105,.3)" : "0 2px 12px rgba(0,0,0,.4)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        transform: m.heading ? `rotate(${m.heading}deg)` : undefined,
                                    }}
                                >
                                    {vehicleEmoji(m.vehicleType)}
                                </div>
                            ) : (
                                <Pin
                                    background={isPickup ? "#16a34a" : "#dc2626"}
                                    borderColor="#fff"
                                    glyphColor="#fff"
                                    glyph={isPickup ? "P" : "D"}
                                    scale={1.2}
                                />
                            )}
                        </AdvancedMarker>

                        {/* InfoWindow popup when clicked */}
                        {activeMarker?.id === m.id && (
                            <InfoWindow
                                position={{ lat: m.lat, lng: m.lng }}
                                onCloseClick={() => setActiveMarker(null)}
                            >
                                <div style={{ fontFamily: "system-ui,sans-serif", minWidth: "180px" }}>
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

// ─── GoogleMapEngine (exported) ─────────────────────────────────────────────
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
