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
    Map as MapIcon
} from "lucide-react";

interface Ride {
    id: string;
    status: "REQUESTED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    originAddress: string;
    destAddress: string;
    fare: number;
    createdAt: string;
    rider: { name: string; email: string };
    driver?: { user: { name: string } };
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
                    <button className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg flex items-center gap-2">
                        <MapIcon size={20} />
                        View Live Map
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
                        {rides.map((ride) => (
                            <div
                                key={ride.id}
                                className={`group p-5 rounded-[2rem] border-2 transition-all cursor-pointer relative overflow-hidden
                                    ${ride.status === "REQUESTED" ? "border-red-600 bg-red-50/30" : "border-gray-50 bg-white hover:border-gray-200"}
                                `}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-bold text-xs">
                                            {ride.rider.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900 leading-tight">{ride.rider.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{ride.id}</p>
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
                                            <span className="font-black text-lg leading-none">{ride.fare.toFixed(2)}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 ml-1">L$ {(ride.fare * 185).toLocaleString()}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-2 py-2 bg-black text-white rounded-xl font-bold flex items-center gap-2 group-hover:scale-105 transition-transform text-xs px-4">
                                            Assign
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

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
                                <span className="text-xs font-black text-green-600">$2,450.50 today</span>
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-gray-900">$2,450</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gross Revenue (L$ 453,342)</p>
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
        </div>
    );
}
