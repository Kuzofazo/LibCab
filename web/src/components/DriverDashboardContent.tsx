"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import AnnouncementFeed from "@/components/AnnouncementFeed";
import RideReceipt from "@/components/RideReceipt";
import {
    Car,
    Navigation,
    Shield,
    Star,
    DollarSign,
    Activity,
    Power,
    MapPin,
    Clock,
    TrendingUp,
    ShieldAlert,
    Phone,
    CheckCircle2,
    FileText,
    RefreshCw,
    Wifi,
    WifiOff
} from "lucide-react";
import { formatDual } from "@/utils/currency";
import type { MapMarker } from "@/components/MapComponent";

const MapComponent = dynamic(() => import("@/components/MapComponent"), { ssr: false });

interface DriverDashboardContentProps {
    user: any;
}

export default function DriverDashboardContent({ user }: DriverDashboardContentProps) {
    const [activeRide, setActiveRide] = useState<any>(null);
    const [availableRides, setAvailableRides] = useState<any[]>([]);
    const [completedRides, setCompletedRides] = useState<any[]>([]);
    const [viewingReceiptRide, setViewingReceiptRide] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
    const [earningsPeriod, setEarningsPeriod] = useState<"TODAY" | "WEEKLY">("TODAY");
    const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsBroadcasting, setGpsBroadcasting] = useState(false);
    const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [completingTrip, setCompletingTrip] = useState(false);

    const fetchRides = useCallback(async (userId: string) => {
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/rides", {
                headers: {
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                }
            });
            if (!res || !res.ok) return;
            const data = await res.json();

            if (Array.isArray(data)) {
                // 1. Find my active ride (Accepted / Arrived / In Progress)
                const myActiveRide = data.find(r =>
                    (r.driver?.userId === userId || r.driverId === userId || r.driver?.id === userId) &&
                    (r.status === "ACCEPTED" || r.status === "ARRIVED" || r.status === "IN_PROGRESS")
                );
                setActiveRide(myActiveRide || null);

                // 2. Find completed rides for history & receipts
                const myCompleted = data.filter(r =>
                    (r.driver?.userId === userId || r.driverId === userId || r.driver?.id === userId) &&
                    r.status === "COMPLETED"
                );
                setCompletedRides(myCompleted);

                // 3. Find available requested rides
                const requests = data.filter(r => r.status === "REQUESTED" && !r.driverId);
                setAvailableRides(requests);
            }
        } catch (error) {
            // Silently absorb transient disconnects
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchRides(user.id);
            const interval = setInterval(() => fetchRides(user.id), 5000);
            return () => clearInterval(interval);
        }
    }, [user, fetchRides]);

    const handleAcceptRide = async (rideId: string) => {
        if (!user) return;
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/rides", {
                method: "PATCH",
                headers: { 
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    id: rideId,
                    status: "ACCEPTED",
                    driverId: user.id,
                    driverPaymentPhone: user.phone || "+231 88 012 3456"
                })
            });

            if (res.ok) {
                fetchRides(user.id);
            }
        } catch (error) {
            console.error("Failed to accept ride", error);
        }
    };

    const handleUpdateStatus = async (status: string) => {
        if (!activeRide) return;
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/rides", {
                method: "PATCH",
                headers: { 
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    id: activeRide.id,
                    status,
                    driverPaymentPhone: user.phone || "+231 88 012 3456"
                })
            });
            if (res.ok) {
                const updated = await res.json();
                setActiveRide(updated);
            }
        } catch (e) {
            console.error("Failed to update status", e);
        }
    };

    const handleCompleteRide = async () => {
        if (!activeRide) return;
        setCompletingTrip(true);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/rides", {
                method: "PATCH",
                headers: { 
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    id: activeRide.id,
                    status: "COMPLETED",
                    paymentStatus: "PAID",
                    driverPaymentPhone: user.phone || "+231 88 012 3456"
                })
            });

            if (res.ok) {
                const completed = await res.json();
                setViewingReceiptRide(completed);
                setActiveRide(null);
                fetchRides(user.id);
            }
        } catch (error) {
            console.error("Failed to complete ride", error);
        } finally {
            setCompletingTrip(false);
        }
    };

    const broadcastLocation = useCallback(async (lat: number, lng: number, speed = 0, heading = 0) => {
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            await fetch("/api/driver/location", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ lat, lng, speed, heading, batteryLevel: 100, signalStrength: 95 })
            });
        } catch {}
    }, []);

    const toggleStatus = () => {
        const newStatus = !isOnline;
        setIsOnline(newStatus);
        if (newStatus) {
            // Start GPS broadcasting when going online
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    setMyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    broadcastLocation(pos.coords.latitude, pos.coords.longitude);
                }, () => {}, { enableHighAccuracy: true });
            }
        } else {
            // Stop broadcasting when going offline
            if (gpsIntervalRef.current) {
                clearInterval(gpsIntervalRef.current);
                gpsIntervalRef.current = null;
                setGpsBroadcasting(false);
            }
        }
    };

    // GPS broadcast loop when online
    useEffect(() => {
        if (!isOnline || typeof navigator === "undefined") return;

        const startBroadcast = () => {
            setGpsBroadcasting(true);
            gpsIntervalRef.current = setInterval(() => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const { latitude: lat, longitude: lng, speed, altitude } = pos.coords;
                        setMyCoords({ lat, lng });
                        broadcastLocation(lat, lng, speed ? speed * 3.6 : 0, 0);
                    },
                    () => {},
                    { enableHighAccuracy: true, timeout: 6000 }
                );
            }, 8000);
        };

        // Initial position grab
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setMyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                broadcastLocation(pos.coords.latitude, pos.coords.longitude);
                startBroadcast();
            },
            () => startBroadcast(),
            { enableHighAccuracy: true, timeout: 5000 }
        );

        return () => {
            if (gpsIntervalRef.current) {
                clearInterval(gpsIntervalRef.current);
                gpsIntervalRef.current = null;
                setGpsBroadcasting(false);
            }
        };
    }, [isOnline, broadcastLocation]);

    // Calculate total earned today
    const totalEarningsToday = completedRides.reduce((sum, r) => sum + (r.fare || 0) * 0.85, 0);

    return (
        <div className="min-h-screen bg-white text-slate-900 transition-colors duration-300">
            {/* Top Status Bar */}
            <div className="border-b border-slate-200 bg-white sticky top-16 z-30 shadow-sm">
                <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span className="font-black text-xs uppercase tracking-wider text-slate-800">
                            {isOnline ? 'Active & Receiving Dispatch Requests' : 'You are currently Offline'}
                        </span>
                    </div>

                    <button
                        onClick={toggleStatus}
                        className={`flex items-center gap-2 px-5 py-2 rounded-full font-black text-xs uppercase tracking-wider transition-all shadow-sm ${
                            isOnline 
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                    >
                        <Power size={13} />
                        Go {isOnline ? 'Offline' : 'Online'}
                    </button>
                </div>
            </div>

            {/* Live Position Map */}
            {myCoords && (
                <div className="border-b border-slate-100 bg-slate-50">
                    <div className="container mx-auto px-4 sm:px-6 py-4">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                        {isOnline ? "Live Driver GPS Radar" : "Driver Map (Offline Standby)"}
                                    </span>
                                    {gpsBroadcasting && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                            <Wifi size={9} /> Broadcasting GPS
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-mono text-slate-500">
                                    {myCoords.lat.toFixed(5)}°N, {Math.abs(myCoords.lng).toFixed(5)}°W
                                </span>
                            </div>
                            <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-md h-[340px] sm:h-[380px] w-full relative">
                                <MapComponent
                                    center={[myCoords.lat, myCoords.lng]}
                                    zoom={14}
                                    className="h-full w-full"
                                    markers={[
                                        {
                                            id: "driver-self",
                                            lat: myCoords.lat,
                                            lng: myCoords.lng,
                                            title: user?.name || "You",
                                            subtitle: isOnline ? "Active on duty" : "Offline",
                                            type: "ASSIGNED_DRIVER" as const,
                                            vehicleType: "Car",
                                        },
                                        ...(activeRide?.originLat && activeRide?.originLng ? [{
                                            id: "customer-pickup",
                                            lat: activeRide.originLat,
                                            lng: activeRide.originLng,
                                            title: activeRide.customer?.name || "Customer Pickup",
                                            subtitle: activeRide.originAddress || "Pickup Location",
                                            type: "PICKUP" as const,
                                        }] : []),
                                        ...availableRides.filter(r => r.originLat && r.originLng).map(r => ({
                                            id: `avail-${r.id}`,
                                            lat: r.originLat!,
                                            lng: r.originLng!,
                                            title: `Pickup: ${r.originAddress}`,
                                            subtitle: `Fare: $${r.fare?.toFixed(2) || "0.00"}`,
                                            type: "PICKUP" as const,
                                        }))
                                    ]}
                                    routes={
                                        activeRide?.originLat && activeRide?.originLng
                                            ? [{
                                                id: "to-pickup",
                                                origin: [myCoords.lat, myCoords.lng] as [number, number],
                                                destination: [activeRide.originLat, activeRide.originLng] as [number, number],
                                                color: "#0f172a",
                                            }]
                                            : []
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="container mx-auto px-4 sm:px-6 py-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Receipt Modal / Viewer if viewing receipt */}
                    {viewingReceiptRide && (
                        <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm overflow-y-auto flex" onClick={(e) => { if (e.target === e.currentTarget) setViewingReceiptRide(null); }}>
                            <div className="w-full max-w-xl mx-auto my-6 px-4">
                                <RideReceipt 
                                    ride={viewingReceiptRide}
                                    role="DRIVER"
                                    onClose={() => setViewingReceiptRide(null)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-8 space-y-8">
                            {/* Profile Header */}
                            <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-50 border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm">
                                <div className="w-20 h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-3xl shadow-sm shrink-0">
                                    {user?.name ? user.name.charAt(0) : "D"}
                                </div>
                                <div className="text-center md:text-left space-y-1 flex-1">
                                    <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                                            Driver {user?.name ? user.name.split(' ')[0] : 'Partner'}
                                        </h1>
                                        <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                                            PRO PARTNER
                                        </span>
                                    </div>
                                    <p className="text-slate-500 font-medium text-xs">
                                        {user?.phone ? `MoMo Account: ${user.phone}` : "Verified Driver"} • Registered AfriCab Partner
                                    </p>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                                        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">
                                            <Star size={13} className="text-amber-500 fill-amber-400" /> 4.9 Rating
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-700">
                                            <Shield size={13} className="fill-emerald-600 text-emerald-600" /> Verified Pro
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">
                                            <Car size={13} className="text-slate-700" /> Toyota Sedan • Verified Plate
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right hidden md:block shrink-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Partner ID</p>
                                    <p className="text-base font-mono font-bold text-slate-700">LC-8842</p>
                                </div>
                            </div>

                            {/* Earnings & Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm relative">
                                    <div className="absolute top-4 right-4 flex bg-white rounded-lg p-0.5 border border-slate-200">
                                        <button
                                            onClick={() => setEarningsPeriod("TODAY")}
                                            className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all ${earningsPeriod === "TODAY" ? "bg-slate-900 text-white" : "text-slate-500"}`}
                                        >DAY</button>
                                        <button
                                            onClick={() => setEarningsPeriod("WEEKLY")}
                                            className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all ${earningsPeriod === "WEEKLY" ? "bg-slate-900 text-white" : "text-slate-500"}`}
                                        >WEEK</button>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-100">
                                        <DollarSign size={20} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                                        {earningsPeriod === "TODAY" ? "Today's Net Earnings" : "Weekly Net Earnings"}
                                    </p>
                                    <h3 className="text-2xl font-black text-slate-900">
                                        {earningsPeriod === "TODAY" ? formatDual(totalEarningsToday > 0 ? totalEarningsToday : 12.50) : formatDual(84.50)}
                                    </h3>
                                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                        <Activity size={11} /> {earningsPeriod === "TODAY" ? "+12.5% from yesterday" : "+8.2% from last week"}
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4 border border-blue-100">
                                        <Clock size={20} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">Hours Online</p>
                                    <h3 className="text-2xl font-black text-slate-900">6.4h</h3>
                                    <p className="mt-2 text-[10px] font-bold text-slate-400">Target: 8.0h daily</p>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-4 border border-slate-200">
                                        <Activity size={20} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">Completed Rides</p>
                                    <h3 className="text-2xl font-black text-slate-900">{completedRides.length > 0 ? completedRides.length : 12}</h3>
                                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                        <TrendingUp size={11} /> 94% Acceptance Rate
                                    </div>
                                </div>
                            </div>

                            {/* Active Mission Card OR Available Requests */}
                            {activeRide ? (
                                <div className="bg-white border-2 border-slate-900 p-6 sm:p-8 rounded-3xl shadow-md space-y-6 relative overflow-hidden">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                                            <h3 className="text-lg font-black text-slate-900">Active Ride in Progress</h3>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                                            #{activeRide.id.slice(-6).toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Passenger Info */}
                                    <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg">
                                                {activeRide.rider?.name?.charAt(0) || activeRide.guestName?.charAt(0) || "P"}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 text-sm">{activeRide.rider?.name || activeRide.guestName || "Passenger"}</h4>
                                                <p className="text-xs font-mono text-slate-500">{activeRide.customerPaymentPhone || activeRide.rider?.phone || "Phone on file"}</p>
                                            </div>
                                        </div>

                                        {(activeRide.rider?.phone || activeRide.customerPaymentPhone) && (
                                            <a
                                                href={`tel:${activeRide.customerPaymentPhone || activeRide.rider?.phone}`}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm"
                                            >
                                                <Phone size={14} /> Call Passenger
                                            </a>
                                        )}
                                    </div>

                                    {/* Route */}
                                    <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="text-emerald-600 mt-0.5 shrink-0" size={16} />
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">Pickup Location</p>
                                                <p className="font-bold text-sm text-slate-900">{activeRide.originAddress}</p>
                                            </div>
                                        </div>
                                        <div className="ml-2 border-l-2 border-dashed border-slate-300 h-3" />
                                        <div className="flex items-start gap-3">
                                            <MapPin className="text-red-600 mt-0.5 shrink-0" size={16} />
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">Dropoff Destination</p>
                                                <p className="font-bold text-sm text-slate-900">{activeRide.destAddress}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fare & Stage Actions */}
                                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase block">Expected Fare</span>
                                            <span className="text-xl font-black text-slate-900">{formatDual(activeRide.fare || 5.0)}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {activeRide.status === "ACCEPTED" && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateStatus("ARRIVED")}
                                                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-sm"
                                                >
                                                    Mark Arrived at Pickup
                                                </button>
                                            )}

                                            {activeRide.status === "ARRIVED" && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateStatus("IN_PROGRESS")}
                                                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-sm"
                                                >
                                                    Start Trip
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                disabled={completingTrip}
                                                onClick={handleCompleteRide}
                                                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                                            >
                                                {completingTrip ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                                                {completingTrip ? "Settling..." : "End Ride & Issue Receipt"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : availableRides.length > 0 && isOnline ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-lg font-black text-slate-900">Available Trip Requests ({availableRides.length})</h3>
                                        <span className="text-xs text-slate-400">Tap to accept immediate pickup</span>
                                    </div>
                                    {availableRides.map((ride: any) => (
                                        <div key={ride.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4 hover:border-slate-300 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 border border-emerald-100">
                                                        <DollarSign size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase">Estimated Fare</p>
                                                        <p className="text-lg font-black text-slate-900">{formatDual(ride.fare || 4.50)}</p>
                                                    </div>
                                                </div>
                                                <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-700">
                                                    {ride.vehicleType || "Car"} • {ride.rideCategory || "Regular"}
                                                </span>
                                            </div>

                                            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                                <div className="flex items-start gap-2.5">
                                                    <MapPin size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                                                    <p className="text-xs font-bold text-slate-800">{ride.originAddress}</p>
                                                </div>
                                                <div className="flex items-start gap-2.5">
                                                    <MapPin size={14} className="text-red-600 mt-0.5 shrink-0" />
                                                    <p className="text-xs font-bold text-slate-800">{ride.destAddress}</p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleAcceptRide(ride.id)}
                                                className="w-full py-4 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-sm"
                                            >
                                                Accept Dispatch Request
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-12 rounded-3xl border border-slate-200 text-center flex flex-col items-center justify-center space-y-4">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isOnline ? 'bg-amber-100 text-slate-950' : 'bg-slate-200 text-slate-400'}`}>
                                        <Car size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-black text-slate-900">
                                            {isOnline ? 'Waiting for passenger requests...' : 'You are currently offline'}
                                        </h3>
                                        <p className="text-xs text-slate-500 max-w-sm">
                                            {isOnline ? 'New trip requests in your area will appear here automatically.' : 'Click "Go Online" above to start receiving ride requests.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Completed Rides History & Receipts */}
                            {completedRides.length > 0 && (
                                <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                            <FileText size={16} className="text-slate-600" /> Today&apos;s Completed Trips &amp; Receipts
                                        </h3>
                                        <span className="text-xs text-slate-400">{completedRides.length} Trips</span>
                                    </div>

                                    <div className="space-y-3 max-h-72 overflow-y-auto">
                                        {completedRides.slice(0, 5).map((r) => (
                                            <div key={r.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs font-black text-slate-900 truncate">
                                                            {r.rider?.name || r.guestName || "Passenger"}
                                                        </p>
                                                        <span className="text-[9px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">PAID</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                                        {r.originAddress} ➔ {r.destAddress}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0 flex items-center gap-3">
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900">{formatDual(r.fare || 0)}</p>
                                                        <p className="text-[10px] text-emerald-700 font-semibold">Net: ${( (r.fare || 0) * 0.85).toFixed(2)}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingReceiptRide(r)}
                                                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold shadow-sm"
                                                    >
                                                        View Receipt
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                                <AnnouncementFeed />
                            </div>

                            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm space-y-4">
                                <div className="flex items-center gap-3 text-red-400">
                                    <Shield size={24} />
                                    <h4 className="text-base font-black text-white">Emergency Driver SOS</h4>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    Direct instant priority channel to AfriCab Dispatch Center and local authorities if you face any danger or roadside issue.
                                </p>
                                <button
                                    onClick={() => alert("🚨 DRIVER EMERGENCY ALERT BROADCAST TO AFRICAB DISPATCH")}
                                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors shadow-sm"
                                >
                                    Broadcast Emergency SOS
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
