"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    UserCheck,
    Clock,
    CheckCircle2,
    XCircle,
    Search,
    RefreshCw,
    Car,
    Bike,
    Shield,
    Phone,
    Mail,
    Calendar,
    FileText,
    AlertTriangle,
    Eye,
    ThumbsUp,
    ThumbsDown,
    ChevronRight,
    X,
    Filter,
    Check,
    Sparkles,
    Radio,
    BadgeAlert,
    User
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DriverApplication {
    id: string;
    driverProfileId: string | null;
    name: string;
    email: string;
    phone: string;
    registrationDate: string;
    approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
    rejectionReason: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
    vehicleType: string;
    vehicleModel: string;
    vehicleColor: string;
    licensePlate: string;
    driverLicense: string;
    isOnline: boolean;
    rating: number;
    reviewCount: number;
    country: string;
}

interface ApplicationStats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
}

const REJECTION_PRESETS = [
    "Driver's license document is unreadable or expired",
    "Vehicle model or year does not meet company safety guidelines",
    "Vehicle license plate number could not be verified",
    "Incomplete identity verification / missing contact details",
    "Duplicate driver account detected"
];

export default function DriverSignupsAdminPage() {
    const router = useRouter();
    const [applications, setApplications] = useState<DriverApplication[]>([]);
    const [stats, setStats] = useState<ApplicationStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTab, setSelectedTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

    // Modal states
    const [selectedApp, setSelectedApp] = useState<DriverApplication | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [appToReject, setAppToReject] = useState<DriverApplication | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

    const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const fetchApplications = useCallback(async (isSilent = false) => {
        if (!isSilent) setRefreshing(true);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/login");
                return;
            }

            const res = await fetch(`/api/admin/driver-signups?_t=${Date.now()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401) {
                router.push("/login");
                return;
            }

            if (!res.ok) {
                throw new Error("Failed to load driver applications");
            }

            const data = await res.json();
            if (Array.isArray(data.applications)) {
                setApplications(data.applications);
                if (data.stats) setStats(data.stats);
            }
        } catch (error: any) {
            console.error("Fetch error:", error);
            if (!isSilent) showToast(error.message || "Could not fetch driver applications", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [router, showToast]);

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (!userStr) {
            router.push("/login");
            return;
        }
        try {
            const parsed = JSON.parse(userStr);
            if (parsed.role !== "ADMIN" && parsed.role !== "SUPER_ADMIN") {
                router.push("/admin");
                return;
            }
        } catch {
            router.push("/login");
            return;
        }

        fetchApplications();

        // Setup real-time SSE listener for new driver signups and status updates
        let eventSource: EventSource | null = null;
        try {
            eventSource = new EventSource("/api/rides/stream");
            eventSource.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    if (parsed.type === "NEW_DRIVER_SIGNUP") {
                        showToast(`New Driver Application received: ${parsed.data?.name || "Driver"}`, "info");
                        fetchApplications(true);
                    } else if (parsed.type === "DRIVER_APPROVAL_UPDATED") {
                        fetchApplications(true);
                    }
                } catch {}
            };
        } catch {}

        const interval = setInterval(() => fetchApplications(true), 20000);

        return () => {
            clearInterval(interval);
            if (eventSource) eventSource.close();
        };
    }, [fetchApplications, router, showToast]);

    // Handle Approve Action
    const handleApprove = async (app: DriverApplication) => {
        setActionLoadingId(app.id);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/admin/driver-signups", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    driverProfileId: app.driverProfileId,
                    userId: app.id,
                    action: "APPROVE",
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Approval failed");

            showToast(`Approved ${app.name}! Driver is now authorized to go online.`, "success");
            
            // Update local state immediately for instant feedback
            setApplications(prev => prev.map(item => 
                item.id === app.id 
                    ? { ...item, approvalStatus: "APPROVED", rejectionReason: null, reviewedAt: new Date().toISOString() } 
                    : item
            ));
            setStats(prev => ({
                ...prev,
                pending: Math.max(0, prev.pending - (app.approvalStatus === "PENDING" ? 1 : 0)),
                approved: prev.approved + (app.approvalStatus !== "APPROVED" ? 1 : 0),
                rejected: Math.max(0, prev.rejected - (app.approvalStatus === "REJECTED" ? 1 : 0)),
            }));

            if (selectedApp && selectedApp.id === app.id) {
                setSelectedApp(prev => prev ? { ...prev, approvalStatus: "APPROVED", rejectionReason: null } : null);
            }
        } catch (error: any) {
            showToast(error.message || "Failed to approve driver", "error");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Open Reject Modal
    const openRejectModal = (app: DriverApplication) => {
        setAppToReject(app);
        setRejectionReason("");
        setIsRejectModalOpen(true);
    };

    // Handle Reject Action
    const handleRejectSubmit = async () => {
        if (!appToReject) return;
        setActionLoadingId(appToReject.id);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/admin/driver-signups", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    driverProfileId: appToReject.driverProfileId,
                    userId: appToReject.id,
                    action: "REJECT",
                    reason: rejectionReason || "Application requirements not met",
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Rejection failed");

            showToast(`Application for ${appToReject.name} marked as Rejected.`, "info");
            
            // Update local state immediately
            setApplications(prev => prev.map(item => 
                item.id === appToReject.id 
                    ? { ...item, approvalStatus: "REJECTED", rejectionReason: rejectionReason || "Application requirements not met", reviewedAt: new Date().toISOString() } 
                    : item
            ));
            setStats(prev => ({
                ...prev,
                pending: Math.max(0, prev.pending - (appToReject.approvalStatus === "PENDING" ? 1 : 0)),
                rejected: prev.rejected + (appToReject.approvalStatus !== "REJECTED" ? 1 : 0),
                approved: Math.max(0, prev.approved - (appToReject.approvalStatus === "APPROVED" ? 1 : 0)),
            }));

            if (selectedApp && selectedApp.id === appToReject.id) {
                setSelectedApp(prev => prev ? { ...prev, approvalStatus: "REJECTED", rejectionReason: rejectionReason || "Application requirements not met" } : null);
            }

            setIsRejectModalOpen(false);
            setAppToReject(null);
        } catch (error: any) {
            showToast(error.message || "Failed to reject application", "error");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Filtered application list
    const filteredApplications = useMemo(() => {
        return applications.filter(app => {
            const matchesTab = selectedTab === "ALL" || app.approvalStatus === selectedTab;
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q || (
                app.name.toLowerCase().includes(q) ||
                app.email.toLowerCase().includes(q) ||
                app.phone.toLowerCase().includes(q) ||
                app.licensePlate.toLowerCase().includes(q) ||
                app.driverLicense.toLowerCase().includes(q) ||
                app.vehicleModel.toLowerCase().includes(q)
            );
            return matchesTab && matchesSearch;
        });
    }, [applications, selectedTab, searchQuery]);

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300 pb-16">
            {/* Toast Notification */}
            {toast && (
                <div className={cn(
                    "fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-bold backdrop-blur-md transition-all animate-in slide-in-from-top-3",
                    toast.type === "success" && "bg-emerald-950/90 text-emerald-200 border-emerald-500/30",
                    toast.type === "error" && "bg-rose-950/90 text-rose-200 border-rose-500/30",
                    toast.type === "info" && "bg-amber-950/90 text-amber-200 border-amber-500/30",
                )}>
                    {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    {toast.type === "error" && <XCircle className="w-5 h-5 text-rose-400" />}
                    {toast.type === "info" && <Sparkles className="w-5 h-5 text-amber-400" />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-black via-[#0d1614] to-[#042a22] p-8 md:p-10 border border-white/10 shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-amber-400 text-xs font-black uppercase tracking-wider mb-3 border border-white/10 backdrop-blur-sm">
                            <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                            Live Driver Ingestion & Review Portal
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                            Driver Sign-up Management
                        </h1>
                        <p className="text-sm md:text-base text-gray-300 font-medium mt-2 max-w-2xl">
                            Central administrative approval desk. Review new driver registrations, verify vehicle credentials, and authorize accounts for ride-hailing services.
                        </p>
                    </div>

                    <button
                        onClick={() => fetchApplications()}
                        disabled={refreshing}
                        className="self-start md:self-auto inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black text-xs uppercase tracking-widest border border-white/15 transition-all shadow-lg backdrop-blur-md cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                        {refreshing ? "Refreshing..." : "Sync Applications"}
                    </button>
                </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Applications */}
                <div className="bg-black/90 p-6 rounded-[2rem] border border-white/10 shadow-xl relative overflow-hidden group hover:border-white/25 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-black uppercase tracking-wider text-gray-400">Total Applicants</span>
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                            <UserCheck className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-4xl font-black text-white tracking-tight">{stats.total}</div>
                    <div className="text-[11px] font-bold text-gray-500 mt-2">All registered driver accounts</div>
                </div>

                {/* Pending Review */}
                <div 
                    onClick={() => setSelectedTab("PENDING")}
                    className={cn(
                        "bg-[#1c1404] p-6 rounded-[2rem] border shadow-xl relative overflow-hidden group transition-all cursor-pointer",
                        selectedTab === "PENDING" ? "border-amber-500 ring-2 ring-amber-500/30" : "border-amber-500/30 hover:border-amber-500/60"
                    )}
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            Pending Review
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-4xl font-black text-amber-400 tracking-tight">{stats.pending}</div>
                    <div className="text-[11px] font-bold text-amber-200/70 mt-2">Requires administrator action</div>
                </div>

                {/* Approved */}
                <div 
                    onClick={() => setSelectedTab("APPROVED")}
                    className={cn(
                        "bg-[#041a14] p-6 rounded-[2rem] border shadow-xl relative overflow-hidden group transition-all cursor-pointer",
                        selectedTab === "APPROVED" ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-emerald-500/30 hover:border-emerald-500/60"
                    )}
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-300">Approved Drivers</span>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-4xl font-black text-emerald-400 tracking-tight">{stats.approved}</div>
                    <div className="text-[11px] font-bold text-emerald-200/70 mt-2">Authorized for dispatch & rides</div>
                </div>

                {/* Rejected */}
                <div 
                    onClick={() => setSelectedTab("REJECTED")}
                    className={cn(
                        "bg-[#1c0808] p-6 rounded-[2rem] border shadow-xl relative overflow-hidden group transition-all cursor-pointer",
                        selectedTab === "REJECTED" ? "border-rose-500 ring-2 ring-rose-500/30" : "border-rose-500/30 hover:border-rose-500/60"
                    )}
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-black uppercase tracking-wider text-rose-300">Rejected</span>
                        <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                            <XCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-4xl font-black text-rose-400 tracking-tight">{stats.rejected}</div>
                    <div className="text-[11px] font-bold text-rose-200/70 mt-2">Restricted from driver services</div>
                </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="bg-white rounded-[2rem] p-4 sm:p-6 border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Status Tabs */}
                    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-gray-100 rounded-2xl">
                        {[
                            { key: "ALL", label: "All Applicants", count: stats.total },
                            { key: "PENDING", label: "Pending Review", count: stats.pending, highlight: true },
                            { key: "APPROVED", label: "Approved", count: stats.approved },
                            { key: "REJECTED", label: "Rejected", count: stats.rejected },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setSelectedTab(tab.key as any)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer",
                                    selectedTab === tab.key
                                        ? "bg-black text-white shadow-md"
                                        : "text-gray-600 hover:text-black hover:bg-white/60"
                                )}
                            >
                                <span>{tab.label}</span>
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[10px] font-black",
                                    selectedTab === tab.key ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700",
                                    tab.highlight && tab.count > 0 && selectedTab !== tab.key && "bg-amber-400 text-black"
                                )}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1 md:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name, phone, email, plate, license..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Applications List / Table */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-16 text-center space-y-4">
                        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm font-black text-gray-600 uppercase tracking-widest">Loading Driver Applications...</p>
                    </div>
                ) : filteredApplications.length === 0 ? (
                    <div className="p-16 text-center space-y-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto text-gray-400">
                            <UserCheck className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900">No Applications Found</h3>
                        <p className="text-xs font-bold text-gray-500 max-w-sm mx-auto">
                            {searchQuery 
                                ? "No driver sign-up applications match your current search query." 
                                : `There are currently no driver applications under the "${selectedTab.toLowerCase()}" category.`}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/70 text-[10px] font-black uppercase tracking-wider text-gray-500">
                                    <th className="py-4 px-6">Driver Info</th>
                                    <th className="py-4 px-6">Contact</th>
                                    <th className="py-4 px-6">Vehicle & License</th>
                                    <th className="py-4 px-6">Submitted At</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                                {filteredApplications.map((app) => {
                                    const isPending = app.approvalStatus === "PENDING";
                                    const isApproved = app.approvalStatus === "APPROVED";
                                    const isRejected = app.approvalStatus === "REJECTED";
                                    const isActing = actionLoadingId === app.id;

                                    return (
                                        <tr 
                                            key={app.id}
                                            className="hover:bg-gray-50/80 transition-colors group cursor-default"
                                        >
                                            {/* Driver Info */}
                                            <td className="py-5 px-6">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center font-black text-sm shadow-md flex-shrink-0">
                                                        {app.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-gray-900 text-sm">{app.name}</div>
                                                        <div className="text-[11px] font-bold text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <span>ID: {app.id.slice(-6).toUpperCase()}</span>
                                                            <span>•</span>
                                                            <span>{app.country}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Contact */}
                                            <td className="py-5 px-6">
                                                <div className="space-y-1">
                                                    <a 
                                                        href={`tel:${app.phone}`} 
                                                        className="font-bold text-gray-800 hover:text-black flex items-center gap-1.5 group-hover:underline"
                                                    >
                                                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                        {app.phone}
                                                    </a>
                                                    <a 
                                                        href={`mailto:${app.email}`} 
                                                        className="text-[11px] font-medium text-gray-500 hover:text-black flex items-center gap-1.5"
                                                    >
                                                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                        {app.email}
                                                    </a>
                                                </div>
                                            </td>

                                            {/* Vehicle & License */}
                                            <td className="py-5 px-6">
                                                <div className="space-y-1">
                                                    <div className="font-black text-gray-900 flex items-center gap-1.5">
                                                        {app.vehicleType?.toLowerCase().includes("bike") ? (
                                                            <Bike className="w-4 h-4 text-emerald-600" />
                                                        ) : (
                                                            <Car className="w-4 h-4 text-blue-600" />
                                                        )}
                                                        <span>{app.vehicleColor} {app.vehicleModel}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                                        <span className="px-2 py-0.5 rounded bg-gray-100 font-mono text-gray-800">
                                                            {app.licensePlate}
                                                        </span>
                                                        <span>•</span>
                                                        <span>DL: {app.driverLicense}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Submitted At */}
                                            <td className="py-5 px-6">
                                                <div className="text-xs font-bold text-gray-700">
                                                    {formatDate(app.registrationDate)}
                                                </div>
                                                {app.reviewedAt && (
                                                    <div className="text-[10px] font-medium text-gray-400 mt-0.5">
                                                        Reviewed: {formatDate(app.reviewedAt)}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-5 px-6">
                                                {isPending && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300/60 shadow-sm animate-pulse">
                                                        <Clock className="w-3 h-3 text-amber-600" />
                                                        Pending Review
                                                    </span>
                                                )}
                                                {isApproved && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300/60 shadow-sm">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                        Approved & Active
                                                    </span>
                                                )}
                                                {isRejected && (
                                                    <div className="space-y-1">
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300/60 shadow-sm">
                                                            <XCircle className="w-3 h-3 text-rose-600" />
                                                            Rejected
                                                        </span>
                                                        {app.rejectionReason && (
                                                            <p className="text-[10px] font-bold text-rose-600 max-w-xs line-clamp-1" title={app.rejectionReason}>
                                                                {app.rejectionReason}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-5 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* View Details Button */}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedApp(app);
                                                            setIsDetailModalOpen(true);
                                                        }}
                                                        className="p-2 rounded-xl text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
                                                        title="Review Application Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>

                                                    {/* Approve Button */}
                                                    {!isApproved && (
                                                        <button
                                                            onClick={() => handleApprove(app)}
                                                            disabled={isActing}
                                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                                                            title="Approve driver registration"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            <span>Approve</span>
                                                        </button>
                                                    )}

                                                    {/* Reject Button */}
                                                    {!isRejected && (
                                                        <button
                                                            onClick={() => openRejectModal(app)}
                                                            disabled={isActing}
                                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                                                            title="Reject driver application"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                            <span>Reject</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Application Detail Review Modal */}
            {isDetailModalOpen && selectedApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="bg-black text-white p-6 md:p-8 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white font-black text-xl border border-white/20">
                                    {selectedApp.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-black">{selectedApp.name}</h2>
                                        <span className={cn(
                                            "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase",
                                            selectedApp.approvalStatus === "PENDING" && "bg-amber-400 text-black",
                                            selectedApp.approvalStatus === "APPROVED" && "bg-emerald-400 text-black",
                                            selectedApp.approvalStatus === "REJECTED" && "bg-rose-500 text-white"
                                        )}>
                                            {selectedApp.approvalStatus}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Application ID: {selectedApp.id}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                            {/* Contact Section */}
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">Contact Information</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <span className="text-[10px] font-bold text-gray-400 block uppercase">Phone Number</span>
                                        <a href={`tel:${selectedApp.phone}`} className="font-black text-gray-900 text-sm hover:underline flex items-center gap-2 mt-1">
                                            <Phone className="w-4 h-4 text-emerald-600" />
                                            {selectedApp.phone}
                                        </a>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <span className="text-[10px] font-bold text-gray-400 block uppercase">Email Address</span>
                                        <a href={`mailto:${selectedApp.email}`} className="font-black text-gray-900 text-sm hover:underline flex items-center gap-2 mt-1 truncate">
                                            <Mail className="w-4 h-4 text-blue-600" />
                                            {selectedApp.email}
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle & Credentials */}
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">Vehicle & Driver Credentials</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <span className="text-[10px] font-bold text-gray-400 block uppercase">Vehicle Make / Model</span>
                                        <div className="font-black text-gray-900 text-sm mt-1">{selectedApp.vehicleColor} {selectedApp.vehicleModel}</div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase mt-0.5 block">{selectedApp.vehicleType}</span>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <span className="text-[10px] font-bold text-gray-400 block uppercase">License Plate</span>
                                        <div className="font-mono font-black text-gray-900 text-sm mt-1">{selectedApp.licensePlate}</div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <span className="text-[10px] font-bold text-gray-400 block uppercase">Driver's License #</span>
                                        <div className="font-mono font-black text-gray-900 text-sm mt-1">{selectedApp.driverLicense}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Application Status & Timeline */}
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">Audit Trail & Timeline</h4>
                                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2.5 text-xs font-medium text-gray-700">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">Submitted Registration:</span>
                                        <span className="font-bold text-gray-900">{formatDate(selectedApp.registrationDate)}</span>
                                    </div>
                                    {selectedApp.reviewedAt && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Reviewed On:</span>
                                            <span className="font-bold text-gray-900">{formatDate(selectedApp.reviewedAt)}</span>
                                        </div>
                                    )}
                                    {selectedApp.reviewedBy && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Reviewed By:</span>
                                            <span className="font-bold text-gray-900">{selectedApp.reviewedBy}</span>
                                        </div>
                                    )}
                                    {selectedApp.rejectionReason && (
                                        <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                                            <span className="font-bold block text-[11px] uppercase tracking-wider">Rejection Reason:</span>
                                            <span className="text-xs font-medium mt-0.5 block">{selectedApp.rejectionReason}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="px-6 py-3 rounded-2xl bg-gray-200 hover:bg-gray-300 font-black text-xs uppercase tracking-wider text-gray-700 transition-colors cursor-pointer"
                            >
                                Close
                            </button>

                            <div className="flex items-center gap-3">
                                {selectedApp.approvalStatus !== "REJECTED" && (
                                    <button
                                        onClick={() => {
                                            setIsDetailModalOpen(false);
                                            openRejectModal(selectedApp);
                                        }}
                                        className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                                    >
                                        Reject Application
                                    </button>
                                )}

                                {selectedApp.approvalStatus !== "APPROVED" && (
                                    <button
                                        onClick={async () => {
                                            await handleApprove(selectedApp);
                                            setIsDetailModalOpen(false);
                                        }}
                                        className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        Approve & Activate Driver
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Reason Modal */}
            {isRejectModalOpen && appToReject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-rose-950 text-rose-200 p-6 md:p-8 flex items-center justify-between border-b border-rose-800/40">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-rose-900/60 text-rose-300 flex items-center justify-center border border-rose-700/50">
                                    <XCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white">Reject Application</h3>
                                    <p className="text-xs text-rose-300">Driver: {appToReject.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsRejectModalOpen(false)}
                                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 md:p-8 space-y-5">
                            <p className="text-xs font-bold text-gray-600">
                                Please specify the reason for rejecting this driver's application. The driver will see this reason on their portal.
                            </p>

                            {/* Quick Presets */}
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Quick Presets:</span>
                                <div className="space-y-1.5">
                                    {REJECTION_PRESETS.map((preset, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setRejectionReason(preset)}
                                            className={cn(
                                                "w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition-all border cursor-pointer",
                                                rejectionReason === preset 
                                                    ? "bg-rose-50 border-rose-400 text-rose-900 font-bold" 
                                                    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                                            )}
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Reason Textarea */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">
                                    Custom Reason or Details:
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Enter additional details or instructions for the driver..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsRejectModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-xs font-black uppercase tracking-wider text-gray-700 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectSubmit}
                                disabled={actionLoadingId === appToReject.id}
                                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
