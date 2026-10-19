"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { 
    ShieldCheck, 
    MapPin, 
    Navigation, 
    Car, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    Phone, 
    RefreshCw,
    Share2,
    Compass,
    Sparkles
} from "lucide-react";
import dynamic from "next/dynamic";
import { formatDual } from "@/utils/currency";

const Map = dynamic(() => import("@/components/MapComponent"), {
    ssr: false,
    loading: () => (
        <div className="h-72 w-full bg-slate-900 animate-pulse rounded-3xl flex items-center justify-center text-slate-400 font-black text-xs uppercase tracking-widest">
            Connecting to Live Telemetry Map...
        </div>
    )
});

interface SharedTripData {
    id: string;
    status: string;
    originAddress: string;
    destAddress: string;
    originLat?: number;
    originLng?: number;
    destLat?: number;
    destLng?: number;
    vehicleType?: string;
    rideCategory?: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    sosAlert?: boolean;
    passengerName: string;
    stops?: Array<{
        id: string;
        sequence: number;
        address: string;
        status: string;
    }>;
    driver?: {
        name: string;
        vehicleModel: string;
        vehicleColor: string;
        licensePlate: string;
        rating: number;
        currentLat?: number;
        currentLng?: number;
        speed?: number;
        heading?: number;
    } | null;
}

export default function SharedTripLivePage() {
    const params = useParams();
    const token = params?.token as string;

    const [trip, setTrip] = useState<SharedTripData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    async function fetchSharedTrip() {
        if (!token) return;
        try {
            const res = await fetch(`/api/rides/share/${token}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Shared trip link is invalid or expired.");
            }
            const data = await res.json();
            setTrip(data);
            setLastUpdated(new Date());
            setError(null);
        } catch (err: any) {
            setError(err.message || "Failed to load shared trip");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchSharedTrip();
        const interval = setInterval(fetchSharedTrip, 6000);
        return () => clearInterval(interval);
    }, [token]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "ACCEPTED":
            case "EN_ROUTE":
                return {
                    label: "Driver En Route",
                    bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                    dot: "bg-emerald-400",
                    desc: "Driver is on the way to pick up the passenger."
                };
            case "ARRIVED":
                return {
                    label: "Driver Arrived",
                    bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
                    dot: "bg-amber-400",
                    desc: "Driver has arrived at the pickup location."
                };
            case "IN_PROGRESS":
                return {
                    label: "Ride in Progress",
                    bg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
                    dot: "bg-blue-400",
                    desc: "Trip is actively underway."
                };
            case "COMPLETED":
                return {
                    label: "Arrived Safely",
                    bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                    dot: "bg-emerald-400",
                    desc: "Trip completed safely. Sharing will expire shortly."
                };
            case "CANCELLED":
                return {
                    label: "Trip Cancelled",
                    bg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
                    dot: "bg-rose-400",
                    desc: "This trip was cancelled."
                };
            default:
                return {
                    label: "Finding Driver",
                    bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
                    dot: "bg-amber-400",
                    desc: "Locating the nearest available verified driver."
                };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400 flex items-center justify-center animate-pulse mb-4">
                    <Car className="text-amber-400" size={28} />
                </div>
                <h2 className="text-xl font-black tracking-tight">Connecting to AfriCab Live Telemetry</h2>
                <p className="text-xs text-slate-400 mt-2 font-mono">Secured end-to-end trip sharing channel...</p>
            </div>
        );
    }

    if (error || !trip) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500 flex items-center justify-center mb-4">
                    <AlertTriangle className="text-rose-400" size={32} />
                </div>
                <h1 className="text-2xl font-black tracking-tight">Trip Link Expired or Unavailable</h1>
                <p className="text-sm text-slate-400 max-w-md mt-2">
                    {error || "This live trip sharing link has expired, was stopped by the passenger, or the ride has concluded."}
                </p>
                <a
                    href="/"
                    className="mt-6 px-6 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                >
                    Visit AfriCab Liberia
                </a>
            </div>
        );
    }

    const badge = getStatusBadge(trip.status);

    // Build map markers
    const mapMarkers: any[] = [];
    if (trip.driver?.currentLat && trip.driver?.currentLng) {
        mapMarkers.push({
            id: "driver",
            lat: trip.driver.currentLat,
            lng: trip.driver.currentLng,
            title: trip.driver.name,
            subtitle: `${trip.driver.vehicleColor} ${trip.driver.vehicleModel}`,
            type: "ASSIGNED_DRIVER",
            heading: trip.driver.heading || 0
        });
    }

    mapMarkers.push({
        id: "pickup",
        lat: trip.originLat || 6.3156,
        lng: trip.originLng || -10.8074,
        title: "Pick Up",
        subtitle: trip.originAddress,
        type: "PICKUP"
    });

    if (trip.stops && trip.stops.length > 0) {
        trip.stops.forEach((s) => {
            mapMarkers.push({
                id: `stop_${s.id}`,
                lat: 6.3100, // fallback or marker
                lng: -10.8000,
                title: `Stop ${s.sequence}`,
                subtitle: s.address,
                type: "STOP"
            });
        });
    }

    mapMarkers.push({
        id: "destination",
        lat: trip.destLat || 6.3000,
        lng: trip.destLng || -10.7900,
        title: "Final Destination",
        subtitle: trip.destAddress,
        type: "DESTINATION"
    });

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
            {/* Top Navigation */}
            <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 rounded-xl bg-amber-400 p-1 flex items-center justify-center shadow-sm overflow-hidden">
                        <Image
                            src="/africab-logo.png"
                            alt="AfriCab Logo"
                            width={36}
                            height={36}
                            className="w-full h-full object-contain"
                            priority
                        />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-white tracking-tight leading-tight flex items-center gap-1.5">
                            AfriCab <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">Live Share</span>
                        </h1>
                        <p className="text-[11px] text-slate-400 font-medium">Tracking {trip.passengerName}&apos;s Ride</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Live Sync
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side: Map Visual */}
                <div className="lg:col-span-7 flex flex-col space-y-4">
                    <div className="relative rounded-3xl overflow-hidden border border-slate-800 h-[380px] sm:h-[460px] bg-slate-900 shadow-2xl">
                        <Map
                            fullScreen={false}
                            center={[trip.originLat || 6.3156, trip.originLng || -10.8074]}
                            zoom={13}
                            markers={mapMarkers}
                        />

                        {/* Status Overlay */}
                        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-2">
                            <div className={`px-4 py-2 rounded-2xl border backdrop-blur-md flex items-center gap-2 text-xs font-black shadow-lg ${badge.bg}`}>
                                <span className={`w-2 h-2 rounded-full ${badge.dot} animate-ping`} />
                                <span>{badge.label}</span>
                            </div>
                            <button
                                onClick={fetchSharedTrip}
                                title="Refresh Telemetry"
                                className="w-9 h-9 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-lg"
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Safety Guarantee Banner */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white leading-tight">24/7 Monitored Journey in Liberia</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Driver coordinates, speed, and status are securely synchronized with AfriCab Operations Center.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Trip Details, Stops & Driver Profile */}
                <div className="lg:col-span-5 flex flex-col space-y-4">
                    {/* Status Card */}
                    <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 space-y-4 shadow-xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Live Journey</span>
                                <h2 className="text-xl font-black text-white mt-0.5">{trip.passengerName}&apos;s Cab</h2>
                            </div>
                            <span className="text-xs font-mono font-bold bg-amber-400 text-slate-950 px-3 py-1 rounded-full font-black">
                                {trip.rideCategory || "Regular"}
                            </span>
                        </div>

                        {/* Driver Card */}
                        {trip.driver ? (
                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-400 p-1 flex items-center justify-center overflow-hidden shrink-0">
                                        <Image src="/africab-logo.png" alt="Driver" width={40} height={40} className="object-contain" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white">{trip.driver.name}</h3>
                                        <p className="text-xs text-slate-400">
                                            {trip.driver.vehicleColor} {trip.driver.vehicleModel}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="inline-block font-mono font-black text-xs text-amber-400 border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 rounded-lg">
                                        {trip.driver.licensePlate}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center text-xs text-slate-400 font-medium">
                                Assigning nearest verified driver...
                            </div>
                        )}

                        {/* Route Timeline */}
                        <div className="space-y-3 pt-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Planned Route & Stops</span>

                            {/* Origin */}
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <MapPin size={12} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Pick Up</span>
                                    <p className="text-xs font-bold text-slate-200 leading-snug">{trip.originAddress}</p>
                                </div>
                            </div>

                            {/* Intermediate Stops if any */}
                            {trip.stops && trip.stops.map((stop) => (
                                <div key={stop.id} className="flex items-start gap-3 pl-0.5">
                                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                                        {stop.sequence}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Stop {stop.sequence}</span>
                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                                                {stop.status}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-200 leading-snug">{stop.address}</p>
                                    </div>
                                </div>
                            ))}

                            {/* Destination */}
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <Navigation size={12} className="transform rotate-45" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Final Destination</span>
                                    <p className="text-xs font-bold text-slate-200 leading-snug">{trip.destAddress}</p>
                                </div>
                            </div>
                        </div>

                        {/* Privacy Footer */}
                        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Private & Secured Link</span>
                            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
