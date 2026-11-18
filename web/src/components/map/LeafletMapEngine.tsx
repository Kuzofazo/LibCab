"use client";

import React, { useEffect, useRef, useState } from "react";
import type { MapMarker, MapRoute, MapProps } from "@/components/MapComponent";
import { renderVehicle3DMarkerHTML } from "@/components/map/Vehicle3DMarker";

export default function LeafletMapEngine({
    center = [6.3156, -10.8074],
    zoom = 14,
    markers = [],
    routes = [],
    onRouteCalculated,
    onMarkerClick,
    fullScreen = false,
    className = "",
}: MapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leafletRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layersRef = useRef<any[]>([]);
    const [ready, setReady] = useState(false);

    // 1. Bootstrap Leaflet (dynamic import — no SSR)
    useEffect(() => {
        if (typeof window === "undefined") return;

        import("leaflet").then((L) => {
            if (!containerRef.current || mapRef.current) return;
            leafletRef.current = L;

            // Fix default icon paths broken by bundlers
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });

            const map = L.map(containerRef.current!, {
                center: [center[0], center[1]],
                zoom,
                zoomControl: false,
                attributionControl: false,
            });

            // High performance Carto Voyager tiles (Clean, modern ride-hailing map aesthetic)
            L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
                attribution: "© OpenStreetMap © CARTO",
                maxZoom: 19,
                subdomains: "abcd",
            }).addTo(map);

            // Zoom control bottom right
            L.control.zoom({ position: "bottomright" }).addTo(map);

            mapRef.current = map;
            setReady(true);

            // Trigger size calculation on mount & after layout reflow
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
            setTimeout(() => {
                map.invalidateSize();
            }, 500);
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                setReady(false);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 2. Center/zoom change sync
    useEffect(() => {
        if (!mapRef.current || !ready) return;
        const currentCenter = mapRef.current.getCenter();
        const dist = Math.abs(currentCenter.lat - center[0]) + Math.abs(currentCenter.lng - center[1]);
        if (dist > 0.001) {
            mapRef.current.setView([center[0], center[1]], zoom, { animate: true });
        }
    }, [center, zoom, ready]);

    // 3. Sync markers + routes
    useEffect(() => {
        if (!mapRef.current || !ready || !leafletRef.current) return;
        const L = leafletRef.current;

        // Clear existing markers & polylines
        layersRef.current.forEach((layer) => {
            try {
                mapRef.current?.removeLayer(layer);
            } catch {}
        });
        layersRef.current = [];

        const bounds: [number, number][] = [];

        // ─── Markers with 3D Vehicles & Uber-Style Pins ───────────────────────────
        markers.forEach((m) => {
            if (!m.lat || !m.lng) return;
            bounds.push([m.lat, m.lng]);

            let iconHtml = "";
            let anchor: [number, number] = [17, 32];

            if (m.type === "PICKUP") {
                anchor = [12, 12];
                const etaPill = m.etaText ? `
                    <div style="
                        position: absolute;
                        top: -30px;
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
                        ${m.etaText}
                    </div>` : "";

                iconHtml = `
                    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                        ${etaPill}
                        <div style="width: 22px; height: 22px; border-radius: 9999px; background: #000; border: 2.5px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
                            <div style="width: 8px; height: 8px; border-radius: 9999px; background: #fff;"></div>
                        </div>
                    </div>`;
            } else if (m.type === "DESTINATION") {
                anchor = [12, 12];
                iconHtml = `
                    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                        <div style="width: 20px; height: 20px; border-radius: 5px; background: #000; border: 2.5px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
                            <div style="width: 7px; height: 7px; border-radius: 1px; background: #fff;"></div>
                        </div>
                    </div>`;
            } else {
                // 3D Top-Down Taxi / Vehicle Marker matching reference photo
                const isAssigned = m.type === "ASSIGNED_DRIVER";
                anchor = [17, 32];
                iconHtml = renderVehicle3DMarkerHTML({
                    type: m.vehicleType,
                    heading: m.heading || 0,
                    isAssigned,
                    etaText: m.etaText,
                    rating: m.rating,
                    driverName: m.title,
                });
            }

            const divIcon = L.divIcon({ html: iconHtml, className: "", iconAnchor: anchor });
            const marker = L.marker([m.lat, m.lng], { icon: divIcon });

            // Popup
            const popupContent = `
                <div style="font-family:system-ui,sans-serif;min-width:190px">
                    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px">
                        <b style="font-size:13px;color:#0f172a">${m.title}</b>
                        ${m.rating ? `<span style="background:#fef9c3;color:#854d0e;font-size:10px;font-weight:800;padding:2px 6px;border-radius:6px">★ ${m.rating.toFixed(1)}</span>` : ""}
                    </div>
                    ${m.subtitle ? `<p style="font-size:11px;color:#475569;margin:2px 0">${m.subtitle}</p>` : ""}
                    ${m.licensePlate ? `<p style="font-size:10px;font-family:monospace;color:#64748b;margin:3px 0">🪪 ${m.licensePlate}</p>` : ""}
                    ${m.distanceText || m.etaText ? `<div style="background:#f0fdf4;color:#166534;font-size:11px;font-weight:700;padding:5px 8px;border-radius:8px;margin-top:6px">${m.distanceText || ""} ${m.etaText ? `• ETA ${m.etaText}` : ""}</div>` : ""}
                </div>`;

            marker.bindPopup(popupContent, { maxWidth: 240, closeButton: true });
            marker.on("click", () => { if (onMarkerClick) onMarkerClick(m); });
            marker.addTo(mapRef.current);
            layersRef.current.push(marker);
        });

        // ─── Routes via OSRM ──────────────────────────────────────────────────
        if (routes && routes.length > 0) {
            routes.forEach((route) => {
                if (!route.origin || !route.destination) return;
                bounds.push(route.origin);
                bounds.push(route.destination);

                fetch(
                    `https://router.project-osrm.org/route/v1/driving/${route.origin[1]},${route.origin[0]};${route.destination[1]},${route.destination[0]}?overview=full&geometries=geojson`
                )
                    .then((res) => res.json())
                    .then((data) => {
                        if (!mapRef.current) return;
                        if (data.routes?.[0]) {
                            const coords = data.routes[0].geometry.coordinates.map(
                                ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
                            );
                            // Sleek bold dark navy / black route line
                            const poly = L.polyline(coords, {
                                color: route.color || "#0f172a",
                                weight: 5,
                                opacity: 0.9,
                                lineJoin: "round",
                                lineCap: "round",
                            }).addTo(mapRef.current);
                            layersRef.current.push(poly);

                            if (onRouteCalculated) {
                                const r = data.routes[0];
                                onRouteCalculated({
                                    distance: `${(r.distance / 1000).toFixed(2)} km`,
                                    eta: `${Math.ceil(r.duration / 60)} min`,
                                    steps: r.legs?.[0]?.steps || [],
                                });
                            }
                        } else {
                            // Fallback straight line
                            const poly = L.polyline([route.origin, route.destination], {
                                color: route.color || "#0f172a",
                                weight: 5,
                                opacity: 0.85,
                            }).addTo(mapRef.current);
                            layersRef.current.push(poly);
                        }
                    })
                    .catch(() => {
                        if (!mapRef.current) return;
                        const poly = L.polyline([route.origin, route.destination], {
                            color: route.color || "#0f172a",
                            weight: 5,
                            opacity: 0.85,
                        }).addTo(mapRef.current);
                        layersRef.current.push(poly);
                    });
            });
        }

        // Fit map bounds if multiple markers/routes exist
        if (bounds.length > 1) {
            try {
                mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            } catch {}
        }
    }, [markers, routes, ready, onMarkerClick, onRouteCalculated]);

    return (
        <div
            className={`relative overflow-hidden ${
                fullScreen ? "fixed inset-0 z-0 h-screen w-screen" : "h-full w-full rounded-3xl"
            } ${className}`}
        >
            <div ref={containerRef} className="h-full w-full" />
            <div className="absolute bottom-2 left-2 z-10 text-[8px] text-gray-500/60 pointer-events-none uppercase tracking-widest font-bold">
                AfriCab Precision Telemetry
            </div>
        </div>
    );
}
