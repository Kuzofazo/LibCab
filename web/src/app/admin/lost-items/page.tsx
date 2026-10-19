"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Luggage,
    Search,
    RefreshCw,
    Phone,
    Car,
    CheckCircle2,
    Clock,
    AlertCircle,
    User,
    Calendar,
    MapPin,
    ExternalLink,
    FileText,
    MessageSquare,
    Save,
    XCircle,
    ChevronRight,
    Tag,
    ShieldAlert
} from "lucide-react";

interface LostItemReport {
    id: string;
    reference: string;
    category: string;
    description: string;
    photoUrl?: string | null;
    status: string;
    contactName: string;
    contactPhone: string;
    adminNotes?: string | null;
    driverResponse?: string | null;
    resolvedAt?: string | null;
    createdAt: string;
    user: {
        id: string;
        name: string;
        phone: string | null;
        email: string;
    };
    ride: {
        id: string;
        originAddress: string;
        destAddress: string;
        fare: number | null;
        createdAt: string;
        rideCategory: string;
        driver?: {
            id: string;
            vehicleModel?: string | null;
            licensePlate?: string | null;
            user: {
                id: string;
                name: string;
                phone: string | null;
                email: string;
            };
        } | null;
        rider?: {
            id: string;
            name: string;
            phone: string | null;
            email: string;
        };
    };
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
    PENDING: {
        label: "Pending Review",
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200"
    },
    DRIVER_CONTACTED: {
        label: "Driver Contacted",
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200"
    },
    ITEM_FOUND: {
        label: "Item Located!",
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-200"
    },
    RECOVERY_ARRANGED: {
        label: "Recovery Arranged",
        bg: "bg-indigo-50",
        text: "text-indigo-700",
        border: "border-indigo-200"
    },
    RESOLVED: {
        label: "Resolved & Returned",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200"
    },
    CLOSED: {
        label: "Case Closed",
        bg: "bg-gray-100",
        text: "text-gray-600",
        border: "border-gray-200"
    }
};

export default function AdminLostItemsPage() {
    const [reports, setReports] = useState<LostItemReport[]>([]);
    const [counts, setCounts] = useState<{
        pending: number;
        driverContacted: number;
        itemFound: number;
        resolved: number;
        total: number;
    }>({
        pending: 0,
        driverContacted: 0,
        itemFound: 0,
        resolved: 0,
        total: 0
    });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    // Active detail modal
    const [selectedReport, setSelectedReport] = useState<LostItemReport | null>(null);
    const [editStatus, setEditStatus] = useState("");
    const [editAdminNotes, setEditAdminNotes] = useState("");
    const [editDriverResponse, setEditDriverResponse] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    const getAuthHeaders = useCallback((): HeadersInit => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, []);

    const fetchLostItems = useCallback(async () => {
        try {
            setLoading(true);
            const headers = getAuthHeaders();
            const params = new URLSearchParams();
            if (statusFilter !== "ALL") params.append("status", statusFilter);
            if (categoryFilter !== "ALL") params.append("category", categoryFilter);
            if (searchQuery.trim()) params.append("q", searchQuery.trim());

            const res = await fetch(`/api/admin/lost-items?${params.toString()}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setReports(data.reports || []);
                if (data.counts) setCounts(data.counts);
            }
        } catch (err) {
            console.error("Failed to fetch lost items:", err);
        } finally {
            setLoading(false);
        }
    }, [getAuthHeaders, statusFilter, categoryFilter, searchQuery]);

    useEffect(() => {
        fetchLostItems();
        const interval = setInterval(fetchLostItems, 30000);
        return () => clearInterval(interval);
    }, [fetchLostItems]);

    const openCaseModal = (report: LostItemReport) => {
        setSelectedReport(report);
        setEditStatus(report.status);
        setEditAdminNotes(report.adminNotes || "");
        setEditDriverResponse(report.driverResponse || "");
    };

    const handleSaveCaseUpdate = async () => {
        if (!selectedReport) return;

        try {
            setIsSaving(true);
            const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };
            const res = await fetch("/api/admin/lost-items", {
                method: "PATCH",
                headers,
                body: JSON.stringify({
                    id: selectedReport.id,
                    status: editStatus,
                    adminNotes: editAdminNotes,
                    driverResponse: editDriverResponse,
                }),
            });

            if (res.ok) {
                const updated = await res.json();
                setFeedbackMessage({ text: `Case ${updated.reference} updated successfully.`, type: "success" });
                setSelectedReport(null);
                fetchLostItems();
            } else {
                const err = await res.json();
                setFeedbackMessage({ text: err.error || "Failed to update case", type: "error" });
            }
        } catch {
            setFeedbackMessage({ text: "Error saving update", type: "error" });
        } finally {
            setIsSaving(false);
            setTimeout(() => setFeedbackMessage(null), 5000);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-200 p-6 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-500/20">
                        <Luggage size={26} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                            Lost & Found Item Recovery
                        </h1>
                        <p className="text-sm text-gray-500">
                            Track lost property reports, coordinate safely with drivers, and maintain customer support accountability.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => fetchLostItems()}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-all self-start md:self-auto"
                >
                    <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {/* Notification Banner */}
            {feedbackMessage && (
                <div
                    className={`p-4 rounded-xl flex items-center justify-between shadow-sm border ${
                        feedbackMessage.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-red-50 border-red-200 text-red-800"
                    }`}
                >
                    <div className="flex items-center gap-3 text-sm font-bold">
                        {feedbackMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <span>{feedbackMessage.text}</span>
                    </div>
                    <button onClick={() => setFeedbackMessage(null)} className="text-xs opacity-60 hover:opacity-100">
                        Dismiss
                    </button>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-amber-600 uppercase tracking-wider">Pending Action</p>
                    <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-black text-amber-600">{counts.pending}</span>
                        <Clock size={20} className="text-amber-500 animate-pulse" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-blue-600 uppercase tracking-wider">Driver Contacted</p>
                    <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-black text-blue-600">{counts.driverContacted}</span>
                        <Phone size={20} className="text-blue-500" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-purple-600 uppercase tracking-wider">Item Found!</p>
                    <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-black text-purple-600">{counts.itemFound}</span>
                        <Luggage size={20} className="text-purple-500" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-emerald-600 uppercase tracking-wider">Resolved Cases</p>
                    <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-black text-emerald-600">{counts.resolved}</span>
                        <CheckCircle2 size={20} className="text-emerald-500" />
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search reference (LOST-...), passenger name, phone, item description..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3.5 py-2.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                        <option value="ALL">All Categories</option>
                        <option value="PHONE">Phone / Electronics</option>
                        <option value="WALLET">Wallet / Purse</option>
                        <option value="BAG">Bag / Luggage</option>
                        <option value="DOCUMENTS">Documents / Keys</option>
                        <option value="CLOTHING">Clothing</option>
                        <option value="OTHER">Other</option>
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3.5 py-2.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="PENDING">Pending Review</option>
                        <option value="DRIVER_CONTACTED">Driver Contacted</option>
                        <option value="ITEM_FOUND">Item Found</option>
                        <option value="RECOVERY_ARRANGED">Recovery Arranged</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                    </select>
                </div>
            </div>

            {/* Reports List */}
            {loading ? (
                <div className="bg-white p-16 rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4" />
                    <p className="text-sm font-bold text-gray-500">Loading lost item reports...</p>
                </div>
            ) : reports.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                    <Luggage size={48} className="text-gray-300 mb-3" />
                    <h3 className="text-base font-bold text-gray-800">No lost item reports found</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-md">
                        {searchQuery || statusFilter !== "ALL" || categoryFilter !== "ALL"
                            ? "Try adjusting your search query or filters."
                            : "When passengers report items left behind in cabs, case tickets will be listed here."}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reports.map((report) => {
                        const statusBadge = STATUS_CONFIG[report.status] || STATUS_CONFIG.PENDING;
                        return (
                            <div
                                key={report.id}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                            >
                                <div className="p-5 md:p-6">
                                    {/* Header Row */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-xs font-black bg-purple-50 text-purple-700 px-3 py-1 rounded-lg border border-purple-200">
                                                {report.reference}
                                            </span>
                                            <span className="text-xs font-black uppercase tracking-wider bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">
                                                {report.category}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                                                {statusBadge.label}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(report.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Main Body */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-4">
                                        {/* Item info */}
                                        <div className="md:col-span-2 space-y-3">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Item Description</p>
                                                <p className="text-sm font-semibold text-gray-900 mt-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                    {report.description}
                                                </p>
                                            </div>

                                            {report.photoUrl && (
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Attached Photo</p>
                                                    <a
                                                        href={report.photoUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:underline"
                                                    >
                                                        <ExternalLink size={13} /> View Attached Photo
                                                    </a>
                                                </div>
                                            )}

                                            {/* Ride details summary */}
                                            <div className="text-xs text-gray-600 bg-gray-50/70 p-3 rounded-xl border border-gray-100 space-y-1">
                                                <div className="flex items-center gap-1.5 font-bold text-gray-800">
                                                    <MapPin size={13} className="text-emerald-500" />
                                                    <span className="truncate">{report.ride.originAddress}</span>
                                                    <span>➔</span>
                                                    <span className="truncate">{report.ride.destAddress}</span>
                                                </div>
                                            </div>

                                            {/* Notes / driver response preview */}
                                            {report.driverResponse && (
                                                <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900">
                                                    <span className="font-bold">Driver Response: </span>
                                                    {report.driverResponse}
                                                </div>
                                            )}
                                        </div>

                                        {/* Contact parties */}
                                        <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-100 text-xs">
                                            {/* Passenger */}
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Passenger Contact</p>
                                                <p className="text-sm font-black text-gray-900">{report.contactName}</p>
                                                <p className="text-xs text-gray-600 flex items-center gap-1.5 mt-0.5">
                                                    <Phone size={12} className="text-gray-400" />
                                                    <span>{report.contactPhone}</span>
                                                </p>
                                            </div>

                                            {/* Assigned Driver */}
                                            <div className="pt-2 border-t border-gray-200">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Assigned Driver</p>
                                                {report.ride.driver ? (
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 flex items-center gap-1">
                                                            <Car size={13} className="text-blue-600" />
                                                            {report.ride.driver.user.name}
                                                        </p>
                                                        {report.ride.driver.user.phone && (
                                                            <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                                                                <Phone size={11} className="text-gray-400" />
                                                                <span>{report.ride.driver.user.phone}</span>
                                                            </p>
                                                        )}
                                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                                            {report.ride.driver.vehicleModel || "Vehicle"} {report.ride.driver.licensePlate ? `• ${report.ride.driver.licensePlate}` : ""}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 italic">No driver assigned to this ride record</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                        <div className="text-xs text-gray-400">
                                            {report.adminNotes ? "📝 Internal notes recorded" : "No internal notes yet"}
                                        </div>

                                        <button
                                            onClick={() => openCaseModal(report)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
                                        >
                                            Manage Case
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Case Management Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 bg-gray-900 text-white flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-lg font-black tracking-tight">Lost Item Recovery Case</h3>
                                <p className="text-xs text-gray-400 mt-0.5 font-mono">
                                    Reference: {selectedReport.reference}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="p-2 text-gray-400 hover:text-white rounded-full transition-colors"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        {/* Scrollable Form */}
                        <div className="p-6 space-y-5 overflow-y-auto">
                            {/* Summary Box */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="font-bold text-gray-500">Category:</span>
                                    <span className="font-black text-gray-900">{selectedReport.category}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold text-gray-500">Passenger:</span>
                                    <span className="font-black text-gray-900">{selectedReport.contactName} ({selectedReport.contactPhone})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold text-gray-500">Driver:</span>
                                    <span className="font-black text-gray-900">
                                        {selectedReport.ride.driver?.user.name || "N/A"} ({selectedReport.ride.driver?.user.phone || "No phone"})
                                    </span>
                                </div>
                                <div>
                                    <span className="font-bold text-gray-500">Description:</span>
                                    <p className="mt-1 text-gray-800 font-medium bg-white p-2 rounded-lg border border-gray-200">
                                        {selectedReport.description}
                                    </p>
                                </div>
                            </div>

                            {/* Status Change */}
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-600 mb-2">
                                    Case Status
                                </label>
                                <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="PENDING">Pending Review</option>
                                    <option value="DRIVER_CONTACTED">Driver Contacted</option>
                                    <option value="ITEM_FOUND">Item Found in Vehicle</option>
                                    <option value="RECOVERY_ARRANGED">Recovery / Handover Arranged</option>
                                    <option value="RESOLVED">Resolved & Returned to Passenger</option>
                                    <option value="CLOSED">Closed (Unrecovered)</option>
                                </select>
                            </div>

                            {/* Driver Response Input */}
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-600 mb-2">
                                    Driver Response / Verification Notes
                                </label>
                                <textarea
                                    value={editDriverResponse}
                                    onChange={(e) => setEditDriverResponse(e.target.value)}
                                    rows={2}
                                    placeholder="Record response from driver (e.g., Driver confirmed item is in trunk, will drop off at dispatch hub tomorrow morning)..."
                                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            {/* Internal Admin Notes */}
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-600 mb-2">
                                    Internal Support Notes (Admin Only)
                                </label>
                                <textarea
                                    value={editAdminNotes}
                                    onChange={(e) => setEditAdminNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Record dispatcher remarks, handover location, security checks, or communication history..."
                                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50 shrink-0">
                            <button
                                type="button"
                                onClick={() => setSelectedReport(null)}
                                className="flex-1 py-3 bg-white hover:bg-gray-100 text-gray-700 text-sm font-bold rounded-xl transition-all border border-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={handleSaveCaseUpdate}
                                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-black rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Save size={16} />
                                {isSaving ? "Saving..." : "Save Case Update"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
