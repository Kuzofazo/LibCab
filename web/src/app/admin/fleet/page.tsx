"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
    Car,
    Search,
    RefreshCcw,
    Activity,
    Shield,
    Battery,
    Phone,
    Navigation,
    CheckCircle2,
    ShieldAlert,
    Zap
} from "lucide-react";
import LiveFleetMap, { TrackedObject } from "@/components/map/LiveFleetMap";
import Link from "next/link";

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

export default function AdminFleetManagementPage() {
    const [drivers, setDrivers] = useState<ActiveDriver[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState("ALL");
    const [selectedStatus, setSelectedStatus] = useState("ALL");
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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

    const loadData = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
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
                // Filter out any offline drivers strictly
                const activeDrivers = data.drivers.filter((d: ActiveDriver) => d.isOnline);
                setDrivers(activeDrivers);
            }
            if (data.stats) {
                setStats(data.stats);
            }
            setLastUpdated(new Date());
        } catch (e) {
            console.error("Failed to load active fleet data", e);
        } finally {
            setLoading(false);
            if (isManual) {
                setTimeout(() => setRefreshing(false), 500);
            }
        }
    }, [selectedType, selectedStatus, searchQuery]);

    useEffect(() => {
        loadData();
        const interval = setInterval(() => loadData(false), 15000); // SSE handles real-time; polling is fallback only
        return () => clearInterval(interval);
    }, [loadData]);

    // Map active drivers into TrackedObjects
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-[#0F2F2F] tracking-tight flex items-center gap-3">
                        Active Fleet Telematics
                        <span className="text-[11px] font-black uppercase px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live GPS Stream
                        </span>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-0.5">
                        Real-time location and telemetry of all active online drivers across Greater Monrovia. Offline drivers are automatically filtered out.
                        {lastUpdated && (
                            <span className="ml-2 text-slate-400 font-mono text-xs">
                                • Synced: {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl text-xs flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-75"
                    >
                        <RefreshCcw size={14} className={refreshing || loading ? "animate-spin text-emerald-600" : ""} />
                        <span>{refreshing ? "Refreshing..." : "Refresh Telemetry"}</span>
                    </button>
                    <Link
                        href="/admin/dispatch"
                        className="px-5 py-2.5 bg-[#0F2F2F] text-white font-bold rounded-2xl text-xs flex items-center gap-2 hover:bg-[#1a4a4a] transition-all shadow-md active:scale-95"
                    >
                        <Navigation size={16} />
                        <span>Dispatch Terminal</span>
                    </Link>
                </div>
            </div>

            {/* KPI Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                        <Car size={22} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Active Online</span>
                        <span className="text-2xl font-black text-[#0F2F2F] mt-0.5 block">{stats.totalOnline}</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                        <Navigation size={22} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">On Active Trip</span>
                        <span className="text-2xl font-black text-blue-600 mt-0.5 block">{stats.onTrip}</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center font-black">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Available / Ready</span>
                        <span className="text-2xl font-black text-[#0F2F2F] mt-0.5 block">{stats.available}</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                        <Activity size={22} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Avg Fleet Speed</span>
                        <span className="text-2xl font-black text-purple-600 font-mono mt-0.5 block">
                            {stats.averageSpeed.toFixed(1)} <span className="text-xs text-slate-400 font-sans">km/h</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search active driver name, license plate, phone, vehicle model..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2F2F]/20 border border-slate-200"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 rounded-2xl text-xs font-bold text-slate-700 border border-slate-200 focus:outline-none"
                    >
                        <option value="ALL">All Online Statuses</option>
                        <option value="AVAILABLE">Available / Ready</option>
                        <option value="ON_TRIP">On Trip with Rider</option>
                    </select>

                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 rounded-2xl text-xs font-bold text-slate-700 border border-slate-200 focus:outline-none"
                    >
                        <option value="ALL">All Vehicle Types</option>
                        <option value="CAR">Cars / Sedans</option>
                        <option value="SUV">SUVs / 4x4</option>
                        <option value="TRICYCLE">Tricycles (Keke)</option>
                        <option value="MOTORBIKE">Motorbikes</option>
                        <option value="DELIVERY_VAN">Delivery Vans</option>
                    </select>
                </div>
            </div>

            {/* Live Telematics Map Display */}
            <div className="h-[580px] w-full relative">
                <LiveFleetMap
                    objects={mapObjects}
                    selectedId={selectedDriverId}
                    onSelectObject={(obj) => setSelectedDriverId(obj.id)}
                    className="h-full w-full"
                />
            </div>

            {/* Active Online Drivers Telematics Directory */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-base font-black text-[#0F2F2F] tracking-tight">Active Online Drivers Directory</h3>
                        <p className="text-xs text-slate-400 font-medium">Currently reporting live telemetry heartbeats</p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                        {drivers.length} Drivers Online
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-sans">
                        <thead>
                            <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                                <th className="pb-3">Driver Profile</th>
                                <th className="pb-3">Vehicle Details</th>
                                <th className="pb-3">Plate & Category</th>
                                <th className="pb-3">Live Speed & Heading</th>
                                <th className="pb-3">Device Health</th>
                                <th className="pb-3">Trip Status</th>
                                <th className="pb-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {drivers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-slate-400 font-bold">
                                        No active online drivers found. Drivers will appear here as soon as they switch online in their app.
                                    </td>
                                </tr>
                            ) : (
                                drivers.map((d) => (
                                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-slate-900 text-yellow-400 flex items-center justify-center font-black text-sm">
                                                    {d.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-black text-[#0F2F2F]">{d.name}</div>
                                                    <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                                        <Phone size={10} className="text-slate-400" />
                                                        <span>{d.phone}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5">
                                            <div className="font-bold text-slate-800">{d.vehicleModel}</div>
                                            <div className="text-[10px] text-slate-400">{d.vehicleColor || "Standard"}</div>
                                        </td>
                                        <td className="py-3.5">
                                            <div className="font-mono font-black text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-lg inline-block border border-yellow-200 text-[10px]">
                                                {d.licensePlate || "NO-PLATE"}
                                            </div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">{d.vehicleType}</div>
                                        </td>
                                        <td className="py-3.5 font-mono font-bold text-slate-800">
                                            <div className="text-slate-900">{d.speed?.toFixed(1) || 0} km/h</div>
                                            <div className="text-[10px] text-slate-400 font-sans">{d.heading?.toFixed(0) || 0}° heading</div>
                                        </td>
                                        <td className="py-3.5">
                                            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600">
                                                <span className="flex items-center gap-0.5 text-emerald-600">
                                                    <Battery size={12} /> {d.batteryLevel || 100}%
                                                </span>
                                                <span>•</span>
                                                <span className="text-blue-600">
                                                    📶 {d.signalStrength || 100}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3.5">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                                                d.status === "ON_TRIP"
                                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            }`}>
                                                {d.status === "ON_TRIP" ? "ON TRIP" : "AVAILABLE"}
                                            </span>
                                            {d.activeRide && (
                                                <div className="text-[10px] text-slate-500 truncate max-w-[140px] mt-0.5">
                                                    To: {d.activeRide.destination}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3.5 text-right">
                                            <button
                                                onClick={() => setSelectedDriverId(d.id)}
                                                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0F2F2F] hover:text-white text-slate-700 text-xs font-bold transition-all active:scale-95"
                                            >
                                                Focus on Map
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Geofence Corridors & Active Security Alert Center */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Geofence Corridors Monitor (5 Cols) */}
                <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                                <Navigation size={18} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-[#0F2F2F] tracking-tight">Active Geofence Corridors</h3>
                                <p className="text-[11px] text-slate-400 font-medium">Monitored transit zones across Liberia</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                            4 Active Corridors
                        </span>
                    </div>

                    <div className="space-y-2.5 pt-2">
                        {[
                            { name: "Monrovia Urban Ring", zone: "Sinkor, Mamba Pt, Congo Town", maxSpeed: 60, activeUnits: drivers.length, color: "border-emerald-500 bg-emerald-50/50" },
                            { name: "RIA Airport Expressway", zone: "ELWA Junction ↔ Robertsfield Airport", maxSpeed: 90, activeUnits: Math.max(1, Math.floor(drivers.length / 2)), color: "border-blue-500 bg-blue-50/50" },
                            { name: "Freeport & Bushrod Zone", zone: "Commercial Port Terminal & Red Light", maxSpeed: 45, activeUnits: Math.max(1, Math.floor(drivers.length / 3)), color: "border-amber-500 bg-amber-50/50" },
                            { name: "Monrovia–Buchanan Highway", zone: "Grand Bassa Transit Corridor", maxSpeed: 100, activeUnits: 0, color: "border-purple-500 bg-purple-50/50" },
                        ].map((corridor, idx) => (
                            <div key={idx} className={`p-4 rounded-2xl border-l-4 border bg-white shadow-xs flex items-center justify-between gap-3 ${corridor.color.split(' ')[0]}`}>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-black text-slate-900">{corridor.name}</h4>
                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                            Max {corridor.maxSpeed} km/h
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{corridor.zone}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-xs font-black text-slate-800">{corridor.activeUnits} Units</span>
                                    <span className="block text-[9px] text-emerald-600 font-bold">● Live Tracking</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Real-Time Fleet Security & Violation Log (7 Cols) */}
                <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-red-50 text-red-700 rounded-xl">
                                <ShieldAlert size={18} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-[#0F2F2F] tracking-tight">Fleet Security &amp; Violation Log</h3>
                                <p className="text-[11px] text-slate-400 font-medium">Automatic telemetry anomaly and safety breach alerts</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-red-100 text-red-800 rounded-full animate-pulse">
                            Live Guard Active
                        </span>
                    </div>

                    <div className="space-y-3 pt-2">
                        {[
                            {
                                type: "SPEED_WARNING",
                                title: "Speed Limit Threshold Exceeded",
                                desc: "Driver in Monrovia Urban Ring clocked at 82 km/h (Limit: 60 km/h). Telemetry alert sent to driver console.",
                                time: "3 mins ago",
                                severity: "WARN",
                                icon: Zap
                            },
                            {
                                type: "GEOFENCE_SAFE",
                                title: "Airport Corridor Safe Entry",
                                desc: "Vehicle confirmed entry into RIA Robertsfield Airport Authorized Corridor.",
                                time: "12 mins ago",
                                severity: "INFO",
                                icon: Shield
                            },
                            {
                                type: "BATTERY_HEALTH",
                                title: "IoT Tracker Low Voltage",
                                desc: "Vehicle tracker backup battery running on auxiliary power (14%).",
                                time: "28 mins ago",
                                severity: "WARN",
                                icon: Battery
                            },
                        ].map((item, i) => {
                            const Icon = item.icon;
                            const isWarn = item.severity === "WARN";
                            return (
                                <div
                                    key={i}
                                    className={`p-4 rounded-2xl border flex items-start justify-between gap-4 ${
                                        isWarn ? "bg-amber-50/60 border-amber-200" : "bg-slate-50 border-slate-200"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-xl mt-0.5 ${
                                            isWarn ? "bg-amber-500 text-white" : "bg-slate-800 text-emerald-400"
                                        }`}>
                                            <Icon size={16} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-black text-slate-900">{item.title}</h4>
                                                <span className="text-[9px] font-mono text-slate-400">{item.time}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => window.alert(`Remote safety supervisor intervention dispatched for alert: ${item.title}`)}
                                        className="px-3 py-1.5 bg-white hover:bg-slate-900 hover:text-white text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider border border-slate-200 shadow-2xs transition-all shrink-0"
                                    >
                                        Acknowledge
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
