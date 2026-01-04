"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Navigation, Star, TrendingUp, Shield, Zap, Wallet, ArrowRight } from "lucide-react";
import { formatDual } from "@/utils/currency";
import { useEffect } from "react";


export default function Hero() {
    const router = useRouter();
    const [pickup, setPickup] = useState("");
    const [destination, setDestination] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [liteMode, setLiteMode] = useState(false);

    useEffect(() => {
        const storedLite = localStorage.getItem("liteMode") === "true";
        setLiteMode(storedLite);
    }, []);

    const toggleLiteMode = () => {
        const newValue = !liteMode;
        setLiteMode(newValue);
        localStorage.setItem("liteMode", String(newValue));
    };

    const handleSeePrices = () => {
        const params = new URLSearchParams();
        if (pickup) params.set("pickup", pickup);
        if (destination) params.set("destination", destination);
        params.set("payment", paymentMethod);
        router.push(`/book/guest?${params.toString()}`);
    };

    return (
        <section className={`relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden transition-colors duration-500 ${liteMode ? 'bg-white' : 'bg-gradient-to-br from-white via-red-50/30 to-white'}`}>
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
            {/* Animated Background Elements */}
            <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[800px] h-[800px] bg-gradient-to-br from-red-100 to-pink-100 rounded-full blur-3xl opacity-40 animate-pulse" />
            <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-[700px] h-[700px] bg-gradient-to-tr from-orange-100 to-red-100 rounded-full blur-3xl opacity-30" />

            {/* Floating Stats Cards */}
            <div className="absolute top-32 left-10 hidden lg:block animate-float">
                <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Star className="w-5 h-5 text-green-600" fill="currentColor" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Rating</p>
                            <p className="font-bold text-lg">4.9/5</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-40 right-10 hidden lg:block animate-float-delayed">
                <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Active Rides</p>
                            <p className="font-bold text-lg">2,500+</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center relative z-10">
                {/* Left Column: Content */}
                <div className="space-y-8">
                    <div className="inline-block">
                        <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                            🚀 Now Available in Your City
                        </span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-gray-900 leading-[1.1]">
                        Go anywhere, <br />
                        <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                            anytime with LibCab.
                        </span>
                    </h1>

                    <p className="text-xl text-gray-600 max-w-md leading-relaxed">
                        Experience the new standard in ride-sharing. Safe, reliable, and affordable rides at your fingertips.
                    </p>

                    {/* Quick Stats */}
                    <div className="flex gap-8 pt-4">
                        <div>
                            <p className="text-3xl font-bold text-gray-900">10K+</p>
                            <p className="text-sm text-gray-500">Happy Riders</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900">500+</p>
                            <p className="text-sm text-gray-500">Drivers</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900">24/7</p>
                            <p className="text-sm text-gray-500">Support</p>
                        </div>
                    </div>

                    {/* Safety & Payment Teasers */}
                    <div className="flex gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100 max-w-sm">
                        <div className="flex items-center gap-2">
                            <Shield className="text-green-600" size={18} />
                            <span className="text-xs font-bold text-gray-700">Safety Hub Built-in</span>
                        </div>
                        <div className="w-[1px] h-4 bg-gray-200 self-center" />
                        <div className="flex items-center gap-2">
                            <Wallet className="text-[#D32F2F]" size={18} />
                            <span className="text-xs font-bold text-gray-700">MoMo Supported</span>
                        </div>
                    </div>

                    {/* Ride Request Widget */}
                    <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-100 max-w-md hover:shadow-3xl transition-shadow duration-300">
                        <h3 className="font-semibold text-lg mb-4 text-gray-900">Request a ride now</h3>
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gray-900"></div>
                                <div className="absolute left-[21px] top-8 h-8 w-[2px] bg-gray-200"></div>
                                <input
                                    type="text"
                                    placeholder="Pickup (e.g. Sinkor, Monrovia)"
                                    value={pickup}
                                    onChange={(e) => setPickup(e.target.value)}
                                    className="w-full bg-gray-50 p-4 pl-12 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-sm bg-red-600"></div>
                                <input
                                    type="text"
                                    placeholder="Where to? (e.g. Paynesville)"
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                    className="w-full bg-gray-50 p-4 pl-12 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all"
                                />
                            </div>

                            {/* Payment Selector in Hero */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("CASH")}
                                    className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border-2 ${paymentMethod === "CASH" ? "border-red-600 bg-red-50 text-red-600" : "border-gray-100 bg-gray-50 text-gray-400 hover:bg-white"}`}
                                >
                                    Cash
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("MOMO")}
                                    className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border-2 ${paymentMethod === "MOMO" ? "border-yellow-400 bg-yellow-50 text-black" : "border-gray-100 bg-gray-50 text-gray-400 hover:bg-white"}`}
                                >
                                    Mobile Money
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("STRIPE")}
                                    className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border-2 ${paymentMethod === "STRIPE" ? "border-blue-600 bg-blue-50 text-blue-600" : "border-gray-100 bg-gray-50 text-gray-400 hover:bg-white"}`}
                                >
                                    Card
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={handleSeePrices}
                            className="w-full mt-6 bg-gradient-to-r from-red-600 to-red-500 text-white p-4 rounded-xl font-bold hover:from-red-700 hover:to-red-600 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/30 flex items-center justify-center gap-2">
                            See prices <ArrowRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Right Column: Visual */}
                <div className="relative h-[600px] w-full hidden md:block">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-all duration-500">
                        {/* App Interface Mockup */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center space-y-4 p-8">
                                <div className="w-32 h-32 mx-auto rounded-full bg-white flex items-center justify-center shadow-2xl p-4">
                                    <img src="/libcab-logo.png" alt="LibCab App" className="w-full h-full object-contain" />
                                </div>
                                <p className="text-white/60 font-medium">Premium Ride Experience</p>
                            </div>
                        </div>

                        {/* Floating Driver Card */}
                        <div className="absolute top-10 right-10 p-4 bg-white rounded-2xl shadow-2xl animate-bounce-slow max-w-[200px]">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center text-white shadow-lg">
                                    <Navigation size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Driver arriving</p>
                                    <p className="font-bold text-lg text-gray-900">2 min</p>
                                </div>
                            </div>
                        </div>

                        {/* Price Tag */}
                        <div className="absolute bottom-10 left-10 p-4 bg-white rounded-2xl shadow-2xl">
                            <p className="text-xs text-gray-500 font-medium mb-1">Estimated fare</p>
                            <p className="font-bold text-lg text-gray-900">{formatDual(12.50)}</p>

                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                }
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                .animate-float-delayed {
                    animation: float-delayed 8s ease-in-out infinite;
                }
                .animate-bounce-slow {
                    animation: bounce-slow 4s ease-in-out infinite;
                }
            `}</style>
        </section>
    );
}
