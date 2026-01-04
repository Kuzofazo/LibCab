"use client";

import React, { useEffect, useState } from "react";
import AnnouncementFeed from "@/components/AnnouncementFeed";
import {
    Car,
    Navigation,
    Shield,
    Star,
    DollarSign,
    Activity,
    ChevronRight,
    Power,
    MapPin,
    Clock,
    Zap,
    TrendingUp,
    ShieldAlert
} from "lucide-react";
import { formatDual } from "@/utils/currency";

interface DriverDashboardContentProps {
    user: any;
}

export default function DriverDashboardContent({ user }: DriverDashboardContentProps) {
    const [activeRide, setActiveRide] = useState<any>(null);
    const [availableRides, setAvailableRides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
    const [liteMode, setLiteMode] = useState(false);
    const [earningsPeriod, setEarningsPeriod] = useState<"TODAY" | "WEEKLY">("TODAY");

    useEffect(() => {
        const storedLite = localStorage.getItem("liteMode") === "true";
        setLiteMode(storedLite);
    }, []);

    const toggleLiteMode = () => {
        const newValue = !liteMode;
        setLiteMode(newValue);
        localStorage.setItem("liteMode", String(newValue));
    };

    useEffect(() => {
        if (user) {
            fetchRides(user.id);
            const interval = setInterval(() => fetchRides(user.id), 5000); // Faster polling for requests
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchRides = async (userId: string) => {
        try {
            const res = await fetch("/api/rides");
            const data = await res.json();

            if (Array.isArray(data)) {
                // 1. Find my active ride (Accepted/In Progress)
                const myActiveRide = data.find(r =>
                    r.driverId === userId &&
                    ["ACCEPTED", "IN_PROGRESS"].includes(r.status)
                );
                setActiveRide(myActiveRide);

                // 2. Find available rides (Requested, no driver)
                // In a real app, filtering by location happens on backend
                const requests = data.filter(r => r.status === "REQUESTED" && !r.driverId);
                setAvailableRides(requests);
            }
        } catch (error) {
            console.error("Failed to fetch rides", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptRide = async (rideId: string) => {
        if (!user) return;
        try {
            const res = await fetch("/api/rides", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: rideId,
                    status: "ACCEPTED",
                    driverId: user.id
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                console.error("Accept ride failed:", res.status, errData);
                alert(`Failed to accept ride: ${errData.details || errData.error}`);
            } else {
                // Refresh immediately
                fetchRides(user.id);
            }
        } catch (error) {
            console.error("Failed to accept ride (network/client error)", error);
        }
    };

    const toggleStatus = () => {
        setIsOnline(!isOnline);
    };

    return (
        <div className={`min-h-screen ${liteMode ? 'bg-gray-100' : 'bg-black'} text-white transition-colors duration-500`}>
            {/* Top Status Bar */}
            <div className={`mt-20 py-4 px-6 flex items-center justify-between border-b border-white/5 transition-colors duration-500 ${isOnline ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="font-black text-xs uppercase tracking-[0.2em]">
                        {isOnline ? 'Active & Receiving Requests' : 'You are currently Offline'}
                    </span>
                </div>
                <button
                    onClick={toggleStatus}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${isOnline ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} shadow-lg`}
                >
                    <Power size={14} />
                    Go {isOnline ? 'Offline' : 'Online'}
                </button>
            </div>

            {/* Lite Mode Toggle */}
            <div className="fixed top-24 right-6 z-40">
                <button
                    onClick={toggleLiteMode}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${liteMode ? 'bg-red-600 text-white' : 'bg-white/10 text-white border border-white/5 backdrop-blur-md'}`}
                >
                    <Zap size={14} fill={liteMode ? "currentColor" : "none"} />
                    {liteMode ? 'Lite Mode On' : 'Standard Mode'}
                </button>
            </div>

            <div className="container mx-auto px-6 pt-12 pb-20">
                <div className="max-w-6xl mx-auto space-y-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        <div className="lg:col-span-8 space-y-10">
                            {/* Profile Header */}
                            <div className="flex flex-col md:flex-row items-center gap-8 bg-gray-900/50 p-10 rounded-[3rem] border border-white/5 backdrop-blur-xl">
                                <div className="w-24 h-24 bg-red-600 rounded-3xl flex items-center justify-center font-black text-4xl shadow-2xl shadow-red-600/20">
                                    {user.name.charAt(0)}
                                </div>
                                <div className="text-center md:text-left space-y-1 flex-1">
                                    <h1 className="text-4xl font-black tracking-tight">Driver {user.name.split(' ')[0]}</h1>
                                    <p className="text-gray-400 font-medium">LibCab Professional Partner</p>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                                        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5 text-xs font-bold">
                                            <Star size={14} className="text-yellow-400 fill-yellow-400" /> 4.9 Rating
                                        </div>
                                        <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full border border-green-500/20 text-xs font-bold text-green-400">
                                            <Shield size={14} className="fill-green-400" /> Verified Pro
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5 text-xs font-bold">
                                            <Car size={14} className="text-red-500" /> Toyota Camry
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right hidden md:block">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Trip ID</p>
                                    <p className="text-xl font-mono text-white/40">LC-8842</p>
                                </div>
                            </div>

                            {/* Earnings & Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[2.5rem] border border-white/5 shadow-xl group hover:border-red-500/30 transition-all relative">
                                    <div className="absolute top-4 right-4 flex bg-white/5 rounded-lg p-1">
                                        <button
                                            onClick={() => setEarningsPeriod("TODAY")}
                                            className={`px-2 py-1 text-[8px] font-black rounded-md transition-all ${earningsPeriod === "TODAY" ? "bg-red-600 text-white" : "text-gray-500"}`}
                                        >DAY</button>
                                        <button
                                            onClick={() => setEarningsPeriod("WEEKLY")}
                                            className={`px-2 py-1 text-[8px] font-black rounded-md transition-all ${earningsPeriod === "WEEKLY" ? "bg-red-600 text-white" : "text-gray-500"}`}
                                        >WEEK</button>
                                    </div>
                                    <DollarSign className="text-green-500 mb-6 group-hover:scale-110 transition-transform" size={32} />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                        {earningsPeriod === "TODAY" ? "Today's Earnings" : "Weekly Earnings"}
                                    </p>
                                    <h3 className="text-3xl font-black">
                                        {earningsPeriod === "TODAY" ? formatDual(1250) : formatDual(8450)}
                                    </h3>
                                    <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-green-400">
                                        <Activity size={12} /> {earningsPeriod === "TODAY" ? "+12.5% from yesterday" : "+8.2% from last week"}
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[2.5rem] border border-white/5 shadow-xl group hover:border-red-500/30 transition-all">
                                    <Clock className="text-blue-500 mb-6 group-hover:scale-110 transition-transform" size={32} />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Hours Online</p>
                                    <h3 className="text-3xl font-black">6.4h</h3>
                                    <p className="mt-4 text-[10px] font-bold text-gray-500">Target: 8.0h</p>
                                </div>
                                <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[2.5rem] border border-white/5 shadow-xl group hover:border-red-500/30 transition-all">
                                    <Activity className="text-red-500 mb-6 group-hover:scale-110 transition-transform" size={32} />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Accepted Trips</p>
                                    <h3 className="text-3xl font-black">12</h3>
                                    <p className="mt-4 text-[10px] font-bold text-gray-500">98% Acceptance Rate</p>
                                </div>
                            </div>

                            {activeRide ? (
                                <div className="bg-white text-gray-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 px-8 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-bl-3xl">
                                        Current Task
                                    </div>

                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                                                    <Navigation size={28} className="text-red-600 animate-pulse" />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-black">Drive to Destination</h3>
                                                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">In Progress</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rider</p>
                                                <p className="text-xl font-black">{activeRide.rider?.name || 'Guest'}</p>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 space-y-6">
                                            <div className="flex items-start gap-4">
                                                <MapPin className="text-red-500 mt-1" size={20} />
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pickup</p>
                                                    <p className="font-black text-lg">{activeRide.originAddress}</p>
                                                </div>
                                            </div>
                                            <div className="w-full h-[2px] bg-gray-100 border-t border-dashed border-gray-300" />
                                            <div className="flex items-start gap-4">
                                                <MapPin className="text-black mt-1" size={20} />
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dropoff</p>
                                                    <p className="font-black text-lg">{activeRide.destAddress}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <button className="flex-1 py-5 bg-black text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-transform">
                                                Navigate
                                            </button>
                                            <button className="flex-1 py-5 bg-red-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-transform">
                                                Complete Ride
                                            </button>
                                        </div>
                                    </div>
                                    {/* Quick SOS in Task */}
                                    <button
                                        onClick={() => alert("EMERGENCY SIGNAL SENT TO LIB CAB DISPATCH")}
                                        className="absolute top-4 right-4 text-red-600 hover:text-red-700 active:scale-95 transition-all p-2 bg-red-50 rounded-xl border border-red-100"
                                    >
                                        <ShieldAlert size={20} />
                                    </button>
                                </div>
                            ) : availableRides.length > 0 && isOnline ? (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-4">
                                        <h3 className="text-2xl font-black">Available Requests ({availableRides.length})</h3>
                                    </div>
                                    {availableRides.map((ride: any) => (
                                        <div key={ride.id} className="bg-white text-gray-900 p-8 rounded-[2.5rem] shadow-xl border border-white/10 hover:scale-[1.01] transition-transform">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                                        <DollarSign size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Est. Earning</p>
                                                        <p className="text-xl font-black">{formatDual(4.50)}</p>
                                                    </div>
                                                </div>
                                                <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold uppercase tracking-wide text-gray-500">
                                                    {ride.vehicleType}
                                                </span>
                                            </div>

                                            <div className="space-y-4 mb-8">
                                                <div className="flex gap-3">
                                                    <div className="mt-1 min-w-[20px]"><MapPin size={16} className="text-green-600" /></div>
                                                    <p className="font-bold text-sm">{ride.originAddress}</p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="mt-1 min-w-[20px]"><MapPin size={16} className="text-red-600" /></div>
                                                    <p className="font-bold text-sm">{ride.destAddress}</p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleAcceptRide(ride.id)}
                                                className="w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors shadow-lg"
                                            >
                                                Accept Ride
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-gray-900/50 p-20 rounded-[3rem] border-2 border-dashed border-white/10 text-center flex flex-col items-center justify-center space-y-6 group">
                                    <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isOnline ? 'bg-green-500/10 text-green-500 scale-110' : 'bg-gray-800 text-gray-600'}`}>
                                        <Car size={48} className={isOnline ? 'animate-bounce' : ''} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black">
                                            {isOnline ? 'Waiting for passengers...' : 'Offline'}
                                        </h3>
                                        <p className="text-gray-500 font-medium max-w-sm">
                                            {isOnline ? 'New trip requests will appear here as soon as they are available.' : 'Go online to start receiving ride requests.'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-4 space-y-10">
                            <div className="bg-gray-900/50 p-10 rounded-[3rem] border border-white/5">
                                <AnnouncementFeed />
                            </div>

                            <div className="bg-gradient-to-br from-red-600 to-red-800 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group cursor-pointer">
                                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                                <Shield size={40} className="mb-6 group-hover:animate-shake" />
                                <h4 className="text-2xl font-black mb-2 leading-tight">Emergency SOS</h4>
                                <p className="text-white/80 font-medium mb-8 text-sm">One tap to alert dispatch and emergency services if you are in danger.</p>
                                <button className="w-full py-4 bg-white text-red-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-100 transition-colors">
                                    Alert Help
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
