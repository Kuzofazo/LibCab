"use client";

import React, { useEffect, useState, useRef } from "react";
import {
    Search,
    MapPin,
    User,
    Navigation,
    Filter,
    RefreshCcw,
    AlertCircle,
    CheckCircle2,
    Activity,
    Compass,
    Clock,
    DollarSign,
    ChevronRight,
    Map as MapIcon,
    Car,
    Phone,
    ShieldAlert,
    Trash2
} from "lucide-react";
import { formatLRD, formatUSD } from "@/utils/currency";
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/MapComponent'), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-500">Loading Map...</div>
});

interface Ride {
    id: string;
    status: "REQUESTED" | "ACCEPTED" | "EN_ROUTE" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "AWAITING_CONFIRMATION";
    originAddress: string;
    destAddress: string;
    fare: number;
    createdAt: string;
    rider?: { name: string; email: string; phone?: string };
    guestName?: string;
    guestPhone?: string;
    driver?: { user: { name: string; phone?: string } };
    originLat?: number;
    originLng?: number;
    destLat?: number;
    destLng?: number;
    vehicleType?: string;
    rideCategory?: string;
    sosAlert?: boolean;
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

interface Driver {
    id: string;
    driverProfileId: string;
    name: string;
    status: string;
    vehicle: string;
    rating: number;
    currentLat?: number;
    currentLng?: number;
    distance?: number | null;
}

export default function DispatchPage() {
    const [rides, setRides] = useState<Ride[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toasts, setToasts] = useState<{id: number, message: string}[]>([]);
    const previousRidesRef = useRef<Set<string>>(new Set());

    // State for modals and flow
    const [filter, setFilter] = useState("ALL");
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualRide, setManualRide] = useState({ 
        name: "",
        phone: "", 
        pickup: "", 
        destination: "", 
        vehicleType: "SEDAN",
        fare: "",
        assignedDriverId: "",
        paymentMethod: "MOMO" 
    });
    const [isLiveMapOpen, setIsLiveMapOpen] = useState(false);
    const [userRole, setUserRole] = useState<string>("ADMIN");

    // Clearance Modal State
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [clearActionType, setClearActionType] = useState("CLEAR_REQUESTS");
    const [clearFilter, setClearFilter] = useState("ALL");
    const [clearConfirmText, setClearConfirmText] = useState("");
    const [clearLoading, setClearLoading] = useState(false);

    // Assignment Logic
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedRideForAssignment, setSelectedRideForAssignment] = useState<Ride | null>(null);

    // Fare Logic
    const [isFareModalOpen, setIsFareModalOpen] = useState(false);
    const [selectedRideForFare, setSelectedRideForFare] = useState<Ride | null>(null);
    const [manualFare, setManualFare] = useState("");

    const getHeaders = () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        return {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
        };
    };

    const playChime = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch(e) {}
    };

    const addToast = (msg: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, {id, message: msg}]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    };

    const fetchRides = async () => {
        try {
            const res = await fetch("/api/rides", { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                const newRequested = data.filter((r: Ride) => r.status === "REQUESTED");
                const currentRequestedIds = new Set(newRequested.map((r: Ride) => r.id));
                
                let hasNew = false;
                if (previousRidesRef.current.size > 0) {
                    newRequested.forEach((r: Ride) => {
                        if (!previousRidesRef.current.has(r.id)) hasNew = true;
                    });
                }
                if (hasNew) {
                    playChime();
                    addToast("New ride requested!");
                }
                previousRidesRef.current = currentRequestedIds as any;
                setRides(data);
            } else {
                setError(data.error);
            }
        } catch (e) {
            setError("Failed to fetch rides");
        } finally {
            setLoading(false);
        }
    };

    const [stats, setStats] = useState<any>(null);
    const fetchStats = async () => {
        try {
            const res = await fetch("/api/admin/stats", { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error("Failed to fetch statistics", e);
        }
    };

    const fetchDrivers = async (ride?: Ride) => {
        try {
            const res = await fetch("/api/admin/drivers", { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                const targetRide = ride || selectedRideForAssignment;

                const validDrivers = data.filter((d: any) => {
                    if (!targetRide?.vehicleType) return true;
                    const reqType = targetRide.vehicleType.toLowerCase();
                    const drvType = (d.vehicleType || "Car").toLowerCase();
                    if (reqType === "sedan" || reqType === "car") return drvType === "car" || drvType === "sedan";
                    return reqType === drvType;
                });

                if (targetRide?.originLat && targetRide?.originLng) {
                    const withDistances = validDrivers.map((d: any) => {
                        const dist = getDistanceFromLatLonInKm(
                            targetRide.originLat!,
                            targetRide.originLng!,
                            d.currentLat || 0,
                            d.currentLng || 0
                        );
                        return { ...d, distance: d.currentLat && d.currentLng ? dist : null };
                    });
                    
                    withDistances.sort((a: any, b: any) => {
                        if (a.distance === null) return 1;
                        if (b.distance === null) return -1;
                        return a.distance - b.distance;
                    });
                    setDrivers(withDistances);
                } else {
                    setDrivers(validDrivers);
                }
            }
        } catch (e) {
            console.error("Failed to fetch drivers", e);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            await Promise.all([fetchRides(), fetchStats(), fetchDrivers()]);
        };
        loadInitialData();

        const userStr = localStorage.getItem("user");
        if (userStr) {
            const user = JSON.parse(userStr);
            setUserRole(user.role);
        }

        const interval = setInterval(() => {
            fetchRides();
            fetchStats();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const openFareModal = (ride: Ride) => {
        setSelectedRideForFare(ride);
        setManualFare(ride.fare ? ride.fare.toString() : "");
        setIsFareModalOpen(true);
    };

    const handleSaveFare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRideForFare) return;
        try {
            const res = await fetch("/api/rides", {
                method: "PATCH",
                headers: getHeaders(),
                body: JSON.stringify({
                    id: selectedRideForFare.id,
                    fare: parseFloat(manualFare),
                    status: "AWAITING_CONFIRMATION"
                })
            });
            if (res.ok) {
                alert("Fare updated successfully!");
                setIsFareModalOpen(false);
                fetchRides();
            }
        } catch (error) {
            alert("Error updating fare");
        }
    };

    const openAssignModal = (ride: Ride) => {
        setSelectedRideForAssignment(ride);
        fetchDrivers(ride);
        setIsAssignModalOpen(true);
    };

    const handleAssignDriver = async (driverId: string) => {
        if (!selectedRideForAssignment) return;
        try {
            const res = await fetch("/api/rides", {
                method: "PATCH",
                headers: getHeaders(),
                body: JSON.stringify({
                    id: selectedRideForAssignment.id,
                    driverId: driverId,
                    status: "ACCEPTED"
                })
            });
            if (res.ok) {
                addToast("Driver assigned!");
                setIsAssignModalOpen(false);
                fetchRides();
            }
        } catch (error) {
            alert("Error assigning driver");
        }
    };

    // Keyboard shortcut (Ctrl+D or Cmd+D) for Rapid Phone Dispatch
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
                e.preventDefault();
                setIsManualModalOpen(prev => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleManualBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/rides", {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({
                    guestName: manualRide.name || "Phone Caller",
                    guestPhone: manualRide.phone,
                    originAddress: manualRide.pickup,
                    destAddress: manualRide.destination,
                    vehicleType: manualRide.vehicleType,
                    fare: manualRide.fare ? parseFloat(manualRide.fare) : undefined,
                    paymentMethod: manualRide.paymentMethod,
                    driverId: manualRide.assignedDriverId || undefined,
                    status: manualRide.assignedDriverId ? "ACCEPTED" : "REQUESTED"
                })
            });
            if (res.ok) {
                const createdRide = await res.json();
                addToast(`📞 Phone Ride Dispatched: #${(createdRide.id || "").slice(-4)}`);
                setIsManualModalOpen(false);
                setManualRide({ name: "", phone: "", pickup: "", destination: "", vehicleType: "SEDAN", fare: "", assignedDriverId: "", paymentMethod: "MOMO" });
                fetchRides();
                fetchStats();
            } else {
                const err = await res.json();
                alert(err.error || "Error dispatching ride");
            }
        } catch (error) {
            alert("Error dispatching ride");
        }
    };

    const handleClearData = async (e: React.FormEvent) => {
        e.preventDefault();
        if (clearConfirmText.toLowerCase() !== "confirm") return;
        setClearLoading(true);
        try {
            const res = await fetch("/api/admin/clear-data", {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({
                    actionType: clearActionType,
                    filter: clearActionType === "CLEAR_REQUESTS" ? clearFilter : undefined
                }),
            });
            if (res.ok) {
                setIsClearModalOpen(false);
                setClearConfirmText("");
                fetchRides();
            }
        } finally {
            setClearLoading(false);
        }
    };

    const mapMarkers = [
        ...drivers.map(d => ({
            id: d.id,
            lat: d.currentLat || 0,
            lng: d.currentLng || 0,
            title: d.name,
            subtitle: `${d.vehicle} • ${d.status}`,
            type: (d.status === "ONLINE" || d.status === "AVAILABLE" ? "AVAILABLE_DRIVER" : "BUSY_DRIVER") as any
        })).filter(d => d.lat !== 0),
        ...rides.filter(r => r.status === "REQUESTED" || r.status === "IN_PROGRESS").map(r => ({
            id: r.id,
            lat: r.originLat || 0,
            lng: r.originLng || 0,
            title: r.rider?.name || r.guestName || "Guest",
            subtitle: `Pickup: ${r.originAddress}`,
            type: "PICKUP" as any
        })).filter(r => r.lat !== 0),
        ...rides.filter(r => r.status === "REQUESTED" || r.status === "IN_PROGRESS").map(r => ({
            id: `dest-${r.id}`,
            lat: r.destLat || 0,
            lng: r.destLng || 0,
            title: `Destination: ${r.rider?.name || r.guestName || "Guest"}`,
            subtitle: `Dropoff: ${r.destAddress}`,
            type: "DESTINATION" as any
        })).filter(r => r.lat !== 0)
    ];

    const mapRoutes = rides
        .filter(r => (r.status === "ACCEPTED" || r.status === "IN_PROGRESS") && r.originLat && r.originLng && r.destLat && r.destLng)
        .map(r => ({
            id: r.id,
            origin: [r.originLat!, r.originLng!] as [number, number],
            destination: [r.destLat!, r.destLng!] as [number, number],
            color: r.status === "IN_PROGRESS" ? "#000000" : "#6366f1",
            dashArray: r.status === "ACCEPTED" ? "10, 10" : undefined
        }));

    return (
        <div className="relative h-[calc(100vh-140px)] -m-8 overflow-hidden rounded-[2.5rem] bg-slate-100 border border-slate-200 shadow-inner">
            {/* Edge-to-Edge Maps Background */}
            <div className="absolute inset-0 z-0">
                <Map 
                    fullScreen={false}
                    markers={mapMarkers} 
                    routes={mapRoutes} 
                    className="h-full w-full"
                />
                <div className="absolute bottom-6 left-[26rem] bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 z-10">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Fleet Insight</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                            <span className="text-[10px] font-black text-slate-800 uppercase">Available</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
                            <span className="text-[10px] font-black text-slate-800 uppercase">On Trip</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative z-10 flex flex-col h-full gap-6 p-8 pointer-events-none">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pointer-events-auto bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-lg">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Real-Time Dispatch</h1>
                        <p className="text-slate-500 font-bold text-sm">Monitor live rides and fleet distribution across Liberia.</p>
                    </div>
                    <div className="flex gap-3">
                        {userRole === "SUPER_ADMIN" && (
                            <button onClick={() => setIsClearModalOpen(true)} className="bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center gap-2">
                                <ShieldAlert size={18} /> Data Mgmt
                            </button>
                        )}
                        <button onClick={() => setIsManualModalOpen(true)} className="bg-yellow-400 text-black px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-yellow-300 transition-all shadow-lg flex items-center gap-2">
                            <Phone size={18} /> Call to Dispatch
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex gap-6 min-h-0 pointer-events-none">
                    <div className="w-96 bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl flex flex-col overflow-hidden pointer-events-auto">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/70">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Incoming Requests</h2>
                                <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full animate-pulse tracking-wider">LIVE</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {rides.length === 0 ? (
                                <div className="text-center py-16 px-4">
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No active requests</p>
                                </div>
                            ) : [...rides].sort((a, b) => (b.sosAlert ? 1 : 0) - (a.sosAlert ? 1 : 0)).map(ride => (
                                <div key={ride.id} className={`p-5 rounded-[2rem] border-2 transition-all cursor-pointer relative shadow-sm ${
                                    ride.sosAlert
                                        ? "border-red-600 bg-red-100/70 shadow-red-200 animate-pulse"
                                        : ride.status === "REQUESTED"
                                        ? "border-red-500 bg-red-50/40"
                                        : "border-slate-100 bg-white hover:border-slate-300"
                                }`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-black text-slate-900 text-base">{ride.guestName || ride.rider?.name || "Guest"}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ride.rider ? "APP USER" : "GUEST"}</p>
                                        </div>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                            ride.sosAlert 
                                                ? "bg-red-600 text-white border-red-700 animate-bounce" 
                                                : "bg-slate-100 text-slate-700 border-slate-200"
                                        }`}>
                                            {ride.sosAlert ? "🚨 SOS ACTIVE" : ride.status.replace("_", " ")}
                                        </span>
                                    </div>
                                    <div className="space-y-2 mb-4 text-xs font-bold text-slate-700">
                                        <div className="flex items-center gap-2"><MapPin size={14} className="text-red-500 shrink-0" /> <span className="truncate">{ride.originAddress}</span></div>
                                        <div className="flex items-center gap-2"><Navigation size={14} className="text-slate-900 shrink-0" /> <span className="truncate">{ride.destAddress}</span></div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                        <div className="font-black text-xl text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200/60">${ride.fare?.toFixed(2) || "0.00"}</div>
                                        <div className="flex items-center gap-2">
                                            {ride.guestPhone || ride.rider?.phone ? (
                                                <a
                                                    href={`tel:${ride.guestPhone || ride.rider?.phone}`}
                                                    className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl"
                                                    title="Call passenger"
                                                >
                                                    <Phone size={14} />
                                                </a>
                                            ) : null}
                                            {ride.status === "REQUESTED" && (
                                                <>
                                                    {!ride.fare ? (
                                                        <button onClick={() => openFareModal(ride)} className="px-4 py-2 bg-yellow-400 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-yellow-300 shadow-sm">Set Fare</button>
                                                    ) : (
                                                        <button onClick={() => openAssignModal(ride)} className="px-4 py-2 bg-slate-950 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-red-600 shadow-sm">Assign</button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 space-y-6 pointer-events-none flex flex-col">
                        <div className="grid grid-cols-3 gap-6 pointer-events-auto">
                            {/* Stat 1: Pending */}
                            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/90 shadow-xl h-44 flex flex-col justify-between hover:shadow-2xl transition-shadow">
                                <div className="flex justify-between items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                                        <Activity size={24} className="text-red-600" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">Active Queue</span>
                                </div>
                                <div>
                                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">{stats?.pendingRides || 0}</h3>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider mt-1">Pending Rides</p>
                                </div>
                            </div>

                            {/* Stat 2: Available Drivers */}
                            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/90 shadow-xl h-44 flex flex-col justify-between hover:shadow-2xl transition-shadow">
                                <div className="flex justify-between items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                                        <Compass size={24} className="text-blue-600" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">Live Grid</span>
                                </div>
                                <div>
                                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">{stats?.activeDrivers || 0}</h3>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider mt-1">Available Drivers</p>
                                </div>
                            </div>

                            {/* Stat 3: Gross Revenue */}
                            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/90 shadow-xl h-44 flex flex-col justify-between hover:shadow-2xl transition-shadow">
                                <div className="flex justify-between items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                                        <DollarSign size={24} className="text-emerald-600" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">Total Shift</span>
                                </div>
                                <div>
                                    <h3 className="text-4xl font-black text-emerald-700 tracking-tight">{formatUSD(stats?.totalRevenue || 0)}</h3>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider mt-1">Gross Revenue</p>
                                </div>
                            </div>
                        </div>

                        {/* Platform Health Card */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/90 shadow-xl flex-1 flex flex-col pointer-events-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Platform Health</h2>
                                <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">System Optimal</span>
                            </div>
                            <div className="flex-1 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center p-8">
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto shadow-sm">
                                        <MapIcon size={32} className="text-slate-700" />
                                    </div>
                                    <h4 className="text-base font-black text-slate-900">Analytics Engine Ready</h4>
                                    <p className="text-xs font-bold text-slate-500 max-w-sm mx-auto">Real-time GPS telemetry and automated fare calculation engine active.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rapid Phone Call Dispatch Modal */}
            {isManualModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200">
                        {/* Header */}
                        <div className="px-6 py-5 bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-950 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-black/10 rounded-xl">
                                    <Phone size={22} className="text-slate-950" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-black text-slate-950">Rapid Phone Dispatch</h3>
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-black text-yellow-400 rounded-md">
                                            Ctrl + D
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-900/80">Telephone booking & instant driver assignment</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsManualModalOpen(false)} 
                                className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center font-black text-slate-950 transition-all"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleManualBooking} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            {/* Caller Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Caller Name
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. John Doe / Guest" 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-yellow-400 outline-none transition-all" 
                                        value={manualRide.name} 
                                        onChange={e => setManualRide({...manualRide, name: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Phone Number *
                                    </label>
                                    <input 
                                        type="tel" 
                                        required 
                                        placeholder="+231..." 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-yellow-400 outline-none transition-all" 
                                        value={manualRide.phone} 
                                        onChange={e => setManualRide({...manualRide, phone: e.target.value})} 
                                    />
                                </div>
                            </div>

                            {/* Pickup & Destination */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Pickup Location *
                                    </label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="e.g. Sinkor 12th Street, Mamba Point, Boulevard Palace" 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-yellow-400 outline-none transition-all" 
                                        value={manualRide.pickup} 
                                        onChange={e => setManualRide({...manualRide, pickup: e.target.value})} 
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Drop-off Destination *
                                    </label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="e.g. Roberts International Airport (RIA), Paynesville Red Light" 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-yellow-400 outline-none transition-all" 
                                        value={manualRide.destination} 
                                        onChange={e => setManualRide({...manualRide, destination: e.target.value})} 
                                    />
                                </div>

                                {/* Quick Monrovia Preset Buttons */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {[
                                        { label: "✈️ RIA Airport", dest: "Roberts International Airport (RIA)", fare: "45" },
                                        { label: "🏢 Sinkor 12th St", dest: "Sinkor 12th Street, Monrovia", fare: "5" },
                                        { label: "🛒 Red Light", dest: "Paynesville Red Light Market", fare: "8" },
                                        { label: "🚢 Freeport", dest: "Freeport of Monrovia, Bushrod", fare: "7" },
                                        { label: "🏛️ Mamba Point", dest: "Mamba Point Embassy Zone", fare: "6" },
                                    ].map((preset, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setManualRide({...manualRide, destination: preset.dest, fare: preset.fare})}
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-yellow-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg text-[11px] font-bold transition-all"
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Ride Tier & Optional Fare Override */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Vehicle Class
                                    </label>
                                    <select 
                                        title="Vehicle Class"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-yellow-400 transition-all"
                                        value={manualRide.vehicleType}
                                        onChange={e => setManualRide({...manualRide, vehicleType: e.target.value})}
                                    >
                                        <option value="SEDAN">Standard Sedan (Car)</option>
                                        <option value="COMFORT">Comfort Air-Con</option>
                                        <option value="VIP">VIP Executive SUV</option>
                                        <option value="VAN">Cargo / Delivery Van</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Agreed Fare (USD $) - Optional
                                    </label>
                                    <input 
                                        type="number" 
                                        step="0.5" 
                                        placeholder="Auto-calculated if blank" 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-yellow-400 outline-none transition-all" 
                                        value={manualRide.fare} 
                                        onChange={e => setManualRide({...manualRide, fare: e.target.value})} 
                                    />
                                </div>
                            </div>

                            {/* Direct Driver Assignment (Optional) */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                    Direct Driver Assignment (Optional)
                                </label>
                                <select 
                                    title="Assign Driver"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-yellow-400 transition-all"
                                    value={manualRide.assignedDriverId}
                                    onChange={e => setManualRide({...manualRide, assignedDriverId: e.target.value})}
                                >
                                    <option value="">Auto-Dispatch to Nearest Driver</option>
                                    {drivers.filter(d => d.status === "ONLINE" || d.status === "AVAILABLE").map(d => (
                                        <option key={d.id} value={d.id}>
                                            {d.name} ({d.vehicle}) {d.distance ? `• ${d.distance.toFixed(1)} km away` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                                    Payment Method
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: "MOMO", label: "📱 Mobile Money" },
                                        { id: "CASH", label: "💵 Cash (USD/LRD)" },
                                        { id: "CORPORATE", label: "🏢 Corporate Account" },
                                    ].map(method => (
                                        <button
                                            key={method.id}
                                            type="button"
                                            onClick={() => setManualRide({...manualRide, paymentMethod: method.id})}
                                            className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                                                manualRide.paymentMethod === method.id 
                                                    ? 'border-yellow-500 bg-yellow-50 text-slate-950 font-black ring-2 ring-yellow-400/20' 
                                                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            {method.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-3 flex gap-2">
                                <button 
                                    type="button" 
                                    onClick={() => setIsManualModalOpen(false)} 
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                                >
                                    ⚡ Dispatch Ride Immediately
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-black text-xl">Select Driver</h3>
                            <button onClick={() => setIsAssignModalOpen(false)} className="font-bold">✕</button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-2">
                            {drivers.map(d => (
                                <div key={d.id} onClick={() => handleAssignDriver(d.id)} className="p-4 border rounded-2xl flex items-center justify-between cursor-pointer hover:border-black transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-sm">{d.name.charAt(0)}</div>
                                        <div><p className="font-bold">{d.name}</p><p className="text-[10px] text-gray-500 uppercase font-black">{d.status} • {d.vehicle}</p></div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-300" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {isFareModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8">
                        <h3 className="text-2xl font-black mb-4">Set Manual Fare</h3>
                        <form onSubmit={handleSaveFare} className="space-y-6">
                            <input type="number" title="Manual Fare" placeholder="Enter fare amount" step="0.01" required autoFocus className="w-full p-4 border-2 rounded-2xl text-2xl font-black outline-none focus:border-red-600" value={manualFare} onChange={e => setManualFare(e.target.value)} />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsFareModalOpen(false)} className="flex-1 p-4 bg-gray-100 rounded-2xl font-bold">Cancel</button>
                                <button type="submit" className="flex-1 p-4 bg-black text-white rounded-2xl font-black">Confirm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isClearModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2"><ShieldAlert size={20} /> Admin Reset</h3>
                        <form onSubmit={handleClearData} className="space-y-4">
                            <select title="Admin Reset Action Type" className="w-full p-3 border rounded-xl font-bold" value={clearActionType} onChange={e => setClearActionType(e.target.value)}>
                                <option value="CLEAR_REQUESTS">Clear Stale Requests</option>
                                <option value="CLEAR_ALL">Wipe Active Data</option>
                            </select>
                            <input type="text" required placeholder="Type 'confirm' to execute" className="w-full p-3 border-2 border-red-50 rounded-xl focus:border-red-600" value={clearConfirmText} onChange={e => setClearConfirmText(e.target.value)} />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsClearModalOpen(false)} className="flex-1 p-3 bg-gray-100 rounded-xl font-bold">Cancel</button>
                                <button type="submit" disabled={clearLoading} className="flex-1 p-3 bg-red-600 text-white rounded-xl font-bold">{clearLoading ? "Processing..." : "Execute Wipe"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toasts */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-right-5 pointer-events-auto">
                        <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                        <span className="text-sm font-bold">{t.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
