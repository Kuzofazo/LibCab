"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
    Car, Bike, Truck, Package,
    Compass, Radio, Lock, Unlock, Volume2,
    Activity, Cpu, X, Signal, Battery, Gauge
} from "lucide-react";
import type { MapMarker, MapRoute } from "@/components/MapComponent";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-3xl">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-500">Loading live map…</span>
            </div>
        </div>
    )
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrackedObject {
    id: string;
    name: string;
    type: "CAR" | "MOTORBIKE" | "TRICYCLE" | "DELIVERY_VAN" | "TRUCK" | "ELECTRONIC_DEVICE" | "CARGO" | "BUS" | string;
    licensePlate?: string;
    imei: string;
    trackerModel?: string;
    protocol?: string;
    driverName?: string;
    driverPhone?: string;
    status: "ACTIVE" | "IDLE" | "IN_TRANSIT" | "ON_TRIP" | "AVAILABLE" | "MAINTENANCE" | "OFFLINE" | "IMMOBILIZED" | string;
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
    batteryLevel?: number;
    signalStrength?: number;
    fuelLevel?: number;
    odometerKm?: number;
    engineRpm?: number;
    coolantTemp?: number;
    isIgnitionOn?: boolean;
    isImmobilized?: boolean;
    geofenceZone?: string;
    lastPing?: string | Date;
    rating?: number;
    reviewCount?: number;
    activeRide?: {
        id: string;
        status: string;
        passenger: string;
        passengerPhone?: string;
        pickup: string;
        destination: string;
        originLat?: number;
        originLng?: number;
        destLat?: number;
        destLng?: number;
        fare?: number;
    } | null;
}

interface LiveFleetMapProps {
    objects: TrackedObject[];
    selectedId?: string | null;
    onSelectObject?: (obj: TrackedObject) => void;
    onRemoteCommand?: (vehicleId: string, command: string) => Promise<unknown>;
    center?: [number, number];
    zoom?: number;
    className?: string;
    showBreadcrumbs?: boolean;
    /** If true, subscribes to SSE stream to auto-update positions in real time */
    liveTracking?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusBadge = (status: string, isImmobilized?: boolean) => {
    if (isImmobilized || status === "IMMOBILIZED")
        return "bg-red-100 text-red-700 border-red-300";
    switch (status) {
        case "ON_TRIP": case "IN_TRANSIT": return "bg-blue-100 text-blue-700 border-blue-300";
        case "AVAILABLE": case "ACTIVE": return "bg-emerald-100 text-emerald-700 border-emerald-300";
        case "IDLE": return "bg-amber-100 text-amber-700 border-amber-300";
        case "MAINTENANCE": return "bg-orange-100 text-orange-700 border-orange-300";
        case "OFFLINE": return "bg-slate-100 text-slate-500 border-slate-300";
        default: return "bg-emerald-100 text-emerald-700 border-emerald-300";
    }
};

const getAssetIcon = (type: string, size = 16) => {
    switch (type) {
        case "MOTORBIKE": return <Bike size={size} />;
        case "TRUCK": case "DELIVERY_VAN": return <Truck size={size} />;
        case "CARGO": return <Package size={size} />;
        case "ELECTRONIC_DEVICE": return <Radio size={size} />;
        default: return <Car size={size} />;
    }
};

const vehicleMapType = (type: string): string => {
    const t = type.toLowerCase();
    if (t.includes("bike") || t.includes("motor")) return "Bike";
    if (t.includes("tri") || t.includes("keke")) return "Tricycle";
    return "Car";
};

// ─── LiveFleetMap ─────────────────────────────────────────────────────────────

export default function LiveFleetMap({
    objects: initialObjects = [],
    selectedId = null,
    onSelectObject,
    onRemoteCommand,
    center = [6.3156, -10.8074],
    zoom = 13,
    className = "",
    liveTracking = true,
}: LiveFleetMapProps) {
    const [objects, setObjects] = useState<TrackedObject[]>(initialObjects);
    const [activeObject, setActiveObject] = useState<TrackedObject | null>(null);
    const [commandLoading, setCommandLoading] = useState<string | null>(null);
    const [commandStatus, setCommandStatus] = useState<string | null>(null);

    // Keep local objects in sync with incoming prop changes
    useEffect(() => {
        setObjects(initialObjects);
    }, [initialObjects]);

    // Update active object when its data refreshes
    useEffect(() => {
        if (selectedId) {
            const found = objects.find(o => o.id === selectedId);
            if (found) setActiveObject(found);
        }
    }, [selectedId, objects]);

    useEffect(() => {
        if (activeObject) {
            const updated = objects.find(o => o.id === activeObject.id);
            if (updated) setActiveObject(updated);
        }
    }, [objects, activeObject]);

    // ── Live SSE position updates ────────────────────────────────────────────
    useEffect(() => {
        if (!liveTracking) return;

        let es: EventSource | null = null;
        try {
            es = new EventSource("/api/rides/stream");
            es.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    if (parsed.type === "LOCATION_UPDATED" && parsed.data) {
                        const { driverId, lat, lng, speed, heading } = parsed.data;
                        setObjects(prev => prev.map(obj =>
                            obj.id === driverId ? { ...obj, lat, lng, speed, heading } : obj
                        ));
                    }
                } catch {}
            };
        } catch {}

        return () => { if (es) es.close(); };
    }, [liveTracking]);

    // ── Convert TrackedObjects → MapMarkers ──────────────────────────────────
    const mapMarkers: MapMarker[] = objects
        .filter(o => o.lat && o.lng)
        .map(o => ({
            id: o.id,
            lat: o.lat,
            lng: o.lng,
            title: o.driverName || o.name,
            subtitle: `${o.licensePlate || "No plate"} • ${o.type}`,
            type: (o.status === "ON_TRIP" || o.status === "IN_TRANSIT")
                ? "ASSIGNED_DRIVER"
                : o.status === "OFFLINE" || o.isImmobilized
                ? "BUSY_DRIVER"
                : "AVAILABLE_DRIVER",
            vehicleType: vehicleMapType(o.type),
            licensePlate: o.licensePlate,
            rating: o.rating,
            heading: o.heading,
            distanceText: o.speed != null ? `${o.speed.toFixed(0)} km/h` : undefined,
            etaText: o.status,
            onSelect: () => {
                setActiveObject(o);
                if (onSelectObject) onSelectObject(o);
            },
        }));

    // Active ride route (driver → pickup → destination)
    const mapRoutes: MapRoute[] = [];
    if (activeObject?.activeRide?.originLat && activeObject?.activeRide?.originLng) {
        mapRoutes.push({
            id: "to-pickup",
            origin: [activeObject.lat, activeObject.lng],
            destination: [activeObject.activeRide.originLat, activeObject.activeRide.originLng],
            color: "#059669",
        });
    }
    if (activeObject?.activeRide?.destLat && activeObject?.activeRide?.destLng
        && activeObject?.activeRide?.originLat && activeObject?.activeRide?.originLng) {
        mapRoutes.push({
            id: "to-destination",
            origin: [activeObject.activeRide.originLat, activeObject.activeRide.originLng],
            destination: [activeObject.activeRide.destLat, activeObject.activeRide.destLng],
            color: "#f59e0b",
        });
    }

    // Customer pickup marker when active
    const activeRideMarkers: MapMarker[] = [];
    if (activeObject?.activeRide?.originLat && activeObject.activeRide.originLng) {
        activeRideMarkers.push({
            id: "pickup",
            lat: activeObject.activeRide.originLat,
            lng: activeObject.activeRide.originLng,
            title: activeObject.activeRide.passenger || "Customer",
            subtitle: activeObject.activeRide.pickup,
            type: "PICKUP",
        });
    }
    if (activeObject?.activeRide?.destLat && activeObject.activeRide.destLng) {
        activeRideMarkers.push({
            id: "destination",
            lat: activeObject.activeRide.destLat,
            lng: activeObject.activeRide.destLng,
            title: "Destination",
            subtitle: activeObject.activeRide.destination,
            type: "DESTINATION",
        });
    }

    const handleExecuteCommand = async (command: string) => {
        if (!activeObject) return;
        setCommandLoading(command);
        setCommandStatus(null);
        try {
            if (onRemoteCommand) {
                const res = await onRemoteCommand(activeObject.id, command);
                setCommandStatus((res as { message?: string })?.message || `Command ${command} executed.`);
            } else {
                const res = await fetch("/api/fleet/telemetry", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "REMOTE_COMMAND", vehicleId: activeObject.id, command })
                });
                const data = await res.json();
                setCommandStatus(data.message || "Command executed.");
            }
        } catch (e: unknown) {
            setCommandStatus(`Failed: ${e instanceof Error ? e.message : "Unknown error"}`);
        } finally {
            setCommandLoading(null);
            setTimeout(() => setCommandStatus(null), 4000);
        }
    };

    return (
        <div className={`relative w-full h-full bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xl flex flex-col ${className}`}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0 bg-white z-10">
                <div className="flex items-center gap-3">
                    <div className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </div>
                    <div>
                        <span className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                            <Cpu size={12} className="text-emerald-600" /> Live Fleet Radar
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                            {objects.filter(o => o.status !== "OFFLINE").length} online • Monrovia Grid
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Status legend */}
                    {[
                        { label: "Available", color: "bg-emerald-500" },
                        { label: "On Trip", color: "bg-blue-500" },
                        { label: "Idle", color: "bg-amber-500" },
                        { label: "Offline", color: "bg-slate-400" },
                    ].map(({ label, color }) => (
                        <span key={label} className="hidden sm:flex items-center gap-1 text-[9px] font-bold text-slate-600">
                            <span className={`w-2 h-2 rounded-full ${color}`} /> {label}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Real Map ───────────────────────────────────────────────── */}
            <div className="flex-1 relative min-h-0">
                <MapComponent
                    center={activeObject
                        ? [activeObject.lat, activeObject.lng]
                        : center}
                    zoom={activeObject ? 15 : zoom}
                    markers={[...mapMarkers, ...activeRideMarkers]}
                    routes={mapRoutes}
                    onMarkerClick={(m) => {
                        const obj = objects.find(o => o.id === m.id);
                        if (obj) {
                            setActiveObject(obj);
                            if (onSelectObject) onSelectObject(obj);
                        }
                    }}
                    className="w-full h-full rounded-none"
                />

                {/* Objects count badge */}
                <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                        {mapMarkers.length} drivers mapped
                    </span>
                </div>

                {/* Reset focus button */}
                {activeObject && (
                    <button
                        onClick={() => setActiveObject(null)}
                        className="absolute top-3 right-3 z-20 px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-sm text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-all"
                    >
                        <Compass size={12} /> Show All
                    </button>
                )}
            </div>

            {/* ── Selected Driver Telematics HUD ─────────────────────────── */}
            {activeObject && (
                <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 space-y-4">
                    {/* Identity Row */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
                                {getAssetIcon(activeObject.type, 20)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base font-black text-slate-950">{activeObject.driverName || activeObject.name}</h3>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${getStatusBadge(activeObject.status, activeObject.isImmobilized)}`}>
                                        {activeObject.isImmobilized ? "IMMOBILIZED" : activeObject.status}
                                    </span>
                                    {activeObject.rating && (
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                            ★ {activeObject.rating.toFixed(1)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-600 font-mono mt-0.5">
                                    {activeObject.licensePlate || "No plate"} • {activeObject.type} • {activeObject.driverPhone || "N/A"}
                                </p>
                                {activeObject.activeRide && (
                                    <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl text-blue-800 w-fit">
                                        <span className="uppercase tracking-wider">Passenger:</span>
                                        <span>{activeObject.activeRide.passenger}</span>
                                        <span className="text-slate-400">→</span>
                                        <span className="truncate max-w-[180px] text-slate-700">{activeObject.activeRide.destination}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setActiveObject(null)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Telemetry Gauges */}
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { label: "Speed", value: `${activeObject.speed?.toFixed(0) || 0} km/h`, icon: <Gauge size={12} />, color: "text-amber-600" },
                            { label: "Battery", value: `${activeObject.batteryLevel || 100}%`, icon: <Battery size={12} />, color: "text-blue-600" },
                            { label: "Signal", value: `${activeObject.signalStrength || 100}%`, icon: <Signal size={12} />, color: "text-emerald-600" },
                            { label: "Fuel", value: `${activeObject.fuelLevel?.toFixed(0) || "—"}%`, icon: <Activity size={12} />, color: "text-purple-600" },
                        ].map(({ label, value, icon, color }) => (
                            <div key={label} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                                <div className={`flex items-center justify-center gap-1 ${color} mb-1`}>{icon}</div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">{label}</span>
                                <span className={`text-sm font-black ${color}`}>{value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Remote Commands */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {commandStatus && (
                            <p className="text-[10px] font-bold text-emerald-700 flex-1">{commandStatus}</p>
                        )}
                        {activeObject.isImmobilized ? (
                            <button onClick={() => handleExecuteCommand("RESTORE_ENGINE")} disabled={Boolean(commandLoading)}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] transition-all disabled:opacity-50">
                                <Unlock size={13} /> Restore Engine
                            </button>
                        ) : (
                            <button onClick={() => handleExecuteCommand("IMMOBILIZE_ENGINE")} disabled={Boolean(commandLoading)}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-[11px] transition-all disabled:opacity-50">
                                <Lock size={13} /> Immobilize
                            </button>
                        )}
                        <button onClick={() => handleExecuteCommand("TRIGGER_ALARM")} disabled={Boolean(commandLoading)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition-all">
                            <Volume2 size={13} className="text-amber-600" /> Siren
                        </button>
                        <button onClick={() => handleExecuteCommand("REQUEST_DTC_SCAN")} disabled={Boolean(commandLoading)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition-all">
                            <Activity size={13} className="text-purple-600" /> DTC Scan
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
