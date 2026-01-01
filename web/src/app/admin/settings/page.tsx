"use client";

import React, { useState } from "react";
import Link from "next/link";
import { X, Save, Edit3 } from "lucide-react";

export default function SettingsPage() {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [config, setConfig] = useState({
        appName: "LibCab",
        supportEmail: "support@libcab.com",
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
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Settings</h1>
            <div className="space-y-6 max-w-xl">
                {/* General Config Card */}
                <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-bold text-gray-900">General Configuration</h3>
                            <p className="text-sm text-gray-500">Manage app name, logos, and support details.</p>
                        </div>
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-600">
                            <Edit3 size={20} />
                        </div>
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                        <div className="flex justify-between border-b border-gray-50 py-2">
                            <span className="text-gray-500">App Name</span>
                            <span className="font-medium">{config.appName}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 py-2">
                            <span className="text-gray-500">Support Email</span>
                            <span className="font-medium">{config.supportEmail}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-gray-500">Support Phone</span>
                            <span className="font-medium">{config.supportPhone}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="w-full bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
                    >
                        Edit Details
                    </button>
                </div>

                {/* Pricing Rules Card */}
                <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <h3 className="font-bold mb-2">Pricing Rules</h3>
                    <p className="text-sm text-gray-500 mb-4">Set base fares, per-mile rates, and surge multipliers.</p>
                    <Link
                        href="/admin/pricing"
                        className="block text-center w-full bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
                    >
                        Manage Pricing
                    </Link>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h3 className="text-lg font-bold">Edit Configuration</h3>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">App Name</label>
                                <input
                                    type="text"
                                    value={config.appName}
                                    onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-600 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Support Email</label>
                                <input
                                    type="email"
                                    value={config.supportEmail}
                                    onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-600 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Support Phone</label>
                                <input
                                    type="text"
                                    value={config.supportPhone}
                                    onChange={(e) => setConfig({ ...config, supportPhone: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-600 outline-none"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
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
