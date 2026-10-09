"use client";

import React, { useState } from "react";
import { 
    Navigation, 
    MapPin, 
    ArrowRight, 
    DollarSign, 
    Clock, 
    ShieldCheck, 
    Car, 
    Sparkles, 
    Zap, 
    Check, 
    ChevronRight,
    TrendingUp,
    PhoneCall
} from "lucide-react";
import Link from "next/link";
import { formatUSD, formatLRD } from "@/utils/currency";

interface PopularRoute {
    id: string;
    origin: string;
    destination: string;
    distanceKm: number;
    baseMinutes: number;
    standardUsd: number;
    popularTag?: string;
}

const POPULAR_ROUTES: PopularRoute[] = [
    {
        id: "sinkor-ria",
        origin: "Sinkor, Monrovia",
        destination: "Roberts International Airport (RIA)",
        distanceKm: 55,
        baseMinutes: 50,
        standardUsd: 45,
        popularTag: "Airport VIP"
    },
    {
        id: "broad-redlight",
        origin: "Broad Street, Downtown",
        destination: "Paynesville Red Light Market",
        distanceKm: 14.5,
        baseMinutes: 30,
        standardUsd: 8.5,
        popularTag: "Top Commute"
    },
    {
        id: "mamba-congotown",
        origin: "Mamba Point (Embassy Zone)",
        destination: "Congo Town / SKD Boulevard",
        distanceKm: 9.8,
        baseMinutes: 22,
        standardUsd: 7.0,
        popularTag: "Diplomatic Corridor"
    },
    {
        id: "freeport-bushrod",
        origin: "Freeport of Monrovia",
        destination: "Sinkor 12th Street",
        distanceKm: 11.2,
        baseMinutes: 25,
        standardUsd: 7.5,
        popularTag: "Business Route"
    },
    {
        id: "congotown-ria",
        origin: "Congo Town / ELWA",
        destination: "Roberts International Airport (RIA)",
        distanceKm: 46,
        baseMinutes: 42,
        standardUsd: 40,
        popularTag: "Airport Fast"
    },
];

const VEHICLE_TIERS = [
    {
        id: "STANDARD",
        name: "Standard Taxi",
        desc: "Affordable sedan for quick city commutes",
        icon: Car,
        multiplier: 1.0,
        badge: "Most Popular",
        color: "from-gray-900 to-gray-800"
    },
    {
        id: "COMFORT",
        name: "Comfort Air-Con",
        desc: "Clean, air-conditioned newer model sedan",
        icon: Sparkles,
        multiplier: 1.35,
        badge: "Recommended",
        color: "from-emerald-950 to-slate-900"
    },
    {
        id: "VIP",
        name: "VIP Executive SUV",
        desc: "Premium SUV for executives & airport comfort",
        icon: Zap,
        multiplier: 2.0,
        badge: "Luxury",
        color: "from-red-950 to-slate-900"
    },
];

export default function FareEstimator() {
    const [selectedRoute, setSelectedRoute] = useState<PopularRoute>(POPULAR_ROUTES[0]);
    const [customOrigin, setCustomOrigin] = useState("");
    const [customDestination, setCustomDestination] = useState("");
    const [isCustom, setIsCustom] = useState(false);
    const [selectedTier, setSelectedTier] = useState(VEHICLE_TIERS[0]);
    const [currencyMode, setCurrencyMode] = useState<"USD" | "LRD" | "BOTH">("BOTH");

    // Dynamic price calculation
    const basePrice = isCustom ? 10.0 : selectedRoute.standardUsd;
    const finalPriceUsd = Math.round((basePrice * selectedTier.multiplier) * 10) / 10;
    const estimatedMinutes = isCustom ? 25 : selectedRoute.baseMinutes;
    const estimatedKm = isCustom ? 12 : selectedRoute.distanceKm;

    const currentOrigin = isCustom ? (customOrigin || "Custom Pickup") : selectedRoute.origin;
    const currentDest = isCustom ? (customDestination || "Custom Destination") : selectedRoute.destination;

    const bookingUrl = `/book/guest?origin=${encodeURIComponent(currentOrigin)}&destination=${encodeURIComponent(currentDest)}&tier=${selectedTier.id}`;

    return (
        <section className="py-16 md:py-24 bg-gradient-to-b from-black via-slate-950 to-black text-white relative overflow-hidden border-y border-white/10">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <span className="px-4 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 mb-4">
                        <TrendingUp size={14} /> Instant Fare Calculator
                    </span>
                    <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
                        Transparent Pricing,{" "}
                        <span className="bg-gradient-to-r from-red-500 to-yellow-400 bg-clip-text text-transparent">
                            Zero Surprises
                        </span>
                    </h2>
                    <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        Calculate exact upfront fares across Monrovia and airport routes in USD or Liberian Dollars before you ride.
                    </p>
                </div>

                <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Route & Class Selection (7 Cols) */}
                    <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
                        {/* Quick Presets vs Custom Toggle */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                                Select Popular Route or Custom
                            </span>
                            <div className="flex bg-white/10 p-1 rounded-xl gap-1">
                                <button
                                    onClick={() => setIsCustom(false)}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                        !isCustom ? "bg-red-600 text-white shadow-md" : "text-gray-400 hover:text-white"
                                    }`}
                                >
                                    Popular Routes
                                </button>
                                <button
                                    onClick={() => setIsCustom(true)}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                        isCustom ? "bg-red-600 text-white shadow-md" : "text-gray-400 hover:text-white"
                                    }`}
                                >
                                    Custom Input
                                </button>
                            </div>
                        </div>

                        {/* Popular Route Badges */}
                        {!isCustom ? (
                            <div className="space-y-2.5">
                                {POPULAR_ROUTES.map((route) => (
                                    <button
                                        key={route.id}
                                        onClick={() => setSelectedRoute(route)}
                                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 group ${
                                            selectedRoute.id === route.id
                                                ? "bg-red-600/10 border-red-500 text-white ring-2 ring-red-500/20"
                                                : "bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/5 hover:border-white/10"
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <MapPin size={14} className="text-red-400 shrink-0" />
                                                <span className="text-sm font-bold truncate">{route.origin}</span>
                                                <ArrowRight size={12} className="text-gray-500 shrink-0" />
                                                <span className="text-sm font-bold truncate text-yellow-400">{route.destination}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                                                <span>{route.distanceKm} km</span>
                                                <span>•</span>
                                                <span>~{route.baseMinutes} mins</span>
                                                {route.popularTag && (
                                                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-gray-300 text-[10px] font-bold">
                                                        {route.popularTag}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-base font-black text-white">{formatUSD(route.standardUsd)}</div>
                                            <div className="text-[11px] text-gray-400 font-bold">{formatLRD(route.standardUsd)}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            /* Custom Route Inputs */
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                        Pickup Location
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="e.g. Sinkor 15th Street or Hotel"
                                            value={customOrigin}
                                            onChange={(e) => setCustomOrigin(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/15 rounded-2xl text-sm font-bold focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                        Drop-off Destination
                                    </label>
                                    <div className="relative">
                                        <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="e.g. RIA Airport, Paynesville, Mamba Point"
                                            value={customDestination}
                                            onChange={(e) => setCustomDestination(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/15 rounded-2xl text-sm font-bold focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Vehicle Tier Selector */}
                        <div className="space-y-3 pt-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                                Choose Ride Class
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {VEHICLE_TIERS.map((tier) => {
                                    const Icon = tier.icon;
                                    const isSelected = selectedTier.id === tier.id;
                                    return (
                                        <button
                                            key={tier.id}
                                            onClick={() => setSelectedTier(tier)}
                                            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                                                isSelected
                                                    ? "bg-gradient-to-br from-red-600/20 to-yellow-600/10 border-red-500 ring-2 ring-red-500/20"
                                                    : "bg-white/[0.02] border-white/10 hover:bg-white/5"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className={`p-2 rounded-xl ${isSelected ? "bg-red-500 text-white" : "bg-white/10 text-gray-400"}`}>
                                                    <Icon size={16} />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                                    {tier.multiplier}x rate
                                                </span>
                                            </div>
                                            <div className="text-xs font-black text-white">{tier.name}</div>
                                            <div className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{tier.desc}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Fare Quote Card (5 Cols) */}
                    <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-gray-950 to-black border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                                    <ShieldCheck size={14} /> Guaranteed Price
                                </span>
                                <h3 className="text-xl font-black text-white mt-0.5">Estimated Fare</h3>
                            </div>
                            <div className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-gray-300">
                                {selectedTier.name}
                            </div>
                        </div>

                        {/* Route Summary */}
                        <div className="space-y-3 mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
                            <div className="flex items-start gap-2 text-xs">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
                                <div>
                                    <span className="text-gray-400 text-[10px] uppercase font-black block">From</span>
                                    <span className="font-bold text-white">{currentOrigin}</span>
                                </div>
                            </div>
                            <div className="w-0.5 h-4 bg-white/20 ml-1" />
                            <div className="flex items-start gap-2 text-xs">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-400 mt-1 shrink-0" />
                                <div>
                                    <span className="text-gray-400 text-[10px] uppercase font-black block">To</span>
                                    <span className="font-bold text-yellow-400">{currentDest}</span>
                                </div>
                            </div>
                        </div>

                        {/* Distance & Time Pills */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                                <div className="text-[10px] uppercase font-black text-gray-400">Distance</div>
                                <div className="text-sm font-black text-white mt-0.5">{estimatedKm} km</div>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                                <div className="text-[10px] uppercase font-black text-gray-400">Est. Duration</div>
                                <div className="text-sm font-black text-white mt-0.5">~{estimatedMinutes} mins</div>
                            </div>
                        </div>

                        {/* Large Price Display */}
                        <div className="p-5 bg-gradient-to-r from-red-950/40 via-red-900/20 to-black rounded-2xl border border-red-500/30 mb-6 text-center">
                            <span className="text-[10px] uppercase font-black tracking-widest text-red-400 block mb-1">
                                Upfront Guaranteed Fare
                            </span>
                            <div className="text-4xl font-black text-white tracking-tight">
                                {formatUSD(finalPriceUsd)}
                            </div>
                            <div className="text-sm font-black text-yellow-400 mt-1">
                                ≈ {formatLRD(finalPriceUsd)}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-2">
                                Accepts MTN MoMo, Orange Money &amp; Cash
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <Link
                                href={bookingUrl}
                                className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-red-600/30"
                            >
                                Book This Ride Now <ChevronRight size={18} />
                            </Link>

                            <a
                                href="tel:+231770000000"
                                className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-white/10 transition-all"
                            >
                                <PhoneCall size={14} /> Call Dispatch (+231-770-000000)
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
