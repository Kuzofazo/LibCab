"use client";

import React, { useState } from "react";
import Link from "next/link";
import { X, Save, Edit3, Sliders, ArrowRight } from "lucide-react";

export default function SettingsPage() {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [config, setConfig] = useState({
        appName: "AfriCab",
        supportEmail: "support@africab.com",
        supportPhone: "+231 77 123 4567"
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate API call
        setTimeout(() => {
            setIsEditModalOpen(false);
            alert("Settings saved successfully!");
        }, 500);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-200">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Settings</h1>
                <p className="text-slate-500 font-bold text-sm mt-1">Manage global fleet parameters, branding, and platform contact information.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
                {/* General Config Card */}
                <div className="p-8 bg-white border border-slate-200/90 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mb-2">Platform Identity</span>
                            <h3 className="font-black text-xl text-slate-900 tracking-tight">General Configuration</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">Manage app branding, official contact channels, and client dispatch details.</p>
                        </div>
                        <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center text-red-600 shrink-0">
                            <Edit3 size={20} />
                        </div>
                    </div>

                    <div className="space-y-3 mb-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Application Name</span>
                            <span className="font-black text-sm text-slate-900">{config.appName}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-200/60 py-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Support Email</span>
                            <span className="font-black text-sm text-slate-900">{config.supportEmail}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Support Hotline</span>
                            <span className="font-black text-sm text-slate-900">{config.supportPhone}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="w-full bg-slate-950 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-red-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Edit3 size={16} /> Edit Platform Details
                    </button>
                </div>

                {/* Pricing Rules Card */}
                <div className="p-8 bg-white border border-slate-200/90 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 inline-block mb-2">Fare Engine</span>
                                <h3 className="font-black text-xl text-slate-900 tracking-tight">Pricing & Zone Tariffs</h3>
                                <p className="text-xs text-slate-500 font-medium mt-1">Configure base fares, per-kilometer rates, night surge multipliers, and Liberian zone pricing.</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                                <Sliders size={20} />
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3 mb-6">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-500">Active Currency Mode</span>
                                <span className="text-slate-900 font-black">Dual Currency (USD / LRD)</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold border-t border-slate-200/60 pt-3">
                                <span className="text-slate-500">Monrovia Base Fare</span>
                                <span className="text-emerald-700 font-black">$2.50 / 480 LRD</span>
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/admin/pricing"
                        className="w-full bg-slate-950 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span>Manage Pricing & Zones</span>
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/80">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Edit Configuration</h3>
                                <p className="text-xs text-slate-500 font-medium">Update primary application details</p>
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">Application Name</label>
                                <input
                                    type="text"
                                    value={config.appName}
                                    onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">Support Email</label>
                                <input
                                    type="email"
                                    value={config.supportEmail}
                                    onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">Support Phone</label>
                                <input
                                    type="text"
                                    value={config.supportPhone}
                                    onChange={(e) => setConfig({ ...config, supportPhone: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white outline-none transition-all"
                                />
                            </div>

                            <div className="pt-3 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 px-4 py-3.5 bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-wider rounded-2xl hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3.5 bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl hover:bg-red-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Save size={16} />
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

