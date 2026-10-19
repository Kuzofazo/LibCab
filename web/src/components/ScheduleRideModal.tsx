"use client";

import React, { useState } from "react";
import { 
    X, 
    Calendar, 
    Clock, 
    MapPin, 
    Navigation, 
    CheckCircle2, 
    AlertCircle, 
    Sparkles, 
    Plane,
    CreditCard,
    DollarSign,
    Car
} from "lucide-react";
import { formatDual } from "@/utils/currency";

interface ScheduleRideModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingData: {
        pickup: string;
        destination: string;
        paymentMethod: string;
        paymentPhone: string;
    };
    selectedTier: "Standard" | "Comfort" | "Business";
    estimatedFare: number;
    stops?: Array<{ address: string; lat: number; lng: number }>;
    promoCode?: string;
    discountAmount?: number;
    onScheduledSuccess?: (scheduledRide: any) => void;
}

export default function ScheduleRideModal({
    isOpen,
    onClose,
    bookingData,
    selectedTier,
    estimatedFare,
    stops,
    promoCode,
    discountAmount = 0,
    onScheduledSuccess
}: ScheduleRideModalProps) {
    // Tomorrow by default, at 08:30 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDateStr = tomorrow.toISOString().split("T")[0];

    const [scheduledDate, setScheduledDate] = useState(defaultDateStr);
    const [scheduledTime, setScheduledTime] = useState("08:30");
    const [notes, setNotes] = useState("");
    const [isAirportTransfer, setIsAirportTransfer] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [confirmedRide, setConfirmedRide] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleConfirmSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
        if (isNaN(scheduledDateTime.getTime())) {
            setError("Please select a valid date and time.");
            return;
        }

        if (scheduledDateTime.getTime() < Date.now() + 15 * 60 * 1000) {
            setError("Advance bookings must be scheduled at least 15 minutes ahead.");
            return;
        }

        setSubmitting(true);

        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/rides/scheduled", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    originAddress: bookingData.pickup,
                    destAddress: bookingData.destination,
                    vehicleType: "Car",
                    rideCategory: selectedTier,
                    paymentMethod: bookingData.paymentMethod,
                    customerPaymentPhone: bookingData.paymentPhone,
                    fare: estimatedFare,
                    scheduledFor: scheduledDateTime.toISOString(),
                    notes: `${isAirportTransfer ? "[AIRPORT TRANSFER] " : ""}${notes}`.trim(),
                    stops: stops && stops.length > 0 ? stops : undefined,
                    promoCode,
                    discountAmount
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to confirm scheduled ride.");
            }

            const data = await res.json();
            setConfirmedRide(data);
            if (onScheduledSuccess) onScheduledSuccess(data);
        } catch (err: any) {
            setError(err.message || "Failed to schedule ride.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[350] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden my-6">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-950">Schedule a Ride in Advance</h3>
                            <p className="text-xs text-slate-500">Book for tomorrow, airport transfers, or planned trips</p>
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

                {confirmedRide ? (
                    /* Confirmation Screen */
                    <div className="p-6 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto">
                            <CheckCircle2 size={36} />
                        </div>
                        <div>
                            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Scheduled Booking Confirmed</span>
                            <h4 className="text-2xl font-black text-slate-950 tracking-tight">Your Ride is Reserved</h4>
                            <div className="mt-2 inline-block bg-slate-100 px-4 py-1.5 rounded-xl border border-slate-200">
                                <span className="text-xs text-slate-500 font-bold mr-2">Booking Reference:</span>
                                <span className="text-sm font-mono font-black text-slate-950">{confirmedRide.bookingReference}</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
                            <div className="flex justify-between text-slate-700">
                                <span className="font-bold">Pickup Time:</span>
                                <span className="font-black text-slate-950">
                                    {new Date(confirmedRide.scheduledFor).toLocaleString("en-US", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                    })}
                                </span>
                            </div>
                            <div className="flex justify-between text-slate-700">
                                <span className="font-bold">Pickup Location:</span>
                                <span className="truncate max-w-[200px] font-medium">{confirmedRide.originAddress}</span>
                            </div>
                            <div className="flex justify-between text-slate-700">
                                <span className="font-bold">Destination:</span>
                                <span className="truncate max-w-[200px] font-medium">{confirmedRide.destAddress}</span>
                            </div>
                            <div className="flex justify-between text-slate-700 pt-1 border-t border-slate-200">
                                <span className="font-bold">Estimated Fare:</span>
                                <span className="font-black text-slate-950">{formatDual(confirmedRide.fare || estimatedFare)}</span>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                            We will notify you and automatically coordinate your verified AfriCab driver 20 minutes before your scheduled pickup time.
                        </p>

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    /* Booking Form */
                    <form onSubmit={handleConfirmSchedule} className="p-5 sm:p-6 space-y-4">
                        {error && (
                            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Date & Time Picker */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                    <Calendar size={13} /> Pickup Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    min={new Date().toISOString().split("T")[0]}
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-slate-900 text-slate-900"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                    <Clock size={13} /> Pickup Time
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={scheduledTime}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-slate-900 text-slate-900"
                                />
                            </div>
                        </div>

                        {/* Quick Date Presets: Today / Tomorrow */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const d = new Date();
                                    setScheduledDate(d.toISOString().split("T")[0]);
                                }}
                                className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                    scheduledDate === new Date().toISOString().split("T")[0]
                                        ? "bg-slate-900 text-white border-slate-900"
                                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                            >
                                Today (Later)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const d = new Date();
                                    d.setDate(d.getDate() + 1);
                                    setScheduledDate(d.toISOString().split("T")[0]);
                                }}
                                className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                    scheduledDate === defaultDateStr
                                        ? "bg-slate-900 text-white border-slate-900"
                                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                            >
                                Tomorrow
                            </button>
                        </div>

                        {/* Airport Transfer Toggle */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                                    <Plane size={16} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-blue-950">Airport Transfer (Roberts / Spriggs)</h4>
                                    <p className="text-[10px] text-blue-700 font-medium">Flight luggage space &amp; driver flight tracking</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={isAirportTransfer}
                                onChange={(e) => setIsAirportTransfer(e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                        </div>

                        {/* Trip Summary Card */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Trip Summary</span>
                            <div className="flex items-center gap-2 text-slate-700">
                                <MapPin size={14} className="text-slate-800 shrink-0" />
                                <span className="font-bold truncate">{bookingData.pickup}</span>
                            </div>
                            {stops && stops.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-slate-500 pl-4">
                                    <span className="text-[10px] font-bold">Stop {idx + 1}:</span>
                                    <span className="truncate">{s.address}</span>
                                </div>
                            ))}
                            <div className="flex items-center gap-2 text-slate-700">
                                <Navigation size={14} className="text-slate-800 shrink-0" />
                                <span className="font-bold truncate">{bookingData.destination}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                                <div>
                                    <span className="text-slate-500 font-medium">Estimated Fare ({selectedTier}):</span>
                                    {discountAmount > 0 && (
                                        <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                                            Promo -${discountAmount.toFixed(2)}
                                        </span>
                                    )}
                                </div>
                                <span className="text-sm font-black text-slate-950">{formatDual(estimatedFare)}</span>
                            </div>
                        </div>

                        {/* Optional Driver Notes */}
                        <div className="space-y-1">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                                Driver Instructions / Flight Number (Optional)
                            </label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. Flight SN241 arriving at Roberts Field, 2 large bags..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-slate-900 text-slate-900"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-4 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer active:scale-98"
                        >
                            {submitting ? "Reserving Schedule..." : "Confirm Scheduled Booking"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
