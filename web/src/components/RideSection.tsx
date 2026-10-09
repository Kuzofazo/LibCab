"use client";

import React, { useState } from "react";
import { Shield, Clock, Wallet, Car, Star, ArrowRight, PhoneCall } from "lucide-react";
import Link from "next/link";

const rideCategories = [
    {
        id: "regular",
        name: "Standard Taxi",
        tagline: "Fast & Economical",
        description: "Reliable sedan rides for everyday commuting across Monrovia & Sinkor.",
        priceEst: "$2.50 USD / LRD 480",
        capacity: "4 Passengers",
        icon: <Car className="w-8 h-8 text-red-600" />,
        popular: true,
    },
    {
        id: "comfort",
        name: "Comfort Class",
        tagline: "Air-Conditioned & Spacious",
        description: "Premium sedan or compact SUV with AC and top-rated professional drivers.",
        priceEst: "$4.00 USD / LRD 770",
        capacity: "4 Passengers",
        icon: <Car className="w-8 h-8 text-blue-600" />,
        popular: false,
    },
    {
        id: "vip",
        name: "Executive VIP",
        tagline: "Luxury Travel & Airport Pickup",
        description: "High-end SUVs for executive meetings, hotel transfers, and Roberts Airport (RIA) trips.",
        priceEst: "$12.00 USD / LRD 2,300",
        capacity: "6 Passengers",
        icon: <Star className="w-8 h-8 text-amber-500" fill="currentColor" />,
        popular: false,
    },
];

export default function RideSection() {
    const [selectedCat, setSelectedCat] = useState("regular");

    return (
        <section id="ride" className="py-20 md:py-28 bg-gradient-to-b from-gray-50 via-white to-gray-50 relative overflow-hidden">
            {/* Glow Orbs */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-100/50 rounded-full blur-3xl -z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl -z-10 pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider inline-block mb-4">
                        Rider Experience
                    </span>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-gray-900 mb-6 leading-tight">
                        Rides Tailored for <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">Every Journey</span>
                    </h2>
                    <p className="text-base sm:text-xl text-gray-600 leading-relaxed">
                        Whether commuting across Sinkor, catching an early flight to Roberts International Airport, or requesting a guest cab without a smartphone, AfriCab gets you there safely.
                    </p>
                </div>

                {/* Ride Categories Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-16">
                    {rideCategories.map((cat) => (
                        <div
                            key={cat.id}
                            onClick={() => setSelectedCat(cat.id)}
                            className={`cursor-pointer group p-6 sm:p-8 rounded-3xl transition-all duration-300 border-2 relative overflow-hidden flex flex-col justify-between ${
                                selectedCat === cat.id
                                    ? "bg-white border-red-500 shadow-2xl scale-[1.02]"
                                    : "bg-white/80 border-gray-100 shadow-md hover:border-gray-300 hover:shadow-xl"
                            }`}
                        >
                            {cat.popular && (
                                <span className="absolute top-4 right-4 bg-gradient-to-r from-red-600 to-red-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                                    Most Popular
                                </span>
                            )}
                            <div>
                                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    {cat.icon}
                                </div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
                                    {cat.tagline}
                                </span>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">{cat.name}</h3>
                                <p className="text-sm text-gray-600 leading-relaxed mb-6">{cat.description}</p>
                            </div>
                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-500">{cat.capacity}</span>
                                    <span className="text-sm font-black text-gray-900">{cat.priceEst}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Features Highlight Grid */}
                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl p-6 sm:p-12 text-white shadow-2xl mb-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="space-y-3">
                            <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center">
                                <Shield className="w-6 h-6" />
                            </div>
                            <h4 className="text-lg font-bold">24/7 Safety Hub</h4>
                            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                                Live trip tracking, SOS emergency alerts, and background-checked professional drivers.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <div className="w-12 h-12 rounded-xl bg-yellow-600/20 text-yellow-400 flex items-center justify-center">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <h4 className="text-lg font-bold">Mobile Money Support</h4>
                            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                                Pay effortlessly using Lonestar Cell MTN MoMo, Orange Money Liberia, or USD cash.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                                <Clock className="w-6 h-6" />
                            </div>
                            <h4 className="text-lg font-bold">Instant Dispatch</h4>
                            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                                Advanced driver proximity matching guarantees average pickup times under 5 minutes.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                                <PhoneCall className="w-6 h-6" />
                            </div>
                            <h4 className="text-lg font-bold">No-Smartphone Guest Booking</h4>
                            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                                Book rides via phone call or SMS dispatch for family members without smartphones.
                            </p>
                        </div>
                    </div>
                </div>

                {/* CTA Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xl gap-6">
                    <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Ready for your next trip?</h3>
                        <p className="text-sm text-gray-500">Book in seconds directly on web or download our mobile app.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <Link
                            href="/book/guest"
                            className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-2xl hover:from-red-700 hover:to-red-600 transition-all text-center shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                        >
                            Book Instant Ride <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
