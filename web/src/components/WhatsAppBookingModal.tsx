"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    MapPin,
    Navigation,
    User,
    Phone,
    Car,
    Sparkles,
    Shield,
    DollarSign,
    Clock,
    Copy,
    Check,
    ExternalLink,
    Send,
    Loader2,
    Users,
    ChevronDown,
    Zap,
    MessageCircle,
    CheckCircle2
} from "lucide-react";
import {
    MONROVIA_LANDMARKS,
    WhatsAppVehicleType,
    WhatsAppRideCategory,
    WhatsAppPaymentMethod,
    estimateWhatsAppBookingFare,
    buildWhatsAppLink,
    formatWhatsAppDispatchMessage,
    DEFAULT_WHATSAPP_DISPATCH_PHONE
} from "@/utils/whatsappBooking";
import { formatUSD, formatLRD } from "@/utils/currency";

export interface WhatsAppInitialData {
    name?: string;
    phone?: string;
    pickup?: string;
    destination?: string;
    rideCategory?: WhatsAppRideCategory;
    paymentMethod?: WhatsAppPaymentMethod;
    notes?: string;
}

interface WhatsAppBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: WhatsAppInitialData;
}

export default function WhatsAppBookingModal({
    isOpen,
    onClose,
    initialData
}: WhatsAppBookingModalProps) {
    const [name, setName] = useState(initialData?.name || "");
    const [phone, setPhone] = useState(initialData?.phone || "+231 ");
    const [pickup, setPickup] = useState(initialData?.pickup || "Sinkor, Tubman Blvd");
    const [destination, setDestination] = useState(initialData?.destination || "Broad Street, Downtown");
    const [vehicleType, setVehicleType] = useState<WhatsAppVehicleType>("Car");
    const [rideCategory, setRideCategory] = useState<WhatsAppRideCategory>(initialData?.rideCategory || "Standard");
    const [paymentMethod, setPaymentMethod] = useState<WhatsAppPaymentMethod>(initialData?.paymentMethod || "MOMO");
    const [passengers, setPassengers] = useState<number>(1);
    const [notes, setNotes] = useState(initialData?.notes || "");
    
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
    const [copied, setCopied] = useState(false);
    const [showNotes, setShowNotes] = useState(false);

    // Sync initial data if passed
    useEffect(() => {
        if (initialData) {
            if (initialData.name) setName(initialData.name);
            if (initialData.phone) setPhone(initialData.phone);
            if (initialData.pickup) setPickup(initialData.pickup);
            if (initialData.destination) setDestination(initialData.destination);
            if (initialData.rideCategory) setRideCategory(initialData.rideCategory);
            if (initialData.paymentMethod) setPaymentMethod(initialData.paymentMethod);
            if (initialData.notes) setNotes(initialData.notes);
        }
    }, [initialData]);

    // Live Fare Calculation
    const { fareUsd, distanceKm, etaMins } = estimateWhatsAppBookingFare(
        pickup,
        destination,
        rideCategory,
        vehicleType
    );

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }
        setLoadingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLoadingLocation(false);
                setPickup(`GPS Pin: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (Monrovia)`);
            },
            () => {
                setLoadingLocation(false);
                setPickup("Sinkor (Tubman Blvd / 12th St)");
            },
            { timeout: 7000 }
        );
    };

    const handleLandmarkSelect = (landmarkName: string, type: "pickup" | "destination") => {
        if (type === "pickup") {
            setPickup(landmarkName);
        } else {
            setDestination(landmarkName);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pickup.trim() || !destination.trim()) {
            alert("Please enter both pickup and destination locations.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/rides/whatsapp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim() || "Customer",
                    phone: phone.trim() || "+231 77 000 0000",
                    pickup: pickup.trim(),
                    destination: destination.trim(),
                    vehicleType,
                    rideCategory,
                    paymentMethod,
                    passengers,
                    notes: notes.trim(),
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to create dispatch booking.");
            }

            setBookingSuccess(data);
            
            // Automatically launch WhatsApp with formatted dispatch ticket
            if (data.whatsappUrl) {
                window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
            }
        } catch (err: any) {
            console.error("WhatsApp booking submission failed:", err);
            // Fallback: Build client-side WhatsApp link even if network API fails
            const clientMessage = formatWhatsAppDispatchMessage({
                name: name.trim() || "Customer",
                phone: phone.trim() || "+231 77 000 0000",
                pickup: pickup.trim(),
                destination: destination.trim(),
                vehicleType,
                rideCategory,
                paymentMethod,
                passengers,
                notes: notes.trim(),
                estimatedFareUsd: fareUsd
            });
            const fallbackLink = buildWhatsAppLink(clientMessage);
            setBookingSuccess({
                bookingReference: `AFR-WA-${Math.floor(100000 + Math.random() * 900000)}`,
                whatsappUrl: fallbackLink,
                formattedMessage: clientMessage,
                trackingUrl: "/book/guest"
            });
            window.open(fallbackLink, "_blank", "noopener,noreferrer");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopy = async (textToCopy: string) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/60 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto"
                >
                    {/* Header with WhatsApp Gradient */}
                    <div className="relative bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366] text-white p-5 sm:p-6">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition-colors"
                            aria-label="Close modal"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-white text-[#25D366] flex items-center justify-center shadow-lg shadow-black/10">
                                <MessageCircle size={28} className="fill-current" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-xl tracking-tight">WhatsApp Quick-Book</h3>
                                    <span className="bg-white/20 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/20">
                                        ⚡ 10s Dispatch
                                    </span>
                                </div>
                                <p className="text-xs text-white/90 font-medium flex items-center gap-1.5 mt-0.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                                    24/7 Monrovia Dispatch Desk Online • No App Needed
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Modal Content */}
                    <div className="p-5 sm:p-6 max-h-[80vh] overflow-y-auto">
                        {!bookingSuccess ? (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Name and Phone */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                            Passenger Name
                                        </label>
                                        <div className="relative">
                                            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. John Flomo"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366]"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                            Contact Phone
                                        </label>
                                        <div className="relative">
                                            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="tel"
                                                required
                                                placeholder="+231 88 123 4567"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Pickup Location */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                                            Pickup Location / Landmark
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleGetLocation}
                                            disabled={loadingLocation}
                                            className="text-[11px] font-bold text-[#128C7E] hover:underline flex items-center gap-1"
                                        >
                                            {loadingLocation ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : (
                                                <Navigation size={12} />
                                            )}
                                            Use GPS
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-900" />
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Sinkor 12th Street or Vamoma"
                                            value={pickup}
                                            onChange={(e) => setPickup(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366]"
                                        />
                                    </div>
                                </div>

                                {/* Destination Location */}
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Destination / Drop-off
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-sm bg-red-600" />
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Broad Street or RIA Airport"
                                            value={destination}
                                            onChange={(e) => setDestination(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366]"
                                        />
                                    </div>
                                </div>

                                {/* Popular Monrovia Landmark Quick-Picks */}
                                <div>
                                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        ⚡ 1-Tap Landmark Quick-Select:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pb-1">
                                        {MONROVIA_LANDMARKS.slice(0, 7).map((lm) => (
                                            <button
                                                key={lm.id}
                                                type="button"
                                                onClick={() => handleLandmarkSelect(lm.name, "destination")}
                                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-transparent text-[11px] font-bold text-slate-700 transition-all active:scale-95 text-left"
                                            >
                                                📍 {lm.name.split("(")[0]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Ride Tier Selection */}
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                                        Select Vehicle &amp; Comfort Tier
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            {
                                                tier: "Standard" as WhatsAppRideCategory,
                                                label: "Standard",
                                                desc: "Reliable Taxi",
                                                icon: Car,
                                                badge: "Best Value"
                                            },
                                            {
                                                tier: "Comfort" as WhatsAppRideCategory,
                                                label: "Comfort A/C",
                                                desc: "Chilled Sedan",
                                                icon: Sparkles,
                                                badge: "Recommended"
                                            },
                                            {
                                                tier: "VIP" as WhatsAppRideCategory,
                                                label: "VIP Luxury",
                                                desc: "Executive SUV",
                                                icon: Shield,
                                                badge: "Top Tier"
                                            }
                                        ].map((item) => {
                                            const isSelected = rideCategory === item.tier;
                                            return (
                                                <button
                                                    key={item.tier}
                                                    type="button"
                                                    onClick={() => {
                                                        setRideCategory(item.tier);
                                                        setVehicleType("Car");
                                                    }}
                                                    className={`p-2.5 rounded-2xl border text-left transition-all ${
                                                        isSelected
                                                            ? "border-[#25D366] bg-emerald-50/70 shadow-sm ring-2 ring-[#25D366]/30"
                                                            : "border-slate-200 hover:border-slate-300 bg-white"
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <item.icon size={16} className={isSelected ? "text-[#128C7E]" : "text-slate-500"} />
                                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md ${
                                                            isSelected ? "bg-[#25D366] text-white" : "bg-slate-100 text-slate-500"
                                                        }`}>
                                                            {item.badge}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-black text-slate-900 leading-tight">{item.label}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">{item.desc}</p>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Alternate: Bike or Keke */}
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setVehicleType("Bike");
                                                setRideCategory("Standard");
                                            }}
                                            className={`flex-1 py-1.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                vehicleType === "Bike"
                                                    ? "border-[#25D366] bg-emerald-50 text-emerald-900 font-black ring-1 ring-[#25D366]"
                                                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                            }`}
                                        >
                                            🛵 AfriCab Express Bike (Beat Traffic)
                                        </button>
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                                        Payment Method
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: "MOMO" as WhatsAppPaymentMethod, name: "MTN MoMo", color: "bg-yellow-400 text-black border-yellow-500" },
                                            { id: "ORANGE" as WhatsAppPaymentMethod, name: "Orange Money", color: "bg-orange-500 text-white border-orange-600" },
                                            { id: "CASH" as WhatsAppPaymentMethod, name: "Cash on Arrival", color: "bg-slate-800 text-white border-slate-900" }
                                        ].map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => setPaymentMethod(m.id)}
                                                className={`py-2 px-2 rounded-xl text-xs font-black transition-all border text-center ${
                                                    paymentMethod === m.id
                                                        ? `${m.color} shadow-sm ring-2 ring-emerald-500/30 scale-[1.02]`
                                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                                                }`}
                                            >
                                                {m.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Expandable Driver Notes */}
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setShowNotes(!showNotes)}
                                        className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                                    >
                                        <ChevronDown size={14} className={`transform transition-transform ${showNotes ? "rotate-180" : ""}`} />
                                        {showNotes ? "Hide passenger notes" : "+ Add special note (luggage, AC, gate details)"}
                                    </button>
                                    {showNotes && (
                                        <textarea
                                            rows={2}
                                            placeholder="e.g. Standing opposite the yellow bank, have 2 bags"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full mt-2 p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40"
                                        />
                                    )}
                                </div>

                                {/* Estimated Fare & Route Info Card */}
                                <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-lg">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Est. Fare ({distanceKm} km • ~{etaMins}m ETA)
                                        </p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xl font-black text-[#25D366]">{formatUSD(fareUsd)}</span>
                                            <span className="text-xs text-slate-400 font-bold">~{formatLRD(fareUsd)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            Fixed Transparent Rate
                                        </span>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366] hover:brightness-105 active:scale-[0.99] text-white font-black text-base shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            <span>Connecting to Dispatch Desk...</span>
                                        </>
                                    ) : (
                                        <>
                                            <MessageCircle size={20} className="fill-current" />
                                            <span>DISPATCH NOW VIA WHATSAPP</span>
                                        </>
                                    )}
                                </button>
                                
                                <p className="text-center text-[11px] text-slate-400">
                                    🔒 Official AfriCab Dispatch Desk (+231 77 000 0000). Your live trip tracker is created automatically.
                                </p>
                            </form>
                        ) : (
                            /* Success Confirmation View */
                            <div className="text-center py-4 space-y-5">
                                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                                    <CheckCircle2 size={36} />
                                </div>

                                <div>
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-black tracking-wide border border-emerald-200 inline-block mb-2">
                                        TICKET CREATED &amp; DISPATCHED
                                    </span>
                                    <h4 className="text-2xl font-black text-slate-900">
                                        Booking Reference: {bookingSuccess.bookingReference}
                                    </h4>
                                    <p className="text-sm text-slate-600 mt-1 max-w-sm mx-auto">
                                        Your ride request has been registered in the AfriCab live dispatch system and sent to WhatsApp.
                                    </p>
                                </div>

                                {/* Tracking Card */}
                                {bookingSuccess.trackingUrl && (
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
                                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                                            Live GPS Telemetry Tracking Link:
                                        </p>
                                        <a
                                            href={bookingSuccess.trackingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1.5 break-all"
                                        >
                                            <ExternalLink size={14} className="shrink-0" />
                                            {bookingSuccess.trackingUrl}
                                        </a>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="space-y-2.5 pt-2">
                                    {bookingSuccess.whatsappUrl && (
                                        <a
                                            href={bookingSuccess.whatsappUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full py-3.5 px-6 rounded-2xl bg-[#25D366] hover:bg-[#1ebd5b] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
                                        >
                                            <MessageCircle size={18} className="fill-current" />
                                            Open WhatsApp Chat Again
                                        </a>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => handleCopy(bookingSuccess.formattedMessage || bookingSuccess.trackingUrl)}
                                        className="w-full py-3 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                                    >
                                        {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                                        {copied ? "Copied to Clipboard!" : "Copy Full Dispatch Ticket"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBookingSuccess(null);
                                            onClose();
                                        }}
                                        className="text-xs font-bold text-slate-400 hover:text-slate-700 pt-2"
                                    >
                                        Done / Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
