"use client";

import React, { useEffect, useState } from "react";
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
    Phone
} from "lucide-react";
import { formatLRD, formatUSD } from "@/utils/currency";


import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/MapComponent'), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-500">Loading Map...</div>
});

interface Ride {
    id: string;
    status: "REQUESTED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    originAddress: string;
    destAddress: string;
    fare: number;
    createdAt: string;
    rider?: { name: string; email: string };
    guestName?: string;
    guestPhone?: string;
    driver?: { user: { name: string } };
    originLat?: number;
    originLng?: number;
}

export default function DispatchPage() {
    const [rides, setRides] = useState<Ride[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRides = async () => {
        try {
            const res = await fetch("/api/rides");
            const data = await res.json();
            if (res.ok) {
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

    useEffect(() => {
        fetchRides();
        // Poll for updates every 10 seconds
        const interval = setInterval(fetchRides, 10000);
        return () => clearInterval(interval);
    }, []);
    const [filter, setFilter] = useState("ALL");
    const [isLiveMapOpen, setIsLiveMapOpen] = useState(false);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualRide, setManualRide] = useState({ phone: "", pickup: "", destination: "" });

    const handleManualBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Need a valid active session or just bypass?
            // "Call to Dispatch" bypasses OTP usually or acts as admin override.
            // But my API reqs 'sessionId'. 
            // For now, I'll update API to allow 'adminOverride' or just create a session on the fly?
            // Let's quickly create a session first via backend or just use a new "Create Manual Ride" API.
            // Actually, I'll use the guest ride API but I need a session ID.
            // Better: Dispatcher just enters phone. System creates session if needed.
            // I'll call a new endpoint `/api/admin/dispatch/manual-ride` to be cleaner?
            // Or just reuse `/api/rides/guest` if I can get a session.
            // I'll create a `POST /api/admin/rides` which I should have anyway for admins.
            // Let's use `POST /api/rides/guest` but with a special "DISPATCHER_OVERRIDE" session? 
            // Attempting to reuse existing guest API is tricky without OTP.
            // I will use `POST /api/rides/guest` but I need to generate a session first.
            // Actually, I will create a new simple endpoint `POST /api/admin/rides/create` or similar.
            // Wait, I see I already have `POST /api/rides` which takes `riderId`.
            // I should update `POST /api/rides` to accept `guestPhone` instead of `riderId` as well.

            const res = await fetch("/api/rides", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    guestPhone: manualRide.phone,
                    originAddress: manualRide.pickup,
                    destAddress: manualRide.destination,
                    payment: "CASH"
                })
            });

            if (res.ok) {
                alert("Ride dispatched successfully");
                setIsManualModalOpen(false);
                setManualRide({ phone: "", pickup: "", destination: "" });
                fetchRides();
            } else {
                alert("Failed to dispatch");
            }
        } catch (error) {
            alert("Error dispatching ride");
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Real-Time Dispatch</h1>
                    <p className="text-gray-500">Monitor live rides and efficiently manage trip assignments.</p>
                </div>
                <div className="flex gap-2">
                    <button className="p-3 bg-white border border-gray-100 text-gray-400 rounded-xl hover:text-gray-900 transition-all shadow-sm">
                        <RefreshCcw size={20} />
                    </button>
                    <button
                        onClick={() => setIsLiveMapOpen(true)}
                        className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg flex items-center gap-2"
                    >
                        <MapIcon size={20} />
                        View Live Map
                    </button>
                    <button
                        onClick={() => setIsManualModalOpen(true)}
                        className="bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold hover:bg-yellow-300 transition-all shadow-lg flex items-center gap-2"
                    >
                        <Phone size={20} />
                        Call to Dispatch
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                {/* Control Panel */}
                <div className="w-96 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-100 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-black text-gray-900">Incoming</h2>
                            <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search riders, drivers..."
                                className="w-full bg-white pl-12 pr-4 py-3 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-red-600 outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {rides.map((ride) => {
                            const isGuest = !ride.rider;
                            const displayName = isGuest ? (ride.guestName || "Guest User") : (ride.rider?.name || "Unknown User");
                            const displayMeta = isGuest ? (ride.guestPhone || "No Phone") : (ride.rider?.email || "No Email");

                            return (
                                <div
                                    key={ride.id}
                                    className={`group p-5 rounded-[2rem] border-2 transition-all cursor-pointer relative overflow-hidden
                                        ${ride.status === "REQUESTED" ? "border-red-600 bg-red-50/30" : "border-gray-50 bg-white hover:border-gray-200"}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs ${isGuest ? "bg-yellow-400 text-black" : "bg-black"}`}>
                                                {isGuest ? <User size={16} /> : displayName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 leading-tight">{displayName}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{isGuest ? "GUEST CALLER" : "APP USER"}</p>
                                                {isGuest && <p className="text-xs font-mono text-gray-500">{displayMeta}</p>}
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter
                                            ${ride.status === "REQUESTED" ? "bg-red-600 text-white" :
                                                ride.status === "ACCEPTED" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"}
                                        `}>
                                            {ride.status.replace("_", " ")}
                                        </span>
                                    </div>

                                    <div className="space-y-3 mb-5">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 w-2.5 h-2.5 rounded-full bg-red-600 ring-4 ring-red-50" />
                                            <p className="text-xs font-bold text-gray-600 leading-snug line-clamp-1">{ride.originAddress}</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 w-2.5 h-2.5 rounded-md bg-black ring-4 ring-gray-50" />
                                            <p className="text-xs font-black text-gray-900 leading-snug line-clamp-1">{ride.destAddress}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                        <div className="flex flex-col text-red-600">
                                            <div className="flex items-center gap-1">
                                                <DollarSign size={14} />
                                                <span className="font-black text-lg leading-none">{ride.fare ? ride.fare.toFixed(2) : "0.00"}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400 ml-1">L$ {formatLRD(ride.fare || 0)}</span>

                                        </div>
                                        <div className="flex gap-2">
                                            <button className="p-2 py-2 bg-black text-white rounded-xl font-bold flex items-center gap-2 group-hover:scale-105 transition-transform text-xs px-4">
                                                Assign
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Manual Booking Modal Trigger handled in parent */}

                {/* Dashboard / Analytics View */}
                <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between h-40">
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><Activity size={24} /></div>
                                <span className="text-xs font-black text-red-600">+12% vol.</span>
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-gray-900">42</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Rides</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between h-40">
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Compass size={24} /></div>
                                <span className="text-xs font-black text-gray-400">92% online</span>
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-gray-900">128</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Available Drivers</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between h-40">
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-green-50 text-green-600 rounded-2xl"><DollarSign size={24} /></div>
                                <span className="text-xs font-black text-green-600">{formatUSD(2450.50)} today</span>

                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-gray-900">{formatUSD(2450)}</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gross Revenue (L$ {formatLRD(2450)})</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">System Health</h2>
                                <p className="text-sm text-gray-500 font-medium">Monitoring platform performance and load.</p>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-full text-xs font-black">
                                <CheckCircle2 size={16} /> ALL SYSTEMS OPERATIONAL
                            </div>
                        </div>

                        <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] opacity-5 grayscale" style={{ backgroundSize: '200%' }} />
                            <div className="text-center z-10 p-8">
                                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl mx-auto mb-6 text-red-600 animate-bounce">
                                    <MapIcon size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Live Heatmap</h3>
                                <p className="text-sm text-gray-500 max-w-xs mx-auto">Visualizing demand density and driver distribution in real-time across active zones.</p>
                                <button className="mt-6 px-8 py-3 bg-black text-white rounded-2xl font-black text-sm hover:scale-105 transition-all">Launch Full Monitor</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Map Overlay */}
            {isLiveMapOpen && (
                <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col animate-in fade-in duration-300">
                    <div className="bg-white p-4 flex items-center justify-between border-b shadow-sm z-10">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-gray-900">Live Fleet Monitor</h2>
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <span className="text-sm font-bold text-green-700">Live Updates Active</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsLiveMapOpen(false)}
                            className="bg-black text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-800 transition-colors"
                        >
                            Close Map
                        </button>
                    </div>
                    <div className="flex-1 relative bg-gray-100 overflow-hidden">
                        {/* Mock Map Background */}
                        <div className="absolute inset-0 bg-[#e5e7eb] flex items-center justify-center opacity-50 overflow-hidden"
                            style={{
                                backgroundImage: 'linear-gradient(#d1d5db 1px, transparent 1px), linear-gradient(90deg, #d1d5db 1px, transparent 1px)',
                                backgroundSize: '40px 40px'
                            }}>
                            <span className="text-4xl font-black text-gray-300 transform -rotate-45 select-none pointer-events-none">
                                LIBERIA MAP VIEW
                            </span>
                        </div>

                        {/* Animated Driver Markers (Mock) */}
                        {rides.slice(0, 5).map((ride, i) => (
                            <div
                                key={ride.id}
                                className="absolute bg-white p-2 rounded-xl shadow-lg border border-gray-200 flex flex-col items-center gap-1 transition-all duration-[2000ms]"
                                style={{
                                    top: `${20 + (i * 15)}%`,
                                    left: `${30 + (i * 10)}%`
                                }}
                            >
                                <div className="p-2 bg-red-600 text-white rounded-lg shadow-sm animate-bounce" style={{ animationDelay: `${i * 0.5}s` }}>
                                    <Car size={16} fill="currentColor" />
                                </div>
                                <div className="bg-white px-2 py-1 rounded text-[10px] font-bold shadow-sm whitespace-nowrap">
                                    {ride.driver?.user.name || "Driver"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {isManualModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold flex items-center gap-2"><Phone size={20} /> Call-to-Dispatch</h3>
                            <button onClick={() => setIsManualModalOpen(false)} className="px-3 py-1 hover:bg-gray-100 rounded-full font-bold">✕</button>
                        </div>
                        <form onSubmit={handleManualBooking} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Caller Phone</label>
                                <input
                                    type="tel"
                                    required
                                    className="w-full px-4 py-2 border rounded-xl"
                                    placeholder="077 000 0000"
                                    value={manualRide.phone}
                                    onChange={e => setManualRide({ ...manualRide, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Pickup Location</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border rounded-xl"
                                    placeholder="e.g. Red Light Market"
                                    value={manualRide.pickup}
                                    onChange={e => setManualRide({ ...manualRide, pickup: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Destination</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border rounded-xl"
                                    placeholder="e.g. Sinkor 12th St"
                                    value={manualRide.destination}
                                    onChange={e => setManualRide({ ...manualRide, destination: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsManualModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-yellow-400 text-black rounded-xl font-bold">Dispatch Ride</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
