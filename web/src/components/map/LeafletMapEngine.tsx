"use client";

import React, { useEffect, useRef, useState } from "react";
import type { MapMarker, MapRoute, MapProps } from "@/components/MapComponent";
import { renderVehicle3DMarkerHTML } from "@/components/map/Vehicle3DMarker";

// ─── Route cache (origin+dest hash → polyline coords) ─────────────────────
const routeCache = new Map<string, [number, number][]>();

function routeKey(origin: [number, number], dest: [number, number]): string {
    return `${origin[0].toFixed(4)},${origin[1].toFixed(4)}-${dest[0].toFixed(4)},${dest[1].toFixed(4)}`;
}

async function fetchOSRMRoute(
    origin: [number, number],
    dest: [number, number]
): Promise<[number, number][] | null> {
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
            ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
        );
        routeCache.set(key, coords);
        return coords;
    } catch {
        return null;
    }
}

// ─── Smooth driver marker animation ───────────────────────────────────────
const ANIMATE_DURATION_MS = 1200;

function animateMarker(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    marker: any,
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
) {
    const start = performance.now();
    function step(now: number) {
        const t = Math.min((now - start) / ANIMATE_DURATION_MS, 1);
        // Ease-out cubic
        const ease = 1 - Math.pow(1 - t, 3);
        const lat = from.lat + (to.lat - from.lat) * ease;
        const lng = from.lng + (to.lng - from.lng) * ease;
        try {
            marker.setLatLng([lat, lng]);
        } catch {
            return;
        }
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

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
    const staticLayersRef = useRef<any[]>([]); // routes + non-driver markers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const driverMarkersRef = useRef<Map<string, any>>(new Map()); // id → Leaflet marker (for smooth animation)
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

            setTimeout(() => { map.invalidateSize(); }, 100);
            setTimeout(() => { map.invalidateSize(); }, 500);
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                driverMarkersRef.current.clear();
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

        // ── Clear static layers (routes + non-driver markers) ──────────────
        staticLayersRef.current.forEach((layer) => {
            try { mapRef.current?.removeLayer(layer); } catch {}
        });
        staticLayersRef.current = [];

        const bounds: [number, number][] = [];

        // ── Separate driver markers from static markers ───────────────────
        const driverMarkerIds = new Set(
            markers
                .filter(m => m.type === "ASSIGNED_DRIVER" || m.type === "AVAILABLE_DRIVER" || m.type === "BUSY_DRIVER")
                .map(m => m.id)
        );

        // Remove driver markers that are no longer in the list
        driverMarkersRef.current.forEach((leafletMarker, id) => {
            if (!driverMarkerIds.has(id)) {
                try { mapRef.current?.removeLayer(leafletMarker); } catch {}
                driverMarkersRef.current.delete(id);
            }
        });

        // ── Render all markers ────────────────────────────────────────────
        markers.forEach((m) => {
            if (!m.lat || !m.lng) return;
            bounds.push([m.lat, m.lng]);

            const isDriver = m.type === "ASSIGNED_DRIVER" || m.type === "AVAILABLE_DRIVER" || m.type === "BUSY_DRIVER";

            let iconHtml = "";
            let anchor: [number, number] = [17, 32];

            if (m.type === "MY_LOCATION") {
                anchor = [10, 10];
                iconHtml = `
                    <div style="position:relative;width:20px;height:20px;">
                        <div style="position:absolute;inset:0;border-radius:9999px;background:rgba(37,99,235,0.2);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
                        <div style="position:absolute;inset:3px;border-radius:9999px;background:#2563eb;border:2px solid #fff;box-shadow:0 2px 8px rgba(37,99,235,0.5);"></div>
                    </div>`;
            } else if (m.type === "PICKUP") {
                anchor = [12, 12];
                const etaPill = m.etaText ? `
                    <div style="
                        position: absolute; top: -30px; left: 50%;
                        transform: translateX(-50%);
                        background: #ffffff; color: #0f172a;
                        font-size: 11px; font-weight: 900;
                        padding: 3px 8px; border-radius: 9999px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                        white-space: nowrap; display: flex; align-items: center; gap: 4px;
                        border: 1px solid rgba(0,0,0,0.08); z-index: 100;
                    ">
                        <span style="display:inline-block;width:6px;height:6px;border-radius:9999px;background:#22c55e;"></span>
                        ${m.etaText}
                    </div>` : "";
                iconHtml = `
                    <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                        ${etaPill}
                        <div style="width:22px;height:22px;border-radius:9999px;background:#000;border:2.5px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
                            <div style="width:8px;height:8px;border-radius:9999px;background:#fff;"></div>
                        </div>
                    </div>`;
            } else if (m.type === "DESTINATION") {
                anchor = [12, 12];
                iconHtml = `
                    <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                        <div style="width:20px;height:20px;border-radius:5px;background:#000;border:2.5px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
                            <div style="width:7px;height:7px;border-radius:1px;background:#fff;"></div>
                        </div>
                    </div>`;
            } else if (m.type === "STOP") {
                anchor = [12, 12];
                iconHtml = `
                    <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                        <div style="width:22px;height:22px;border-radius:9999px;background:#f59e0b;border:2.5px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:900;font-family:system-ui,sans-serif;">
                            ${m.order || "•"}
                        </div>
                    </div>`;
            } else if (isDriver) {
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

            if (isDriver) {
                // ── Smooth-animate existing driver markers ────────────────
                const existing = driverMarkersRef.current.get(m.id);
                if (existing) {
                    const prevLatLng = existing.getLatLng();
                    const from = { lat: prevLatLng.lat, lng: prevLatLng.lng };
                    const to = { lat: m.lat, lng: m.lng };
                    // Only animate if position actually changed
                    if (Math.abs(from.lat - to.lat) > 0.00001 || Math.abs(from.lng - to.lng) > 0.00001) {
                        animateMarker(existing, from, to);
                    }
                    // Update icon (heading may have changed)
                    const newIcon = L.divIcon({ html: iconHtml, className: "", iconAnchor: anchor });
                    existing.setIcon(newIcon);
                } else {
                    // Create new driver marker
                    const divIcon = L.divIcon({ html: iconHtml, className: "", iconAnchor: anchor });
                    const marker = L.marker([m.lat, m.lng], { icon: divIcon });
                    marker.bindPopup(popupContent, { maxWidth: 240, closeButton: true });
                    marker.on("click", () => { if (onMarkerClick) onMarkerClick(m); });
                    marker.addTo(mapRef.current);
                    driverMarkersRef.current.set(m.id, marker);
                }
            } else {
                // Static marker (pickup, destination, my location)
                const divIcon = L.divIcon({ html: iconHtml, className: "", iconAnchor: anchor });
                const marker = L.marker([m.lat, m.lng], { icon: divIcon });
                marker.bindPopup(popupContent, { maxWidth: 240, closeButton: true });
                marker.on("click", () => { if (onMarkerClick) onMarkerClick(m); });
                marker.addTo(mapRef.current);
                staticLayersRef.current.push(marker);
            }
        });

        // ── Routes via OSRM (cached) ───────────────────────────────────────
        if (routes && routes.length > 0) {
            routes.forEach((route) => {
                if (!route.origin || !route.destination) return;
                bounds.push(route.origin);
                bounds.push(route.destination);

                fetchOSRMRoute(route.origin, route.destination)
                    .then((coords) => {
                        if (!mapRef.current) return;
                        const lineCoords = coords || [route.origin, route.destination];
                        const poly = L.polyline(lineCoords, {
                            color: route.color || "#0f172a",
                            weight: 5,
                            opacity: 0.9,
                            lineJoin: "round",
                            lineCap: "round",
                        }).addTo(mapRef.current);
                        staticLayersRef.current.push(poly);

                        if (onRouteCalculated && coords) {
                            // Approximate distance from polyline points
                            let totalMetres = 0;
                            for (let i = 1; i < coords.length; i++) {
                                const dLat = (coords[i][0] - coords[i-1][0]) * Math.PI / 180;
                                const dLng = (coords[i][1] - coords[i-1][1]) * Math.PI / 180;
                                const a = Math.sin(dLat/2)**2 + Math.cos(coords[i-1][0]*Math.PI/180)*Math.cos(coords[i][0]*Math.PI/180)*Math.sin(dLng/2)**2;
                                totalMetres += 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                            }
                            const distKm = totalMetres / 1000;
                            const eta = Math.ceil((distKm / 28) * 60);
                            onRouteCalculated({ distance: `${distKm.toFixed(2)} km`, eta: `${eta} min`, steps: [] });
                        }
                    })
                    .catch(() => {
                        if (!mapRef.current) return;
                        const poly = L.polyline([route.origin, route.destination], {
                            color: route.color || "#0f172a",
                            weight: 5,
                            opacity: 0.85,
                        }).addTo(mapRef.current);
                        staticLayersRef.current.push(poly);
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
