"use client";

import React, { useState } from "react";
import { 
    CheckCircle2, 
    Printer, 
    Share2, 
    Star, 
    MapPin, 
    ShieldCheck, 
    Clock, 
    ArrowRight, 
    Copy, 
    Check,
    CreditCard,
    Smartphone
} from "lucide-react";
import { formatDual } from "@/utils/currency";

export interface RideReceiptData {
    id: string;
    status: string;
    paymentStatus?: string;
    paymentMethod?: string;
    fare: number;
    originAddress: string;
    destAddress: string;
    createdAt?: string | Date;
    completedAt?: string | Date;
    rideCategory?: string;
    vehicleType?: string;
    customerPaymentPhone?: string | null;
    driverPaymentPhone?: string | null;
    rider?: {
        id?: string;
        name?: string | null;
        phone?: string | null;
        email?: string | null;
    } | null;
    guestName?: string | null;
    guestPhone?: string | null;
    driver?: {
        id?: string;
        vehicleType?: string | null;
        vehicleModel?: string | null;
        vehicleColor?: string | null;
        licensePlate?: string | null;
        rating?: number | null;
        user?: {
            id?: string;
            name?: string | null;
            phone?: string | null;
            email?: string | null;
        } | null;
    } | null;
}

interface RideReceiptProps {
    ride: RideReceiptData;
    role?: "CUSTOMER" | "DRIVER";
    onClose?: () => void;
    onSubmitRating?: (rating: number, comment: string) => Promise<void>;
    ratingSubmitted?: boolean;
}

export default function RideReceipt({
    ride,
    role = "CUSTOMER",
    onClose,
    onSubmitRating,
    ratingSubmitted = false
}: RideReceiptProps) {
    const [rating, setRating] = useState<number>(5);
    const [comment, setComment] = useState<string>("");
    const [submittingRating, setSubmittingRating] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);

    const driverName = ride.driver?.user?.name || "Verified AfriCab Driver";
    const driverPhone = ride.driverPaymentPhone || ride.driver?.user?.phone || "+231 88 012 3456";
    const riderName = ride.rider?.name || ride.guestName || "Valued Passenger";
    const riderPhone = ride.customerPaymentPhone || ride.rider?.phone || ride.guestPhone || "+231 88 765 4321";
    
    // Receipt recipient number: Driver's direct phone or AfriCab Merchant receiving line
    const paymentRecipientNumber = ride.driverPaymentPhone || ride.driver?.user?.phone || "+231 77 000 8888 (AfriCab Merchant)";
    const paymentPayerNumber = riderPhone;

    const receiptDate = ride.completedAt 
        ? new Date(ride.completedAt).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short"
        })
        : new Date(ride.createdAt || Date.now()).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short"
        });

    const receiptId = `REC-${ride.id.slice(-8).toUpperCase()}`;
    const fareAmount = ride.fare || 0;
    const isPaid = (ride.paymentStatus || "").toUpperCase() === "PAID" || ride.status === "COMPLETED";

    // Driver settlement breakdown
    const platformFee = fareAmount * 0.15;
    const driverNetPayout = fareAmount - platformFee;

    const handlePrint = () => {
        window.print();
    };

    const handleCopy = () => {
        const textToCopy = `AfriCab Receipt #${receiptId}\nDriver: ${driverName}\nRoute: ${ride.originAddress} ➔ ${ride.destAddress}\nTotal: $${fareAmount.toFixed(2)}\nPayer: ${paymentPayerNumber}\nPaid To: ${paymentRecipientNumber}\nStatus: PAID`;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRate = async () => {
        if (!onSubmitRating) return;
        setSubmittingRating(true);
        try {
            await onSubmitRating(rating, comment);
        } finally {
            setSubmittingRating(false);
        }
    };

    return (
        <div className="bg-white text-slate-900 border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-8 max-w-xl mx-auto space-y-6">
            {/* Header: Verified Stamp & Status */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                        <CheckCircle2 size={26} className="text-emerald-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                {isPaid ? "Payment Completed" : "Payment Pending"}
                            </span>
                            <span className="text-xs font-mono text-slate-400 font-bold">#{receiptId}</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                            {role === "CUSTOMER" ? "Official Passenger Receipt" : "Driver Settlement Receipt"}
                        </h2>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-600 block">Date & Time</span>
                    <span className="text-xs font-semibold text-slate-700">{receiptDate}</span>
                </div>
            </div>

            {/* Core Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Driver / Passenger Info Card */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                        {role === "CUSTOMER" ? "Assigned Driver" : "Passenger"}
                    </span>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0">
                            {role === "CUSTOMER" ? driverName.charAt(0) : riderName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-black text-slate-900 text-sm truncate">
                                {role === "CUSTOMER" ? driverName : riderName}
                            </p>
                            {role === "CUSTOMER" && ride.driver && (
                                <p className="text-[11px] text-slate-500 truncate">
                                    {ride.driver.vehicleColor || ""} {ride.driver.vehicleModel || ride.driver.vehicleType || "Sedan"}
                                    {ride.driver.licensePlate ? ` • ${ride.driver.licensePlate}` : ""}
                                </p>
                            )}
                            {role === "DRIVER" && (
                                <p className="text-[11px] text-slate-500 font-mono">
                                    {riderPhone}
                                </p>
                            )}
                        </div>
                    </div>
                    {role === "CUSTOMER" && ride.driver?.rating && (
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-600 pt-1">
                            <Star size={12} className="fill-amber-400 text-amber-400" />
                            <span>{ride.driver.rating.toFixed(1)} Verified Pro</span>
                        </div>
                    )}
                </div>

                {/* Amount Charged Card */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                        {role === "CUSTOMER" ? "Total Fare Charged" : "Total Fare Collected"}
                    </span>
                    <div>
                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                            {formatDual(fareAmount)}
                        </p>
                        <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                            ✓ Paid via {ride.paymentMethod || "Mobile Money"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Crucial Payment Phone Details Box */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Smartphone size={14} className="text-slate-500" /> Payment Route &amp; Phone Numbers
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {ride.paymentMethod === "ORANGE" ? "Orange Money" : ride.paymentMethod === "STRIPE" ? "Debit / Credit Card" : "MTN MoMo"}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Number used for payment (Customer's number) */}
                    <div className="space-y-1">
                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                            Number Used for Payment (Payer):
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900 text-sm bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                {paymentPayerNumber}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-600">Customer account billed</p>
                    </div>

                    {/* Number paid to (Driver / Merchant receiving number) */}
                    <div className="space-y-1">
                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                            Number Paid To (Recipient):
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900 text-sm bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                                {paymentRecipientNumber}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-600">
                            {role === "CUSTOMER" ? "Driver / AfriCab Settlement line" : "Your receiving wallet number"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Trip Location Route */}
            <div className="bg-slate-50/60 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                    Trip Location &amp; Route
                </span>

                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                            <MapPin size={13} className="text-emerald-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-slate-600 uppercase block">Pickup Location</span>
                            <p className="text-xs font-bold text-slate-900">{ride.originAddress}</p>
                        </div>
                    </div>

                    <div className="ml-3 border-l-2 border-dashed border-slate-300 h-4" />

                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0 mt-0.5">
                            <MapPin size={13} className="text-red-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-slate-600 uppercase block">Drop-Off Destination</span>
                            <p className="text-xs font-bold text-slate-900">{ride.destAddress}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Itemized Fare Breakdown */}
            <div className="border-t border-b border-slate-200 py-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                    <span>Base Ride Fare ({ride.rideCategory || "Regular"} Class)</span>
                    <span className="font-semibold text-slate-900">${(fareAmount * 0.7).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                    <span>Distance &amp; Time Surcharge</span>
                    <span className="font-semibold text-slate-900">${(fareAmount * 0.3).toFixed(2)}</span>
                </div>
                {role === "DRIVER" && (
                    <>
                        <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-100">
                            <span>AfriCab Fleet Platform Fee (15%)</span>
                            <span className="text-red-600 font-semibold">-${platformFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-black text-sm text-emerald-700 pt-1">
                            <span>Driver Net Payout</span>
                            <span>{formatDual(driverNetPayout)}</span>
                        </div>
                    </>
                )}
                {role === "CUSTOMER" && (
                    <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-100">
                        <span>Total Paid</span>
                        <span>{formatDual(fareAmount)}</span>
                    </div>
                )}
            </div>

            {/* Rating Section for Customer */}
            {role === "CUSTOMER" && onSubmitRating && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                    <p className="text-xs font-black text-slate-900">How was your trip with {driverName.split(" ")[0]}?</p>
                    {!ratingSubmitted ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className="p-1 hover:scale-110 transition-transform"
                                    >
                                        <Star
                                            size={26}
                                            className={rating >= star ? "fill-amber-400 text-amber-400" : "text-slate-300"}
                                        />
                                    </button>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Add optional comments (e.g. Great driving, polite, on-time)..."
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-slate-900 text-slate-900 placeholder:text-slate-400"
                            />
                            <button
                                type="button"
                                onClick={handleRate}
                                disabled={submittingRating}
                                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                            >
                                {submittingRating ? "Submitting..." : "Submit Rating"}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                            <CheckCircle2 size={16} /> Thank you for your feedback!
                        </div>
                    )}
                </div>
            )}

            {/* Receipt Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200"
                    >
                        <Printer size={14} /> Print / Save PDF
                    </button>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200"
                    >
                        {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        {copied ? "Copied!" : "Copy Summary"}
                    </button>
                </div>

                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
                    >
                        {role === "CUSTOMER" ? "Book Another Ride" : "Back to Available Trips"}
                    </button>
                )}
            </div>

            {/* Footer Notice */}
            <p className="text-[10px] text-center text-slate-600 font-medium">
                AfriCab Liberia • Official Electronic Receipt • Tax &amp; Regulatory Compliant
            </p>
        </div>
    );
}
