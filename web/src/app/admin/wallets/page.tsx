"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Wallet,
    RefreshCw,
    Settings,
    CheckCircle2,
    AlertTriangle,
    TrendingDown,
    TrendingUp,
    Users,
    Search,
    ChevronDown,
    DollarSign,
    Loader2,
    ArrowDownLeft,
    ArrowUpRight,
    Filter,
    Save,
    Plus,
    Minus,
    Eye,
    X,
} from "lucide-react";

type WalletEntry = {
    id: string;
    balance: number;
    pendingBalance: number;
    currency: string;
    status: string;
    totalDeposited: number;
    totalDeducted: number;
    createdAt: string;
    updatedAt: string;
    eligible: boolean;
    shortfall: number;
    driver: {
        id: string;
        user: { id: string; name: string; email: string; phone: string };
    };
    transactions: any[];
};

export default function AdminDriverWalletsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"ALL" | "ELIGIBLE" | "INELIGIBLE" | "SUSPENDED">("ALL");
    const [search, setSearch] = useState("");

    // Config edit state
    const [editingConfig, setEditingConfig] = useState(false);
    const [configForm, setConfigForm] = useState({ minBalance: "", depositAmount: "", depositMode: "FIXED", depositPercent: "" });
    const [savingConfig, setSavingConfig] = useState(false);
    const [configMsg, setConfigMsg] = useState<{ success: boolean; text: string } | null>(null);

    // Adjustment state
    const [adjustingDriver, setAdjustingDriver] = useState<WalletEntry | null>(null);
    const [adjustAmount, setAdjustAmount] = useState("");
    const [adjustNote, setAdjustNote] = useState("");
    const [adjustType, setAdjustType] = useState<"add" | "deduct">("add");
    const [adjusting, setAdjusting] = useState(false);
    const [adjustMsg, setAdjustMsg] = useState<{ success: boolean; text: string } | null>(null);

    // Transaction detail view
    const [viewingWallet, setViewingWallet] = useState<WalletEntry | null>(null);

    const getAuthHeaders = useCallback((): HeadersInit => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/wallets?filter=${filter}`, { headers: getAuthHeaders() });
            if (res.ok) setData(await res.json());
        } catch {}
        finally { setLoading(false); }
    }, [filter, getAuthHeaders]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (data?.config) {
            setConfigForm({
                minBalance: String(data.config.minBalance ?? 500),
                depositAmount: String(data.config.depositAmount ?? 200),
                depositMode: data.config.depositMode ?? "FIXED",
                depositPercent: String(data.config.depositPercent ?? 10),
            });
        }
    }, [data?.config]);

    const handleSaveConfig = async () => {
        setSavingConfig(true);
        setConfigMsg(null);
        try {
            const res = await fetch("/api/admin/wallets", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    action: "UPDATE_CONFIG",
                    minBalance: parseFloat(configForm.minBalance),
                    depositAmount: parseFloat(configForm.depositAmount),
                    depositMode: configForm.depositMode,
                    depositPercent: parseFloat(configForm.depositPercent),
                }),
            });
            const d = await res.json();
            setConfigMsg({ success: res.ok && d.success, text: d.message || d.error || "Unknown" });
            if (res.ok) { setEditingConfig(false); fetchData(); }
        } catch { setConfigMsg({ success: false, text: "Network error" }); }
        finally { setSavingConfig(false); }
    };

    const handleAdjust = async () => {
        if (!adjustingDriver || !adjustAmount || !adjustNote) return;
        setAdjusting(true);
        setAdjustMsg(null);
        const amount = (adjustType === "add" ? 1 : -1) * parseFloat(adjustAmount);
        try {
            const res = await fetch("/api/admin/wallets", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ action: "ADJUST_WALLET", driverProfileId: adjustingDriver.driver.id, amount, note: adjustNote }),
            });
            const d = await res.json();
            setAdjustMsg({ success: res.ok && d.success, text: d.message || d.error || "Unknown" });
            if (res.ok) { fetchData(); setAdjustAmount(""); setAdjustNote(""); }
        } catch { setAdjustMsg({ success: false, text: "Network error" }); }
        finally { setAdjusting(false); }
    };

    const handleWalletStatus = async (driverId: string, action: "SUSPEND_WALLET" | "ACTIVATE_WALLET") => {
        try {
            await fetch("/api/admin/wallets", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ action, driverProfileId: driverId }),
            });
            fetchData();
        } catch {}
    };

    const handleCreateWallet = async (driverId: string) => {
        try {
            await fetch("/api/admin/wallets", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ action: "CREATE_WALLET", driverProfileId: driverId }),
            });
            fetchData();
        } catch {}
    };

    const filteredWallets: WalletEntry[] = (data?.wallets ?? []).filter((w: WalletEntry) =>
        !search ||
        w.driver?.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        w.driver?.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        w.driver?.user?.phone?.includes(search)
    );

    const stats = data?.stats ?? {};
    const config = data?.config ?? {};

    return (
        <div className="space-y-8 animate-in fade-in duration-200">

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Wallet size={24} className="text-emerald-600" /> Driver Wallets
                    </h1>
                    <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-wider">Wallet balances · Minimum requirements · Funding · Deductions</p>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-slate-700 transition-all">
                    <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: "Total Wallets", value: stats.totalWallets ?? "—", icon: Wallet, color: "bg-slate-900 text-white" },
                    { label: "Total Balance", value: stats.totalBalance != null ? `${(stats.totalBalance).toFixed(0)} LRD` : "—", icon: DollarSign, color: "bg-emerald-600 text-white" },
                    { label: "Eligible Drivers", value: stats.eligibleDrivers ?? "—", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-800" },
                    { label: "Ineligible", value: stats.ineligibleDrivers ?? "—", icon: AlertTriangle, color: "bg-orange-50 text-orange-800" },
                    { label: "Suspended", value: stats.suspendedWallets ?? "—", icon: X, color: "bg-red-50 text-red-800" },
                    { label: "No Wallet", value: stats.driversWithoutWallets ?? "—", icon: Users, color: "bg-slate-50 text-slate-700" },
                ].map(({ label, value, icon: Icon, color }, i) => (
                    <div key={i} className={`${color} rounded-3xl p-4 flex flex-col gap-1`}>
                        <Icon size={16} className="opacity-60" />
                        <p className="text-[9px] font-black uppercase tracking-wider opacity-70">{label}</p>
                        <p className="text-2xl font-black">{value}</p>
                    </div>
                ))}
            </div>

            {/* Config Panel */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Settings size={16} className="text-slate-600" />
                        <h2 className="font-black text-sm uppercase tracking-wider text-slate-800">Wallet Configuration</h2>
                    </div>
                    <button
                        onClick={() => setEditingConfig(v => !v)}
                        className="px-4 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded-full hover:bg-slate-700 transition-all"
                    >
                        {editingConfig ? "Cancel" : "Edit Settings"}
                    </button>
                </div>
                <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Min. Balance (LRD)", key: "minBalance", type: "number" },
                        { label: "Ride Deposit (LRD)", key: "depositAmount", type: "number" },
                        { label: "Deposit Mode", key: "depositMode", type: "select", options: ["FIXED", "PERCENT"] },
                        { label: "Deposit % of Fare", key: "depositPercent", type: "number" },
                    ].map(({ label, key, type, options }) => (
                        <div key={key}>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
                            {editingConfig ? (
                                type === "select" ? (
                                    <select
                                        value={(configForm as any)[key]}
                                        onChange={e => setConfigForm(prev => ({ ...prev, [key]: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        {options!.map(o => <option key={o}>{o}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        type="number"
                                        value={(configForm as any)[key]}
                                        onChange={e => setConfigForm(prev => ({ ...prev, [key]: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                )
                            ) : (
                                <p className="text-lg font-black text-slate-900">
                                    {key === "depositMode" ? config[key] : key === "depositPercent" ? `${config[key] ?? 10}%` : `${config[key] ?? "—"} LRD`}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
                {editingConfig && (
                    <div className="px-5 pb-5 flex items-center gap-3">
                        <button
                            onClick={handleSaveConfig}
                            disabled={savingConfig}
                            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider rounded-full transition-all disabled:opacity-50"
                        >
                            {savingConfig ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Configuration
                        </button>
                        {configMsg && (
                            <span className={`text-[11px] font-bold ${configMsg.success ? "text-emerald-600" : "text-red-600"}`}>{configMsg.text}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Drivers Without Wallets */}
            {data?.driversWithoutWallets?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={16} className="text-amber-600" />
                        <h3 className="font-black text-sm text-amber-800 uppercase tracking-wider">Approved Drivers Without Wallets</h3>
                        <span className="bg-amber-400 text-amber-900 text-[9px] font-black px-2 py-0.5 rounded-full">{data.driversWithoutWallets.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {data.driversWithoutWallets.map((d: any) => (
                            <div key={d.id} className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 border border-amber-200">
                                <div>
                                    <p className="text-sm font-black text-slate-900">{d.user?.name ?? "Unknown"}</p>
                                    <p className="text-[10px] text-slate-500">{d.user?.phone ?? d.user?.email}</p>
                                </div>
                                <button
                                    onClick={() => handleCreateWallet(d.id)}
                                    className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-full hover:bg-emerald-700 transition-all"
                                >
                                    Create Wallet
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Wallet List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* List Filters */}
                <div className="flex flex-wrap items-center gap-3 p-5 border-b border-slate-100">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, email, phone..."
                            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                    </div>
                    <div className="flex gap-1.5">
                        {(["ALL", "ELIGIBLE", "INELIGIBLE", "SUSPENDED"] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full transition-all ${
                                    filter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-slate-400" />
                    </div>
                ) : filteredWallets.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm">No wallets found.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredWallets.map((wallet: WalletEntry) => (
                            <div key={wallet.id} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex flex-wrap items-center gap-4">
                                    {/* Driver Info */}
                                    <div className="flex-1 min-w-[180px]">
                                        <p className="font-black text-sm text-slate-900">{wallet.driver?.user?.name ?? "Unknown Driver"}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{wallet.driver?.user?.phone ?? wallet.driver?.user?.email ?? "—"}</p>
                                    </div>

                                    {/* Balance */}
                                    <div className="text-right min-w-[100px]">
                                        <p className="font-black text-lg text-slate-900">{wallet.balance.toFixed(2)} <span className="text-xs text-slate-500 font-bold">LRD</span></p>
                                        {!wallet.eligible && (
                                            <p className="text-[9px] font-black text-orange-600">
                                                Needs {wallet.shortfall.toFixed(2)} LRD more
                                            </p>
                                        )}
                                    </div>

                                    {/* Eligibility Badge */}
                                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                        wallet.eligible
                                            ? "bg-emerald-100 text-emerald-700"
                                            : wallet.status !== "ACTIVE"
                                                ? "bg-red-100 text-red-700"
                                                : "bg-orange-100 text-orange-700"
                                    }`}>
                                        {wallet.eligible ? <CheckCircle2 size={9} /> : <AlertTriangle size={9} />}
                                        {wallet.eligible ? "Eligible" : wallet.status !== "ACTIVE" ? wallet.status : "Ineligible"}
                                    </div>

                                    {/* Funded / Deducted */}
                                    <div className="flex gap-3 text-[10px] font-bold">
                                        <span className="text-emerald-600 flex items-center gap-0.5">
                                            <TrendingUp size={10} /> {wallet.totalDeposited.toFixed(0)} LRD
                                        </span>
                                        <span className="text-red-500 flex items-center gap-0.5">
                                            <TrendingDown size={10} /> {wallet.totalDeducted.toFixed(0)} LRD
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setViewingWallet(wallet); }}
                                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
                                            title="View transactions"
                                        >
                                            <Eye size={13} />
                                        </button>
                                        <button
                                            onClick={() => { setAdjustingDriver(wallet); setAdjustMsg(null); setAdjustAmount(""); setAdjustNote(""); }}
                                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all"
                                            title="Adjust balance"
                                        >
                                            <DollarSign size={13} />
                                        </button>
                                        {wallet.status === "ACTIVE" ? (
                                            <button
                                                onClick={() => handleWalletStatus(wallet.driver.id, "SUSPEND_WALLET")}
                                                className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all"
                                                title="Suspend wallet"
                                            >
                                                <X size={13} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleWalletStatus(wallet.driver.id, "ACTIVATE_WALLET")}
                                                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all"
                                                title="Activate wallet"
                                            >
                                                <CheckCircle2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Adjust Wallet Modal */}
            {adjustingDriver && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">Adjust Wallet Balance</h3>
                            <button onClick={() => setAdjustingDriver(null)} className="p-1 rounded-full hover:bg-slate-100"><X size={16} /></button>
                        </div>
                        <p className="text-sm font-semibold text-slate-600 mb-4">{adjustingDriver.driver?.user?.name} · Current: <strong>{adjustingDriver.balance.toFixed(2)} LRD</strong></p>

                        {adjustMsg && (
                            <div className={`mb-3 p-3 rounded-2xl text-[11px] font-semibold ${adjustMsg.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                                {adjustMsg.text}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                {(["add", "deduct"] as const).map(t => (
                                    <button key={t} type="button" onClick={() => setAdjustType(t)}
                                        className={`py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                                            adjustType === t ? t === "add" ? "bg-emerald-600 text-white" : "bg-red-500 text-white" : "bg-slate-100 text-slate-600"
                                        }`}
                                    >
                                        {t === "add" ? <Plus size={12} /> : <Minus size={12} />} {t === "add" ? "Credit" : "Debit"}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="number" min="0.01" step="0.01" placeholder="Amount (LRD)"
                                value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <input
                                type="text" placeholder="Reason / admin note (required)"
                                value={adjustNote} onChange={e => setAdjustNote(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <button
                                onClick={handleAdjust}
                                disabled={adjusting || !adjustAmount || !adjustNote}
                                className={`w-full py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all ${
                                    adjustType === "add" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-500 hover:bg-red-600"
                                } text-white disabled:opacity-50`}
                            >
                                {adjusting ? <Loader2 size={13} className="animate-spin" /> : adjustType === "add" ? <Plus size={13} /> : <Minus size={13} />}
                                {adjusting ? "Processing..." : `${adjustType === "add" ? "Credit" : "Debit"} Wallet`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction History Modal */}
            {viewingWallet && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <div>
                                <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">Transaction History</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{viewingWallet.driver?.user?.name} · {viewingWallet.balance.toFixed(2)} LRD</p>
                            </div>
                            <button onClick={() => setViewingWallet(null)} className="p-2 rounded-full hover:bg-slate-100"><X size={16} /></button>
                        </div>
                        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                            {viewingWallet.transactions.length === 0 ? (
                                <p className="text-center text-slate-400 text-sm py-8">No transactions found.</p>
                            ) : viewingWallet.transactions.map((tx: any) => (
                                <div key={tx.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.type === "CREDIT" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                                        {tx.type === "CREDIT" ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className="text-[11px] font-black text-slate-800 capitalize">{tx.category?.replace(/_/g, " ") ?? tx.type}</p>
                                            <p className={`text-[11px] font-black ${tx.type === "CREDIT" ? "text-emerald-600" : "text-red-600"}`}>
                                                {tx.type === "CREDIT" ? "+" : "-"}{tx.amount.toFixed(2)} LRD
                                            </p>
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-0.5">{new Date(tx.createdAt).toLocaleString()} · Balance: {tx.balanceAfter.toFixed(2)} LRD</p>
                                        {tx.note && <p className="text-[10px] text-slate-500 mt-1 italic truncate">{tx.note}</p>}
                                        {tx.provider && <span className="inline-block mt-1 text-[9px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{tx.provider}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
