"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
    Car,
    Search,
    RefreshCcw,
    Activity,
    Battery,
    Navigation
} from "lucide-react";
import LiveFleetMap, { TrackedObject } from "@/components/map/LiveFleetMap";
import Link from "next/link";
import Image from "next/image";

interface ActiveDriver {
    id: string;
    driverProfileId?: string;
    name: string;
    email: string;
    phone: string;
    vehicleModel: string;
    vehicleColor: string;
    vehicleType: string;
    licensePlate: string;
    driverLicense?: string;
    imei: string;
    deviceId?: string;
    status: "AVAILABLE" | "ON_TRIP" | string;
    isOnline: boolean;
    rating: number;
    reviewCount: number;
    currentLat: number;
    currentLng: number;
    speed: number;
    heading: number;
    batteryLevel: number;
    signalStrength: number;
    lastPing?: string;
    activeRide?: {
        id: string;
        status: string;
        passenger: string;
        passengerPhone?: string;
        pickup: string;
        destination: string;
        fare?: number;
    } | null;
}

export default function FleetPortalPage() {
    const [drivers, setDrivers] = useState<ActiveDriver[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState("ALL");
    const [selectedStatus, setSelectedStatus] = useState("ALL");
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalOnline: 0,
        available: 0,
        onTrip: 0,
        averageSpeed: 0
    });

    const getHeaders = () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        return {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
        };
    };

    const fetchData = useCallback(async () => {
        try {
            const params = new URLSearchParams({
                ...(selectedType !== "ALL" ? { vehicleType: selectedType } : {}),
                ...(selectedStatus !== "ALL" ? { status: selectedStatus } : {}),
                ...(searchQuery ? { q: searchQuery } : {}),
                _t: Date.now().toString()
            });

            const res = await fetch(`/api/fleet/drivers?${params.toString()}`, {
                headers: getHeaders(),
                cache: "no-store"
            });
            const data = await res.json();

            if (data.drivers) {
                // Strictly active online drivers only
                const active = data.drivers.filter((d: ActiveDriver) => d.isOnline);
                setDrivers(active);
            }
            if (data.stats) {
                setStats(data.stats);
            }
        } catch (e) {
            console.error("Failed to load active fleet portal data:", e);
        } finally {
            setLoading(false);
        }
    }, [selectedType, selectedStatus, searchQuery]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000); // SSE handles real-time; polling is fallback only
        return () => clearInterval(interval);
    }, [fetchData]);

    // Map active drivers into TrackedObjects for LiveFleetMap
    const mapObjects: TrackedObject[] = drivers
        .filter(d => d.currentLat && d.currentLng && d.isOnline)
        .map(d => ({
            id: d.id,
            name: `${d.vehicleColor ? d.vehicleColor + " " : ""}${d.vehicleModel}`,
            type: d.vehicleType || "CAR",
            licensePlate: d.licensePlate,
            imei: d.imei || `IMEI-${d.id.slice(-6)}`,
            driverName: d.name,
            driverPhone: d.phone,
            status: d.status === "ON_TRIP" ? "ON_TRIP" : "AVAILABLE",
            lat: d.currentLat,
            lng: d.currentLng,
            speed: d.speed || 0,
            heading: d.heading || 0,
            batteryLevel: d.batteryLevel || 100,
            signalStrength: d.signalStrength || 100,
            fuelLevel: 100,
            rating: d.rating,
            reviewCount: d.reviewCount,
            lastPing: d.lastPing,
            activeRide: d.activeRide
        }));

    const selectedDriver = drivers.find(d => d.id === selectedDriverId);

    return (
        <div className="min-h-screen bg-[#070c14] text-white p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Top Navigation & Brand Ribbon */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/90 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                            <Image
                                src="/africab-logo.png"
                                alt="AfriCab Logo"
                                width={56}
                                height={56}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-white tracking-tight">LibCab Active Fleet Telematics</h1>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    LIVE SATELLITE RADAR
                                </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-400 mt-0.5">
                                Live GPS Radar & Active Driver Telemetry Stream
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        <button
                            onClick={fetchData}
                            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all border border-white/10"
                        >
                            <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
                            <span>Refresh Stream</span>
                        </button>
                        <Link
                            href="/admin/dispatch"
                            className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
                        >
                            <Navigation size={16} />
                            <span>Dispatch Terminal</span>
                        </Link>
                    </div>
                </header>

                {/* KPI Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-900/70 p-4 rounded-2xl border border-white/10 text-center">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">Active Online</span>
                        <span className="text-2xl font-black text-emerald-400 mt-1 block">{stats.totalOnline}</span>
                    </div>
                    <div className="bg-slate-900/70 p-4 rounded-2xl border border-white/10 text-center">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">On Active Trip</span>
                        <span className="text-2xl font-black text-blue-400 mt-1 block">{stats.onTrip}</span>
                    </div>
                    <div className="bg-slate-900/70 p-4 rounded-2xl border border-white/10 text-center">
                        <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest block">Available / Ready</span>
                        <span className="text-2xl font-black text-yellow-400 mt-1 block">{stats.available}</span>
                    </div>
                    <div className="bg-slate-900/70 p-4 rounded-2xl border border-white/10 text-center">
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block">Average Speed</span>
                        <span className="text-2xl font-black text-purple-400 font-mono mt-1 block">
                            {stats.averageSpeed.toFixed(1)} <span className="text-xs text-slate-400 font-sans">km/h</span>
                        </span>
                    </div>
                </div>

                {/* Search & Filter Ribbon */}
                <div className="bg-slate-900/80 p-4 rounded-[2rem] border border-white/10 flex flex-col lg:flex-row justify-between items-center gap-4">
                    <div className="relative flex-1 w-full lg:w-96">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Filter active driver, plate, vehicle model, IMEI..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-950 rounded-xl text-xs font-bold text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:border-yellow-400/50"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="px-3 py-2 bg-slate-950 rounded-xl text-xs font-bold text-slate-300 border border-white/10 focus:outline-none"
                        >
                            <option value="ALL">All Online Statuses</option>
                            <option value="AVAILABLE">Available / Ready</option>
                            <option value="ON_TRIP">On Trip with Rider</option>
                        </select>

                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="px-3 py-2 bg-slate-950 rounded-xl text-xs font-bold text-slate-300 border border-white/10 focus:outline-none"
                        >
                            <option value="ALL">All Vehicle Types</option>
                            <option value="CAR">Cars / Sedans</option>
                            <option value="SUV">SUVs / 4x4</option>
                            <option value="TRICYCLE">Tricycles (Keke)</option>
                            <option value="MOTORBIKE">Motorbikes</option>
                        </select>
                    </div>
                </div>

                {/* Main Interactive Fleet Grid / Live Map View */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Sidebar: Active Drivers List */}
                    <div className="bg-slate-900/80 rounded-[2.5rem] p-6 border border-white/10 shadow-2xl flex flex-col h-[650px]">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                            <div>
                                <h3 className="text-base font-black text-white tracking-tight">Active Online Drivers</h3>
                                <p className="text-[11px] font-semibold text-slate-400">{drivers.length} drivers streaming live</p>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                GPS ACTIVE
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {drivers.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Car size={36} className="mx-auto mb-2 opacity-40" />
                                    <p className="text-xs font-bold">No active online drivers found.</p>
                                    <p className="text-[10px] text-slate-500 mt-1">Drivers will appear when online.</p>
                                </div>
                            ) : (
                                drivers.map((d) => {
                                    const isSelected = selectedDriverId === d.id;
                                    return (
                                        <div
                                            key={d.id}
                                            onClick={() => setSelectedDriverId(d.id)}
                                            className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                                                isSelected
                                                    ? "bg-slate-800 border-yellow-400 shadow-lg shadow-yellow-400/10"
                                                    : "bg-slate-950/60 hover:bg-slate-800/60 border-white/5"
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="text-xs font-black text-white truncate max-w-[170px]">{d.name}</h4>
                                                    <p className="text-[10px] font-mono text-yellow-400 font-bold">{d.licensePlate || "NO-PLATE"} • {d.vehicleModel}</p>
                                                </div>
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                                    d.status === "ON_TRIP"
                                                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                                }`}>
                                                    {d.status === "ON_TRIP" ? "ON TRIP" : "AVAILABLE"}
                                                </span>
                                            </div>

                                            {/* Hardware Telemetry Specs */}
                                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-2 border-t border-white/5">
                                                <span className="text-yellow-400 font-bold">
                                                    {d.speed?.toFixed(0) || 0} km/h
                                                </span>
                                                <span className="flex items-center gap-1 text-emerald-400">
                                                    <Battery size={11} />
                                                    {d.batteryLevel || 100}%
                                                </span>
                                                <span className="text-purple-400">
                                                    ★ {d.rating?.toFixed(1) || "5.0"}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Center & Right: High-Tech Live Fleet Map Component */}
                    <div className="lg:col-span-2 h-[650px] relative">
                        <LiveFleetMap
                            objects={mapObjects}
                            selectedId={selectedDriverId}
                            onSelectObject={(obj) => setSelectedDriverId(obj.id)}
                            className="h-full"
                        />
                    </div>
                </div>

                {/* Driver Detail Inspector Card */}
                {selectedDriver && (
                    <div className="bg-slate-900/80 rounded-[2.5rem] p-6 border border-white/10 shadow-2xl animate-in fade-in duration-300">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6 pb-4 border-b border-white/10">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Activity className="text-yellow-400" size={18} />
                                    <h3 className="text-lg font-black text-white">
                                        Driver Telematics Diagnostic — {selectedDriver.name}
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Vehicle: <span className="text-yellow-400 font-bold">{selectedDriver.vehicleColor} {selectedDriver.vehicleModel}</span> • 
                                    Plate: <span className="font-mono text-emerald-400">{selectedDriver.licensePlate}</span> • 
                                    Phone: <span className="text-blue-300 font-mono">{selectedDriver.phone}</span>
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 text-slate-300">
                                    Speed: <strong className="text-yellow-400">{selectedDriver.speed?.toFixed(1) || 0} km/h</strong>
                                </span>
                                <span className="text-xs font-mono bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 text-slate-300">
                                    Status: <strong className={selectedDriver.status === "ON_TRIP" ? "text-blue-400" : "text-emerald-400"}>{selectedDriver.status === "ON_TRIP" ? "ON TRIP" : "ONLINE / READY"}</strong>
                                </span>
                            </div>
                        </div>

                        {selectedDriver.activeRide && (
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                                <div>
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-md border border-blue-500/30">CURRENT ACTIVE TRIP</span>
                                    <p className="font-bold text-white mt-1">Passenger: {selectedDriver.activeRide.passenger}</p>
                                    <p className="text-slate-400">Route: {selectedDriver.activeRide.pickup} → {selectedDriver.activeRide.destination}</p>
                                </div>
                                <div className="text-right font-mono text-yellow-400 font-black text-base">
                                    ${selectedDriver.activeRide.fare?.toFixed(2) || "0.00"}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
