"use client";

import React, { useState, useEffect } from "react";
import { 
    Printer, 
    Download, 
    X, 
    Building2, 
    Calendar, 
    DollarSign, 
    FileText, 
    CheckCircle2, 
    Car, 
    Users, 
    CreditCard,
    ShieldCheck
} from "lucide-react";
import { formatUSD, formatLRD } from "@/utils/currency";

interface InvoiceData {
    invoiceNumber: string;
    billingPeriod: string;
    issueDate: string;
    dueDate: string;
    company: {
        id: string;
        name: string;
        code: string;
        category: string;
        email?: string;
        phone?: string;
        address: string;
        plan: string;
    };
    summary: {
        totalRides: number;
        subtotalUsd: number;
        corporateDiscountPct: number;
        discountAmountUsd: number;
        taxRatePct: number;
        taxAmountUsd: number;
        totalDueUsd: number;
    };
    staffBreakdown: Array<{ name: string; count: number; total: number }>;
    itemizedRides: Array<{
        id: string;
        date: string;
        staffName: string;
        origin: string;
        destination: string;
        driverName: string;
        fare: number;
        status: string;
    }>;
}

interface CorporateInvoiceModalProps {
    companyId: string;
    companyName: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function CorporateInvoiceModal({
    companyId,
    companyName,
    isOpen,
    onClose
}: CorporateInvoiceModalProps) {
    const [invoice, setInvoice] = useState<InvoiceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    async function loadInvoice() {
        if (!companyId) return;
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/admin/companies/invoices?companyId=${companyId}&month=${selectedMonth}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInvoice(data);
            }
        } catch (err) {
            console.error("Failed to load invoice:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (isOpen) {
            loadInvoice();
        }
    }, [isOpen, companyId, selectedMonth]);

    if (!isOpen) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
                {/* Modal Header & Controls (Hidden when printing) */}
                <div className="px-8 py-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-600 rounded-xl">
                            <FileText size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white">Corporate Invoice Generator</h3>
                            <p className="text-xs text-gray-400 font-medium">
                                {companyName} • Consolidated Monthly Billing
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-red-500"
                        />
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                        >
                            <Printer size={16} /> Print / PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-gray-300 transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Invoice Printable Body */}
                <div className="p-8 sm:p-12 overflow-y-auto flex-1 bg-white text-slate-900 font-sans print:p-0 print:overflow-visible">
                    {loading ? (
                        <div className="py-20 text-center space-y-3">
                            <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-600 rounded-full animate-spin mx-auto" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Calculating itemized ledger & corporate tax breakdown...
                            </p>
                        </div>
                    ) : invoice ? (
                        <div className="space-y-8">
                            {/* Brand & Invoice Details */}
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center text-white font-black text-lg">
                                            A
                                        </div>
                                        <span className="text-2xl font-black tracking-tight text-slate-950">
                                            Afri<span className="text-red-600">Cab</span>
                                        </span>
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-red-50 text-red-700 rounded-md border border-red-100">
                                            Corporate Transport
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">LTP Services Inc. • Republic of Liberia</p>
                                    <p className="text-xs text-slate-500 font-medium">Sinkor Blvd, Monrovia, Montserrado County</p>
                                    <p className="text-xs text-slate-500 font-medium">TIN: LR-2022-8492019 • corporate@africab.com</p>
                                </div>

                                <div className="text-left sm:text-right">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400 block">TAX INVOICE</span>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{invoice.invoiceNumber}</h2>
                                    <div className="text-xs font-medium text-slate-600 mt-2 space-y-0.5">
                                        <p><strong>Billing Period:</strong> {invoice.billingPeriod}</p>
                                        <p><strong>Issued:</strong> {new Date(invoice.issueDate).toLocaleDateString()}</p>
                                        <p><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()} (Net 14)</p>
                                    </div>
                                </div>
                            </div>

                            {/* Billed To */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                        Billed Corporate Account
                                    </span>
                                    <h3 className="text-lg font-black text-slate-900">{invoice.company.name}</h3>
                                    <p className="text-xs font-bold text-slate-500 mt-0.5">Account Code: {invoice.company.code}</p>
                                    <p className="text-xs text-slate-600 mt-1">{invoice.company.address}</p>
                                    <p className="text-xs text-slate-600">{invoice.company.phone || invoice.company.email || "Liberia"}</p>
                                </div>

                                <div className="space-y-1 text-xs sm:text-right">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                        Tier &amp; Service Agreement
                                    </span>
                                    <span className="inline-block px-3 py-1 bg-slate-900 text-white rounded-lg font-black text-[11px] uppercase">
                                        {invoice.company.plan} Corporate Plan
                                    </span>
                                    <p className="text-slate-500 font-medium pt-2">Total Logged Trips: <strong>{invoice.summary.totalRides}</strong></p>
                                    <p className="text-emerald-700 font-bold">Partner Discount: {invoice.summary.corporateDiscountPct}% Applied</p>
                                </div>
                            </div>

                            {/* Department / Staff Summary Breakdown */}
                            {invoice.staffBreakdown.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                                        Staff Utilization Breakdown
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {invoice.staffBreakdown.map((staff, idx) => (
                                            <div key={idx} className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                                                <div>
                                                    <span className="font-black text-slate-900 block">{staff.name}</span>
                                                    <span className="text-[11px] text-slate-500">{staff.count} trip{staff.count > 1 ? "s" : ""}</span>
                                                </div>
                                                <span className="font-black text-slate-900">{formatUSD(staff.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Itemized Ride Ledger Table */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                                    Itemized Transportation Ledger
                                </h4>
                                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                            <tr>
                                                <th className="py-3 px-4">Date</th>
                                                <th className="py-3 px-4">Staff Member</th>
                                                <th className="py-3 px-4">Pickup / Drop-off</th>
                                                <th className="py-3 px-4">Driver</th>
                                                <th className="py-3 px-4 text-right">Fare (USD)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {invoice.itemizedRides.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                                                        No billed rides logged for this period. Standard corporate platform fee applies.
                                                    </td>
                                                </tr>
                                            ) : (
                                                invoice.itemizedRides.map((ride) => (
                                                    <tr key={ride.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="py-3 px-4 font-bold text-slate-600">
                                                            {new Date(ride.date).toLocaleDateString()}
                                                        </td>
                                                        <td className="py-3 px-4 font-bold text-slate-900">{ride.staffName}</td>
                                                        <td className="py-3 px-4 text-slate-600">
                                                            <div className="truncate max-w-xs">{ride.origin} → {ride.destination}</div>
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-600">{ride.driverName}</td>
                                                        <td className="py-3 px-4 text-right font-black text-slate-900">
                                                            {formatUSD(ride.fare)}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Totals Calculation */}
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-slate-200">
                                {/* Payment Instructions */}
                                <div className="text-xs text-slate-500 space-y-1 max-w-md">
                                    <span className="font-black text-slate-900 uppercase tracking-wider block mb-1">
                                        Payment Instructions (Liberia)
                                    </span>
                                    <p>📱 <strong>MTN Mobile Money Merchant:</strong> *156*3*123456# (AfriCab)</p>
                                    <p>🍊 <strong>Orange Money Merchant:</strong> #144*4*654321#</p>
                                    <p>🏦 <strong>Ecobank Liberia Wire:</strong> USD Account # 0011029482910</p>
                                    <p className="text-[11px] text-slate-400 pt-1">
                                        Please cite invoice number <strong>{invoice.invoiceNumber}</strong> with your remittance.
                                    </p>
                                </div>

                                {/* Calculation Box */}
                                <div className="w-full sm:w-72 space-y-2 text-xs">
                                    <div className="flex justify-between text-slate-600">
                                        <span>Subtotal ({invoice.summary.totalRides} trips):</span>
                                        <span className="font-bold">{formatUSD(invoice.summary.subtotalUsd)}</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-600">
                                        <span>Corporate Discount ({invoice.summary.corporateDiscountPct}%):</span>
                                        <span className="font-bold">-{formatUSD(invoice.summary.discountAmountUsd)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                        <span>Liberia GST ({invoice.summary.taxRatePct}%):</span>
                                        <span className="font-bold">+{formatUSD(invoice.summary.taxAmountUsd)}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-black text-slate-950 border-t border-slate-200 pt-2">
                                        <span>Total Due:</span>
                                        <div className="text-right">
                                            <span>{formatUSD(invoice.summary.totalDueUsd)}</span>
                                            <span className="block text-xs font-bold text-yellow-600 mt-0.5">
                                                ≈ {formatLRD(invoice.summary.totalDueUsd)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
