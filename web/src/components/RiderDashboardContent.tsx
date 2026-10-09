"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import AnnouncementFeed from "@/components/AnnouncementFeed";
import RideReceipt from "@/components/RideReceipt";
import { 
    MapPin, 
    Navigation, 
    Star, 
    Phone, 
    MessageSquare,
    Plus, 
    Edit2,
    SlidersHorizontal,
    Share2, 
    Check, 
    RefreshCw, 
    UserCheck, 
    CreditCard,
    Smartphone,
    X,
    Clock,
    Compass,
    Radio,
    ShieldAlert,
    Activity
} from "lucide-react";
import { formatDual } from "@/utils/currency";
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMapProvider } from "@/components/map/MapProvider";
import { NearbyDriverResult } from "@/lib/geo";
import ShareModal from "@/components/ShareModal";

// Shallow equality check for ride objects
function rideChanged(prev: any, next: any): boolean {
    if (prev === next) return false;
    if (prev == null || next == null) return prev !== next;
    return prev.id !== next.id ||
        prev.status !== next.status ||
        prev.paymentStatus !== next.paymentStatus ||
        prev.driverId !== next.driverId ||
        prev.sosAlert !== next.sosAlert ||
        (prev.driver?.currentLat !== next.driver?.currentLat) ||
        (prev.driver?.currentLng !== next.driver?.currentLng) ||
        (prev.driver?.speed !== next.driver?.speed) ||
        (prev.driver?.heading !== next.driver?.heading);
}

const Map = dynamic(() => import('@/components/MapComponent'), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full bg-slate-100 animate-pulse rounded-3xl flex items-center justify-center text-slate-400 font-bold uppercase text-xs tracking-wider border border-slate-200">
            Connecting to Live Telemetry Radar...
        </div>
    )
});

const LocationSearch = dynamic(() => import('@/components/map/LocationSearch').then(mod => mod.LocationSearch), {
    ssr: false
});

interface RiderDashboardContentProps {
    user: any;
}

export default function RiderDashboardContent({ user }: RiderDashboardContentProps) {
    const [activeRide, setActiveRide] = useState<any>(null);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [serviceMode, setServiceMode] = useState<"Transport" | "Taxi" | "Delivery">("Taxi");
    const [selectedTier, setSelectedTier] = useState<"Standard" | "Comfort" | "Business">("Standard");
    const [shareLocation, setShareLocation] = useState(true);
    
    const [bookingData, setBookingData] = useState({
        pickup: "2578 Bergen Blvd, Sinkor",
        destination: "1417 West End Ave, Monrovia",
        paymentMethod: "MOMO",
        paymentPhone: user?.phone || "+231 88 123 4567"
    });

    const [fareEstimate, setFareEstimate] = useState(27.00);
    const [routeData, setRouteData] = useState<{distance: string, eta: string} | null>({
        distance: "4.8 km",
        eta: "19 min"
    });
    
    const [ratingSubmitted, setRatingSubmitted] = useState(false);
    const [isSosModalOpen, setIsSosModalOpen] = useState(false);
    const [sosLoading, setSosLoading] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [copiedShareLink, setCopiedShareLink] = useState(false);
    const [showChatModal, setShowChatModal] = useState(false);
    const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([
        { sender: "driver", text: "Hello! I am on my way to your pickup location.", time: "Just now" }
    ]);
    const [chatInput, setChatInput] = useState("");

    // Nearby Driver Discovery State
    const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriverResult[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<NearbyDriverResult | null>(null);
    const [searchRadiusKm, setSearchRadiusKm] = useState(5);
    const [isFetchingDrivers, setIsFetchingDrivers] = useState(false);
    const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number }>({
        lat: 6.3156,
        lng: -10.8074
    });

    const prevRideRef = React.useRef<any>(undefined);
    const { locationProvider } = useMapProvider();

    const userCoordinatesRef = React.useRef(userCoordinates);
    const activeRideIdRef = React.useRef<string | undefined>(undefined);
    const userIdRef = React.useRef<string | undefined>(user?.id);

    useEffect(() => { userCoordinatesRef.current = userCoordinates; }, [userCoordinates]);
    useEffect(() => { activeRideIdRef.current = activeRide?.id; }, [activeRide?.id]);
    useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);

    // 1. Geolocation on Mount
    useEffect(() => {
        if (typeof window !== "undefined" && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserCoordinates({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                },
                () => {},
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    }, []);

    // 2. Fetch Nearby Drivers
    const fetchNearbyDrivers = useCallback(async (lat: number, lng: number, radius: number) => {
        setIsFetchingDrivers(true);
        try {
            const params = new URLSearchParams({
                lat: lat.toString(),
                lng: lng.toString(),
                radius: radius.toString(),
            });
            const res = await fetch(`/api/drivers/nearby?${params.toString()}`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.drivers && Array.isArray(data.drivers)) {
                    setNearbyDrivers(data.drivers);
                }
            }
        } catch {
        } finally {
            setIsFetchingDrivers(false);
        }
    }, []);

    useEffect(() => {
        fetchNearbyDrivers(userCoordinates.lat, userCoordinates.lng, searchRadiusKm);
        const interval = setInterval(() => {
            fetchNearbyDrivers(userCoordinates.lat, userCoordinates.lng, searchRadiusKm);
        }, 10000);
        return () => clearInterval(interval);
    }, [userCoordinates, searchRadiusKm, fetchNearbyDrivers]);

    // 3. Real-Time SSE Stream
    useEffect(() => {
        let eventSource: EventSource | null = null;
        try {
            eventSource = new EventSource("/api/rides/stream");

            eventSource.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    const { type, data, rideId: eventRideId } = parsed;

                    if (type === "LOCATION_UPDATED" && data) {
                        setActiveRide((prev: any) => {
                            if (prev && (prev.driverId === data.driverId || prev.driver?.id === data.driverId || prev.driver?.userId === data.userId)) {
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
                            }
                            return prev;
                        });
                    }

                    if (["RIDE_ACCEPTED", "DRIVER_ARRIVED", "RIDE_UPDATED", "DRIVER_ASSIGNED"].includes(type)) {
                        const myId = userIdRef.current;
                        const myRideId = activeRideIdRef.current;
                        if (data && (data.riderId === myId || data.id === myRideId || eventRideId === myRideId)) {
                            setActiveRide(data);
                        }
                    }
                } catch {}
            };
        } catch {}

        return () => {
            if (eventSource) eventSource.close();
        };
    }, []);

    const handleTriggerSOS = async () => {
        if (!activeRide) return;
        setSosLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/rides/${activeRide.id}/sos`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    lat: activeRide.originLat,
                    lng: activeRide.originLng,
                    reporterRole: "RIDER",
                    reason: "Passenger triggered emergency SOS."
                })
            });

            if (res.ok) {
                setActiveRide((prev: any) => ({ ...prev, sosAlert: true }));
            }
        } catch (e) {
            console.error("SOS failed", e);
        } finally {
            setSosLoading(false);
        }
    };

    const handleSubmitRating = async (stars: number, feedback: string) => {
        if (!activeRide || stars === 0) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/reviews", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    rideId: activeRide.id,
                    rating: stars,
                    comment: feedback,
                    targetRole: "DRIVER"
                })
            });
            if (res.ok) {
                setRatingSubmitted(true);
            }
        } catch (e) {
            console.error("Submit rating error:", e);
        }
    };

    const geocodeAddress = async (address: string) => {
        return locationProvider.geocode(address);
    };

    const handleRouteCalculated = (data: {distance: string, eta: string}) => {
        setRouteData(data);
    };

    // Calculate Dynamic Price based on Tier
    const tierPrices = {
        Standard: 27.00,
        Comfort: 35.00,
        Business: 52.00
    };

    const tierETAs = {
        Standard: "3 min",
        Comfort: "8 min",
        Business: "15 min"
    };

    const fetchRides = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/rides", {
                headers: {
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                const myActive = data.find(r => 
                    ["REQUESTED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(r.status) &&
                    !r.isArchived
                );
                
                if (myActive && myActive.status === "COMPLETED" && (!activeRide || activeRide.status !== "COMPLETED")) {
                    setRatingSubmitted(false);
                }
                
                if (rideChanged(prevRideRef.current, myActive)) {
                    prevRideRef.current = myActive;
                    setActiveRide(myActive);
                }
            }
        } catch (error) {
            console.error("Failed to fetch rides", error);
        }
    }, [activeRide]);

    useEffect(() => {
        if (user) {
            fetchRides();
            const interval = setInterval(() => fetchRides(), 8000);
            return () => clearInterval(interval);
        }
    }, [user, fetchRides]);

    const handleBookRide = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!bookingData.pickup || !bookingData.destination) {
            alert("Please enter both pickup and destination.");
            return;
        }

        setBookingLoading(true);
        
        try {
            const pickupCoords = await geocodeAddress(bookingData.pickup) || { lat: 6.3156, lng: -10.8074 };
            const destCoords = await geocodeAddress(bookingData.destination) || { lat: 6.3000, lng: -10.7900 };

            const selectedFare = tierPrices[selectedTier] || 27.00;
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

            const res = await fetch("/api/rides", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    riderId: user?.id,
                    originAddress: bookingData.pickup,
                    destAddress: bookingData.destination,
                    originLat: pickupCoords.lat,
                    originLng: pickupCoords.lng,
                    destLat: destCoords.lat,
                    destLng: destCoords.lng,
                    vehicleType: "Car",
                    rideCategory: selectedTier,
                    paymentMethod: bookingData.paymentMethod,
                    customerPaymentPhone: bookingData.paymentPhone || user?.phone || "+231 88 123 4567",
                    driverId: selectedDriver ? selectedDriver.id : undefined,
                    fare: selectedFare
                })
            });

            if (res.ok) {
                const newRide = await res.json();
                setActiveRide(newRide);
            } else {
                const error = await res.json();
                // If unauthorized or error, try guest endpoint fallback so user request isn't blocked
                try {
                    const guestRes = await fetch("/api/rides/guest", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            pickup: bookingData.pickup,
                            destination: bookingData.destination,
                            originLat: pickupCoords.lat,
                            originLng: pickupCoords.lng,
                            destLat: destCoords.lat,
                            destLng: destCoords.lng,
                            vehicleType: "Car",
                            rideCategory: selectedTier,
                            payment: bookingData.paymentMethod,
                            guestName: user?.name || "Rider",
                            phone: bookingData.paymentPhone || user?.phone || "0880000000",
                            driverId: selectedDriver ? selectedDriver.id : undefined,
                            fare: selectedFare
                        })
                    });
                    if (guestRes.ok) {
                        const guestRide = await guestRes.json();
                        setActiveRide(guestRide);
                        return;
                    }
                } catch {}
                alert(error.error || "Failed to book ride");
            }
        } catch (error: any) {
            alert(error.message || "An error occurred while booking.");
        } finally {
            setBookingLoading(false);
        }
    };

    const handleCancelRide = async () => {
        if (!activeRide) return;
        if (!confirm("Are you sure you want to cancel this ride?")) return;
        try {
            const res = await fetch("/api/rides", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: activeRide.id, status: "CANCELLED" })
            });
            if (res.ok) {
                setActiveRide(null);
            }
        } catch (e) {
            console.error("Cancel ride error", e);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        setChatMessages(prev => [...prev, { sender: "user", text: chatInput, time: "Just now" }]);
        setChatInput("");
    };

    // Construct Markers for Map
    const mapMarkers: any[] = [];
    if (activeRide) {
        if (activeRide.driver?.currentLat && activeRide.driver?.currentLng) {
            mapMarkers.push({
                id: "assigned_driver",
                lat: activeRide.driver.currentLat,
                lng: activeRide.driver.currentLng,
                title: activeRide.driver.user?.name || "Assigned Driver",
                subtitle: activeRide.status === "ARRIVED" ? "Driver Arrived" : "Driver En Route",
                type: "ASSIGNED_DRIVER",
                vehicleType: "Car",
                heading: activeRide.driver.heading || 0,
                rating: activeRide.driver.rating || 4.9,
            });
        }
        mapMarkers.push({
            id: "pickup",
            lat: activeRide.originLat || 6.3156,
            lng: activeRide.originLng || -10.8074,
            title: "Pick up",
            subtitle: activeRide.originAddress,
            type: "PICKUP",
        });
        mapMarkers.push({
            id: "dest",
            lat: activeRide.destLat || 6.3000,
            lng: activeRide.destLng || -10.7900,
            title: "Destination",
            subtitle: activeRide.destAddress,
            type: "DESTINATION",
        });
    } else {
        mapMarkers.push({
            id: "my_location",
            lat: userCoordinates.lat,
            lng: userCoordinates.lng,
            title: "Your Location",
            subtitle: bookingData.pickup,
            type: "PICKUP",
        });

        nearbyDrivers.forEach((driver) => {
            mapMarkers.push({
                id: `driver_${driver.id}`,
                lat: driver.lat,
                lng: driver.lng,
                title: driver.name,
                subtitle: `${driver.vehicleColor || ""} ${driver.vehicleModel || "Sedan"}`,
                licensePlate: driver.licensePlate || undefined,
                rating: driver.rating,
                distanceText: driver.formattedDistance,
                etaText: driver.formattedEta,
                type: "AVAILABLE_DRIVER",
                vehicleType: "Car",
                heading: driver.heading || 0,
            });
        });
    }

    // Construct Routes
    const mapRoutes: any[] = [];
    if (activeRide) {
        mapRoutes.push({
            id: "active-trip-route",
            origin: [activeRide.originLat || 6.3156, activeRide.originLng || -10.8074] as [number, number],
            destination: [activeRide.destLat || 6.3000, activeRide.destLng || -10.7900] as [number, number],
            color: "#0f172a",
        });
    }

    return (
        <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
            {/* Top Navigation & Status Bar */}
            <header className="border-b border-slate-100 bg-white sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-2xl bg-amber-400 p-1 flex items-center justify-center shadow-sm overflow-hidden">
                        <Image
                            src="/africab-logo.png"
                            alt="AfriCab Logo"
                            width={40}
                            height={40}
                            className="w-full h-full object-contain"
                            priority
                        />
                    </div>
                    <div>
                        <h1 className="text-base font-black text-slate-950 tracking-tight leading-tight flex items-center gap-1.5">
                            AfriCab <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Live</span>
                        </h1>
                        <p className="text-[11px] text-slate-500 font-medium">Anytime, anywhere</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {nearbyDrivers.length > 0 ? `${nearbyDrivers.length} Cars Nearby` : "Monrovia Fleet Active"}
                    </span>
                </div>
            </header>

            {/* Main Interactive Screen */}
            <main className="flex-1 relative flex flex-col md:flex-row min-h-[calc(100vh-65px)]">
                {/* Left/Main Side: Interactive Map Visual */}
                <div className="flex-1 w-full h-[380px] md:h-full md:min-h-[calc(100vh-65px)] relative z-0 bg-slate-100">
                    <Map 
                        fullScreen={false}
                        center={[userCoordinates.lat, userCoordinates.lng]}
                        zoom={13}
                        onRouteCalculated={handleRouteCalculated}
                        markers={mapMarkers}
                        routes={mapRoutes}
                    />

                    {/* Floating Back / Home Button */}
                    <div className="absolute top-4 left-4 z-10">
                        <button
                            type="button"
                            onClick={() => window.location.href = "/"}
                            className="w-11 h-11 rounded-full bg-white text-slate-900 shadow-lg flex items-center justify-center border border-slate-100 hover:bg-slate-50 transition-all"
                        >
                            <span className="text-lg font-black">←</span>
                        </button>
                    </div>
                </div>

                {/* Right Side: Clean White Bottom/Side Sheet (Exact Design from Reference Photos) */}
                <div className="w-full md:w-[480px] lg:w-[520px] bg-white border-t md:border-t-0 md:border-l border-slate-200 z-10 flex flex-col justify-between shadow-2xl p-5 sm:p-7 overflow-y-auto">
                    
                {/* CASE 1: Ride Completed -> Show Official Receipt as Full-Screen Modal */}
                {activeRide && activeRide.status === "COMPLETED" && (
                    <div
                        className="fixed inset-0 z-[300] bg-slate-900/70 backdrop-blur-sm overflow-y-auto flex"
                        onClick={(e) => { if (e.target === e.currentTarget) setActiveRide(null); }}
                    >
                        <div className="w-full max-w-xl mx-auto my-6 px-4">
                            <RideReceipt
                                ride={activeRide}
                                role="CUSTOMER"
                                onClose={() => setActiveRide(null)}
                                onSubmitRating={handleSubmitRating}
                                ratingSubmitted={ratingSubmitted}
                            />
                        </div>
                    </div>
                )}

                    {/* CASE 2: Active Ride Tracking -> Exact Match with Image 3 */}
                    {activeRide && activeRide.status !== "COMPLETED" && (
                        <div className="space-y-6">
                            {/* Top Drag Handle */}
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-2" />

                            {/* Header: Vehicle Name, Arrival ETA, License Plate Badge & Car Photo */}
                            <div className="flex items-start justify-between gap-4 pt-1">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-slate-950 tracking-tight leading-tight">
                                        {activeRide.driver?.vehicleColor || "Black"} {activeRide.driver?.vehicleModel || "Toyota Corolla"}
                                    </h2>
                                    <p className="text-sm font-semibold text-slate-600">
                                        {activeRide.status === "ARRIVED" ? "driver has arrived!" : "arriving in 5 min"}
                                    </p>
                                    <div className="pt-2">
                                        <span className="inline-block font-mono font-black text-sm text-slate-900 border-2 border-slate-900 px-3 py-1 rounded-xl tracking-wider">
                                            {activeRide.driver?.licensePlate || "C 3555 OE"}
                                        </span>
                                    </div>
                                </div>

                                <div className="w-32 h-20 relative shrink-0">
                                    <Image
                                        src="/assets/cars/black_sedan.jpg"
                                        alt="Vehicle"
                                        fill
                                        className="object-contain"
                                        priority
                                    />
                                </div>
                            </div>

                            {/* Driver Profile Row: Avatar, Name, Rating, Chat & Call Action Buttons */}
                            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-13 h-13 rounded-full overflow-hidden relative border-2 border-white shadow-sm shrink-0">
                                        <Image
                                            src="/assets/cars/driver_portrait.jpg"
                                            alt="Driver Avatar"
                                            width={52}
                                            height={52}
                                            className="object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-950">
                                            {activeRide.driver?.user?.name || "Harry Parker"}
                                        </h3>
                                        <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                                            <Star size={13} className="fill-amber-400 text-amber-400" />
                                            <span>4.9</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowChatModal(true)}
                                        className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm"
                                    >
                                        <MessageSquare size={18} />
                                    </button>
                                    <a
                                        href={`tel:${activeRide.driver?.user?.phone || "+231880123456"}`}
                                        className="w-11 h-11 rounded-2xl bg-white border border-slate-200 text-slate-900 flex items-center justify-center hover:bg-slate-100 transition-colors shadow-sm"
                                    >
                                        <Phone size={18} />
                                    </a>
                                </div>
                            </div>

                            <div className="border-t border-slate-100" />

                            {/* Trip Route Details with Pencil Edit Icons */}
                            <div className="space-y-4">
                                {/* Pickup */}
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                            <MapPin size={15} className="text-slate-800" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase block">Pick up</span>
                                            <p className="text-sm font-bold text-slate-900 truncate">{activeRide.originAddress}</p>
                                        </div>
                                    </div>
                                    <button type="button" className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 transition-colors">
                                        <Edit2 size={14} />
                                    </button>
                                </div>

                                {/* Add Stop Option */}
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                            <Plus size={15} className="text-slate-800" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">Add stop</p>
                                    </div>
                                    <button type="button" className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 transition-colors">
                                        <Edit2 size={14} />
                                    </button>
                                </div>

                                {/* Destination */}
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                            <Navigation size={15} className="text-slate-800" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase block">Destination</span>
                                            <p className="text-sm font-bold text-slate-900 truncate">{activeRide.destAddress}</p>
                                        </div>
                                    </div>
                                    <button type="button" className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 transition-colors">
                                        <Edit2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-slate-100" />

                            {/* Share Location Toggle Row */}
                            <div className="flex items-center justify-between py-1">
                                <span className="text-sm font-black text-slate-900">Share my location to driver</span>
                                <button
                                    type="button"
                                    onClick={() => setShareLocation(!shareLocation)}
                                    className={cn(
                                        "w-13 h-7 rounded-full p-1 transition-colors relative flex items-center",
                                        shareLocation ? "bg-amber-400 justify-end" : "bg-slate-200 justify-start"
                                    )}
                                >
                                    <span className="w-5 h-5 rounded-full bg-white shadow-md inline-block" />
                                </button>
                            </div>

                            {/* Payment Method Row */}
                            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                                <div>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase block">Payment Method</span>
                                    <p className="text-sm font-black text-slate-900">
                                        {activeRide.paymentMethod || "MTN MoMo"} • {activeRide.customerPaymentPhone || user?.phone || "**** 4568"}
                                    </p>
                                </div>
                                <button type="button" className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shadow-sm">
                                    <Edit2 size={14} />
                                </button>
                            </div>

                            {/* Share Live Route Button */}
                            <button
                                type="button"
                                onClick={() => setShareModalOpen(true)}
                                className="w-full py-3.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer active:scale-98"
                            >
                                <Share2 size={15} /> Share Live Route
                            </button>

                            {/* Bottom Dual Action Buttons: Cancel Ride & New Request */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={handleCancelRide}
                                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <X size={16} /> Cancel ride
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveRide(null)}
                                    className="flex-1 py-4 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <Plus size={16} /> New request
                                </button>
                            </div>
                        </div>
                    )}

                    {/* CASE 3: Booking Form -> Exact Match with Image 2 */}
                    {!activeRide && (
                        <div className="space-y-6">
                            {/* Top Drag Handle */}
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-2" />

                            {/* Service Category Pills: [ Transport ] [ Taxi ] [ Delivery ] */}
                            <div className="flex gap-2">
                                {(["Transport", "Taxi", "Delivery"] as const).map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setServiceMode(cat)}
                                        className={cn(
                                            "flex-1 py-2.5 rounded-full text-xs font-black transition-all",
                                            serviceMode === cat
                                                ? "bg-slate-900 text-white shadow-sm"
                                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                        )}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Route Input Box (Pickup & Destination with ETA) */}
                            <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-100 space-y-3">
                                {/* Pickup */}
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center shrink-0">
                                        <MapPin size={14} />
                                    </div>
                                    <input 
                                        type="text"
                                        value={bookingData.pickup}
                                        onChange={(e) => setBookingData({ ...bookingData, pickup: e.target.value })}
                                        placeholder="Enter pickup location"
                                        className="flex-1 bg-transparent font-bold text-sm text-slate-900 outline-none placeholder:text-slate-400"
                                    />
                                </div>

                                <div className="ml-3 border-l-2 border-dashed border-slate-300 h-3" />

                                {/* Destination */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                                            <Navigation size={12} className="transform rotate-45" />
                                        </div>
                                        <input 
                                            type="text"
                                            value={bookingData.destination}
                                            onChange={(e) => setBookingData({ ...bookingData, destination: e.target.value })}
                                            placeholder="Enter destination"
                                            className="flex-1 bg-transparent font-bold text-sm text-slate-900 outline-none placeholder:text-slate-400"
                                        />
                                    </div>
                                    
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs font-bold text-slate-500">{routeData?.eta || "19 min"}</span>
                                        <button type="button" className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center justify-center font-black">
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle Cards Carousel / Selector (Exact Match with Image 2) */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">Select Vehicle Tier</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2.5">
                                    {/* Standard Card (White Car) */}
                                    <div
                                        onClick={() => setSelectedTier("Standard")}
                                        className={cn(
                                            "p-3 rounded-2xl transition-all cursor-pointer flex flex-col justify-between h-44 relative overflow-hidden",
                                            selectedTier === "Standard"
                                                ? "bg-slate-950 text-white shadow-xl ring-2 ring-slate-950"
                                                : "bg-slate-100 hover:bg-slate-200/80 text-slate-900"
                                        )}
                                    >
                                        <p className="font-black text-xs">Standard</p>
                                        
                                        <div className="w-full h-16 relative my-1">
                                            <Image
                                                src="/assets/cars/white_sedan.jpg"
                                                alt="Standard"
                                                fill
                                                className="object-contain"
                                            />
                                        </div>

                                        <div>
                                            <p className="text-base font-black leading-tight">$ 27.00</p>
                                            <p className={cn("text-[10px] font-bold mt-0.5", selectedTier === "Standard" ? "text-slate-300" : "text-slate-500")}>
                                                3 min
                                            </p>
                                        </div>
                                    </div>

                                    {/* Comfort Card (Red Car) */}
                                    <div
                                        onClick={() => setSelectedTier("Comfort")}
                                        className={cn(
                                            "p-3 rounded-2xl transition-all cursor-pointer flex flex-col justify-between h-44 relative overflow-hidden",
                                            selectedTier === "Comfort"
                                                ? "bg-slate-950 text-white shadow-xl ring-2 ring-slate-950"
                                                : "bg-slate-100 hover:bg-slate-200/80 text-slate-900"
                                        )}
                                    >
                                        <p className="font-black text-xs">Comfort</p>
                                        
                                        <div className="w-full h-16 relative my-1">
                                            <Image
                                                src="/assets/cars/red_sedan.jpg"
                                                alt="Comfort"
                                                fill
                                                className="object-contain"
                                            />
                                        </div>

                                        <div>
                                            <p className="text-base font-black leading-tight">$ 35.00</p>
                                            <p className={cn("text-[10px] font-bold mt-0.5", selectedTier === "Comfort" ? "text-slate-300" : "text-slate-500")}>
                                                8 min
                                            </p>
                                        </div>
                                    </div>

                                    {/* Business Card (Black Luxury Car) */}
                                    <div
                                        onClick={() => setSelectedTier("Business")}
                                        className={cn(
                                            "p-3 rounded-2xl transition-all cursor-pointer flex flex-col justify-between h-44 relative overflow-hidden",
                                            selectedTier === "Business"
                                                ? "bg-slate-950 text-white shadow-xl ring-2 ring-slate-950"
                                                : "bg-slate-100 hover:bg-slate-200/80 text-slate-900"
                                        )}
                                    >
                                        <p className="font-black text-xs">Business</p>
                                        
                                        <div className="w-full h-16 relative my-1">
                                            <Image
                                                src="/assets/cars/black_sedan.jpg"
                                                alt="Business"
                                                fill
                                                className="object-contain"
                                            />
                                        </div>

                                        <div>
                                            <p className="text-base font-black leading-tight">$ 52.00</p>
                                            <p className={cn("text-[10px] font-bold mt-0.5", selectedTier === "Business" ? "text-slate-300" : "text-slate-500")}>
                                                15 min
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method Selector Row */}
                            <div className="p-3.5 bg-slate-100 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-slate-200/70 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center -space-x-1.5">
                                        <span className="w-4 h-4 rounded-full bg-red-500 inline-block" />
                                        <span className="w-4 h-4 rounded-full bg-amber-400 inline-block" />
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-900">
                                        •••• 4568 ({bookingData.paymentMethod === "ORANGE" ? "Orange Money" : "MTN MoMo"})
                                    </span>
                                </div>
                                <span className="text-slate-500 font-black text-sm">›</span>
                            </div>

                            {/* Bottom Dual Action: Golden Yellow 'Request' Button + Filter Button */}
                            <div className="flex items-center gap-3 pt-1">
                                <button
                                    type="button"
                                    disabled={bookingLoading}
                                    onClick={() => handleBookRide()}
                                    className="flex-1 py-4 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-2xl font-black text-base transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
                                >
                                    {bookingLoading ? (
                                        <span className="flex items-center gap-2">
                                            <RefreshCw className="animate-spin" size={18} /> Requesting...
                                        </span>
                                    ) : (
                                        "Request"
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setSearchRadiusKm(prev => prev === 5 ? 15 : 5)}
                                    className="w-14 h-14 rounded-2xl bg-slate-950 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-md shrink-0"
                                    title="Search Settings"
                                >
                                    <SlidersHorizontal size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* In-Ride Live Chat Drawer / Modal */}
            {showChatModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 border border-slate-200 flex flex-col h-[480px]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full overflow-hidden relative">
                                    <Image src="/assets/cars/driver_portrait.jpg" alt="Driver" width={32} height={32} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-900">Harry Parker</h4>
                                    <p className="text-[10px] text-emerald-600 font-bold">Online</p>
                                </div>
                            </div>
                            <button onClick={() => setShowChatModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={cn("flex flex-col", msg.sender === "user" ? "items-end" : "items-start")}>
                                    <div className={cn(
                                        "px-4 py-2.5 rounded-2xl text-xs font-medium max-w-[80%]",
                                        msg.sender === "user" ? "bg-amber-400 text-slate-950 font-bold rounded-tr-none" : "bg-slate-100 text-slate-900 rounded-tl-none"
                                    )}>
                                        {msg.text}
                                    </div>
                                    <span className="text-[9px] text-slate-400 mt-1">{msg.time}</span>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-100 flex gap-2">
                            <input 
                                type="text" 
                                value={chatInput} 
                                onChange={(e) => setChatInput(e.target.value)} 
                                placeholder="Type a message to driver..."
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-900"
                            />
                            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Social Media Share Live Route Modal */}
            {activeRide && (
                <ShareModal
                    isOpen={shareModalOpen}
                    onClose={() => setShareModalOpen(false)}
                    title="Share Live Route"
                    description="Share live tracking with WhatsApp, Messenger, SMS, and more so loved ones can follow your ride."
                    trackingUrl={typeof window !== "undefined" ? `${window.location.origin}/track/${activeRide.id}` : `/track/${activeRide.id}`}
                    rideDetails={{
                        pickup: activeRide.originAddress,
                        destination: activeRide.destAddress,
                        passengerName: user?.name || "Rider",
                        driverName: activeRide.driver?.user?.name || "Verified AfriCab Driver",
                        vehicleInfo: `${activeRide.driver?.vehicleColor || ""} ${activeRide.driver?.vehicleModel || ""}`.trim(),
                        licensePlate: activeRide.driver?.licensePlate,
                        eta: routeData?.eta
                    }}
                />
            )}
        </div>
    );
}
