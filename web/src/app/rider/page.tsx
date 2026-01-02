"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnnouncementFeed from "@/components/AnnouncementFeed";
import { Car, MapPin, Navigation, Clock, Shield, Star, ChevronRight, History } from "lucide-react";
import { formatDual } from "@/utils/currency";
import { useRouter } from "next/navigation";

export default function RiderDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [activeRide, setActiveRide] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingData, setBookingData] = useState({
        pickup: "",
        destination: ""
    });

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem("user");
            if (!storedUser) {
                router.push("/login");
                return;
            }
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.role !== "RIDER") {
                router.push("/");
                return;
            }
            setUser(parsedUser);
            fetchActiveRide(parsedUser.id);

            const interval = setInterval(() => fetchActiveRide(parsedUser.id), 10000);
            return () => clearInterval(interval);
        } catch (e) {
            console.error("Rider dashboard auth failed", e);
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
                    r.riderId === userId &&
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

    const handleBookRide = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookingData.pickup || !bookingData.destination) {
            alert("Please enter both pickup and destination.");
            return;
        }

        setBookingLoading(true);
        try {
            const res = await fetch("/api/rides", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    riderId: user.id,
                    originAddress: bookingData.pickup,
                    destAddress: bookingData.destination,
                    vehicleType: "Sedan"
                })
            });

            if (res.ok) {
                const newRide = await res.json();
                setActiveRide(newRide);
                setBookingData({ pickup: "", destination: "" });
            } else {
                const error = await res.json();
                alert(error.error || "Failed to book ride");
            }
        } catch (error) {
            console.error("Booking failed", error);
            alert("An error occurred while booking.");
        } finally {
            setBookingLoading(false);
        }
    };

    if (!user) return null;

    return (
        <main className="min-h-screen bg-white">
            <Navbar />
            <div className="container mx-auto px-6 pt-32 pb-20">
                <div className="max-w-6xl mx-auto space-y-10">
                    {/* Welcome Header */}
                    <div className="bg-white border-2 border-gray-100 p-8 md:p-12 rounded-[3rem] shadow-xl shadow-gray-100 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="space-y-2 text-center md:text-left">
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
                                Hello, {user.name.split(' ')[0]}!
                            </h1>
                            <p className="text-xl text-gray-500 font-medium">Ready for your next journey?</p>
                        </div>
                        <div className="flex gap-4 p-2 bg-gray-50 rounded-3xl border border-gray-100">
                            <div className="px-6 py-4 text-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rating</p>
                                <p className="text-2xl font-black flex items-center gap-1">4.9 <Star size={18} fill="currentColor" className="text-yellow-400" /></p>
                            </div>
                            <div className="w-[1px] h-12 bg-gray-200 mt-4" />
                            <div className="px-6 py-4 text-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Trips</p>
                                <p className="text-2xl font-black">128</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* Main Interaction Area */}
                        <div className="lg:col-span-7 space-y-10">
                            {/* Ride Booking Form */}
                            {!activeRide && (
                                <div className="bg-red-600 p-10 rounded-[3rem] text-white shadow-2xl shadow-red-500/30 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl transition-transform group-hover:scale-150 duration-700" />
                                    <div className="relative z-10 space-y-8">
                                        <div className="space-y-2">
                                            <h2 className="text-3xl font-black">Book a Ride</h2>
                                            <p className="text-red-100 font-medium opacity-80">Quick, safe, and reliable transportation.</p>
                                        </div>

                                        <form onSubmit={handleBookRide} className="space-y-4">
                                            <div className="relative">
                                                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-red-500" size={20} />
                                                <input
                                                    type="text"
                                                    placeholder="Where from?"
                                                    className="w-full pl-14 pr-6 py-5 bg-white text-gray-900 border-none rounded-[2rem] outline-none font-bold text-lg placeholder:text-gray-300 focus:ring-4 focus:ring-white/20 transition-all"
                                                    value={bookingData.pickup}
                                                    onChange={(e) => setBookingData({ ...bookingData, pickup: e.target.value })}
                                                />
                                            </div>
                                            <div className="relative text-center -my-2 relative z-20">
                                                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center mx-auto border-4 border-red-600 shadow-xl">
                                                    <Navigation size={18} className="text-white transform rotate-45" />
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-black" size={20} />
                                                <input
                                                    type="text"
                                                    placeholder="Where to?"
                                                    className="w-full pl-14 pr-6 py-5 bg-white text-gray-900 border-none rounded-[2rem] outline-none font-bold text-lg placeholder:text-gray-300 focus:ring-4 focus:ring-white/20 transition-all"
                                                    value={bookingData.destination}
                                                    onChange={(e) => setBookingData({ ...bookingData, destination: e.target.value })}
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={bookingLoading}
                                                className="w-full mt-4 py-5 bg-black text-white rounded-[2rem] font-black text-lg uppercase tracking-widest hover:bg-gray-900 active:scale-95 transition-all shadow-2xl disabled:opacity-50 flex items-center justify-center gap-3"
                                            >
                                                {bookingLoading ? (
                                                    <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <>Request LibCab <ChevronRight size={20} /></>
                                                )}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {/* Active Ride Display */}
                            {activeRide && (
                                <div className="bg-white p-10 rounded-[3rem] border-4 border-black shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 px-8 py-3 bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-bl-3xl">
                                        Active Trip
                                    </div>

                                    <div className="space-y-8">
                                        <div className="flex items-center gap-4">
                                            <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest
                                                ${activeRide.status === "REQUESTED" ? "bg-yellow-100 text-yellow-700" :
                                                    activeRide.status === "ACCEPTED" ? "bg-blue-100 text-blue-700" :
                                                        "bg-green-100 text-green-700"}
                                            `}>
                                                {activeRide.status.replace('_', ' ')}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-6 relative">
                                                <div className="absolute left-2.5 top-6 bottom-6 w-0.5 bg-dashed border-l-2 border-dashed border-gray-200" />
                                                <div className="flex items-start gap-5 relative">
                                                    <div className="mt-1.5 w-5 h-5 rounded-full bg-red-600 ring-4 ring-red-50 flex-shrink-0" />
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pickup</p>
                                                        <p className="text-lg font-black text-gray-900">{activeRide.originAddress}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-5 relative">
                                                    <div className="mt-1.5 w-5 h-5 rounded-sm bg-black ring-4 ring-gray-100 flex-shrink-0" />
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Destination</p>
                                                        <p className="text-lg font-black text-gray-900">{activeRide.destAddress}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {activeRide.driver ? (
                                                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Your Driver</p>
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg">
                                                                {activeRide.driver.user.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-xl font-black text-gray-900">{activeRide.driver.user.name}</p>
                                                                <p className="text-sm text-gray-500 font-bold">{activeRide.driver.vehicleModel || "Toyota Corolla"}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-6 bg-yellow-50 rounded-3xl border-2 border-yellow-100 animate-pulse">
                                                        <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-2">Connecting...</p>
                                                        <p className="text-lg font-black text-yellow-900">Finding your driver</p>
                                                    </div>
                                                )}
                                                <div className="p-6 bg-black text-white rounded-3xl flex items-center justify-between shadow-xl">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Est. Fare</p>
                                                        <p className="text-2xl font-black">{formatDual(activeRide.fare)}</p>
                                                    </div>
                                                    <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center">
                                                        <Navigation size={24} className="text-white" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Recent Trips Header */}
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-2xl font-black text-gray-900">Recent Activity</h3>
                                <button className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:tracking-[0.2em] transition-all">View History</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 hover:bg-white hover:shadow-xl transition-all group">
                                    <div className="w-14 h-14 bg-white text-gray-900 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:bg-black group-hover:text-white transition-all">
                                        <History size={28} />
                                    </div>
                                    <h4 className="text-xl font-black mb-1">Trip to Market</h4>
                                    <p className="text-gray-500 font-medium text-sm">Yesterday • $3.50</p>
                                </div>
                                <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 hover:bg-white hover:shadow-xl transition-all group">
                                    <div className="w-14 h-14 bg-white text-gray-900 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:bg-black group-hover:text-white transition-all">
                                        <History size={28} />
                                    </div>
                                    <h4 className="text-xl font-black mb-1">Morning Commute</h4>
                                    <p className="text-gray-500 font-medium text-sm">2 days ago • $5.00</p>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-5 space-y-10">
                            <div className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100">
                                <AnnouncementFeed />
                            </div>

                            <div className="bg-black p-10 rounded-[3rem] text-white overflow-hidden relative group cursor-pointer">
                                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-red-600 rounded-full blur-[80px] opacity-40 group-hover:opacity-60 transition-opacity" />
                                <Shield size={40} className="text-red-500 mb-6 group-hover:scale-110 transition-transform" />
                                <h4 className="text-2xl font-black mb-2">Safety Center</h4>
                                <p className="text-gray-400 font-medium mb-6">Learn about our safety protocols and 24/7 support.</p>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/50 group-hover:text-white transition-colors">
                                    Explore Safety <ChevronRight size={14} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </main>
    );
}
