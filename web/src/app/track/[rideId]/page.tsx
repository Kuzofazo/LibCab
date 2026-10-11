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
    Share2, 
    CheckCircle2, 
    AlertTriangle, 
    Phone, 
    Sparkles, 
    RefreshCw,
    ExternalLink,
    Copy,
    Check
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { formatUSD, formatLRD } from "@/utils/currency";
import ShareModal from "@/components/ShareModal";

const Map = dynamic(() => import("@/components/MapComponent"), {
    ssr: false,
    loading: () => (
        <div className="h-72 w-full bg-slate-900 animate-pulse rounded-3xl flex items-center justify-center text-slate-400 font-black text-xs uppercase tracking-widest">
            Connecting to Live Telemetry Map...
        </div>
    )
});

interface PublicRideData {
    id: string;
    status: "REQUESTED" | "ACCEPTED" | "EN_ROUTE" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    originAddress: string;
    destAddress: string;
    originLat?: number;
    originLng?: number;
    destLat?: number;
    destLng?: number;
    fare: number;
    vehicleType?: string;
    createdAt: string;
    updatedAt: string;
    sosAlert?: boolean;
    passengerName: string;
    driver?: {
        name: string;
        vehicleModel: string;
        vehicleColor: string;
        licensePlate: string;
        rating: number;
        reviewCount: number;
        currentLat?: number;
        currentLng?: number;
        speed?: number;
        heading?: number;
    } | null;
}

const STATUS_STEPS = [
    { key: "REQUESTED", label: "Requested", desc: "Finding nearest driver" },
    { key: "ACCEPTED", label: "Driver Assigned", desc: "Driver on the way to pickup" },
    { key: "IN_PROGRESS", label: "Trip In Progress", desc: "Heading to destination" },
    { key: "COMPLETED", label: "Completed", desc: "Arrived safely" },
];

export default function PublicTrackRidePage() {
    const params = useParams();
    const rideId = params?.rideId as string;

    const [ride, setRide] = useState<PublicRideData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [routeData, setRouteData] = useState<{ distance: string; eta: string } | null>(null);

    async function fetchRideStatus() {
        if (!rideId) return;
        try {
            const res = await fetch(`/api/rides/${rideId}/public`);
            if (!res.ok) {
                if (res.status === 404) throw new Error("Ride not found or expired.");
                throw new Error("Unable to fetch ride tracking data.");
            }
            const data = await res.json();
            setRide(data);
            setLastUpdated(new Date());
            setError(null);
        } catch (err: any) {
            setError(err.message || "Failed to load ride");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchRideStatus();
        const interval = setInterval(fetchRideStatus, 5000); // Poll every 5s fallback
        return () => clearInterval(interval);
    }, [rideId]);

    // Real-Time SSE Stream Subscription for this specific ride
    useEffect(() => {
        if (!rideId) return;
        let eventSource: EventSource | null = null;
        try {
            eventSource = new EventSource(`/api/rides/stream?rideId=${rideId}`);
            eventSource.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    const { type, data } = parsed;
                    if (type === "LOCATION_UPDATED" && data) {
                        setRide((prev) => {
                            if (!prev || !prev.driver) return prev;
                            return {
                                ...prev,
                                driver: {
                                    ...prev.driver,
                                    currentLat: data.lat,
                                    currentLng: data.lng,
                                    speed: data.speed,
                                    heading: data.heading,
                                }
                            };
                        });
                        setLastUpdated(new Date());
                    }
                    if (["RIDE_ACCEPTED", "DRIVER_ARRIVED", "RIDE_UPDATED"].includes(type)) {
                        fetchRideStatus();
                    }
                } catch {}
            };
        } catch {}

        return () => {
            if (eventSource) eventSource.close();
        };
    }, [rideId]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleWhatsAppShare = () => {
        const text = `🚨 AfriCab Live Ride Share: Track ${ride?.passengerName || "my"}'s ride to ${ride?.destAddress || "destination"} live here: ${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    };

    if (loading && !ride) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
                <div className="w-16 h-16 rounded-full border-4 border-red-500/20 border-t-red-500 animate-spin mb-4" />
                <h2 className="text-xl font-bold">Connecting to Live Fleet Telemetry...</h2>
                <p className="text-gray-400 text-sm mt-1">Retrieving verified ride data for #{rideId?.slice(-6)}</p>
            </div>
        );
    }

    if (error && !ride) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-2xl font-black mb-2">Tracking Unavailable</h2>
                <p className="text-gray-400 max-w-md mb-6">{error}</p>
                <Link href="/" className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold">
                    Return to AfriCab Home
                </Link>
            </div>
        );
    }

    const currentStatus = ride?.status || "REQUESTED";
    const isCompleted = currentStatus === "COMPLETED";
    const isCancelled = currentStatus === "CANCELLED";

    // Map Markers & Routes
    const markers: any[] = [];
    if (ride) {
        if (ride.driver?.currentLat && ride.driver?.currentLng) {
            markers.push({
                id: "driver",
                lat: ride.driver.currentLat,
                lng: ride.driver.currentLng,
                title: `${ride.driver.name} (Driver)`,
                subtitle: `${ride.driver.vehicleColor} ${ride.driver.vehicleModel}`,
                licensePlate: ride.driver.licensePlate,
                type: "ASSIGNED_DRIVER",
                vehicleType: ride.vehicleType || "Car",
                heading: ride.driver.heading || 0,
                rating: ride.driver.rating,
            });
        }
        if (ride.originLat && ride.originLng) {
            markers.push({
                id: "pickup",
                lat: ride.originLat,
                lng: ride.originLng,
                title: "Pickup Location",
                subtitle: ride.originAddress,
                type: "PICKUP",
            });
        }
        if (ride.destLat && ride.destLng) {
            markers.push({
                id: "dest",
                lat: ride.destLat,
                lng: ride.destLng,
                title: "Destination",
                subtitle: ride.destAddress,
                type: "DESTINATION",
            });
        }
    }

    const routes: any[] = [];
    if (ride && ride.originLat && ride.originLng && ride.destLat && ride.destLng) {
        if (["ACCEPTED", "EN_ROUTE"].includes(ride.status) && ride.driver?.currentLat && ride.driver?.currentLng) {
            routes.push({
                id: "driver-to-pickup",
                origin: [ride.driver.currentLat, ride.driver.currentLng] as [number, number],
                destination: [ride.originLat, ride.originLng] as [number, number],
                color: "#10b981",
            });
        } else if (ride.status === "IN_PROGRESS" && ride.driver?.currentLat && ride.driver?.currentLng) {
            routes.push({
                id: "trip-in-progress",
                origin: [ride.driver.currentLat, ride.driver.currentLng] as [number, number],
                destination: [ride.destLat, ride.destLng] as [number, number],
                color: "#ef4444",
            });
        } else {
            routes.push({
                id: "standard-route",
                origin: [ride.originLat, ride.originLng] as [number, number],
                destination: [ride.destLat, ride.destLng] as [number, number],
                color: "#ef4444",
            });
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white selection:bg-red-500 selection:text-white">
            {/* Top Bar */}
            <header className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl font-black tracking-tighter text-white">
                            Afri<span className="text-red-500">Cab</span>
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                            Live Ride Share
                        </span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShareModalOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            <Share2 size={14} /> Share Live Route
                        </button>
                        <button
                            onClick={handleCopyLink}
                            className="p-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl transition-all cursor-pointer"
                            title="Copy Live Link"
                        >
                            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
                {/* Emergency / Safety Alert Banner if triggered */}
                {ride?.sosAlert && (
                    <div className="p-4 rounded-2xl bg-red-600/20 border-2 border-red-500 text-red-200 flex items-center gap-3 animate-pulse">
                        <AlertTriangle size={24} className="text-red-400 shrink-0" />
                        <div>
                            <p className="font-black text-white text-sm">Emergency Alert Triggered for this Trip</p>
                            <p className="text-xs text-red-300">AfriCab Safety Dispatch has been notified and is monitoring this unit.</p>
                        </div>
                    </div>
                )}

                {/* Status Hero Card */}
                <div className="p-6 sm:p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-400 mb-1">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                                </span>
                                Verified Passenger: {ride?.passengerName}
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black text-white">
                                {isCompleted
                                    ? "Trip Completed Safely 🎉"
                                    : isCancelled
                                    ? "Trip Cancelled"
                                    : currentStatus === "IN_PROGRESS"
                                    ? "Trip In Progress — On The Move"
                                    : currentStatus === "ARRIVED"
                                    ? "Driver Arrived at Pickup Point 🚖"
                                    : currentStatus === "ACCEPTED" || currentStatus === "EN_ROUTE"
                                    ? "Driver Assigned & En Route"
                                    : "Connecting to Verified Driver"}
                            </h1>
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                            <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block">Total Fare</span>
                            <div className="text-xl font-black text-white">{formatUSD(ride?.fare || 0)}</div>
                            <div className="text-xs font-bold text-yellow-400">≈ {formatLRD(ride?.fare || 0)}</div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {STATUS_STEPS.map((step, idx) => {
                            const isPast =
                                (step.key === "REQUESTED") ||
                                (step.key === "ACCEPTED" && ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(currentStatus)) ||
                                (step.key === "IN_PROGRESS" && ["IN_PROGRESS", "COMPLETED"].includes(currentStatus)) ||
                                (step.key === "COMPLETED" && currentStatus === "COMPLETED");

                            const isCurrent = currentStatus === step.key || (step.key === "ACCEPTED" && ["EN_ROUTE", "ARRIVED"].includes(currentStatus));

                            return (
                                <div
                                    key={step.key}
                                    className={`p-3.5 rounded-2xl border transition-all ${
                                        isCurrent
                                            ? "bg-red-600/20 border-red-500 ring-2 ring-red-500/20"
                                            : isPast
                                            ? "bg-emerald-500/10 border-emerald-500/30 text-gray-300"
                                            : "bg-white/[0.02] border-white/5 text-gray-500"
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 mb-1">
                                        {isPast ? (
                                            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                        ) : (
                                            <span className="w-3.5 h-3.5 rounded-full border border-gray-600 flex items-center justify-center text-[9px] font-black">
                                                {idx + 1}
                                            </span>
                                        )}
                                        <span className="text-xs font-black truncate">{step.label}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 leading-tight">{step.desc}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Interactive Live Map */}
                    <div className="h-80 rounded-2xl overflow-hidden border border-white/10 shadow-inner">
                        <Map
                            markers={markers}
                            routes={routes}
                            onRouteCalculated={(data) => setRouteData(data)}
                        />
                    </div>

                    {/* Route Details Card */}
                    <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center gap-1 mt-1">
                                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                                <div className="w-0.5 h-8 bg-white/20" />
                                <span className="w-3 h-3 rounded-full bg-red-400" />
                            </div>
                            <div className="space-y-4 flex-1">
                                <div>
                                    <span className="text-[10px] uppercase font-black text-gray-400 block">Pickup Point</span>
                                    <span className="text-sm font-bold text-white">{ride?.originAddress}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-black text-gray-400 block">Drop-Off Destination</span>
                                    <span className="text-sm font-bold text-yellow-400">{ride?.destAddress}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Driver & Vehicle Details (if assigned) */}
                    {ride?.driver ? (
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-white border border-white/20 p-1.5 flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
                                    <Image
                                        src="/africab-logo.png"
                                        alt="AfriCab Driver"
                                        width={48}
                                        height={48}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-black text-white">{ride.driver.name}</h3>
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                                            ★ {ride.driver.rating.toFixed(1)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-300 mt-0.5">
                                        {ride.driver.vehicleColor} {ride.driver.vehicleModel}
                                    </p>
                                </div>
                            </div>

                            <div className="px-4 py-2 bg-black/60 border border-white/10 rounded-xl text-center sm:text-right">
                                <span className="text-[10px] uppercase font-black text-gray-400 block">License Plate</span>
                                <span className="text-base font-black tracking-wider text-yellow-400">{ride.driver.licensePlate}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-xs text-gray-400">
                            Searching for the closest verified driver in Monrovia...
                        </div>
                    )}
                </div>

                {/* Safety & AfriCab Dispatch Center Card */}
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-white">AfriCab Safety &amp; Emergency Dispatch</p>
                            <p>Trip monitored 24/7 with GPS telemetry. Need assistance? Call <strong>+231-770-000000</strong></p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                        <RefreshCw size={12} className="animate-spin" /> Live telemetry active
                    </div>
                </div>
            </main>

            {/* Social Media Share Modal */}
            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                title="Share Live Route"
                description="Share live tracking with WhatsApp, Messenger, SMS, and more so loved ones can follow this ride."
                trackingUrl={typeof window !== "undefined" ? window.location.href : `/track/${rideId || ""}`}
                rideDetails={{
                    pickup: ride?.originAddress,
                    destination: ride?.destAddress,
                    passengerName: "Passenger",
                    driverName: ride?.driver?.name || "AfriCab Verified Driver",
                    vehicleInfo: `${ride?.driver?.vehicleColor || ""} ${ride?.driver?.vehicleModel || ""}`.trim(),
                    licensePlate: ride?.driver?.licensePlate,
                    eta: routeData?.eta
                }}
            />
        </div>
    );
}
