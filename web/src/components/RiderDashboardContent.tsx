"use client";

import React, { useEffect, useState } from "react";
import AnnouncementFeed from "@/components/AnnouncementFeed";
import { Car, MapPin, Navigation, Clock, Shield, Star, ChevronRight, History, Zap, ShieldCheck, Wallet, CreditCard, Smartphone, DollarSign } from "lucide-react";
import { formatDual } from "@/utils/currency";

interface RiderDashboardContentProps {
    user: any;
}

export default function RiderDashboardContent({ user }: RiderDashboardContentProps) {
    const [activeRide, setActiveRide] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingData, setBookingData] = useState({
        pickup: "",
        destination: "",
        paymentMethod: "CASH"
    });
    const [fareEstimate, setFareEstimate] = useState(0);
    const [liteMode, setLiteMode] = useState(false);

    // Dynamic Price Calculation
    useEffect(() => {
        if (bookingData.pickup && bookingData.destination) {
            const base = 2.5;
            const distanceFactor = (bookingData.pickup.length + bookingData.destination.length) / 8;
            const paymentMultiplier = bookingData.paymentMethod === "STRIPE" ? 1.1 : 1.0;
            const total = (base + distanceFactor) * paymentMultiplier;
            setFareEstimate(parseFloat(total.toFixed(2)));
        } else {
            setFareEstimate(0);
        }
    }, [bookingData.pickup, bookingData.destination, bookingData.paymentMethod]);

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
            fetchActiveRide(user.id);
            const interval = setInterval(() => fetchActiveRide(user.id), 10000);
            return () => clearInterval(interval);
        }
    }, [user]);

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
                    vehicleType: "Sedan",
                    paymentMethod: bookingData.paymentMethod
                })
            });

            if (res.ok) {
                const newRide = await res.json();
                setActiveRide(newRide);
                setBookingData({ pickup: "", destination: "", paymentMethod: "CASH" });
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

    return (
        <div className={`container mx-auto px-6 pt-32 pb-20 ${liteMode ? 'bg-white' : ''}`}>
            {/* Lite Mode Toggle */}
            <div className="fixed top-24 right-6 z-40">
                <button
                    onClick={toggleLiteMode}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${liteMode ? 'bg-red-600 text-white' : 'bg-white text-gray-900 border border-gray-100'}`}
                >
                    <Zap size={14} fill={liteMode ? "currentColor" : "none"} />
                    {liteMode ? 'Lite Mode On' : 'Standard Mode'}
                </button>
            </div>
            <div className="max-w-6xl mx-auto space-y-10">
                {/* Welcome Header */}
                <div className="bg-white border-2 border-gray-100 p-8 md:p-12 rounded-[3rem] shadow-xl shadow-gray-100 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-2 text-center md:text-left flex-1">
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

                                        {/* Payment Method Selector */}
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black text-red-200 uppercase tracking-widest pl-2">Payment Option</p>

                                            {/* Primary Options */}
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setBookingData({ ...bookingData, paymentMethod: "CASH" })}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs transition-all ${bookingData.paymentMethod === "CASH" ? "bg-white text-red-600 shadow-lg" : "bg-white/10 text-white hover:bg-white/20"}`}
                                                >
                                                    <Wallet size={14} /> Cash
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setBookingData({ ...bookingData, paymentMethod: "STRIPE" })}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs transition-all ${bookingData.paymentMethod === "STRIPE" ? "bg-white text-red-600 shadow-lg" : "bg-white/10 text-white hover:bg-white/20"}`}
                                                >
                                                    <CreditCard size={14} /> Card (Stripe)
                                                </button>
                                            </div>

                                            {/* Local Mobile Money Options */}
                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setBookingData({ ...bookingData, paymentMethod: "MOMO" })}
                                                    className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-bold text-[9px] transition-all ${bookingData.paymentMethod === "MOMO" ? "bg-white text-red-600 shadow-lg" : "bg-white/10 text-white hover:bg-white/20"}`}
                                                >
                                                    <Zap size={14} /> MoMo
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setBookingData({ ...bookingData, paymentMethod: "ORANGE" })}
                                                    className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-bold text-[9px] transition-all ${bookingData.paymentMethod === "ORANGE" ? "bg-white text-red-600 shadow-lg" : "bg-white/10 text-white hover:bg-white/20"}`}
                                                >
                                                    <Smartphone size={14} className="text-orange-400" /> Orange
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setBookingData({ ...bookingData, paymentMethod: "TIPME" })}
                                                    className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-bold text-[9px] transition-all ${bookingData.paymentMethod === "TIPME" ? "bg-white text-red-600 shadow-lg" : "bg-white/10 text-white hover:bg-white/20"}`}
                                                >
                                                    <DollarSign size={14} className="text-yellow-400" /> TipMe
                                                </button>
                                            </div>
                                        </div>

                                        {/* Fare Estimate Display */}
                                        {fareEstimate > 0 && (
                                            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 flex items-center justify-between animate-in slide-in-from-top-2">
                                                <div>
                                                    <p className="text-[10px] font-black text-red-200 uppercase tracking-widest pl-2 mb-1">Estimated Fare</p>
                                                    <div className="flex items-baseline gap-2 pl-2">
                                                        <span className="text-2xl font-black">${fareEstimate.toFixed(2)}</span>
                                                        <span className="text-xs font-bold text-red-100/60">/ L$ {(fareEstimate * 190).toFixed(0)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right pr-2">
                                                    <div className="text-[10px] font-black bg-white/20 px-2 py-1 rounded text-white uppercase tracking-wider">Standard</div>
                                                </div>
                                            </div>
                                        )}
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
                                                        <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg relative">
                                                            {activeRide.driver.user.name.charAt(0)}
                                                            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full border-2 border-white">
                                                                <ShieldCheck size={10} />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1">
                                                                <p className="text-xl font-black text-gray-900">{activeRide.driver.user.name}</p>
                                                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Verified</span>
                                                            </div>
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
                                {/* SOS Button Fixed */}
                                <button
                                    onClick={() => alert("SOS Alert Sent to LibCab Emergency Dispatch!")}
                                    className="absolute bottom-6 right-6 w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-30 group"
                                >
                                    <Shield size={24} className="group-hover:animate-pulse" />
                                    <span className="absolute -top-10 right-0 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">SOS Emergency</span>
                                </button>
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
    );
}
