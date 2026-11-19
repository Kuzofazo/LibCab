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
    TrendingUp,
    Plus,
    CornerDownRight
} from "lucide-react";
import { formatDual } from "@/utils/currency";
import { useMapProvider } from "@/components/map/MapProvider";

interface ChangeDestinationModalProps {
    isOpen: boolean;
    onClose: () => void;
    ride: any;
    onSuccess: (updatedRide: any) => void;
    initialTab?: "DESTINATION" | "ADD_STOP";
}

export default function ChangeDestinationModal({
    isOpen,
    onClose,
    ride,
    onSuccess,
    initialTab = "DESTINATION",
}: ChangeDestinationModalProps) {
    const { locationProvider } = useMapProvider();
    const [activeTab, setActiveTab] = useState<"DESTINATION" | "ADD_STOP">(initialTab);

    // Destination change state
    const [newAddress, setNewAddress] = useState("");
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [fareEstimate, setFareEstimate] = useState<number | null>(null);

    // Add Stop state
    const [stopAddress, setStopAddress] = useState("");
    const [stopCoords, setStopCoords] = useState<{ lat: number; lng: number } | null>(null);

    const [isGeocoding, setIsGeocoding] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !ride) return null;

    const currentFare = ride.fare || 25.0;
    const existingStops = ride.stops && Array.isArray(ride.stops) ? ride.stops : [];

    // Geocode destination search
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

                // Distance calculation from pickup to new destination
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

    // Geocode stop search
    const handleSearchStop = async (addr: string) => {
        setStopAddress(addr);
        if (!addr.trim() || addr.length < 3) {
            setStopCoords(null);
            return;
        }

        setIsGeocoding(true);
        setError(null);
        try {
            const loc = await locationProvider.geocode(addr);
            if (loc && loc.lat && loc.lng) {
                setStopCoords({ lat: loc.lat, lng: loc.lng });
            }
        } catch {
        } finally {
            setIsGeocoding(false);
        }
    };

    // Confirm Change Destination
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

    // Confirm Add Stop
    const handleConfirmAddStop = async () => {
        if (!stopAddress.trim()) {
            setError("Please enter an intermediate stop address.");
            return;
        }

        if (existingStops.length >= 4) {
            setError("Maximum of 4 intermediate stops allowed per trip.");
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const fallbackLat = (Number(ride.originLat || 6.3156) + Number(ride.destLat || 6.3000)) / 2;
            const fallbackLng = (Number(ride.originLng || -10.8074) + Number(ride.destLng || -10.7900)) / 2;

            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch(`/api/rides/${ride.id}/stops`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    address: stopAddress.trim(),
                    lat: stopCoords?.lat || fallbackLat,
                    lng: stopCoords?.lng || fallbackLng,
                })
            });

            const data = await res.json();
            if (res.ok && data.ride) {
                onSuccess(data.ride);
                onClose();
            } else {
                setError(data.error || "Failed to add stop.");
            }
        } catch (err: any) {
            setError(err.message || "Network error while adding stop.");
        } finally {
            setSubmitting(false);
        }
    };

    const fareDiff = fareEstimate ? fareEstimate - currentFare : 0;
    const addStopFee = 2.50;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-start justify-between">
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wider uppercase backdrop-blur-md mb-2">
                                <Navigation className="w-3 h-3" />
                                Dynamic Route Modification
                            </div>
                            <h2 className="text-xl font-black tracking-tight">Modify Trip Route</h2>
                            <p className="text-white/80 text-xs mt-0.5">
                                Modify destination or add an extra stop mid-ride without cancelling.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={submitting}
                            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
                        <button
                            type="button"
                            onClick={() => { setActiveTab("DESTINATION"); setError(null); }}
                            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                                activeTab === "DESTINATION"
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <Navigation className="w-3.5 h-3.5" />
                            Change Destination
                        </button>
                        <button
                            type="button"
                            onClick={() => { setActiveTab("ADD_STOP"); setError(null); }}
                            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                                activeTab === "ADD_STOP"
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Extra Stop {existingStops.length > 0 && `(${existingStops.length})`}
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4 overflow-y-auto">
                        {activeTab === "DESTINATION" ? (
                            <>
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
                                            <span>Current: {formatDual(currentFare)}</span>
                                            <span>
                                                {fareDiff > 0 ? `+${formatDual(fareDiff)} adjustment` : "No fare increase"}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Existing Stops List */}
                                {existingStops.length > 0 && (
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Existing Stops</span>
                                        {existingStops.map((st: any, idx: number) => (
                                            <div key={st.id || idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs">
                                                <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                                    {st.sequence || idx + 1}
                                                </span>
                                                <span className="font-semibold text-slate-800 truncate flex-1">{st.address}</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${st.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                                                    {st.status || "PENDING"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Stop Input */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                                        Add Intermediate Stop Address
                                    </label>
                                    <div className="relative">
                                        <Plus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                                        <input
                                            type="text"
                                            value={stopAddress}
                                            onChange={(e) => handleSearchStop(e.target.value)}
                                            placeholder="e.g. Total Gas Station, Sinkor or Supermarket..."
                                            className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none text-sm font-semibold text-slate-800"
                                        />
                                        {isGeocoding && (
                                            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 animate-spin" />
                                        )}
                                    </div>
                                </div>

                                {/* Fixed Extra Stop Pricing Alert */}
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
                                    <div>
                                        <div className="font-bold text-amber-900 flex items-center gap-1.5">
                                            <CornerDownRight className="w-3.5 h-3.5 text-amber-600" />
                                            Additional Stop Fee:
                                        </div>
                                        <p className="text-[11px] text-amber-700 mt-0.5">
                                            Fixed route addition fee per extra stop
                                        </p>
                                    </div>
                                    <span className="text-sm font-black text-amber-950">
                                        +{formatDual(addStopFee)}
                                    </span>
                                </div>
                            </>
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
                            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={activeTab === "DESTINATION" ? handleConfirmChange : handleConfirmAddStop}
                            disabled={submitting || (activeTab === "DESTINATION" ? !newAddress.trim() : !stopAddress.trim())}
                            className="flex-1 py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Updating Route...</span>
                                </>
                            ) : (
                                <>
                                    <span>{activeTab === "DESTINATION" ? "Confirm Route Change" : "Add Stop & Update Route"}</span>
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
