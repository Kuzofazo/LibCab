"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    MapPin, 
    Navigation, 
    ArrowRight, 
    AlertCircle, 
    CheckCircle2, 
    Loader2, 
    X,
    TrendingUp
} from "lucide-react";
import { formatDual } from "@/utils/currency";
import { useMapProvider } from "@/components/map/MapProvider";

interface ChangeDestinationModalProps {
    isOpen: boolean;
    onClose: () => void;
    ride: any;
    onSuccess: (updatedRide: any) => void;
}

export default function ChangeDestinationModal({
    isOpen,
    onClose,
    ride,
    onSuccess,
}: ChangeDestinationModalProps) {
    const { locationProvider } = useMapProvider();
    const [newAddress, setNewAddress] = useState("");
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fareEstimate, setFareEstimate] = useState<number | null>(null);

    if (!isOpen || !ride) return null;

    const currentFare = ride.fare || 25.0;

    const handleSearchAddress = async (addr: string) => {
        setNewAddress(addr);
        if (!addr.trim() || addr.length < 3) {
            setCoords(null);
            setFareEstimate(null);
            return;
        }

        setIsGeocoding(true);
        setError(null);
        try {
            const loc = await locationProvider.geocode(addr);
            if (loc && loc.lat && loc.lng) {
                setCoords({ lat: loc.lat, lng: loc.lng });

                // Simple distance calculation from pickup to new destination
                const R = 6371; // km
                const dLat = (loc.lat - (ride.originLat || 6.3156)) * Math.PI / 180;
                const dLng = (loc.lng - (ride.originLng || -10.8074)) * Math.PI / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos((ride.originLat || 6.3156) * Math.PI / 180) * Math.cos(loc.lat * Math.PI / 180) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distKm = R * c;

                // Rate: base $12 + $2.5/km
                const estimatedFare = Math.max(15.0, Math.round((12.0 + (distKm * 2.5)) * 100) / 100);
                setFareEstimate(estimatedFare);
            }
        } catch {
            // Keep user-typed address
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleConfirmChange = async () => {
        if (!newAddress.trim()) {
            setError("Please enter a new destination address.");
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch(`/api/rides/${ride.id}/destination`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    newDestAddress: newAddress.trim(),
                    newDestLat: coords?.lat || ride.destLat,
                    newDestLng: coords?.lng || ride.destLng,
                    newFare: fareEstimate || currentFare,
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                onSuccess(data.ride);
                onClose();
            } else {
                setError(data.error || "Failed to update destination.");
            }
        } catch (err: any) {
            setError(err.message || "Network error while updating destination.");
        } finally {
            setSubmitting(false);
        }
    };

    const fareDiff = fareEstimate ? fareEstimate - currentFare : 0;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
                >
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-start justify-between">
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wider uppercase backdrop-blur-md mb-2">
                                <Navigation className="w-3 h-3" />
                                Dynamic Route Modification
                            </div>
                            <h2 className="text-xl font-black tracking-tight">Change Destination</h2>
                            <p className="text-white/80 text-xs mt-0.5">
                                Modify your final stop mid-ride without cancelling. Navigation will update for your driver.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={submitting}
                            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        {/* Current Destination */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                                <MapPin className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Destination</span>
                                <div className="text-xs font-semibold text-slate-700 truncate">{ride.destAddress}</div>
                            </div>
                        </div>

                        {/* New Destination Input */}
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                                Enter New Destination Address
                            </label>
                            <div className="relative">
                                <Navigation className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                <input
                                    type="text"
                                    value={newAddress}
                                    onChange={(e) => handleSearchAddress(e.target.value)}
                                    placeholder="e.g. Broad Street, Monrovia or Paynesville Red Light"
                                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none text-sm font-semibold text-slate-800"
                                />
                                {isGeocoding && (
                                    <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                                )}
                            </div>
                        </div>

                        {/* Fare Impact Preview */}
                        {fareEstimate !== null && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-blue-900 font-bold flex items-center gap-1.5">
                                        <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                                        Updated Fare Preview:
                                    </span>
                                    <span className="text-sm font-black text-blue-950">
                                        {formatDual(fareEstimate)}
                                    </span>
                                </div>
                                <div className="text-[11px] text-blue-700 flex items-center justify-between">
                                    <span>Original: {formatDual(currentFare)}</span>
                                    <span>
                                        {fareDiff > 0 ? `+${formatDual(fareDiff)} adjustment` : "No fare increase"}
                                    </span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmChange}
                            disabled={submitting || !newAddress.trim()}
                            className="flex-1 py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Updating Route...</span>
                                </>
                            ) : (
                                <>
                                    <span>Confirm Route Change</span>
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
