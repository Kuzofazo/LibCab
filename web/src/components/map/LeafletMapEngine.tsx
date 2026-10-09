"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { MapMarker, MapRoute, MapProps } from "@/components/MapComponent";

// ─── Vehicle emoji for popup labels ──────────────────────────────────────────
function vehicleEmoji(type?: string) {
    const t = (type || "").toLowerCase();
    if (t.includes("bike") || t.includes("motor")) return "🏍";
    if (t.includes("tri") || t.includes("keke")) return "🛺";
    return "🚗";
}

// ─── LeafletMapEngine ─────────────────────────────────────────────────────────
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

        let resizeObserver: ResizeObserver | null = null;

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

            // High performance Carto Voyager / OpenStreetMap tiles
            L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
                attribution: "© OpenStreetMap © CARTO",
                maxZoom: 19,
                subdomains: "abcd",
            }).addTo(map);

            // Zoom control
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

            // Observe container resize for responsive redraw
            if (typeof ResizeObserver !== "undefined" && containerRef.current) {
                resizeObserver = new ResizeObserver(() => {
                    if (mapRef.current) {
                        mapRef.current.invalidateSize();
                    }
                });
                resizeObserver.observe(containerRef.current);
            }
        });

        return () => {
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 2. Re-center when center prop changes
    useEffect(() => {
        if (!mapRef.current || !ready) return;
        mapRef.current.setView([center[0], center[1]], zoom, { animate: true });
        mapRef.current.invalidateSize();
    }, [center, zoom, ready]);

    // 3. Sync markers + routes
    useEffect(() => {
        if (!mapRef.current || !ready) return;
        const L = leafletRef.current || (typeof window !== "undefined" ? (window as any).L : null);
        if (!L) return;

        // Clear old layers
        layersRef.current.forEach(l => { try { mapRef.current.removeLayer(l); } catch {} });
        layersRef.current = [];

        const bounds: [number, number][] = [];

        // ─── Markers ──────────────────────────────────────────────────────────
        markers.forEach((m) => {
            if (!m.lat || !m.lng) return;
            bounds.push([m.lat, m.lng]);

            let iconHtml = "";
            if (m.type === "PICKUP") {
                iconHtml = `<div style="background:#16a34a;color:#fff;padding:6px 8px;border-radius:12px;font-size:18px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;">📍</div>`;
            } else if (m.type === "DESTINATION") {
                iconHtml = `<div style="background:#dc2626;color:#fff;padding:6px 8px;border-radius:12px;font-size:18px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;">🏁</div>`;
            } else {
                const isAssigned = m.type === "ASSIGNED_DRIVER";
                const bg = isAssigned ? "#059669" : "#0f172a";
                const emoji = vehicleEmoji(m.vehicleType);
                iconHtml = `<div style="background:${bg};color:#fff;padding:7px 10px;border-radius:14px;font-size:16px;border:2px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.4);display:flex;align-items:center;gap:4px;white-space:nowrap;${isAssigned ? "animation:pulse 1.4s infinite;" : ""}">
                    ${emoji}
                    ${m.heading ? `<span style="font-size:10px;opacity:.8;transform:rotate(${m.heading}deg);display:inline-block">▲</span>` : ""}
                </div>`;
            }

            const divIcon = L.divIcon({ html: iconHtml, className: "", iconAnchor: [20, 20] });
            const marker = L.marker([m.lat, m.lng], { icon: divIcon });

            // Popup
            const popupContent = `
                <div style="font-family:system-ui,sans-serif;min-width:180px">
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
        routes.forEach(async (route) => {
            try {
                const res = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${route.origin[1]},${route.origin[0]};${route.destination[1]},${route.destination[0]}?overview=full&geometries=geojson&steps=true`
                );
                if (!res.ok) throw new Error("OSRM failed");
                const data = await res.json();
                if (!data.routes?.[0]) throw new Error("No route");

                const r = data.routes[0];
                const coords = r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);

                const polyline = L.polyline(coords, {
                    color: route.color || "#0f172a",
                    weight: 5,
                    opacity: 0.85,
                });
                polyline.addTo(mapRef.current);
                layersRef.current.push(polyline);

                if (onRouteCalculated) {
                    onRouteCalculated({
                        distance: `${(r.distance / 1000).toFixed(2)} km`,
                        eta: `${Math.ceil(r.duration / 60)} min`,
                        steps: r.legs[0]?.steps || [],
                    });
                }
            } catch {
                // Straight-line fallback
                const fallback = L.polyline(
                    [route.origin, route.destination],
                    { color: route.color || "#0f172a", weight: 4, opacity: 0.7, dashArray: "8,6" }
                );
                fallback.addTo(mapRef.current);
                layersRef.current.push(fallback);
            }
        });

        // ─── Fit bounds ───────────────────────────────────────────────────────
        if (bounds.length > 1) {
            try { mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true }); } catch {}
        }

        mapRef.current.invalidateSize();
    }, [markers, routes, ready, onMarkerClick, onRouteCalculated]);

    return (
        <div
            className={cn(
                "relative overflow-hidden w-full h-full min-h-[280px]",
                fullScreen ? "fixed inset-0 z-0 h-screen w-screen" : "h-full w-full rounded-3xl",
                className
            )}
        >
            <div ref={containerRef} className="w-full h-full min-h-full" style={{ width: "100%", height: "100%" }} />
            {!ready && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50 rounded-3xl">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                        <span className="text-xs font-bold">Loading map…</span>
                    </div>
                </div>
            )}
        </div>
    );
}
