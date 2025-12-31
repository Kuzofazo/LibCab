"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit3, Search, Tag, Calendar, CheckCircle, XCircle } from "lucide-react";

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            const res = await fetch("/api/admin/coupons");
            const data = await res.json();
            setCoupons(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Fetch failed", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await fetch("/api/admin/coupons", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, isActive: !currentStatus }),
            });
            fetchCoupons();
        } catch (error) {
            console.error("Update failed", error);
        }
    };

    const deleteCoupon = async (id: string) => {
        if (confirm("Are you sure you want to delete this coupon?")) {
            try {
                await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
                fetchCoupons();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Coupon Management</h1>
                    <p className="text-gray-500">Create and manage discount codes for your platform.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg active:scale-95"
                >
                    <Plus size={20} />
                    Create New Coupon
                </button>
            </div>

            {/* Filters and Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search coupons by code..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-600 outline-none transition-all"
                    />
                </div>
                <select className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-100">
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>

            {/* Coupon Grid/Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {coupons.map((coupon) => (
                    <div key={coupon.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                                    <Tag size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                        <Edit3 size={18} />
                                    </button>
                                    <button
                                        onClick={() => deleteCoupon(coupon.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">{coupon.code}</h3>
                                <p className="text-sm text-gray-500">
                                    {coupon.type === "PERCENTAGE" ? `${coupon.discount}% OFF` : `$${coupon.discount} OFF`}
                                </p>
                            </div>

                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar size={14} />
                                    <span>Expires: {new Date(coupon.expiry).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <CheckCircle size={14} className="text-green-500" />
                                    <span>Created: {new Date(coupon.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${coupon.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                    }`}>
                                    {coupon.isActive ? "active" : "inactive"}
                                </span>
                                <button
                                    onClick={() => toggleStatus(coupon.id, coupon.isActive)}
                                    className={`text-sm font-semibold transition-colors ${coupon.isActive ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"
                                        }`}
                                >
                                    {coupon.isActive ? "Deactivate" : "Activate"}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {coupons.length === 0 && (
                <div className="bg-white p-20 rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Tag size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No coupons found</h3>
                    <p className="text-gray-500 max-w-sm">Start creating coupons to boost your platform growth and user engagement.</p>
                </div>
            )}
        </div>
    );
}
