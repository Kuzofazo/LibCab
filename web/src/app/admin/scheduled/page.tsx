"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    CalendarClock,
    Search,
    RefreshCw,
    Send,
    UserCheck,
    XCircle,
    MapPin,
    Clock,
    Phone,
    Car,
    AlertCircle,
    CheckCircle2,
    Calendar,
    ChevronDown,
    ChevronUp,
    Shield,
    Layers,
    Tag
} from "lucide-react";
import { formatDual } from "@/utils/currency";

interface RideStop {
    id: string;
    sequence: number;
    address: string;
    status: string;
}

interface ScheduledRide {
    id: string;
    bookingReference: string | null;
    originAddress: string;
    destAddress: string;
    rideCategory: string;
    vehicleType: string;
    fare: number | null;
    paymentMethod: string;
    status: string;
    scheduledStatus: string | null;
    scheduledFor: string;
    notes: string | null;
    promoCode: string | null;
    discountAmount: number | null;
    rider: {
        id: string;
        name: string;
        phone: string | null;
        email: string;
    };
    driver: {
        id: string;
        vehicleModel?: string | null;
        licensePlate?: string | null;
        user: {
            name: string;
            phone: string | null;
        };
    } | null;
    stops?: RideStop[];
    createdAt: string;
}

interface Driver {
    id: string;
    driverProfileId?: string;
    name: string;
    phone: string;
    status: string;
    approvalStatus: string;
    vehicle: string;
    licensePlate: string;
}

export default function AdminScheduledRidesPage() {
    const [rides, setRides] = useState<ScheduledRide[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [dateFilter, setDateFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedRideId, setExpandedRideId] = useState<string | null>(null);

    // Driver assignment modal
    const [assignModalRide, setAssignModalRide] = useState<ScheduledRide | null>(null);
    const [selectedDriverId, setSelectedDriverId] = useState("");
    const [isAssigning, setIsAssigning] = useState(false);

    // Action feedback
    const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    const getAuthHeaders = useCallback((): HeadersInit => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, []);

    const fetchScheduledRides = useCallback(async () => {
        try {
            setLoading(true);
            const headers = getAuthHeaders();
            const res = await fetch("/api/rides/scheduled", { headers });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setRides(data);
                }
            }
        } catch (err) {
            console.error("Failed to load scheduled rides:", err);
        } finally {
            setLoading(false);
        }
    }, [getAuthHeaders]);

    const fetchDrivers = useCallback(async () => {
        try {
            const headers = getAuthHeaders();
            const res = await fetch("/api/admin/drivers", { headers });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setDrivers(data);
                }
            }
        } catch (err) {
            console.error("Failed to load drivers:", err);
        }
    }, [getAuthHeaders]);

    useEffect(() => {
        fetchScheduledRides();
        fetchDrivers();
        const interval = setInterval(fetchScheduledRides, 25000);
        return () => clearInterval(interval);
    }, [fetchScheduledRides, fetchDrivers]);

    const handleRunDispatchScanner = async () => {
        try {
            setIsScanning(true);
            const headers = getAuthHeaders();
            const res = await fetch("/api/rides/scheduled/dispatch", { headers });
            if (res.ok) {
                const data = await res.json();
                setActionMessage({
                    text: `Scanner completed! Dispatched ${data.dispatchedCount || 0} scheduled ride(s) due within 25 minutes.`,
                    type: "success"
                });
                fetchScheduledRides();
            } else {
                setActionMessage({ text: "Dispatch scanner check failed", type: "error" });
            }
        } catch {
            setActionMessage({ text: "Error executing dispatch scan", type: "error" });
        } finally {
            setIsScanning(false);
            setTimeout(() => setActionMessage(null), 5000);
        }
    };

    const handleInstantDispatch = async (rideId: string) => {
        if (!confirm("Are you sure you want to broadcast this scheduled ride to nearby online drivers immediately?")) {
            return;
        }

        try {
            const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };
            const res = await fetch("/api/rides/scheduled/dispatch", {
                method: "POST",
                headers,
                body: JSON.stringify({ rideId }),
            });

            if (res.ok) {
                setActionMessage({ text: "Ride dispatched to nearby drivers successfully!", type: "success" });
                fetchScheduledRides();
            } else {
                const err = await res.json();
                setActionMessage({ text: err.error || "Dispatch failed", type: "error" });
            }
        } catch {
            setActionMessage({ text: "Error executing dispatch", type: "error" });
        } finally {
            setTimeout(() => setActionMessage(null), 5000);
        }
    };

    const handleConfirmAssignDriver = async () => {
        if (!assignModalRide || !selectedDriverId) return;

        try {
            setIsAssigning(true);
            const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };
            const res = await fetch("/api/rides/scheduled/dispatch", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    rideId: assignModalRide.id,
                    driverId: selectedDriverId,
                }),
            });

            if (res.ok) {
                setActionMessage({ text: "Driver assigned successfully to scheduled ride!", type: "success" });
                setAssignModalRide(null);
                setSelectedDriverId("");
                fetchScheduledRides();
            } else {
                const err = await res.json();
                setActionMessage({ text: err.error || "Failed to assign driver", type: "error" });
            }
        } catch {
            setActionMessage({ text: "Failed to connect to server", type: "error" });
        } finally {
            setIsAssigning(false);
            setTimeout(() => setActionMessage(null), 5000);
        }
    };

    const handleCancelRide = async (rideId: string) => {
        if (!confirm("Are you sure you want to cancel this scheduled ride?")) return;

        try {
            const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };
            const res = await fetch("/api/rides/scheduled", {
                method: "PATCH",
                headers,
                body: JSON.stringify({ id: rideId, action: "CANCEL" }),
            });

            if (res.ok) {
                setActionMessage({ text: "Scheduled ride has been cancelled.", type: "success" });
                fetchScheduledRides();
            } else {
                const err = await res.json();
                setActionMessage({ text: err.error || "Failed to cancel ride", type: "error" });
            }
        } catch {
            setActionMessage({ text: "Error cancelling ride", type: "error" });
        } finally {
            setTimeout(() => setActionMessage(null), 5000);
        }
    };

    // Filter computation
    const filteredRides = rides.filter((ride) => {
        // Status filter
        if (statusFilter !== "ALL") {
            if (statusFilter === "CONFIRMED" && ride.scheduledStatus !== "CONFIRMED") return false;
            if (statusFilter === "DISPATCHED" && ride.scheduledStatus !== "DISPATCHED") return false;
            if (statusFilter === "CANCELLED" && ride.scheduledStatus !== "CANCELLED" && ride.status !== "CANCELLED") return false;
            if (statusFilter === "COMPLETED" && ride.status !== "COMPLETED") return false;
        }

        // Date filter
        if (dateFilter !== "ALL") {
            const rideDate = new Date(ride.scheduledFor);
            const now = new Date();
            const isToday = rideDate.toDateString() === now.toDateString();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const isTomorrow = rideDate.toDateString() === tomorrow.toDateString();

            if (dateFilter === "TODAY" && !isToday) return false;
            if (dateFilter === "TOMORROW" && !isTomorrow) return false;
            if (dateFilter === "UPCOMING" && rideDate.getTime() < now.getTime()) return false;
        }

        // Search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const refMatch = ride.bookingReference?.toLowerCase().includes(q);
            const riderMatch = ride.rider?.name?.toLowerCase().includes(q) || ride.rider?.phone?.includes(q);
            const originMatch = ride.originAddress?.toLowerCase().includes(q);
            const destMatch = ride.destAddress?.toLowerCase().includes(q);
            const driverMatch = ride.driver?.user?.name?.toLowerCase().includes(q);
            if (!refMatch && !riderMatch && !originMatch && !destMatch && !driverMatch) {
                return false;
            }
        }

        return true;
    });

    // Stats
    const totalScheduled = rides.length;
    const nowTime = Date.now();
    const dueWithinHour = rides.filter(r => {
        const t = new Date(r.scheduledFor).getTime();
        return t >= nowTime && t <= nowTime + 60 * 60 * 1000 && r.scheduledStatus === "CONFIRMED";
    }).length;
    const activeConfirmed = rides.filter(r => r.scheduledStatus === "CONFIRMED").length;
    const dispatchedCount = rides.filter(r => r.scheduledStatus === "DISPATCHED" || r.status === "REQUESTED" || r.status === "ACCEPTED").length;

    const formatPickupTime = (isoString: string) => {
        const d = new Date(isoString);
        const now = new Date();
        const diffMs = d.getTime() - now.getTime();
        const diffMins = Math.round(diffMs / 60000);

        let relative = "";
        if (diffMins < 0) {
            relative = `${Math.abs(diffMins)}m ago`;
        } else if (diffMins <= 60) {
            relative = `in ${diffMins} min${diffMins === 1 ? "" : "s"}`;
        } else if (diffMins < 24 * 60) {
            const hrs = Math.floor(diffMins / 60);
            relative = `in ${hrs}h ${diffMins % 60}m`;
        } else {
            const days = Math.floor(diffMins / (24 * 60));
            relative = `in ${days} day${days === 1 ? "" : "s"}`;
        }

        const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

        return { dateStr, timeStr, relative, isSoon: diffMins >= 0 && diffMins <= 45 };
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-200 p-6 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                            <CalendarClock size={26} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                                Scheduled Rides & Advance Bookings
                            </h1>
                            <p className="text-sm text-gray-500">
                                Monitor advance airport transfers, scheduled journeys, and automated dispatch across Monrovia.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRunDispatchScanner}
                        disabled={isScanning}
                        className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw size={15} className={isScanning ? "animate-spin" : ""} />
                        {isScanning ? "Scanning..." : "Scan & Dispatch (<= 25m)"}
                    </button>

                    <button
                        onClick={() => fetchScheduledRides()}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-all"
                    >
                        <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Total Bookings</p>
                    <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-black text-gray-900">{totalScheduled}</span>
                        <CalendarClock size={20} className="text-gray-300" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-amber-600 uppercase tracking-wider">Due Soon (&lt; 1 hr)</p>
                    <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-black text-amber-600">{dueWithinHour}</span>
                        <Clock size={20} className="text-amber-500 animate-pulse" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-blue-600 uppercase tracking-wider">Confirmed (Waiting)</p>
                    <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-black text-blue-600">{activeConfirmed}</span>
                        <CheckCircle2 size={20} className="text-blue-500" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-emerald-600 uppercase tracking-wider">Dispatched / Active</p>
                    <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-black text-emerald-600">{dispatchedCount}</span>
                        <Send size={20} className="text-emerald-500" />
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
                        placeholder="Search reference, customer name, phone, pickup, or destination..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Date filter */}
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="px-3.5 py-2.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="ALL">All Dates</option>
                        <option value="TODAY">Today</option>
                        <option value="TOMORROW">Tomorrow</option>
                        <option value="UPCOMING">Upcoming Only</option>
                    </select>

                    {/* Status filter */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                        {["ALL", "CONFIRMED", "DISPATCHED", "CANCELLED"].map((st) => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                    statusFilter === st
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-900"
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Scheduled Rides List */}
            {loading ? (
                <div className="bg-white p-16 rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
                    <p className="text-sm font-bold text-gray-500">Loading scheduled bookings...</p>
                </div>
            ) : filteredRides.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                    <CalendarClock size={48} className="text-gray-300 mb-3" />
                    <h3 className="text-base font-bold text-gray-800">No scheduled rides found</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-md">
                        {searchQuery || statusFilter !== "ALL" || dateFilter !== "ALL"
                            ? "Try adjusting your search criteria or status filters."
                            : "When riders book advance rides, they will appear here ready for scheduled dispatch."}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRides.map((ride) => {
                        const timing = formatPickupTime(ride.scheduledFor);
                        const isExpanded = expandedRideId === ride.id;
                        const hasStops = ride.stops && ride.stops.length > 0;

                        return (
                            <div
                                key={ride.id}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                            >
                                <div className="p-5 md:p-6">
                                    {/* Top Row: Ref, Timing, Badges */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-xs font-black bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-200">
                                                {ride.bookingReference || `SCH-${ride.id.slice(-6).toUpperCase()}`}
                                            </span>

                                            <span className="text-xs font-black uppercase tracking-wider bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">
                                                {ride.rideCategory}
                                            </span>

                                            {ride.promoCode && (
                                                <span className="flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200">
                                                    <Tag size={12} />
                                                    {ride.promoCode} (-${ride.discountAmount || 0})
                                                </span>
                                            )}
                                        </div>

                                        {/* Scheduled Timing Badge */}
                                        <div className="flex items-center gap-2">
                                            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                                                timing.isSoon
                                                    ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                                                    : "bg-blue-50 text-blue-900 border border-blue-100"
                                            }`}>
                                                <Calendar size={14} />
                                                <span>{timing.dateStr} at {timing.timeStr}</span>
                                                <span className="bg-white/80 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                                                    {timing.relative}
                                                </span>
                                            </div>

                                            {/* Status Badge */}
                                            <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
                                                ride.scheduledStatus === "CONFIRMED"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : ride.scheduledStatus === "DISPATCHED"
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : ride.scheduledStatus === "CANCELLED" || ride.status === "CANCELLED"
                                                    ? "bg-red-100 text-red-800"
                                                    : "bg-gray-100 text-gray-700"
                                            }`}>
                                                {ride.scheduledStatus || ride.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Middle Row: Route & Customer Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-4">
                                        {/* Route details */}
                                        <div className="md:col-span-2 space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                                                    <MapPin size={14} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Pickup Location</p>
                                                    <p className="text-sm font-bold text-gray-900 truncate">{ride.originAddress}</p>
                                                </div>
                                            </div>

                                            {hasStops && (
                                                <div className="ml-3 pl-6 border-l-2 border-dashed border-gray-200 py-1 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                            <Layers size={12} />
                                                            {ride.stops?.length} Intermediate Stop{ride.stops?.length === 1 ? "" : "s"}
                                                        </span>
                                                        <button
                                                            onClick={() => setExpandedRideId(isExpanded ? null : ride.id)}
                                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold"
                                                        >
                                                            {isExpanded ? "Hide Stops" : "Show All Stops"}
                                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        </button>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="space-y-1.5 pt-1">
                                                            {ride.stops?.map((stop, sIdx) => (
                                                                <div key={stop.id || sIdx} className="text-xs text-gray-700 flex items-center gap-2">
                                                                    <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black flex items-center justify-center shrink-0">
                                                                        {stop.sequence}
                                                                    </span>
                                                                    <span className="font-medium truncate">{stop.address}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex items-start gap-3">
                                                <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                                                    <MapPin size={14} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Destination</p>
                                                    <p className="text-sm font-bold text-gray-900 truncate">{ride.destAddress}</p>
                                                </div>
                                            </div>

                                            {ride.notes && (
                                                <div className="p-2.5 bg-gray-50 rounded-xl text-xs text-gray-600 border border-gray-100">
                                                    <span className="font-bold text-gray-800">Special Notes: </span>
                                                    {ride.notes}
                                                </div>
                                            )}
                                        </div>

                                        {/* Customer and Driver details */}
                                        <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-100">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Customer</p>
                                                <p className="text-sm font-black text-gray-900">{ride.rider?.name || "Customer"}</p>
                                                {ride.rider?.phone && (
                                                    <p className="text-xs text-gray-600 flex items-center gap-1.5 mt-0.5">
                                                        <Phone size={12} className="text-gray-400" />
                                                        <span>{ride.rider.phone}</span>
                                                    </p>
                                                )}
                                            </div>

                                            <div className="pt-2 border-t border-gray-200">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Assigned Driver</p>
                                                {ride.driver ? (
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                                                            <Car size={14} className="text-blue-600" />
                                                            {ride.driver.user.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {ride.driver.vehicleModel || "Vehicle"} {ride.driver.licensePlate ? `• ${ride.driver.licensePlate}` : ""}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md inline-block mt-0.5">
                                                        ⚠️ Unassigned (Automated dispatch will trigger)
                                                    </p>
                                                )}
                                            </div>

                                            <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-xs">
                                                <span className="text-gray-500 font-bold">Estimated Fare:</span>
                                                <span className="font-black text-gray-900">
                                                    {ride.fare !== null ? formatDual(ride.fare) : "Metered"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Controls Bar */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                                        <div className="text-xs text-gray-400">
                                            Booked on {new Date(ride.createdAt).toLocaleString()}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {ride.scheduledStatus !== "CANCELLED" && ride.status !== "CANCELLED" && ride.status !== "COMPLETED" && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setAssignModalRide(ride);
                                                            setSelectedDriverId(ride.driver?.id || "");
                                                        }}
                                                        className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all"
                                                    >
                                                        <UserCheck size={14} />
                                                        {ride.driver ? "Reassign Driver" : "Assign Driver"}
                                                    </button>

                                                    <button
                                                        onClick={() => handleInstantDispatch(ride.id)}
                                                        className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
                                                    >
                                                        <Send size={14} />
                                                        Dispatch Now
                                                    </button>

                                                    <button
                                                        onClick={() => handleCancelRide(ride.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                        title="Cancel scheduled ride"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Assign Driver Modal */}
            {assignModalRide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 bg-gray-900 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black tracking-tight">Assign Driver to Scheduled Ride</h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Ref: {assignModalRide.bookingReference || assignModalRide.id.slice(-6).toUpperCase()}
                                </p>
                            </div>
                            <button
                                onClick={() => setAssignModalRide(null)}
                                className="p-2 text-gray-400 hover:text-white rounded-full transition-colors"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-xs text-blue-900 space-y-1">
                                <p className="font-bold">Scheduled Pickup Time:</p>
                                <p>{new Date(assignModalRide.scheduledFor).toLocaleString()}</p>
                                <p className="font-bold pt-1">From:</p>
                                <p className="truncate">{assignModalRide.originAddress}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-gray-600 mb-2">
                                    Select Driver
                                </label>
                                <select
                                    value={selectedDriverId}
                                    onChange={(e) => setSelectedDriverId(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Choose a driver --</option>
                                    {drivers.map((d) => (
                                        <option key={d.id} value={d.driverProfileId || d.id}>
                                            {d.name} ({d.phone}) • {d.vehicle} [{d.status}]
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setAssignModalRide(null)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={!selectedDriverId || isAssigning}
                                    onClick={handleConfirmAssignDriver}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    {isAssigning ? "Assigning..." : "Confirm Driver Assignment"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
