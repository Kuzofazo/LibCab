"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Trash2,
    Edit3,
    Search,
    Tag,
    Calendar,
    CheckCircle,
    XCircle,
    Percent,
    DollarSign,
    Users,
    Layers,
    Clock,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    ShieldCheck
} from "lucide-react";
import { formatDual } from "@/utils/currency";

interface Coupon {
    id: string;
    code: string;
    discount: number;
    type: "PERCENTAGE" | "FIXED";
    expiry: string;
    startDate?: string | null;
    minFare?: number | null;
    maxDiscount?: number | null;
    usageLimit?: number | null;
    perCustomerLimit?: number | null;
    timesUsed?: number;
    applicableCategories?: string | null;
    description?: string | null;
    isActive: boolean;
    createdAt: string;
    _count?: {
        redemptions: number;
    };
}

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    const getAuthHeaders = useCallback((): HeadersInit => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, []);

    const fetchCoupons = useCallback(async () => {
        try {
            setLoading(true);
            const headers = getAuthHeaders();
            const res = await fetch("/api/admin/coupons", { headers });
            if (res.ok) {
                const data = await res.json();
                setCoupons(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Fetch coupons failed", error);
        } finally {
            setLoading(false);
        }
    }, [getAuthHeaders]);

    useEffect(() => {
        fetchCoupons();
    }, [fetchCoupons]);

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };
            const res = await fetch("/api/admin/coupons", {
                method: "PATCH",
                headers,
                body: JSON.stringify({ id, isActive: !currentStatus }),
            });
            if (res.ok) {
                fetchCoupons();
            }
        } catch (error) {
            console.error("Update status failed", error);
        }
    };

    const deleteCoupon = async (id: string, code: string) => {
        if (!confirm(`Are you sure you want to permanently delete promo code "${code}"?`)) return;
        try {
            const headers = getAuthHeaders();
            const res = await fetch(`/api/admin/coupons?id=${id}`, {
                method: "DELETE",
                headers
            });
            if (res.ok) {
                setActionMessage({ text: `Promo code "${code}" deleted.`, type: "success" });
                fetchCoupons();
            } else {
                const err = await res.json();
                setActionMessage({ text: err.error || "Failed to delete promo code", type: "error" });
            }
        } catch {
            setActionMessage({ text: "Error deleting coupon", type: "error" });
        } finally {
            setTimeout(() => setActionMessage(null), 4000);
        }
    };

    // Filter computation
    const filteredCoupons = coupons.filter((c) => {
        if (statusFilter === "active" && !c.isActive) return false;
        if (statusFilter === "inactive" && c.isActive) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const codeMatch = c.code.toLowerCase().includes(q);
            const descMatch = c.description?.toLowerCase().includes(q);
            if (!codeMatch && !descMatch) return false;
        }
        return true;
    });

    // Stats
    const totalCoupons = coupons.length;
    const activeCoupons = coupons.filter(c => c.isActive).length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + (c._count?.redemptions || c.timesUsed || 0), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-200 p-6 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-500/20">
                            <Tag size={26} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                                Promo Codes & Promotional Campaigns
                            </h1>
                            <p className="text-sm text-gray-500">
                                Configure promotional discounts, minimum fare eligibility, usage limits, and category restrictions.
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 self-start md:self-auto"
                >
                    <Plus size={18} />
                    Create Promo Campaign
                </button>
            </div>

            {/* Notification Banner */}
            {actionMessage && (
                <div
                    className={`p-4 rounded-xl flex items-center justify-between shadow-sm border ${
                        actionMessage.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-red-50 border-red-200 text-red-800"
                    }`}
                >
                    <div className="flex items-center gap-3 text-sm font-bold">
                        {actionMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <span>{actionMessage.text}</span>
                    </div>
                    <button onClick={() => setActionMessage(null)} className="text-xs opacity-60 hover:opacity-100">
                        Dismiss
                    </button>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Total Campaigns</p>
                    <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-black text-gray-900">{totalCoupons}</span>
                        <Tag size={20} className="text-gray-300" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-emerald-600 uppercase tracking-wider">Active Campaigns</p>
                    <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-black text-emerald-600">{activeCoupons}</span>
                        <CheckCircle size={20} className="text-emerald-500" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-blue-600 uppercase tracking-wider">Total Customer Redemptions</p>
                    <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-black text-blue-600">{totalRedemptions}</span>
                        <TrendingUp size={20} className="text-blue-500" />
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search promo codes by code or campaign description..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-600 outline-none transition-all"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-100"
                >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                </select>
            </div>

            {/* Coupons Grid */}
            {loading ? (
                <div className="bg-white p-16 rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mb-4" />
                    <p className="text-sm font-bold text-gray-500">Loading promo campaigns...</p>
                </div>
            ) : filteredCoupons.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                    <Tag size={48} className="text-gray-300 mb-3" />
                    <h3 className="text-base font-bold text-gray-800">No promo campaigns found</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm">
                        Create promo codes to boost customer engagement, seasonal campaigns, or airport ride incentives.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredCoupons.map((coupon) => {
                        const redemptions = coupon._count?.redemptions ?? coupon.timesUsed ?? 0;
                        const hasUsageLimit = coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageLimit > 0;
                        const isExpired = new Date(coupon.expiry).getTime() < Date.now();

                        return (
                            <div
                                key={coupon.id}
                                className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col justify-between ${
                                    coupon.isActive && !isExpired ? "border-gray-200" : "border-gray-200/60 opacity-80"
                                }`}
                            >
                                <div className="p-6">
                                    {/* Top Bar */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                                            {coupon.type === "PERCENTAGE" ? <Percent size={22} /> : <DollarSign size={22} />}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => setEditingCoupon(coupon)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit campaign limits"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                onClick={() => deleteCoupon(coupon.id, coupon.code)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete coupon"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Code & Value */}
                                    <div className="mb-4">
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-xl font-black font-mono text-gray-900 tracking-tight uppercase">
                                                {coupon.code}
                                            </h3>
                                            <span className="text-sm font-black text-red-600">
                                                {coupon.type === "PERCENTAGE" ? `${coupon.discount}% OFF` : `${formatDual(coupon.discount)} OFF`}
                                            </span>
                                        </div>

                                        {coupon.description && (
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                {coupon.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Configurable Rules Tags */}
                                    <div className="space-y-2 py-3 border-y border-gray-100 text-xs text-gray-600">
                                        {/* Min fare & Max discount */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400 font-bold">Min Ride Fare:</span>
                                            <span className="font-bold text-gray-800">
                                                {coupon.minFare && coupon.minFare > 0 ? formatDual(coupon.minFare) : "No minimum"}
                                            </span>
                                        </div>

                                        {coupon.type === "PERCENTAGE" && coupon.maxDiscount && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 font-bold">Max Discount Cap:</span>
                                                <span className="font-bold text-gray-800">{formatDual(coupon.maxDiscount)}</span>
                                            </div>
                                        )}

                                        {/* Eligible Categories */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400 font-bold">Category:</span>
                                            <span className="font-bold text-gray-800 uppercase text-[11px] bg-gray-100 px-2 py-0.5 rounded">
                                                {coupon.applicableCategories || "ALL"}
                                            </span>
                                        </div>

                                        {/* Per customer limit */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400 font-bold">Per Customer Limit:</span>
                                            <span className="font-bold text-gray-800">
                                                {coupon.perCustomerLimit || 1} ride{coupon.perCustomerLimit === 1 ? "" : "s"}
                                            </span>
                                        </div>

                                        {/* Usage Limit & Redemptions */}
                                        <div className="pt-1">
                                            <div className="flex justify-between text-[11px] mb-1 font-bold">
                                                <span className="text-gray-400">Total Redemptions:</span>
                                                <span className="text-gray-900">
                                                    {redemptions} {hasUsageLimit ? `/ ${coupon.usageLimit}` : "used"}
                                                </span>
                                            </div>
                                            {hasUsageLimit && (
                                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-red-500 h-full rounded-full transition-all"
                                                        style={{ width: `${Math.min(100, (redemptions / (coupon.usageLimit || 1)) * 100)}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expiry & Status */}
                                    <div className="pt-3 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 text-gray-500">
                                            <Calendar size={13} />
                                            <span>
                                                {isExpired ? (
                                                    <span className="text-red-600 font-bold">Expired</span>
                                                ) : (
                                                    `Expires: ${new Date(coupon.expiry).toLocaleDateString()}`
                                                )}
                                            </span>
                                        </div>

                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            coupon.isActive && !isExpired
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-100 text-gray-500"
                                        }`}>
                                            {coupon.isActive && !isExpired ? "active" : "inactive"}
                                        </span>
                                    </div>
                                </div>

                                {/* Bottom Action */}
                                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                    <span className="text-[11px] text-gray-400 font-bold">
                                        {coupon.isActive ? "Campaign running" : "Campaign paused"}
                                    </span>
                                    <button
                                        onClick={() => toggleStatus(coupon.id, coupon.isActive)}
                                        className={`text-xs font-black transition-colors ${
                                            coupon.isActive
                                                ? "text-red-600 hover:text-red-700"
                                                : "text-green-600 hover:text-green-700"
                                        }`}
                                    >
                                        {coupon.isActive ? "Pause Promo" : "Activate Promo"}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Promo Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 bg-gray-900 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black tracking-tight">Create Promotional Campaign</h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Define rules, eligibility constraints, and discount rates.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-2 text-gray-400 hover:text-white rounded-full transition-colors"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    const formData = new FormData(e.currentTarget);
                                    const rawExpiry = formData.get("expiry") as string;
                                    const rawStart = formData.get("startDate") as string;

                                    const payload = {
                                        code: formData.get("code"),
                                        discount: Number(formData.get("discount")),
                                        type: formData.get("type"),
                                        expiry: new Date(rawExpiry).toISOString(),
                                        startDate: rawStart ? new Date(rawStart).toISOString() : new Date().toISOString(),
                                        minFare: formData.get("minFare") ? Number(formData.get("minFare")) : 0,
                                        maxDiscount: formData.get("maxDiscount") ? Number(formData.get("maxDiscount")) : null,
                                        usageLimit: formData.get("usageLimit") ? Number(formData.get("usageLimit")) : null,
                                        perCustomerLimit: formData.get("perCustomerLimit") ? Number(formData.get("perCustomerLimit")) : 1,
                                        applicableCategories: formData.get("applicableCategories") || "ALL",
                                        description: formData.get("description") || null,
                                    };

                                    const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };
                                    const res = await fetch("/api/admin/coupons", {
                                        method: "POST",
                                        headers,
                                        body: JSON.stringify(payload),
                                    });

                                    if (!res.ok) {
                                        const err = await res.json();
                                        alert(err.error || "Failed to create promo code");
                                        return;
                                    }

                                    setActionMessage({ text: "Promo campaign created successfully!", type: "success" });
                                    setIsCreateModalOpen(false);
                                    fetchCoupons();
                                } catch {
                                    alert("Network error creating promo code");
                                }
                            }}
                            className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
                        >
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                    Promo Code *
                                </label>
                                <input
                                    name="code"
                                    type="text"
                                    required
                                    placeholder="e.g. MONROVIA2026, AIRPORT10"
                                    className="w-full px-4 py-2.5 border rounded-xl font-mono uppercase font-bold text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-red-600"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                        Discount Rate *
                                    </label>
                                    <input
                                        name="discount"
                                        type="number"
                                        step="0.5"
                                        required
                                        placeholder="15 or 5"
                                        className="w-full px-4 py-2.5 border rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-red-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                        Discount Type *
                                    </label>
                                    <select
                                        name="type"
                                        className="w-full px-4 py-2.5 border rounded-xl bg-white font-bold text-sm outline-none focus:ring-2 focus:ring-red-100"
                                    >
                                        <option value="PERCENTAGE">Percentage (%)</option>
                                        <option value="FIXED">Fixed Amount ($)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                        Minimum Ride Fare ($)
                                    </label>
                                    <input
                                        name="minFare"
                                        type="number"
                                        step="0.5"
                                        placeholder="0 for none"
                                        className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                        Max Discount Cap ($)
                                    </label>
                                    <input
                                        name="maxDiscount"
                                        type="number"
                                        step="0.5"
                                        placeholder="Optional cap"
                                        className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                        Total Usage Limit
                                    </label>
                                    <input
                                        name="usageLimit"
                                        type="number"
                                        placeholder="e.g. 500 (blank = unltd)"
                                        className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                        Per-Customer Limit
                                    </label>
                                    <input
                                        name="perCustomerLimit"
                                        type="number"
                                        defaultValue={1}
                                        className="w-full px-4 py-2.5 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-red-100"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                        Eligible Category
                                    </label>
                                    <select
                                        name="applicableCategories"
                                        className="w-full px-4 py-2.5 border rounded-xl bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-red-100"
                                    >
                                        <option value="ALL">All Categories</option>
                                        <option value="Regular">Regular Only</option>
                                        <option value="Comfort">Comfort Only</option>
                                        <option value="Luxury">Luxury Only</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                        Expiry Date *
                                    </label>
                                    <input
                                        name="expiry"
                                        type="date"
                                        required
                                        className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                    Campaign Description
                                </label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    placeholder="e.g. Special welcome discount for all riders across Monrovia."
                                    className="w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-100"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-sm transition-all shadow-lg active:scale-95"
                                >
                                    Create Promo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Promo Modal */}
            {editingCoupon && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 bg-gray-900 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black tracking-tight">Edit Promo Campaign</h3>
                                <p className="text-xs text-gray-400 mt-0.5 font-mono">
                                    {editingCoupon.code}
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingCoupon(null)}
                                className="p-2 text-gray-400 hover:text-white rounded-full transition-colors"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    const formData = new FormData(e.currentTarget);
                                    const rawExpiry = formData.get("expiry") as string;

                                    const payload = {
                                        id: editingCoupon.id,
                                        discount: Number(formData.get("discount")),
                                        expiry: new Date(rawExpiry).toISOString(),
                                        minFare: formData.get("minFare") ? Number(formData.get("minFare")) : 0,
                                        maxDiscount: formData.get("maxDiscount") ? Number(formData.get("maxDiscount")) : null,
                                        usageLimit: formData.get("usageLimit") ? Number(formData.get("usageLimit")) : null,
                                        perCustomerLimit: formData.get("perCustomerLimit") ? Number(formData.get("perCustomerLimit")) : 1,
                                        applicableCategories: formData.get("applicableCategories") || "ALL",
                                        description: formData.get("description") || null,
                                    };

                                    const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };
                                    const res = await fetch("/api/admin/coupons", {
                                        method: "PATCH",
                                        headers,
                                        body: JSON.stringify(payload),
                                    });

                                    if (!res.ok) {
                                        const err = await res.json();
                                        alert(err.error || "Failed to update promo code");
                                        return;
                                    }

                                    setActionMessage({ text: "Promo campaign updated successfully!", type: "success" });
                                    setEditingCoupon(null);
                                    fetchCoupons();
                                } catch {
                                    alert("Network error updating promo code");
                                }
                            }}
                            className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
                        >
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                        Discount Amount
                                    </label>
                                    <input
                                        name="discount"
                                        type="number"
                                        step="0.5"
                                        defaultValue={editingCoupon.discount}
                                        required
                                        className="w-full px-4 py-2.5 border rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-red-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                        Expiry Date
                                    </label>
                                    <input
                                        name="expiry"
                                        type="date"
                                        defaultValue={new Date(editingCoupon.expiry).toISOString().split("T")[0]}
                                        required
                                        className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                        Minimum Ride Fare ($)
                                    </label>
                                    <input
                                        name="minFare"
                                        type="number"
                                        step="0.5"
                                        defaultValue={editingCoupon.minFare || 0}
                                        className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                        Max Discount Cap ($)
                                    </label>
                                    <input
                                        name="maxDiscount"
                                        type="number"
                                        step="0.5"
                                        defaultValue={editingCoupon.maxDiscount || ""}
                                        placeholder="Optional"
                                        className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                        Total Usage Limit
                                    </label>
                                    <input
                                        name="usageLimit"
                                        type="number"
                                        defaultValue={editingCoupon.usageLimit || ""}
                                        placeholder="Blank for unlimited"
                                        className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                        Per-Customer Limit
                                    </label>
                                    <input
                                        name="perCustomerLimit"
                                        type="number"
                                        defaultValue={editingCoupon.perCustomerLimit || 1}
                                        className="w-full px-4 py-2.5 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-red-100"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                    Eligible Ride Category
                                </label>
                                <select
                                    name="applicableCategories"
                                    defaultValue={editingCoupon.applicableCategories || "ALL"}
                                    className="w-full px-4 py-2.5 border rounded-xl bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-red-100"
                                >
                                    <option value="ALL">All Categories</option>
                                    <option value="Regular">Regular Only</option>
                                    <option value="Comfort">Comfort Only</option>
                                    <option value="Luxury">Luxury Only</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                    Campaign Description
                                </label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    defaultValue={editingCoupon.description || ""}
                                    className="w-full px-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-100"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingCoupon(null)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-sm transition-all shadow-lg active:scale-95"
                                >
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
