"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnnouncementFeed from "@/components/AnnouncementFeed";
import { Car, Navigation, Shield, Star, DollarSign, Activity, ChevronRight, Power, MapPin, Clock } from "lucide-react";
import { formatDual } from "@/utils/currency";
import { useRouter } from "next/navigation";

export default function DriverDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [activeRide, setActiveRide] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem("user");
            if (!storedUser) {
                router.push("/login");
                return;
            }
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.role !== "DRIVER") {
                router.push("/");
                return;
            }
            setUser(parsedUser);
            fetchActiveRide(parsedUser.id);

            const interval = setInterval(() => fetchActiveRide(parsedUser.id), 10000);
            return () => clearInterval(interval);
        } catch (e) {
            console.error("Driver dashboard auth failed", e);
            localStorage.removeItem("user");
            router.push("/login");
        }
    }, []);

    const fetchActiveRide = async (userId: string) => {
        try {
            const res = await fetch("/api/rides");
            const data = await res.json();

            if (Array.isArray(data)) {
                const myActiveRide = data.find(r =>
                    r.driverId === userId &&
                    ["ACCEPTED", "IN_PROGRESS"].includes(r.status)
                );
                setActiveRide(myActiveRide);
            }
        } catch (error) {
            console.error("Failed to fetch active ride", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = () => {
        setIsOnline(!isOnline);
        // Implement API call to update driver status if needed
    };

    if (!user) return null;

    return (
        <main className="min-h-screen bg-black text-white">
            <Navbar />

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

            <div className="container mx-auto px-6 pt-12 pb-20">
                <div className="max-w-6xl mx-auto space-y-10">

                    {/* Hero Section */}
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
                                <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[2.5rem] border border-white/5 shadow-xl group hover:border-red-500/30 transition-all">
                                    <DollarSign className="text-green-500 mb-6 group-hover:scale-110 transition-transform" size={32} />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Today's Earnings</p>
                                    <h3 className="text-3xl font-black">{formatDual(1250)}</h3>
                                    <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-green-400">
                                        <Activity size={12} /> +12.5% from yesterday
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

                            {/* Active Task / Current Ride */}
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
            <Footer />
        </main>
    );
}
