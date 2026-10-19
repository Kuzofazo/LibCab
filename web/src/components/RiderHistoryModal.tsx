"use client";

import React, { useState, useEffect } from "react";
import { 
    X, 
    Calendar, 
    Clock, 
    MapPin, 
    Navigation, 
    Search, 
    FileText, 
    AlertCircle, 
    CheckCircle2, 
    XCircle, 
    ShieldCheck, 
    Printer, 
    Star, 
    HelpCircle,
    ChevronRight,
    RefreshCw,
    Filter,
    Car
} from "lucide-react";
import { formatDual } from "@/utils/currency";
import RideReceipt from "@/components/RideReceipt";
import LostItemReportModal from "@/components/LostItemReportModal";

interface RiderHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    onRebook?: (origin: string, dest: string) => void;
}

export default function RiderHistoryModal({
    isOpen,
    onClose,
    user,
    onRebook
}: RiderHistoryModalProps) {
    const [activeSubTab, setActiveSubTab] = useState<"HISTORY" | "SCHEDULED" | "LOST_ITEMS">("HISTORY");
    const [rides, setRides] = useState<any[]>([]);
    const [scheduledRides, setScheduledRides] = useState<any[]>([]);
    const [lostItemCases, setLostItemCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    
    // Detailed ride modal
    const [selectedRideForReceipt, setSelectedRideForReceipt] = useState<any | null>(null);
    const [selectedRideForLostItem, setSelectedRideForLostItem] = useState<any | null>(null);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            if (activeSubTab === "HISTORY") {
                const params = new URLSearchParams({
                    status: statusFilter,
                    q: searchQuery
                });
                const res = await fetch(`/api/rides/history?${params.toString()}`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setRides(data.rides || []);
                }
            } else if (activeSubTab === "SCHEDULED") {
                const res = await fetch("/api/rides/scheduled", { headers });
                if (res.ok) {
                    const data = await res.json();
                    setScheduledRides(Array.isArray(data) ? data : []);
                }
            } else if (activeSubTab === "LOST_ITEMS") {
                const res = await fetch("/api/support/lost-items", { headers });
                if (res.ok) {
                    const data = await res.json();
                    setLostItemCases(Array.isArray(data) ? data : []);
                }
            }
        } catch (err) {
            console.error("Fetch history error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen, activeSubTab, statusFilter]);

    if (!isOpen) return null;

    const handleCancelScheduled = async (rideId: string) => {
        if (!confirm("Are you sure you want to cancel this scheduled ride?")) return;
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/rides/scheduled", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ id: rideId, action: "CANCEL" })
            });
            if (res.ok) {
                fetchHistory();
            }
        } catch (err) {
            console.error("Cancel scheduled ride error:", err);
        }
    };

    return (
        <div className="fixed inset-0 z-[320] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                            📜
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-950">Ride History &amp; Bookings</h3>
                            <p className="text-xs text-slate-500">Trip records, scheduled rides &amp; lost item recovery</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Sub-Tabs: [ Ride History ] [ Scheduled (Upcoming) ] [ Lost Item Cases ] */}
                <div className="px-5 pt-3 pb-2 border-b border-slate-100 flex gap-2 bg-white">
                    {[
                        { id: "HISTORY", label: "Past Trips" },
                        { id: "SCHEDULED", label: "Scheduled Rides" },
                        { id: "LOST_ITEMS", label: "Lost Items" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveSubTab(tab.id as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                activeSubTab === tab.id
                                    ? "bg-slate-950 text-white shadow-sm"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Filter and Search Bar (shown for HISTORY tab) */}
                {activeSubTab === "HISTORY" && (
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-2.5">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") fetchHistory(); }}
                                placeholder="Search by booking reference, street..."
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-900"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="COMPLETED">Completed Trips</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                        <button
                            type="button"
                            onClick={fetchHistory}
                            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-bold text-slate-800 transition-colors"
                        >
                            Search
                        </button>
                    </div>
                )}

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                    {loading ? (
                        <div className="py-16 text-center text-xs text-slate-400 animate-pulse font-bold">
                            Loading records...
                        </div>
                    ) : activeSubTab === "HISTORY" ? (
                        /* TAB 1: HISTORY */
                        rides.length === 0 ? (
                            <div className="py-16 text-center text-xs text-slate-500">
                                No past trips found matching your filters.
                            </div>
                        ) : (
                            rides.map((r) => (
                                <div
                                    key={r.id}
                                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 transition-colors shadow-sm space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                {r.bookingReference || r.id.slice(0, 8).toUpperCase()}
                                            </span>
                                            <span className="text-[11px] text-slate-500 font-medium">
                                                {new Date(r.createdAt).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric"
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                                                r.status === "COMPLETED"
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                            }`}>
                                                {r.status}
                                            </span>
                                            <span className="text-sm font-black text-slate-950">
                                                {formatDual(r.fare || 0)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Route Preview */}
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <MapPin size={13} className="text-slate-800 shrink-0" />
                                            <span className="truncate">{r.originAddress}</span>
                                        </div>
                                        {r.stops && r.stops.length > 0 && (
                                            <div className="flex items-center gap-2 text-slate-500 pl-4 text-[11px]">
                                                <span>+ {r.stops.length} intermediate stop{r.stops.length > 1 ? "s" : ""}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <Navigation size={13} className="text-slate-800 shrink-0" />
                                            <span className="truncate">{r.destAddress}</span>
                                        </div>
                                    </div>

                                    {/* Driver Summary */}
                                    {r.driver && (
                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                            <span>Driver: <strong className="text-slate-900">{r.driver.user?.name || "AfriCab Driver"}</strong> ({r.driver.vehicleModel || "Sedan"})</span>
                                            <span className="font-mono text-[11px] font-bold text-slate-700">{r.driver.licensePlate}</span>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRideForReceipt(r)}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <FileText size={13} /> View Receipt
                                        </button>

                                        <div className="flex items-center gap-2">
                                            {r.status === "COMPLETED" && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedRideForLostItem(r)}
                                                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                                                >
                                                    🎒 Report Lost Item
                                                </button>
                                            )}

                                            {onRebook && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onRebook(r.originAddress, r.destAddress);
                                                        onClose();
                                                    }}
                                                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
                                                >
                                                    Re-book
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )
                    ) : activeSubTab === "SCHEDULED" ? (
                        /* TAB 2: SCHEDULED RIDES */
                        scheduledRides.length === 0 ? (
                            <div className="py-16 text-center text-xs text-slate-500">
                                No scheduled rides booked. Use &quot;Schedule a Ride&quot; on the booking screen to reserve upcoming rides.
                            </div>
                        ) : (
                            scheduledRides.map((sr) => (
                                <div
                                    key={sr.id}
                                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 transition-colors shadow-sm space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-black text-xs text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                                {sr.bookingReference}
                                            </span>
                                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                                <Clock size={13} className="text-amber-500" />
                                                {new Date(sr.scheduledFor).toLocaleString("en-US", {
                                                    weekday: "short",
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                })}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                            sr.scheduledStatus === "CONFIRMED"
                                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                : sr.scheduledStatus === "DISPATCHED"
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                : "bg-slate-100 text-slate-600"
                                        }`}>
                                            {sr.scheduledStatus || "Confirmed"}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <MapPin size={13} className="text-slate-800 shrink-0" />
                                            <span className="truncate">{sr.originAddress}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <Navigation size={13} className="text-slate-800 shrink-0" />
                                            <span className="truncate">{sr.destAddress}</span>
                                        </div>
                                    </div>

                                    {sr.notes && (
                                        <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                            Note: {sr.notes}
                                        </p>
                                    )}

                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-sm font-black text-slate-950">{formatDual(sr.fare || 0)}</span>
                                        {sr.scheduledStatus === "CONFIRMED" && sr.status === "SCHEDULED" && (
                                            <button
                                                type="button"
                                                onClick={() => handleCancelScheduled(sr.id)}
                                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors"
                                            >
                                                Cancel Booking
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )
                    ) : (
                        /* TAB 3: LOST ITEMS */
                        lostItemCases.length === 0 ? (
                            <div className="py-16 text-center text-xs text-slate-500">
                                No lost item reports filed. If you left a belonging in an AfriCab, open any completed trip and click &quot;Report Lost Item&quot;.
                            </div>
                        ) : (
                            lostItemCases.map((cs) => (
                                <div
                                    key={cs.id}
                                    className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-sm"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                {cs.reference}
                                            </span>
                                            <h4 className="text-sm font-black text-slate-950 mt-1">
                                                {cs.category}: {cs.description}
                                            </h4>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                                            cs.status === "PENDING"
                                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                                : cs.status === "DRIVER_CONTACTED"
                                                ? "bg-blue-50 text-blue-800 border border-blue-200"
                                                : cs.status === "ITEM_FOUND" || cs.status === "RESOLVED"
                                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                                : "bg-slate-100 text-slate-600"
                                        }`}>
                                            {cs.status.replace(/_/g, " ")}
                                        </span>
                                    </div>

                                    {cs.adminNotes && (
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Support Update:</span>
                                            <p className="text-slate-800">{cs.adminNotes}</p>
                                        </div>
                                    )}

                                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                                        <span>Contact: {cs.contactPhone}</span>
                                        <span>Reported {new Date(cs.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
            </div>

            {/* Receipt Modal */}
            {selectedRideForReceipt && (
                <div
                    className="fixed inset-0 z-[360] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                    onClick={(e) => { if (e.target === e.currentTarget) setSelectedRideForReceipt(null); }}
                >
                    <div className="w-full max-w-xl my-6">
                        <RideReceipt
                            ride={selectedRideForReceipt}
                            role="CUSTOMER"
                            onClose={() => setSelectedRideForReceipt(null)}
                        />
                    </div>
                </div>
            )}

            {/* Lost Item Form Modal */}
            {selectedRideForLostItem && (
                <LostItemReportModal
                    isOpen={Boolean(selectedRideForLostItem)}
                    onClose={() => setSelectedRideForLostItem(null)}
                    rideId={selectedRideForLostItem.id}
                    rideDetails={{
                        bookingReference: selectedRideForLostItem.bookingReference,
                        pickup: selectedRideForLostItem.originAddress,
                        destination: selectedRideForLostItem.destAddress,
                        driverName: selectedRideForLostItem.driver?.user?.name,
                        vehicleInfo: selectedRideForLostItem.driver?.vehicleModel,
                        licensePlate: selectedRideForLostItem.driver?.licensePlate,
                        date: new Date(selectedRideForLostItem.createdAt).toLocaleDateString()
                    }}
                    userPhone={user?.phone}
                    userName={user?.name}
                    onSuccess={() => {
                        setSelectedRideForLostItem(null);
                        setActiveSubTab("LOST_ITEMS");
                        fetchHistory();
                    }}
                />
            )}
        </div>
    );
}
