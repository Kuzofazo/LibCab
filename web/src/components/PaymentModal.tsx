"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    CreditCard, 
    Smartphone, 
    Banknote, 
    CheckCircle2, 
    AlertTriangle, 
    Loader2, 
    X, 
    ShieldCheck, 
    Receipt, 
    ArrowRight,
    MapPin
} from "lucide-react";
import { formatDual } from "@/utils/currency";

interface PaymentModalProps {
    isOpen: boolean;
    onClose?: () => void;
    ride: any;
    fare?: number;
    mode?: "COMPLETION" | "CANCELLATION_AFTER_START";
    reason?: string;
    onPaymentSuccess: (updatedRide: any) => void;
}

export default function PaymentModal({
    isOpen,
    onClose,
    ride,
    fare: overrideFare,
    mode = "COMPLETION",
    reason,
    onPaymentSuccess,
}: PaymentModalProps) {
    const isCancellation = mode === "CANCELLATION_AFTER_START";
    const baseFare = overrideFare !== undefined 
        ? overrideFare 
        : (isCancellation ? (ride?.cancellationFare || 15.00) : (ride?.fare || 25.00));

    const [selectedMethod, setSelectedMethod] = useState<"MOMO" | "ORANGE" | "CASH">("MOMO");
    const [phone, setPhone] = useState(ride?.customerPaymentPhone || ride?.rider?.phone || "+231 88 ");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (ride?.paymentMethod === "ORANGE") setSelectedMethod("ORANGE");
        else if (ride?.paymentMethod === "CASH") setSelectedMethod("CASH");
        else setSelectedMethod("MOMO");

        if (ride?.customerPaymentPhone) {
            setPhone(ride.customerPaymentPhone);
        }
    }, [ride]);

    if (!isOpen || !ride) return null;

    const handleConfirmPayment = async () => {
        setError(null);
        if ((selectedMethod === "MOMO" || selectedMethod === "ORANGE") && (!phone || phone.trim().length < 8)) {
            setError("Please enter a valid mobile money phone number (e.g. +231 88/77 ...)");
            return;
        }

        setLoading(true);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch(`/api/rides/${ride.id}/pay`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    paymentMethod: selectedMethod,
                    paymentPhone: phone.trim(),
                    amount: baseFare,
                    isCancellation
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setSuccess(true);
                setTimeout(() => {
                    onPaymentSuccess(data.ride || { ...ride, status: isCancellation ? "CANCELLED" : "COMPLETED", paymentStatus: "PAID" });
                }, 1200);
            } else {
                setError(data.error || "Payment confirmation failed. Please try again.");
            }
        } catch (err: any) {
            setError(err.message || "Network error while confirming payment.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]"
                >
                    {/* Header */}
                    <div className={cn(
                        "p-6 pb-5 text-white flex items-start justify-between relative overflow-hidden",
                        isCancellation 
                            ? "bg-gradient-to-r from-amber-600 to-rose-600" 
                            : "bg-gradient-to-r from-emerald-600 to-teal-700"
                    )}>
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wider uppercase backdrop-blur-md mb-2">
                                {isCancellation ? (
                                    <>
                                        <AlertTriangle className="w-3 h-3 text-amber-200" />
                                        In-Progress Cancellation Settlement
                                    </>
                                ) : (
                                    <>
                                        <Receipt className="w-3 h-3 text-emerald-200" />
                                        Ride Completion & Payment
                                    </>
                                )}
                            </div>
                            <h2 className="text-xl font-black tracking-tight">
                                {isCancellation ? "Settle Cancellation Fare" : "Select Payment Method"}
                            </h2>
                            <p className="text-white/80 text-xs mt-0.5">
                                {isCancellation
                                    ? "Trip was ended before destination. Please settle the trip distance fee."
                                    : `Driver has arrived. Confirm payment for Ride #${ride.bookingReference || ride.id?.slice(-6).toUpperCase()}.`}
                            </p>
                        </div>

                        {onClose && (
                            <button
                                onClick={onClose}
                                disabled={loading || success}
                                className="relative z-10 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Scrollable Content */}
                    <div className="p-6 overflow-y-auto space-y-5 flex-1">
                        {/* Fare Card */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                    {isCancellation ? "Settlement Due" : "Total Amount Due"}
                                </span>
                                <div className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">
                                    {formatDual(baseFare)}
                                </div>
                                {isCancellation && reason && (
                                    <span className="text-[11px] text-amber-700 font-medium mt-1 block">
                                        Reason: {reason}
                                    </span>
                                )}
                            </div>
                            <div className="text-right">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Secure Checkout
                                </span>
                                <div className="text-[10px] text-slate-400 mt-1">
                                    {ride.stops?.length ? `${ride.stops.length} stop(s) included` : "Direct route"}
                                </div>
                            </div>
                        </div>

                        {/* Payment Method Selector */}
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 block">
                                Supported Payment Methods
                            </label>
                            <div className="grid grid-cols-3 gap-2.5">
                                {/* MTN MoMo */}
                                <button
                                    type="button"
                                    onClick={() => setSelectedMethod("MOMO")}
                                    className={cn(
                                        "p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all relative",
                                        selectedMethod === "MOMO"
                                            ? "border-amber-500 bg-amber-50/50 shadow-sm"
                                            : "border-slate-200 hover:border-slate-300 bg-white"
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-full bg-amber-400/20 text-amber-600 flex items-center justify-center font-black text-xs mb-1.5">
                                        MoMo
                                    </div>
                                    <span className="text-xs font-bold text-slate-800">MTN MoMo</span>
                                    <span className="text-[10px] text-slate-400">Mobile Money</span>
                                    {selectedMethod === "MOMO" && (
                                        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
                                    )}
                                </button>

                                {/* Orange Money */}
                                <button
                                    type="button"
                                    onClick={() => setSelectedMethod("ORANGE")}
                                    className={cn(
                                        "p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all relative",
                                        selectedMethod === "ORANGE"
                                            ? "border-orange-500 bg-orange-50/50 shadow-sm"
                                            : "border-slate-200 hover:border-slate-300 bg-white"
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-600 flex items-center justify-center font-black text-xs mb-1.5">
                                        OM
                                    </div>
                                    <span className="text-xs font-bold text-slate-800">Orange</span>
                                    <span className="text-[10px] text-slate-400">Mobile Money</span>
                                    {selectedMethod === "ORANGE" && (
                                        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500" />
                                    )}
                                </button>

                                {/* Cash */}
                                <button
                                    type="button"
                                    onClick={() => setSelectedMethod("CASH")}
                                    className={cn(
                                        "p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all relative",
                                        selectedMethod === "CASH"
                                            ? "border-emerald-500 bg-emerald-50/50 shadow-sm"
                                            : "border-slate-200 hover:border-slate-300 bg-white"
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center mb-1.5">
                                        <Banknote className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-800">Cash</span>
                                    <span className="text-[10px] text-slate-400">To Driver</span>
                                    {selectedMethod === "CASH" && (
                                        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Phone Number Input for Mobile Money */}
                        {(selectedMethod === "MOMO" || selectedMethod === "ORANGE") && (
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                                    {selectedMethod === "MOMO" ? "MTN Mobile Money Phone" : "Orange Money Phone"}
                                </label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+231 88 123 4567"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none text-sm font-semibold text-slate-800"
                                    />
                                </div>
                                <span className="text-[11px] text-slate-400 mt-1 block">
                                    Payment request will be confirmed with the driver upon settlement.
                                </span>
                            </div>
                        )}

                        {/* Cash instructions */}
                        {selectedMethod === "CASH" && (
                            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
                                <Banknote className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold">Pay Cash Directly:</span> Hand{" "}
                                    <strong>{formatDual(baseFare)}</strong> in cash to driver{" "}
                                    <strong>{ride.driver?.user?.name || "your driver"}</strong> and tap
                                    Confirm below.
                                </div>
                            </div>
                        )}

                        {/* Error Alert */}
                        {error && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Success State */}
                        {success && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1 text-emerald-800">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                                <div className="text-sm font-bold">Payment Confirmed!</div>
                                <div className="text-xs text-emerald-600">Generating digital receipt and syncing dashboards...</div>
                            </div>
                        )}
                    </div>

                    {/* Footer / Confirm Button */}
                    <div className="p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading || success}
                                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
                            >
                                Back
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleConfirmPayment}
                            disabled={loading || success}
                            className={cn(
                                "flex-1 py-3 px-6 rounded-2xl text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                                isCancellation
                                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/30"
                                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30",
                                (loading || success) && "opacity-80 cursor-not-allowed"
                            )}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Processing Payment...</span>
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Confirmed</span>
                                </>
                            ) : (
                                <>
                                    <span>Confirm {selectedMethod === "CASH" ? "Cash" : selectedMethod} Payment</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
    return classes.filter(Boolean).join(" ");
}
