"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Navigation, Star, TrendingUp, Shield, Zap, Wallet, ArrowRight, User } from "lucide-react";


export default function Hero() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [pickup, setPickup] = useState("");
    const [destination, setDestination] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("MOMO");
    const [liteMode, setLiteMode] = useState(false);
    const [attemptedSubmit, setAttemptedSubmit] = useState(false);

    const isFormComplete = pickup.trim() !== "" && destination.trim() !== "";

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
        setAttemptedSubmit(true);
        if (!pickup.trim() || !destination.trim()) return;

        const params = new URLSearchParams();
        if (name.trim()) params.set("name", name.trim());
        params.set("pickup", pickup.trim());
        params.set("destination", destination.trim());
        params.set("payment", paymentMethod);
        router.push(`/book/guest?${params.toString()}`);
    };

    return (
        <section className={`relative pt-28 pb-16 sm:pt-36 md:pt-48 md:pb-32 overflow-hidden transition-colors duration-500 ${liteMode ? 'bg-white' : 'bg-gradient-to-br from-white via-red-50/30 to-white'}`}>
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

            <div className="container mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center relative z-10">
                {/* Left Column: Content */}
                <div className="space-y-8">
                    <div className="inline-block">
                        <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                            🚀 Now Available in Your City
                        </span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter text-gray-900 leading-[1.1]">
                        The Best <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">Taxi Booking</span>{" "}<br className="hidden sm:block" />
                        Platform in Liberia.
                    </h1>

                    <p className="text-base sm:text-xl text-gray-600 max-w-md leading-relaxed">
                        Experience the new standard in ride-sharing. Book safe and affordable taxi services or bike taxis anywhere in Monrovia.
                    </p>

                    {/* Quick Stats */}
                    <div className="flex flex-wrap gap-6 sm:gap-8 pt-4">
                        <div>
                            <p className="text-2xl sm:text-3xl font-bold text-gray-900">10K+</p>
                            <p className="text-xs sm:text-sm text-gray-500">Happy Riders</p>
                        </div>
                        <div>
                            <p className="text-2xl sm:text-3xl font-bold text-gray-900">500+</p>
                            <p className="text-xs sm:text-sm text-gray-500">Drivers</p>
                        </div>
                        <div>
                            <p className="text-2xl sm:text-3xl font-bold text-gray-900">24/7</p>
                            <p className="text-xs sm:text-sm text-gray-500">Support</p>
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
                            <Wallet className="text-[#042a22]" size={18} />
                            <span className="text-xs font-bold text-gray-700">MoMo Supported</span>
                        </div>
                    </div>

                    {/* Ride Request Widget */}
                    <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-100 max-w-md hover:shadow-3xl transition-shadow duration-300">
                        <h3 className="font-semibold text-lg mb-4 text-gray-900">Request a ride now</h3>
                        <div className="space-y-4">
                            <div className="relative mb-2">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center">
                                    <User className="text-gray-400 w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Your Full Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={`w-full bg-gray-50 p-4 pl-12 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition-all ${attemptedSubmit && !name.trim() ? 'border-2 border-red-500 bg-red-50 focus:ring-red-500/20' : 'focus:ring-red-500/20 focus:bg-white'}`}
                                />
                                {attemptedSubmit && !name.trim() && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Please enter your name</p>}
                            </div>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gray-900"></div>
                                <div className="absolute left-[21px] top-8 h-8 w-[2px] bg-gray-200"></div>
                                <input
                                    type="text"
                                    placeholder="Pickup (e.g. Sinkor, Monrovia)"
                                    value={pickup}
                                    onChange={(e) => setPickup(e.target.value)}
                                    className={`w-full bg-gray-50 p-4 pl-12 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition-all ${attemptedSubmit && !pickup.trim() ? 'border-2 border-red-500 bg-red-50 focus:ring-red-500/20' : 'focus:ring-red-500/20 focus:bg-white'}`}
                                />
                                {attemptedSubmit && !pickup.trim() && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Pickup location is required</p>}
                            </div>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-sm bg-red-600"></div>
                                <input
                                    type="text"
                                    placeholder="Where to? (e.g. Paynesville)"
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                    className={`w-full bg-gray-50 p-4 pl-12 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition-all ${attemptedSubmit && !destination.trim() ? 'border-2 border-red-500 bg-red-50 focus:ring-red-500/20' : 'focus:ring-red-500/20 focus:bg-white'}`}
                                />
                                {attemptedSubmit && !destination.trim() && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Destination is required</p>}
                            </div>

                            {/* Payment Selector in Hero */}
                            <div className="flex gap-2">
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
                            className={`w-full mt-6 p-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${isFormComplete ? 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600 hover:scale-[1.02] active:scale-[0.98] shadow-red-500/30' : 'bg-red-600/90 hover:bg-red-600 text-white hover:scale-[1.01] active:scale-[0.98]'}`}>
                            Request Ride <ArrowRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Right Column: Visual with Liberian Map */}
                <div className="relative h-[480px] sm:h-[540px] md:h-[620px] w-full select-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0a1120] to-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group">
                        
                        {/* Background Radar / Sci-Fi Grid lines */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:24px_24px]" />
                        
                        {/* Ambient Glows */}
                        <div className="absolute -top-20 -left-20 w-80 h-80 bg-red-600/15 rounded-full blur-[100px] pointer-events-none" />
                        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />

                        {/* Top-Left Live Fleet HUD Chip */}
                        <div className="absolute top-6 left-6 z-20 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-lg">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                            <span className="text-[11px] font-black text-white tracking-wider uppercase">Live Fleet: Liberia</span>
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-md">248 Cabs</span>
                        </div>

                        {/* Top-Right Floating Driver Arriving Card */}
                        <div className="absolute top-6 right-6 z-20 p-3.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/40 animate-bounce-slow max-w-[190px]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
                                    <Navigation size={18} className="transform rotate-45" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Driver arriving</p>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="font-black text-base text-gray-900">2 min</span>
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">• RIA-04</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive / Animated Liberian Vector Map */}
                        <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
                            <svg
                                viewBox="0 0 600 500"
                                className="w-full h-full max-h-[500px] object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <defs>
                                    {/* Map Gradient */}
                                    <linearGradient id="liberiaGradient" x1="100" y1="50" x2="500" y2="450" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
                                        <stop offset="50%" stopColor="#0f172a" stopOpacity="0.95" />
                                        <stop offset="100%" stopColor="#090d16" stopOpacity="1" />
                                    </linearGradient>

                                    <linearGradient id="routeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#ef4444" />
                                        <stop offset="50%" stopColor="#fbbf24" />
                                        <stop offset="100%" stopColor="#10b981" />
                                    </linearGradient>

                                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="3" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>

                                    <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur stdDeviation="6" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                </defs>

                                {/* Atlantic Ocean Coastline Glow Effect */}
                                <path
                                    d="M 120 250 C 160 300 240 370 340 420 C 400 450 470 470 510 450"
                                    stroke="#0284c7"
                                    strokeWidth="12"
                                    strokeOpacity="0.15"
                                    strokeLinecap="round"
                                    fill="none"
                                />

                                {/* Liberia Geographic Contour Path */}
                                <path
                                    d="M 175 110 
                                       C 210 95, 260 80, 290 85 
                                       C 330 90, 360 120, 385 115 
                                       C 420 110, 460 170, 470 210 
                                       C 480 250, 460 300, 485 340 
                                       C 510 380, 525 430, 510 450 
                                       C 475 465, 410 440, 365 410 
                                       C 320 380, 270 350, 220 310 
                                       C 170 270, 130 240, 120 220 
                                       C 110 195, 125 160, 145 140 
                                       Z"
                                    fill="url(#liberiaGradient)"
                                    stroke="#ef4444"
                                    strokeWidth="2"
                                    strokeOpacity="0.4"
                                    className="transition-all duration-500 hover:stroke-opacity-80"
                                />

                                {/* Internal County Region Lines / Grid */}
                                <path
                                    d="M 230 180 Q 290 220 365 240 M 270 270 Q 320 320 380 340 M 180 230 Q 240 260 280 330 M 360 120 Q 370 200 430 260"
                                    stroke="#ffffff"
                                    strokeWidth="1"
                                    strokeOpacity="0.08"
                                    strokeDasharray="4 4"
                                    fill="none"
                                />

                                {/* Country Watermark / Label */}
                                <text x="310" y="270" fill="#ffffff" fillOpacity="0.05" fontSize="54" fontWeight="900" letterSpacing="12" textAnchor="middle">
                                    LIBERIA
                                </text>

                                {/* Major Highway Corridors (Glowing Animated Lines) */}
                                {/* Corridor 1: Robertsport -> Monrovia */}
                                <path
                                    d="M 140 180 L 195 245"
                                    stroke="#64748b"
                                    strokeWidth="2"
                                    strokeDasharray="3 3"
                                    fill="none"
                                />

                                {/* Corridor 2: Monrovia -> Kakata -> Gbarnga -> Ganta (Main Artery) */}
                                <path
                                    d="M 195 245 Q 245 220 295 200 T 385 170"
                                    stroke="#ef4444"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    fill="none"
                                    filter="url(#glow)"
                                />
                                <path
                                    d="M 195 245 Q 245 220 295 200 T 385 170"
                                    stroke="#ffffff"
                                    strokeWidth="1.5"
                                    strokeDasharray="6 12"
                                    strokeLinecap="round"
                                    fill="none"
                                    className="animate-dash"
                                />

                                {/* Corridor 3: Monrovia -> RIA Harbel Airport -> Buchanan Express */}
                                <path
                                    d="M 195 245 Q 235 275 270 295 T 325 365"
                                    stroke="#10b981"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    fill="none"
                                    filter="url(#glow)"
                                />
                                <path
                                    d="M 195 245 Q 235 275 270 295 T 325 365"
                                    stroke="#ffffff"
                                    strokeWidth="1.5"
                                    strokeDasharray="6 12"
                                    strokeLinecap="round"
                                    fill="none"
                                    className="animate-dash-reverse"
                                />

                                {/* Corridor 4: Buchanan -> Greenville -> Harper (Coastal Route) */}
                                <path
                                    d="M 325 365 Q 400 410 495 440"
                                    stroke="#fbbf24"
                                    strokeWidth="2.5"
                                    strokeDasharray="4 4"
                                    strokeLinecap="round"
                                    fill="none"
                                    opacity="0.7"
                                />

                                {/* Moving Live Cab Indicator 1: En-route to Airport */}
                                <g className="animate-car-airport">
                                    <circle cx="0" cy="0" r="10" fill="#10b981" fillOpacity="0.2" className="animate-ping" />
                                    <circle cx="0" cy="0" r="5" fill="#10b981" />
                                    <rect x="-8" y="-18" width="16" height="10" rx="3" fill="#042a22" stroke="#10b981" strokeWidth="1" />
                                    <text x="0" y="-11" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle">🚖</text>
                                </g>

                                {/* Moving Live Cab Indicator 2: Monrovia to Gbarnga */}
                                <g className="animate-car-monrovia">
                                    <circle cx="0" cy="0" r="10" fill="#ef4444" fillOpacity="0.2" className="animate-ping" />
                                    <circle cx="0" cy="0" r="5" fill="#ef4444" />
                                    <rect x="-8" y="-18" width="16" height="10" rx="3" fill="#1e1b4b" stroke="#ef4444" strokeWidth="1" />
                                    <text x="0" y="-11" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle">🚖</text>
                                </g>

                                {/* City Node 1: MONROVIA (Capital Hub) */}
                                <g transform="translate(195, 245)">
                                    {/* Radar Pulse */}
                                    <circle cx="0" cy="0" r="22" fill="#ef4444" fillOpacity="0.15" className="animate-ping" />
                                    <circle cx="0" cy="0" r="12" fill="#ef4444" fillOpacity="0.4" />
                                    <circle cx="0" cy="0" r="6" fill="#ffffff" stroke="#ef4444" strokeWidth="2.5" />
                                    
                                    {/* Label Pill */}
                                    <g transform="translate(-50, -32)">
                                        <rect width="100" height="20" rx="10" fill="#0f172a" fillOpacity="0.95" stroke="#ef4444" strokeWidth="1.5" />
                                        <circle cx="12" cy="10" r="3.5" fill="#ef4444" />
                                        <text x="56" y="14" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="0.5">MONROVIA</text>
                                    </g>
                                </g>

                                {/* City Node 2: PAYNESVILLE */}
                                <g transform="translate(225, 255)">
                                    <circle cx="0" cy="0" r="4" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
                                    <text x="8" y="4" fill="#fbbf24" fontSize="9" fontWeight="bold" filter="url(#glow)">Paynesville</text>
                                </g>

                                {/* City Node 3: RIA HARBEL AIRPORT */}
                                <g transform="translate(265, 290)">
                                    <circle cx="0" cy="0" r="16" fill="#10b981" fillOpacity="0.2" className="animate-pulse" />
                                    <circle cx="0" cy="0" r="5" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
                                    {/* Label Pill */}
                                    <g transform="translate(8, -8)">
                                        <rect width="84" height="18" rx="9" fill="#0f172a" fillOpacity="0.9" stroke="#10b981" strokeWidth="1" />
                                        <text x="42" y="12.5" fill="#34d399" fontSize="8.5" fontWeight="bold" textAnchor="middle">✈️ RIA Airport</text>
                                    </g>
                                </g>

                                {/* City Node 4: BUCHANAN */}
                                <g transform="translate(325, 365)">
                                    <circle cx="0" cy="0" r="14" fill="#38bdf8" fillOpacity="0.2" className="animate-pulse" />
                                    <circle cx="0" cy="0" r="5" fill="#ffffff" stroke="#38bdf8" strokeWidth="2" />
                                    <g transform="translate(-38, 12)">
                                        <rect width="76" height="16" rx="8" fill="#0f172a" fillOpacity="0.9" stroke="#38bdf8" strokeWidth="1" />
                                        <text x="38" y="11.5" fill="#7dd3fc" fontSize="8.5" fontWeight="bold" textAnchor="middle">⚓ Buchanan</text>
                                    </g>
                                </g>

                                {/* City Node 5: GBARNGA / GANTA */}
                                <g transform="translate(295, 200)">
                                    <circle cx="0" cy="0" r="4.5" fill="#ffffff" stroke="#f59e0b" strokeWidth="2" />
                                    <text x="8" y="3" fill="#fcd34d" fontSize="9" fontWeight="bold">Gbarnga</text>
                                </g>

                                <g transform="translate(385, 170)">
                                    <circle cx="0" cy="0" r="4" fill="#ffffff" stroke="#a855f7" strokeWidth="1.5" />
                                    <text x="8" y="3" fill="#d8b4fe" fontSize="8.5" fontWeight="bold">Ganta</text>
                                </g>

                                {/* City Node 6: HARPER (Cape Palmas) */}
                                <g transform="translate(495, 440)">
                                    <circle cx="0" cy="0" r="4" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.5" />
                                    <text x="-46" y="2" fill="#94a3b8" fontSize="8" fontWeight="bold">Harper</text>
                                </g>
                            </svg>
                        </div>

                        {/* Centered / Lower Glassmorphism AfriCab Brand Badge */}
                        <div className="absolute bottom-6 left-6 right-6 z-20">
                            <div className="p-4 rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600/30 to-black p-1 border border-red-500/30 flex items-center justify-center shrink-0">
                                        <Image src="/africab-logo.png" alt="AfriCab" width={48} height={48} className="w-full h-full object-contain drop-shadow" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="text-white font-black text-sm tracking-tight flex items-center gap-2">
                                            AfriCab Nationwide Transit
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Verified</span>
                                        </h4>
                                        <p className="text-slate-400 text-xs font-medium">Monrovia • Paynesville • RIA Airport • Buchanan • Gbarnga</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Avg Pickup</p>
                                        <p className="text-xs font-black text-white">3-5 Min</p>
                                    </div>
                                    <div className="px-3 py-1.5 rounded-xl bg-red-600/20 border border-red-500/30 text-center">
                                        <p className="text-[9px] font-bold text-red-300 uppercase">Payment</p>
                                        <p className="text-xs font-black text-white">MoMo / Cash</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}

