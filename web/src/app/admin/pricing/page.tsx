"use client";

import React, { useState } from "react";
import {
    DollarSign,
    MapPin,
    TrendingUp,
    Clock,
    Save,
    Plus,
    Trash2,
    CheckCircle2,
    Zap,
    Globe,
    RefreshCcw
} from "lucide-react";

interface Zone {
    id: string;
    name: string;
    city: string;
    status: "ACTIVE" | "INACTIVE";
    baseFare: number;
    multiplier: number;
}

const initialZones: Zone[] = [
    { id: "Z-001", name: "Sinkor", city: "Monrovia", status: "ACTIVE", baseFare: 5, multiplier: 1.2 },
    { id: "Z-002", name: "Bushrod Island", city: "Monrovia", status: "ACTIVE", baseFare: 7, multiplier: 1.5 },
    { id: "Z-003", name: "Paynesville", city: "Monrovia", status: "ACTIVE", baseFare: 4, multiplier: 1.0 },
    { id: "Z-004", name: "Roberts Intl Airport", city: "Monrovia", status: "INACTIVE", baseFare: 45, multiplier: 1.8 },
];

export default function PricingPage() {
    const [zones, setZones] = useState<Zone[]>(initialZones);
    const [exchangeRate, setExchangeRate] = useState(185);
    const [baseRate, setBaseRate] = useState(5.00);
    const [perMile, setPerMile] = useState(1.50);
    const [perMinute, setPerMinute] = useState(0.20);

    const formatLRD = (usd: number) => {
        return (usd * exchangeRate).toLocaleString();
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Pricing & Operational Areas</h1>
                    <p className="text-gray-500">Configure global fare parameters and manage geographic service zones for Liberia.</p>
                </div>
                <button className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                    <Save size={20} />
                    Save All Changes
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Global Pricing & Exchange Rate */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-black text-white rounded-2xl">
                                    <Globe size={24} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Market Rates</h2>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Exchange Rate Input */}
                            <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-xs font-black text-red-600 uppercase tracking-widest">USD to LRD Exchange Rate</label>
                                    <RefreshCcw size={14} className="text-red-400" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-400 text-lg">$1 = </span>
                                    <input
                                        type="number"
                                        value={exchangeRate}
                                        onChange={(e) => setExchangeRate(Number(e.target.value))}
                                        className="flex-1 bg-white border-transparent rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-200 outline-none font-black text-red-600 text-xl"
                                    />
                                    <span className="font-black text-gray-900">LRD</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600 ml-1">Default Base Fare ($)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="number"
                                        value={baseRate}
                                        onChange={(e) => setBaseRate(Number(e.target.value))}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent rounded-2xl focus:ring-2 focus:ring-red-100 focus:bg-white focus:border-red-600 outline-none transition-all font-bold text-lg"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                        ≈ L$ {formatLRD(baseRate)}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600 ml-1">Rate Per KM ($)</label>
                                <div className="relative">
                                    <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="number"
                                        value={perMile}
                                        onChange={(e) => setPerMile(Number(e.target.value))}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent rounded-2xl focus:ring-2 focus:ring-red-100 focus:bg-white focus:border-red-600 outline-none transition-all font-bold text-lg"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                        ≈ L$ {formatLRD(perMile)}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600 ml-1">Rate Per Minute ($)</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="number"
                                        value={perMinute}
                                        onChange={(e) => setPerMinute(Number(e.target.value))}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent rounded-2xl focus:ring-2 focus:ring-red-100 focus:bg-white focus:border-red-600 outline-none transition-all font-bold text-lg"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                        ≈ L$ {formatLRD(perMinute)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                            <div className="flex gap-3">
                                <Zap className="text-orange-600 flex-shrink-0" size={20} />
                                <p className="text-xs text-orange-800 font-medium">
                                    Dual currency support enabled. Riders will see prices in both USD and Liberian Dollars.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#D32F2F] to-[#B71C1C] p-6 rounded-3xl text-white shadow-xl">
                        <h3 className="text-lg font-bold mb-2">Smart Surge Pricing</h3>
                        <p className="text-sm opacity-90 mb-4">Automatically increase fares during high demand periods in Monrovia.</p>
                        <button className="w-full py-3 bg-white text-[#D32F2F] font-bold rounded-2xl hover:bg-gray-100 transition-colors shadow-lg">
                            Configure Algorithms
                        </button>
                    </div>
                </div>

                {/* Zones Management Card */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Operational Zones</h2>
                                    <p className="text-sm text-gray-500 font-medium">Regional price overrides for Monrovia districts.</p>
                                </div>
                            </div>
                            <button className="p-3 bg-gray-50 text-gray-600 rounded-2xl hover:bg-gray-100 transition-colors">
                                <Plus size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50 text-gray-500 text-xs font-black uppercase tracking-wider">
                                        <th className="px-6 py-4">Zone Name & City</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Base Fare (USD/LRD)</th>
                                        <th className="px-6 py-4">Multiplier</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {zones.map((zone) => (
                                        <tr key={zone.id} className="hover:bg-gray-50/30 transition-all">
                                            <td className="px-6 py-5">
                                                <div>
                                                    <p className="font-bold text-gray-900">{zone.name}</p>
                                                    <p className="text-xs text-gray-500 font-medium">{zone.city}, Liberia</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {zone.status === "ACTIVE" ? (
                                                    <span className="flex items-center gap-1.5 text-green-600 text-xs font-black uppercase tracking-tight">
                                                        <CheckCircle2 size={14} /> ACTIVE
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-gray-400 text-xs font-black uppercase tracking-tight">
                                                        <Clock size={14} /> INACTIVE
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-gray-900">${zone.baseFare.toFixed(2)}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold">L$ {formatLRD(zone.baseFare)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${zone.multiplier > 1 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {zone.multiplier}x
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
                                                        <Save size={18} />
                                                    </button>
                                                    <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 bg-gray-50/30 border-t border-gray-50">
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Geofencing Tool</p>
                                        <p className="text-xs text-gray-500">Draw custom boundaries on the map to create new zones in Monrovia.</p>
                                    </div>
                                </div>
                                <button className="px-4 py-2 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors shadow-md">
                                    Open Map Tool
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
