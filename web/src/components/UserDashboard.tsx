"use client";

import React, { useEffect, useState } from "react";
import AnnouncementFeed from "./AnnouncementFeed";
import { Car, MapPin, Navigation, Clock, Shield, Star, DollarSign, Activity, ChevronRight } from "lucide-react";
import { formatDual } from "@/utils/currency";

export default function UserDashboard() {
    const [user, setUser] = useState<any>(null);
    const [activeRide, setActiveRide] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }

        // Mock fetching active ride - in a real app, this would be an API call
        fetchActiveRide();

        // Poll for ride updates
        const interval = setInterval(fetchActiveRide, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchActiveRide = async () => {
        try {
            // This would call /api/rides/active or similar
            // For now, let's fetch all rides and find one that is active for this user
            const userId = JSON.parse(localStorage.getItem("user") || "{}").id;
            const res = await fetch("/api/rides");
            const data = await res.json();

            if (Array.isArray(data)) {
                const myActiveRide = data.find(r =>
                    (r.riderId === userId || r.driverId === userId) &&
                    ["REQUESTED", "ACCEPTED", "IN_PROGRESS"].includes(r.status)
                );
                setActiveRide(myActiveRide);
            }
        } catch (error) {
            console.error("Failed to fetch active ride", error);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    const isDriver = user.role === "DRIVER";

    return (
        <div className="container mx-auto px-6 pt-32 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Welcome Header */}
                    <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[2.5rem] text-white overflow-hidden relative shadow-2xl">
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-red-600 rounded-full blur-3xl opacity-20" />
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-4xl font-black tracking-tight mb-2">Welcome back, {user.name.split(' ')[0]}!</h1>
                                <p className="text-gray-400 font-medium">
                                    {isDriver ? "You are currently online and ready for rides." : "Where are we heading today?"}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
                                <div className="text-center group">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-red-500 transition-colors">Rating</p>
                                    <p className="text-xl font-black flex items-center gap-1">4.9 <Star size={16} fill="currentColor" className="text-yellow-400" /></p>
                                </div>
                                <div className="w-[1px] h-8 bg-white/20" />
                                <div className="text-center group">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-red-500 transition-colors">Trips</p>
                                    <p className="text-xl font-black">128</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Active Ride Card */}
                    {activeRide ? (
                        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-red-600 shadow-xl shadow-red-500/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 px-6 py-2 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-2xl">
                                Active Ride
                            </div>

                            <div className="flex flex-col md:flex-row justify-between gap-8">
                                <div className="flex-1 space-y-6">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider
                                            ${activeRide.status === "REQUESTED" ? "bg-yellow-100 text-yellow-700" :
                                                activeRide.status === "ACCEPTED" ? "bg-blue-100 text-blue-700" :
                                                    "bg-green-100 text-green-700"}
                                        `}>
                                            {activeRide.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 w-3 h-3 rounded-full bg-red-600 ring-4 ring-red-50" />
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pickup</p>
                                                <p className="font-bold text-gray-900">{activeRide.originAddress}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 w-3 h-3 rounded-sm bg-black ring-4 ring-gray-100" />
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Destination</p>
                                                <p className="font-bold text-gray-900">{activeRide.destAddress}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full md:w-64 space-y-4">
                                    {activeRide.driver ? (
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Your Driver</p>
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center font-bold text-xl">
                                                    {activeRide.driver.user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900">{activeRide.driver.user.name}</p>
                                                    <p className="text-xs text-gray-500 font-bold">{activeRide.driver.vehicleModel || "Toyota Corolla"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100 animate-pulse">
                                            <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-2">Finding Driver</p>
                                            <p className="text-sm font-bold text-yellow-800">Assigning your cab...</p>
                                        </div>
                                    )}

                                    <div className="p-4 bg-black text-white rounded-2xl flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fare</p>
                                            <p className="text-lg font-black">{formatDual(activeRide.fare)}</p>
                                        </div>
                                        <Navigation className="text-red-500" size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-600 group-hover:text-white transition-all">
                                    <Car size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2">Book a Ride</h3>
                                <p className="text-gray-500 font-medium mb-6">Need to get somewhere? Our top-rated drivers are just minutes away.</p>
                                <button className="w-full py-4 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg">Request now</button>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <Activity size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2">History</h3>
                                <p className="text-gray-500 font-medium mb-6">Review your past trips, receipts, and track your spending easily.</p>
                                <button className="w-full py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all">View all trips</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar: Announcements */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gray-50 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <AnnouncementFeed />
                    </div>

                    <div className="bg-gradient-to-br from-red-600 to-red-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-red-500/20 group cursor-pointer overflow-hidden relative">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
                        <Shield className="mb-4 text-white" size={32} />
                        <h4 className="text-xl font-black mb-1 leading-tight">Safety First</h4>
                        <p className="text-white/80 text-sm font-medium mb-4">Learn about our LibCab safety protocols and emergency SOS.</p>
                        <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest group-hover:gap-3 transition-all">
                            View Safety Center <ChevronRight size={14} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
