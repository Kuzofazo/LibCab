"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
    Building2,
    Car,
    Radio,
    Search,
    Plus,
    RefreshCcw,
    Shield,
    ExternalLink,
    Copy,
    Check,
    Phone,
    Mail,
    MapPin,
    Cpu,
    Activity,
    SlidersHorizontal,
    CheckCircle2,
    AlertCircle,
    Signal,
    Lock,
    Zap,
    X,
    FileText
} from "lucide-react";
import Link from "next/link";
import CorporateInvoiceModal from "@/components/admin/CorporateInvoiceModal";

interface TrackerDevice {
    id: string;
    imei: string;
    model: string;
    protocol: string;
    status: string;
    lastPing: string;
}

interface Company {
    id: string;
    name: string;
    code: string;
    category: string;
    email?: string;
    phone?: string;
    contactPerson?: string;
    address?: string;
    plan: string;
    apiKey?: string;
    status: string;
    createdAt: string;
    stats: {
        totalVehicles: number;
        inTransit: number;
        active: number;
        idle: number;
        maintenance: number;
        immobilized: number;
        totalTrackers: number;
        onlineTrackers: number;
        totalGeofences: number;
        totalMembers: number;
    };
    vehicles: unknown[];
    trackerDevices: TrackerDevice[];
}

export default function AdminCompanyManagementPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

    // Modals
    const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
    const [isProvisionTrackerOpen, setIsProvisionTrackerOpen] = useState(false);
    const [selectedInvoiceCompany, setSelectedInvoiceCompany] = useState<{ id: string; name: string } | null>(null);

    // Form States
    const [companyForm, setCompanyForm] = useState({
        name: "",
        code: "",
        category: "LOGISTICS",
        email: "",
        phone: "",
        contactPerson: "",
        address: "",
        plan: "ENTERPRISE",
        initialGeofence: true
    });

    const [trackerForm, setTrackerForm] = useState({
        imei: "",
        model: "Teltonika FMC130 (4G Heavy)",
        protocol: "TELTONIKA",
        companyId: "",
        vehicleName: "",
        licensePlate: "",
        vehicleType: "CAR",
        simCardNumber: "",
        serialNumber: ""
    });

    const [submitting, setSubmitting] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Use a ref so the loadCompanies callback doesn't get recreated every time the
    // user types in the tracker form (which was restarting the 10 s interval on each
    // keystroke and causing a fetch storm).
    const trackerCompanyIdRef = React.useRef(trackerForm.companyId);
    React.useEffect(() => { trackerCompanyIdRef.current = trackerForm.companyId; }, [trackerForm.companyId]);

    const loadCompanies = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (selectedCategory !== "ALL") params.set("category", selectedCategory);
            if (searchQuery) params.set("q", searchQuery);

            const res = await fetch(`/api/companies?${params.toString()}`);
            const data = await res.json();
            if (data.companies) {
                setCompanies(data.companies);
                // Read companyId from ref — avoids adding it to the dep array
                if (data.companies.length > 0 && !trackerCompanyIdRef.current) {
                    setTrackerForm(prev => ({ ...prev, companyId: data.companies[0].id }));
                }
            }
        } catch (e) {
            console.error("Failed to fetch companies:", e);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory, searchQuery]); // trackerForm.companyId removed — now a ref

    useEffect(() => {
        loadCompanies();
        const interval = setInterval(loadCompanies, 30000); // 30 s — companies don't change in real-time
        return () => clearInterval(interval);
    }, [loadCompanies]);

    const handleCopyKey = (key: string, id: string) => {
        if (!key) return;
        navigator.clipboard.writeText(key);
        setCopiedKeyId(id);
        setTimeout(() => setCopiedKeyId(null), 2500);
    };

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setActionMessage(null);
        try {
            const res = await fetch("/api/companies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(companyForm)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create company");

            setActionMessage({ type: "success", text: `Company "${data.name}" onboarded successfully with API access!` });
            setIsAddCompanyOpen(false);
            setCompanyForm({
                name: "",
                code: "",
                category: "LOGISTICS",
                email: "",
                phone: "",
                contactPerson: "",
                address: "",
                plan: "ENTERPRISE",
                initialGeofence: true
            });
            loadCompanies();
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : "Failed to create company";
            setActionMessage({ type: "error", text: errorMsg });
        } finally {
            setSubmitting(false);
        }
    };

    const getHeaders = () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        return {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
        };
    };

    const handleProvisionTracker = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setActionMessage(null);
        try {
            // If vehicle name provided, create vehicle first then bind tracker
            let vehicleId = null;
            if (trackerForm.vehicleName && trackerForm.companyId) {
                const vRes = await fetch("/api/fleet/vehicles", {
                    method: "POST",
                    headers: getHeaders(),
                    body: JSON.stringify({
                        companyId: trackerForm.companyId,
                        name: trackerForm.vehicleName,
                        licensePlate: trackerForm.licensePlate,
                        vehicleType: trackerForm.vehicleType,
                        currentLat: 6.3156,
                        currentLng: -10.8074
                    })
                });
                const vData = await vRes.json();
                if (vData.id) vehicleId = vData.id;
            }

            const res = await fetch("/api/fleet/trackers", {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({
                    imei: trackerForm.imei,
                    model: trackerForm.model,
                    protocol: trackerForm.protocol,
                    companyId: trackerForm.companyId || null,
                    vehicleId: vehicleId || null,
                    simCardNumber: trackerForm.simCardNumber || null,
                    serialNumber: trackerForm.serialNumber || null
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to provision hardware tracker");

            setActionMessage({ type: "success", text: `Hardware Tracker IMEI ${data.imei} provisioned and online!` });
            setIsProvisionTrackerOpen(false);
            setTrackerForm({
                imei: "",
                model: "Teltonika FMC130 (4G Heavy)",
                protocol: "TELTONIKA",
                companyId: companies[0]?.id || "",
                vehicleName: "",
                licensePlate: "",
                vehicleType: "CAR",
                simCardNumber: "",
                serialNumber: ""
            });
            loadCompanies();
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : "Failed to provision hardware tracker";
            setActionMessage({ type: "error", text: errorMsg });
        } finally {
            setSubmitting(false);
        }
    };

    // Aggregate Stats
    const totalCompanies = companies.length;
    const totalFleetVehicles = companies.reduce((acc, c) => acc + (c.stats?.totalVehicles || 0), 0);
    const totalTrackers = companies.reduce((acc, c) => acc + (c.stats?.totalTrackers || 0), 0);
    const totalActiveTransits = companies.reduce((acc, c) => acc + (c.stats?.inTransit || 0), 0);

    const getCategoryBadge = (cat: string) => {
        switch (cat) {
            case "MINING": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
            case "NGO": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
            case "LOGISTICS": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
            case "CORPORATE": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
            case "GOVERNMENT": return "bg-red-500/10 text-red-600 border-red-500/20";
            default: return "bg-slate-500/10 text-slate-600 border-slate-500/20";
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-200">
            {/* Top Operational Status Banner */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <h2 className="text-xl font-black text-[#0F2F2F] tracking-tight">Enterprise Company & Fleet Provisioning</h2>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        Multi-tenant company management, IoT GPS hardware registration & telematics access control.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsProvisionTrackerOpen(true)}
                        className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs flex items-center gap-2 hover:bg-black transition-all shadow-md active:scale-95"
                    >
                        <Cpu size={16} className="text-blue-400" />
                        Provision IoT Tracker
                    </button>
                    <button
                        onClick={() => setIsAddCompanyOpen(true)}
                        className="px-5 py-3 rounded-2xl bg-[#0F2F2F] text-white font-bold text-xs flex items-center gap-2 hover:bg-[#1a4a4a] transition-all shadow-md active:scale-95"
                    >
                        <Plus size={16} className="text-emerald-400" />
                        Onboard Company
                    </button>
                </div>
            </div>

            {/* Notification alert if any */}
            {actionMessage && (
                <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold ${
                    actionMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                    <div className="flex items-center gap-2">
                        {actionMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{actionMessage.text}</span>
                    </div>
                    <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-700">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrolled Companies</p>
                            <h3 className="text-3xl font-black text-[#0F2F2F] mt-2">{totalCompanies}</h3>
                            <p className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Multi-Tenant Active
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                            <Building2 size={22} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Monitored Vehicles</p>
                            <h3 className="text-3xl font-black text-[#0F2F2F] mt-2">{totalFleetVehicles}</h3>
                            <p className="text-[11px] font-bold text-blue-600 mt-1 flex items-center gap-1">
                                <Activity size={12} /> {totalActiveTransits} In Transit Now
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
                            <Car size={22} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hardware Trackers</p>
                            <h3 className="text-3xl font-black text-[#0F2F2F] mt-2">{totalTrackers}</h3>
                            <p className="text-[11px] font-bold text-purple-600 mt-1 flex items-center gap-1">
                                <Cpu size={12} /> Teltonika & Jimi Dual-Cam
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold">
                            <Radio size={22} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Telemetry Gateway</p>
                            <h3 className="text-3xl font-black text-emerald-600 mt-2">100%</h3>
                            <p className="text-[11px] font-bold text-slate-500 mt-1 flex items-center gap-1">
                                <Signal size={12} className="text-emerald-500" /> TCP/MQTT Socket Live
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold">
                            <Zap size={22} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-5 rounded-[2rem] border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search company name, code, contact or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2F2F]/20 border border-slate-200/60 transition-all"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                        <SlidersHorizontal size={12} /> Category:
                    </span>
                    {["ALL", "LOGISTICS", "MINING", "NGO", "CORPORATE", "GOVERNMENT"].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-xl text-[11px] font-bold tracking-wide transition-all whitespace-nowrap ${
                                selectedCategory === cat
                                    ? "bg-[#0F2F2F] text-white shadow-md"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                    <button
                        onClick={loadCompanies}
                        className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                        title="Refresh list"
                    >
                        <RefreshCcw size={16} />
                    </button>
                </div>
            </div>

            {/* Companies Grid */}
            {loading ? (
                <div className="py-20 text-center">
                    <RefreshCcw className="animate-spin text-slate-400 mx-auto mb-3" size={32} />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Company Fleets...</p>
                </div>
            ) : companies.length === 0 ? (
                <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200/80 text-center">
                    <Building2 className="mx-auto text-slate-300 mb-3" size={48} />
                    <h4 className="text-lg font-black text-slate-700">No Companies Found</h4>
                    <p className="text-xs text-slate-400 font-semibold mt-1 max-w-sm mx-auto">
                        No enterprise tenants match your query. Click &quot;Onboard Company&quot; to register a new fleet owner.
                    </p>
                    <button
                        onClick={() => setIsAddCompanyOpen(true)}
                        className="mt-5 px-6 py-3 rounded-2xl bg-[#0F2F2F] text-white font-bold text-xs inline-flex items-center gap-2 hover:bg-[#1a4a4a]"
                    >
                        <Plus size={16} /> Onboard First Company
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {companies.map((company) => (
                        <div
                            key={company.id}
                            className="bg-white rounded-[2.5rem] p-7 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                            <div>
                                {/* Card Header */}
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${getCategoryBadge(company.category)}`}>
                                                {company.category}
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200">
                                                {company.code}
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                {company.plan}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-black text-[#0F2F2F] mt-2 tracking-tight">
                                            {company.name}
                                        </h3>
                                    </div>
                                    <Link
                                        href={`/fleet?orgId=${company.id}`}
                                        className="p-3 rounded-2xl bg-slate-100 text-slate-700 hover:bg-[#0F2F2F] hover:text-white transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold whitespace-nowrap"
                                        title="Open Live Fleet Monitor"
                                    >
                                        <span>Live Map</span>
                                        <ExternalLink size={14} />
                                    </Link>
                                </div>

                                {/* Fleet Telemetry Health Summary */}
                                <div className="grid grid-cols-4 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-5">
                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vehicles</p>
                                        <p className="text-base font-black text-[#0F2F2F] mt-0.5">{company.stats?.totalVehicles || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">In Transit</p>
                                        <p className="text-base font-black text-blue-600 mt-0.5">{company.stats?.inTransit || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trackers</p>
                                        <p className="text-base font-black text-purple-600 mt-0.5">{company.stats?.totalTrackers || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Geofences</p>
                                        <p className="text-base font-black text-emerald-600 mt-0.5">{company.stats?.totalGeofences || 1}</p>
                                    </div>
                                </div>

                                {/* Contact & Provisioning Info */}
                                <div className="space-y-2 text-xs text-slate-600 mb-5">
                                    {company.contactPerson && (
                                        <div className="flex items-center gap-2 font-bold text-slate-700">
                                            <Shield size={14} className="text-slate-400 shrink-0" />
                                            <span>Contact: {company.contactPerson}</span>
                                        </div>
                                    )}
                                    {company.email && (
                                        <div className="flex items-center gap-2 font-semibold">
                                            <Mail size={14} className="text-slate-400 shrink-0" />
                                            <span>{company.email}</span>
                                        </div>
                                    )}
                                    {company.phone && (
                                        <div className="flex items-center gap-2 font-semibold">
                                            <Phone size={14} className="text-slate-400 shrink-0" />
                                            <span>{company.phone}</span>
                                        </div>
                                    )}
                                    {company.address && (
                                        <div className="flex items-center gap-2 font-semibold text-slate-500">
                                            <MapPin size={14} className="text-slate-400 shrink-0" />
                                            <span>{company.address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card Footer: API Key & Quick Actions */}
                            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="bg-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-2 text-[10px] font-mono text-slate-600 border border-slate-200/60 max-w-[220px] truncate">
                                        <Lock size={10} className="text-slate-400" />
                                        <span className="truncate">{company.apiKey || "flt_live_key..."}</span>
                                    </div>
                                    <button
                                        onClick={() => handleCopyKey(company.apiKey || "", company.id)}
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                        title="Copy Telematics Ingestion Key"
                                    >
                                        {copiedKeyId === company.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    <button
                                        onClick={() => setSelectedInvoiceCompany({ id: company.id, name: company.name })}
                                        className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                        title="Generate Monthly Corporate Invoice"
                                    >
                                        <FileText size={14} className="text-red-600" />
                                        <span>Invoice</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTrackerForm(prev => ({ ...prev, companyId: company.id }));
                                            setIsProvisionTrackerOpen(true);
                                        }}
                                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                    >
                                        <Cpu size={14} className="text-blue-400" />
                                        <span>Add Tracker</span>
                                    </button>
                                    <Link
                                        href={`/admin/fleet?orgId=${company.id}`}
                                        className="px-3.5 py-2 rounded-xl bg-[#0F2F2F] hover:bg-[#1a4a4a] text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                    >
                                        <span>Manage Fleet</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal: Onboard New Company */}
            {isAddCompanyOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-[#0F2F2F] tracking-tight">Onboard Company / Tenant</h3>
                                <p className="text-xs font-semibold text-slate-500 mt-1">Enroll an enterprise client with independent fleet dashboard access.</p>
                            </div>
                            <button
                                onClick={() => setIsAddCompanyOpen(false)}
                                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCompany} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">Company Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. ArcelorMittal Liberia"
                                        value={companyForm.name}
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            const autoCode = name.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 15);
                                            setCompanyForm(prev => ({ ...prev, name, code: prev.code || autoCode }));
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F2F2F]/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">Company Code / Slug *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. AML-MINING-OPS"
                                        value={companyForm.code}
                                        onChange={(e) => setCompanyForm({ ...companyForm, code: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-[#0F2F2F]/20"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">Industry Category</label>
                                    <select
                                        value={companyForm.category}
                                        onChange={(e) => setCompanyForm({ ...companyForm, category: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F2F2F]/20"
                                    >
                                        <option value="LOGISTICS">Logistics & Supply Chain</option>
                                        <option value="MINING">Mining & Heavy Industry</option>
                                        <option value="NGO">NGO / International Mission</option>
                                        <option value="CORPORATE">Corporate Enterprise</option>
                                        <option value="GOVERNMENT">Government & Municipal</option>
                                        <option value="HOTEL">Hotel & Hospitality Fleet</option>
                                        <option value="COOPERATIVE">Taxi Cooperative</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">Subscription Tier</label>
                                    <select
                                        value={companyForm.plan}
                                        onChange={(e) => setCompanyForm({ ...companyForm, plan: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F2F2F]/20"
                                    >
                                        <option value="ENTERPRISE">Enterprise (Unlimited IoT Trackers & Telematics)</option>
                                        <option value="PRO">Professional (Up to 50 Vehicles)</option>
                                        <option value="STARTER">Starter (Up to 10 Vehicles)</option>
                                        <option value="GOVERNMENT">Government Custom SLA</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">Contact Person</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Kolu Kpadeh (Fleet Manager)"
                                        value={companyForm.contactPerson}
                                        onChange={(e) => setCompanyForm({ ...companyForm, contactPerson: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F2F2F]/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">Company Phone</label>
                                    <input
                                        type="text"
                                        placeholder="+231 77 000 8822"
                                        value={companyForm.phone}
                                        onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F2F2F]/20"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">Official Email</label>
                                <input
                                    type="email"
                                    placeholder="fleet@company.com"
                                    value={companyForm.email}
                                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F2F2F]/20"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">Headquarters / Operational Base Address</label>
                                <input
                                    type="text"
                                    placeholder="Tubman Boulevard, Congo Town, Monrovia"
                                    value={companyForm.address}
                                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F2F2F]/20"
                                />
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={companyForm.initialGeofence}
                                        onChange={(e) => setCompanyForm({ ...companyForm, initialGeofence: e.target.checked })}
                                        className="rounded border-slate-300 text-[#0F2F2F] focus:ring-[#0F2F2F]"
                                    />
                                    <span className="text-xs font-bold text-slate-700">Auto-create Greater Monrovia Operations Geofence</span>
                                </label>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddCompanyOpen(false)}
                                    className="px-5 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-3 rounded-xl bg-[#0F2F2F] text-white font-bold text-xs hover:bg-[#1a4a4a] transition-colors shadow-md disabled:opacity-50"
                                >
                                    {submitting ? "Onboarding..." : "Complete Onboarding"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Provision IoT Hardware Tracker */}
            {isProvisionTrackerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Cpu className="text-blue-600" size={22} />
                                    <h3 className="text-2xl font-black text-[#0F2F2F] tracking-tight">Provision Hardware Tracker</h3>
                                </div>
                                <p className="text-xs font-semibold text-slate-500 mt-1">Register Teltonika, Jimi AI Dashcam, or OBD-II hardware anchor.</p>
                            </div>
                            <button
                                onClick={() => setIsProvisionTrackerOpen(false)}
                                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleProvisionTracker} className="space-y-4">
                            <div>
                                <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">Assign to Company Tenant *</label>
                                <select
                                    required
                                    value={trackerForm.companyId}
                                    onChange={(e) => setTrackerForm({ ...trackerForm, companyId: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F2F2F]/20"
                                >
                                    <option value="">Select a company...</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">Hardware 15-Digit IMEI *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 358920104829101"
                                        value={trackerForm.imei}
                                        onChange={(e) => setTrackerForm({ ...trackerForm, imei: e.target.value.replace(/\s+/g, "") })}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#0F2F2F]/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">Hardware Tracker Model</label>
                                    <select
                                        value={trackerForm.model}
                                        onChange={(e) => {
                                            const model = e.target.value;
                                            let protocol = "TELTONIKA";
                                            if (model.includes("Jimi JC400")) protocol = "STREAMAX_MDVR";
                                            if (model.includes("OBD")) protocol = "OBD_II_CAN";
                                            if (model.includes("Concox")) protocol = "JIMI_CONCOX";
                                            setTrackerForm({ ...trackerForm, model, protocol });
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F2F2F]/20"
                                    >
                                        <option value="Teltonika FMC130 (4G Heavy)">Teltonika FMC130 (4G Heavy / CAN-Bus)</option>
                                        <option value="Teltonika FMB920 Hardwired">Teltonika FMB920 (Compact Hardwired GPS)</option>
                                        <option value="Jimi JC400 Dual AI Dashcam">Jimi JC400 (4G Dual AI Video Dashcam)</option>
                                        <option value="Teltonika FMC003 OBD-II">Teltonika FMC003 (Plug & Play OBD-II CAN)</option>
                                        <option value="Concox JM-VL03 4G">Concox / Jimi JM-VL03 (4G Waterproof Tracker)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">Telematics Protocol</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={trackerForm.protocol}
                                        className="w-full px-4 py-3 bg-slate-100 rounded-xl text-xs font-mono font-bold text-slate-600 border border-slate-200"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">Tracker SIM MSISDN</label>
                                    <input
                                        type="text"
                                        placeholder="+231 88 901 2233 (Orange/Lonestar)"
                                        value={trackerForm.simCardNumber}
                                        onChange={(e) => setTrackerForm({ ...trackerForm, simCardNumber: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F2F2F]/20"
                                    />
                                </div>
                            </div>

                            {/* Optional Vehicle Binding */}
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                <p className="text-xs font-black text-[#0F2F2F] flex items-center gap-1.5">
                                    <Car size={14} className="text-blue-600" />
                                    Link to Vehicle (Optional)
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="md:col-span-2">
                                        <input
                                            type="text"
                                            placeholder="Vehicle Name e.g. Land Cruiser #09"
                                            value={trackerForm.vehicleName}
                                            onChange={(e) => setTrackerForm({ ...trackerForm, vehicleName: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-white rounded-xl text-xs font-bold text-slate-800 border border-slate-200"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Plate e.g. LB-9842"
                                            value={trackerForm.licensePlate}
                                            onChange={(e) => setTrackerForm({ ...trackerForm, licensePlate: e.target.value.toUpperCase() })}
                                            className="w-full px-3 py-2.5 bg-white rounded-xl text-xs font-bold text-slate-800 border border-slate-200 uppercase font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsProvisionTrackerOpen(false)}
                                    className="px-5 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-3 rounded-xl bg-[#0F2F2F] text-white font-bold text-xs hover:bg-[#1a4a4a] transition-colors shadow-md disabled:opacity-50"
                                >
                                    {submitting ? "Provisioning..." : "Provision & Activate"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Corporate Monthly Invoice Generator */}
            {selectedInvoiceCompany && (
                <CorporateInvoiceModal
                    companyId={selectedInvoiceCompany.id}
                    companyName={selectedInvoiceCompany.name}
                    isOpen={!!selectedInvoiceCompany}
                    onClose={() => setSelectedInvoiceCompany(null)}
                />
            )}
        </div>
    );
}
