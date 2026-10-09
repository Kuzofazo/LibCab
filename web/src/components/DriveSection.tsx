"use client";

import React, { useState } from "react";
import { DollarSign, Clock, ShieldCheck, CheckCircle2, ArrowRight, Car, Award } from "lucide-react";
import Link from "next/link";

export default function DriveSection() {
    const [tripsPerDay, setTripsPerDay] = useState(12);

    // Approx $4.50 average net revenue per trip
    const estimatedDailyUSD = (tripsPerDay * 4.5).toFixed(0);
    const estimatedDailyLRD = (tripsPerDay * 4.5 * 192).toLocaleString();

    return (
        <section id="drive" className="py-20 md:py-28 bg-white relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-1/2 left-0 w-80 h-80 bg-red-50 rounded-full blur-3xl -z-10 pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider inline-block mb-4">
                        Driver Partnership
                    </span>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-gray-900 mb-6 leading-tight">
                        Partner with AfriCab & <br />
                        <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                            Earn on Your Own Schedule
                        </span>
                    </h2>
                    <p className="text-base sm:text-xl text-gray-600 leading-relaxed">
                        Join hundreds of empowered drivers across Monrovia. Enjoy industry-leading payout rates, instant Mobile Money cashouts, and 24/7 road assistance.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-16">
                    {/* Left Column: Benefits Grid */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="p-6 rounded-3xl bg-gray-50 border border-gray-100 hover:border-red-200 hover:bg-white hover:shadow-xl transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Instant MoMo Cashout</h3>
                                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                    Withdraw your earnings daily via Lonestar Cell MTN MoMo or Orange Money with zero delays.
                                </p>
                            </div>

                            <div className="p-6 rounded-3xl bg-gray-50 border border-gray-100 hover:border-red-200 hover:bg-white hover:shadow-xl transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-4">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">100% Flexible Hours</h3>
                                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                    You control when and where you drive. Be your own boss—full-time or part-time.
                                </p>
                            </div>

                            <div className="p-6 rounded-3xl bg-gray-50 border border-gray-100 hover:border-red-200 hover:bg-white hover:shadow-xl transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Safety & Vehicle Care</h3>
                                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                    Every rider is verified. Access emergency SOS assistance and dedicated driver support.
                                </p>
                            </div>

                            <div className="p-6 rounded-3xl bg-gray-50 border border-gray-100 hover:border-red-200 hover:bg-white hover:shadow-xl transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
                                    <Award className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Low Commission Rates</h3>
                                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                    Keep up to 85%+ of every fare. Transparent fees with no hidden deductions.
                                </p>
                            </div>
                        </div>

                        {/* Driver Requirements checklist */}
                        <div className="p-6 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 text-white space-y-4">
                            <h4 className="font-bold text-lg flex items-center gap-2">
                                <Car className="text-red-500" /> Requirements to Register as a Driver:
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-gray-300">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>Valid Liberian Driver&apos;s License</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>Registered Vehicle (Sedan/SUV/Keke)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>Active Smartphone (Android or iOS)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>Mobile Money Account (MTN/Orange)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Earnings Estimator Card */}
                    <div className="lg:col-span-5">
                        <div className="bg-gradient-to-b from-gray-900 via-gray-900 to-black p-8 sm:p-10 rounded-3xl shadow-2xl text-white border border-gray-800 relative overflow-hidden">
                            <span className="text-xs font-bold text-red-400 uppercase tracking-widest block mb-2">
                                Interactive Calculator
                            </span>
                            <h3 className="text-2xl font-bold mb-6">Estimate Your Potential Earnings</h3>

                            <div className="space-y-6 mb-8">
                                <div>
                                    <div className="flex justify-between items-center mb-2 text-sm font-semibold">
                                        <span className="text-gray-300">Trips Completed Per Day:</span>
                                        <span className="text-xl font-black text-red-400">{tripsPerDay} trips</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="4"
                                        max="25"
                                        value={tripsPerDay}
                                        onChange={(e) => setTripsPerDay(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                                    />
                                </div>

                                <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center space-y-2">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                                        Estimated Daily Income
                                    </span>
                                    <div className="text-4xl font-black text-emerald-400">
                                        ${estimatedDailyUSD} <span className="text-lg text-gray-300 font-bold">USD</span>
                                    </div>
                                    <p className="text-xs font-bold text-yellow-400">
                                        ~ LRD {estimatedDailyLRD} per day
                                    </p>
                                </div>
                            </div>

                            <Link
                                href="/signup?role=DRIVER"
                                className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-2xl hover:from-red-700 hover:to-red-600 transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
                            >
                                Sign Up as a Driver <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
