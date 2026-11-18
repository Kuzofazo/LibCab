"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import AnnouncementFeed from "@/components/AnnouncementFeed";
import RideReceipt from "@/components/RideReceipt";
import {
    Car,
    Navigation,
    Shield,
    Star,
    DollarSign,
    Activity,
    Power,
    MapPin,
    Clock,
    TrendingUp,
    ShieldAlert,
    Phone,
    CheckCircle2,
    FileText,
    RefreshCw,
    Wifi,
    WifiOff,
    Bell,
    Volume2,
    AlertTriangle,
    KeyRound,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    Sparkles,
    Wallet,
    ArrowDownLeft,
    ArrowUpRight,
    PlusCircle,
    XCircle,
    TrendingDown,
    Banknote,
    History
} from "lucide-react";
import { formatDual } from "@/utils/currency";
import type { MapMarker } from "@/components/MapComponent";

const MOTIVATIONAL_MESSAGES = [
    "Every Ride Counts. Every Customer Matters.",
    "Drive Safely. Arrive Successfully.",
    "Your Service Makes a Difference.",
    "Every Journey Is an Opportunity.",
    "Stay Focused. Drive Smart. Earn More.",
    "Great Service Builds Great Reputation.",
    "Your Next Ride Could Make Someone’s Day.",
    "Safety First, Excellence Always."
];

const MapComponent = dynamic(() => import("@/components/MapComponent"), { ssr: false });

interface DriverDashboardContentProps {
    user: any;
}

export default function DriverDashboardContent({ user }: DriverDashboardContentProps) {
    const [activeRide, setActiveRide] = useState<any>(null);
    const [availableRides, setAvailableRides] = useState<any[]>([]);
    const [completedRides, setCompletedRides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [approvalStatus, setApprovalStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">(
        user?.approvalStatus || "APPROVED"
    );
    const [rejectionReason, setRejectionReason] = useState<string | null>(
        user?.rejectionReason || null
    );
    const [isOnline, setIsOnline] = useState(user?.approvalStatus === "APPROVED" || !user?.approvalStatus);
    const [earningsPeriod, setEarningsPeriod] = useState<"TODAY" | "WEEKLY">("TODAY");
    const [myCoords, setMyCoords] = useState<{ lat: number; lng: number }>(() => {
        const dLat = user?.driverProfile?.currentLat || user?.currentLat;
        const dLng = user?.driverProfile?.currentLng || user?.currentLng;
        if (dLat && dLng) return { lat: Number(dLat), lng: Number(dLng) };
        return { lat: 6.3156, lng: -10.8074 };
    });
    const [showDirectionsPrompt, setShowDirectionsPrompt] = useState(false);

    // ─── Google Maps Navigation Universal Redirect Helper ──────────────────
    const openGoogleMapsNavigation = useCallback((targetLat?: number, targetLng?: number, address?: string) => {
        let url = "";
        if (targetLat && targetLng) {
            url = `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}&travelmode=driving&dir_action=navigate`;
        } else if (address) {
            url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving&dir_action=navigate`;
        } else if (myCoords) {
            url = `https://www.google.com/maps/@${myCoords.lat},${myCoords.lng},16z`;
        } else {
            url = `https://www.google.com/maps/@6.3156,-10.8074,16z`;
        }

        if (typeof window !== "undefined") {
            window.open(url, "_blank", "noopener,noreferrer");
        }
    }, [myCoords]);

    const [gpsBroadcasting, setGpsBroadcasting] = useState(false);
    const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [completingTrip, setCompletingTrip] = useState(false);
    const [incomingOffer, setIncomingOffer] = useState<{
        rideId: string;
        bookingReference?: string;
        customerName: string;
        customerPhone?: string;
        originAddress: string;
        destAddress: string;
        originLat?: number;
        originLng?: number;
        destLat?: number;
        destLng?: number;
        fare: number;
        distanceKm: number;
        etaMinutes: number;
        vehicleType?: string;
        rideCategory?: string;
        paymentMethod?: string;
        acPreference?: string;
        atmospherePreference?: string;
        luggageAssistance?: boolean;
        notes?: string;
        countdown: number;
    } | null>(null);

    // Helper: Normalize incoming offer payload with full passenger & trip details
    const buildIncomingOffer = useCallback((raw: any, fallbackCountdown = 45) => {
        const ride = raw?.ride || raw || {};
        const cName = ride.rider?.name || ride.guestName || raw?.guestName || raw?.clientName || "Passenger";
        const cPhone = ride.customerPaymentPhone || ride.guestPhone || ride.rider?.phone || "";
        return {
            rideId: ride.id || raw?.rideId || "",
            bookingReference: ride.bookingReference || (ride.id ? ride.id.slice(-6).toUpperCase() : ""),
            customerName: cName,
            customerPhone: cPhone,
            originAddress: ride.originAddress || "Pickup Location",
            destAddress: ride.destAddress || "Destination",
            originLat: ride.originLat,
            originLng: ride.originLng,
            destLat: ride.destLat,
            destLng: ride.destLng,
            fare: ride.fare !== undefined && ride.fare !== null ? Number(ride.fare) : 5.0,
            distanceKm: Number(raw?.distanceKm || ride.distanceKm || 1.8),
            etaMinutes: Number(raw?.etaMinutes || ride.etaMinutes || 4),
            vehicleType: ride.vehicleType || "Car",
            rideCategory: ride.rideCategory || "Regular",
            paymentMethod: ride.paymentMethod || "MOMO",
            acPreference: ride.acPreference,
            atmospherePreference: ride.atmospherePreference,
            luggageAssistance: Boolean(ride.luggageAssistance),
            notes: ride.notes,
            countdown: raw?.countdownSeconds || fallbackCountdown,
        };
    }, []);

    const [pushPermission, setPushPermission] = useState<string>("default");
    const [testingPush, setTestingPush] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
    const incomingOfferRef = useRef<any>(null);
    incomingOfferRef.current = incomingOffer;
    const activeRideRef = useRef<any>(null);
    activeRideRef.current = activeRide;

    // ─── Driver-Initiated & Customer Cancellation States ─────────────────────
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("Passenger no-show / uncontactable");
    const [cancelCustomReason, setCancelCustomReason] = useState("");
    const [cancelReturnToPool, setCancelReturnToPool] = useState(true);
    const [isCancellingTrip, setIsCancellingTrip] = useState(false);
    const [cancelledRideAlert, setCancelledRideAlert] = useState<{
        rideId: string;
        reference: string;
        clientName: string;
        reason: string;
        cancelledBy: string;
    } | null>(null);

    const [acceptingRideId, setAcceptingRideId] = useState<string | null>(null);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [driverProfileId, setDriverProfileId] = useState<string | null>(user?.driverProfileId || null);
    const [viewingReceiptRide, setViewingReceiptRide] = useState<any>(null);

    // ─── Wallet State ───────────────────────────────────────────────────────
    const [walletData, setWalletData] = useState<any>(null);
    const [walletLoading, setWalletLoading] = useState(false);
    const [showWalletTab, setShowWalletTab] = useState(false);
    const [fundingAmount, setFundingAmount] = useState("");
    const [fundingProvider, setFundingProvider] = useState<"MTN" | "ORANGE">("MTN");
    const [fundingPhone, setFundingPhone] = useState("");
    const [fundingLoading, setFundingLoading] = useState(false);
    const [fundingResult, setFundingResult] = useState<{ success: boolean; message: string } | null>(null);
    const [walletInsufficientAlert, setWalletInsufficientAlert] = useState<{
        balance: number;
        minBalance: number;
        shortfall: number;
    } | null>(null);

    // Rotating Motivational Message State
    const [msgIndex, setMsgIndex] = useState(0);
    const [msgFade, setMsgFade] = useState<"in" | "out">("in");

    // Password Management & User State
    const [currentUser, setCurrentUser] = useState(user);
    const driverFullName = currentUser?.name || user?.name || "Driver Partner";
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(Boolean(user?.forcePasswordChange));
    const [currentPass, setCurrentPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [passSubmitting, setPassSubmitting] = useState(false);
    const [passError, setPassError] = useState("");
    const [passSuccess, setPassSuccess] = useState("");

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassError("");
        setPassSuccess("");

        if (!currentPass) {
            setPassError("Please enter your current or temporary password.");
            return;
        }
        if (newPass.length < 6) {
            setPassError("New password must be at least 6 characters long.");
            return;
        }
        if (newPass !== confirmPass) {
            setPassError("New password and confirmation do not match.");
            return;
        }
        if (newPass === currentPass) {
            setPassError("New password cannot be the same as your current password.");
            return;
        }

        setPassSubmitting(true);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    currentPassword: currentPass,
                    newPassword: newPass,
                    confirmPassword: confirmPass,
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to update password");
            }

            if (data.token) localStorage.setItem("token", data.token);
            if (data.user) {
                localStorage.setItem("user", JSON.stringify(data.user));
                setCurrentUser(data.user);
            } else {
                const updated = { ...currentUser, forcePasswordChange: false };
                localStorage.setItem("user", JSON.stringify(updated));
                setCurrentUser(updated);
            }

            setPassSuccess("Password updated successfully! You can now use your new password.");
            setCurrentPass("");
            setNewPass("");
            setConfirmPass("");
            setTimeout(() => {
                setIsPasswordModalOpen(false);
                setPassSuccess("");
            }, 1500);
        } catch (err: any) {
            setPassError(err.message || "Failed to change password. Please check your current password.");
        } finally {
            setPassSubmitting(false);
        }
    };

    // Web Audio Synthesizer: 2-tone harmonic chime (880Hz -> 1174Hz)
    const playChimeSound = useCallback(() => {
        try {
            if (typeof window === "undefined") return;
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = audioContextRef.current || new AudioCtx();
            audioContextRef.current = ctx;
            if (ctx.state === "suspended") {
                ctx.resume();
            }

            const now = ctx.currentTime;
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(880, now);
            gain1.gain.setValueAtTime(0.4, now);
            gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.35);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(1174.66, now + 0.16);
            gain2.gain.setValueAtTime(0.4, now + 0.16);
            gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.16);
            osc2.stop(now + 0.6);

            if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate([400, 200, 400]);
            }
        } catch (e) {
            console.warn("Chime playback notice:", e);
        }
    }, []);

    // Web Audio Synthesizer: 3-tone descending cancellation alert (550Hz -> 380Hz -> 240Hz)
    const playCancelSound = useCallback(() => {
        try {
            if (typeof window === "undefined") return;
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = audioContextRef.current || new AudioCtx();
            audioContextRef.current = ctx;
            if (ctx.state === "suspended") {
                ctx.resume();
            }

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(550, now);
            osc.frequency.setValueAtTime(380, now + 0.15);
            osc.frequency.setValueAtTime(240, now + 0.30);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.55);

            if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate([200, 100, 200, 100, 300]);
            }
        } catch (e) {
            console.warn("Cancel sound notice:", e);
        }
    }, []);

    // Driver-Initiated Cancellation Handler
    const handleDriverCancelRide = async () => {
        const currentActive = activeRideRef.current || activeRide;
        if (!currentActive) return;
        setIsCancellingTrip(true);
        try {
            const finalReason = cancelReason === "Other" && cancelCustomReason.trim()
                ? cancelCustomReason.trim()
                : cancelReason;

            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch(`/api/rides/${currentActive.id}/cancel`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    reason: finalReason,
                    returnToPool: cancelReturnToPool,
                    cancelledBy: "DRIVER"
                })
            });

            if (res.ok) {
                playCancelSound();
                setActiveRide(null);
                activeRideRef.current = null;
                setIsCancelModalOpen(false);
                setCancelCustomReason("");
                if (user?.id) fetchRides(user.id);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Failed to cancel ride.");
            }
        } catch (err: any) {
            alert(err.message || "Network error while cancelling ride.");
        } finally {
            setIsCancellingTrip(false);
        }
    };

    // Check notification permission on mount
    useEffect(() => {
        if (typeof Notification !== "undefined") {
            setPushPermission(Notification.permission);
        }
    }, []);

    // Keep user state in sync with prop updates
    useEffect(() => {
        if (user) {
            setCurrentUser((prev: any) => ({ ...prev, ...user }));
        }
    }, [user]);

    // Backend sync: Retrieve authenticated driver's latest profile and full name from database
    useEffect(() => {
        let isMounted = true;
        const syncDriverProfile = async () => {
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
                if (!token) return;
                const res = await fetch("/api/driver/profile", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data?.id && isMounted) {
                        setDriverProfileId(data.id);
                    }
                    const appStatus = data?.approvalStatus || "APPROVED";
                    if (isMounted) {
                        setApprovalStatus(appStatus);
                        if (data?.rejectionReason) setRejectionReason(data.rejectionReason);
                        if (appStatus !== "APPROVED") {
                            setIsOnline(false);
                        } else if (data?.isOnline) {
                            setIsOnline(true);
                        }
                    }

                    if (data?.user?.name && isMounted) {
                        setCurrentUser((prev: any) => {
                            const updated = {
                                ...prev,
                                driverProfileId: data.id,
                                name: data.user.name,
                                phone: data.user.phone || prev?.phone,
                                email: data.user.email || prev?.email,
                                approvalStatus: appStatus,
                                rejectionReason: data.rejectionReason || null,
                            };
                            try {
                                localStorage.setItem("user", JSON.stringify(updated));
                            } catch { }
                            return updated;
                        });
                    }

                    // Only mark active/online in database if approved by administrator
                    if (appStatus === "APPROVED") {
                        fetch("/api/driver/profile", {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({ isOnline: true })
                        }).catch(() => { });
                    }
                }
            } catch (err) {
                console.error("Failed to sync driver profile:", err);
            }
        };

        syncDriverProfile();
        return () => {
            isMounted = false;
        };
    }, []);

    // Rotating Motivational Message: Auto-rotates every 6 seconds with smooth fade transition
    useEffect(() => {
        let fadeTimeout: NodeJS.Timeout;
        const interval = setInterval(() => {
            setMsgFade("out");
            fadeTimeout = setTimeout(() => {
                setMsgIndex((prev) => (prev + 1) % MOTIVATIONAL_MESSAGES.length);
                setMsgFade("in");
            }, 400);
        }, 6000);

        return () => {
            clearInterval(interval);
            clearTimeout(fadeTimeout);
        };
    }, []);

    // ─── Real-Time SSE: Approval Status Updates + Ride Offers ───────────────
    useEffect(() => {
        if (!user) return;

        const sse = new EventSource("/api/rides/stream");

        sse.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);

                // ── Admin approved / rejected this driver ──
                if (payload.type === "DRIVER_APPROVAL_UPDATED") {
                    const isForMe =
                        payload.data?.userId === user.id ||
                        payload.driverId === user.driverProfileId ||
                        payload.driverId === driverProfileId;

                    if (isForMe) {
                        const newStatus = payload.data?.approvalStatus;
                        const reason = payload.data?.rejectionReason || null;
                        if (newStatus) {
                            setApprovalStatus(newStatus);
                            if (reason) setRejectionReason(reason);
                            // Reflect in localStorage so next login is accurate
                            try {
                                const stored = localStorage.getItem("user");
                                if (stored) {
                                    const parsed = JSON.parse(stored);
                                    localStorage.setItem("user", JSON.stringify({ ...parsed, approvalStatus: newStatus, rejectionReason: reason }));
                                }
                            } catch { }
                            if (newStatus !== "APPROVED") {
                                setIsOnline(false);
                            }
                            // System notification
                            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                                new Notification(
                                    newStatus === "APPROVED"
                                        ? "✅ AfriCab: Application Approved!"
                                        : "❌ AfriCab: Application Update",
                                    {
                                        body: payload.data?.message || (newStatus === "APPROVED"
                                            ? "You are now authorized to go online and accept rides."
                                            : `Your application was ${newStatus.toLowerCase()}.`),
                                        icon: "/favicon.ico",
                                    }
                                );
                            }
                        }
                    }
                    return;
                }

                // ── Real-time wallet update broadcast ──
                if (payload.type === "WALLET_UPDATED" || payload.type === "DEPOSIT_CONFIRMED") {
                    const isForMe = !payload.driverId ||
                        payload.driverId === user?.id ||
                        payload.driverId === user?.driverProfileId ||
                        payload.driverId === driverProfileId;
                    if (isForMe) {
                        fetchWallet();
                    }
                    return;
                }

                // ── Incoming ride offers (only if online, approved, and wallet balance eligible) ──
                if (!isOnline || approvalStatus !== "APPROVED" || (walletData && walletData.eligible === false)) return;

                if (payload.type === "RIDE_OFFER_RECEIVED") {
                    const offerData = payload.data?.ride || payload.data;
                    const targetDriverId = payload.driverId;

                    const isTargetDriver = !targetDriverId ||
                        targetDriverId === user.id ||
                        targetDriverId === user.driverProfileId ||
                        targetDriverId === driverProfileId ||
                        targetDriverId === currentUser?.driverProfileId;

                    if (isTargetDriver && (!activeRideRef.current || activeRideRef.current.status === "ASSIGNED" || activeRideRef.current.status === "PENDING")) {
                        playChimeSound();

                        const offer = buildIncomingOffer(payload.data || payload, 45);

                        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
                            new Notification("🚖 New AfriCab Ride Request!", {
                                body: `Passenger: ${offer.customerName} • Pickup: ${offer.originAddress} • Fare: $${Number(offer.fare || 5).toFixed(2)}`,
                                icon: "/favicon.ico",
                            });
                        }

                        setIncomingOffer(offer);

                        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                        let secondsLeft = offer.countdown;
                        countdownTimerRef.current = setInterval(() => {
                            secondsLeft -= 1;
                            if (secondsLeft <= 0) {
                                clearInterval(countdownTimerRef.current!);
                                setIncomingOffer(null);
                            } else {
                                setIncomingOffer((prev) => prev ? { ...prev, countdown: secondsLeft } : null);
                            }
                        }, 1000);
                    }
                } else if (payload.type === "RIDE_REQUESTED") {
                    const rideData = payload.data;
                    if (rideData && !rideData.driverId) {
                        setAvailableRides((prev) => {
                            if (prev.some(r => r.id === rideData.id)) return prev;
                            return [rideData, ...prev];
                        });
                        if (!activeRideRef.current) {
                            playChimeSound();
                        }
                    }
                    if (user?.id) fetchRides(user.id);
                } else if (payload.type === "DRIVER_ASSIGNED") {
                    const isForMe = payload.driverId === driverProfileId ||
                        payload.driverId === user.id ||
                        payload.driverId === user.driverProfileId ||
                        payload.data?.driverId === driverProfileId ||
                        payload.data?.driver?.userId === user.id;

                    if (isForMe && payload.data) {
                        const assignedRide = payload.data;
                        setActiveRide(assignedRide);
                        activeRideRef.current = assignedRide;
                        playChimeSound();

                        const offer = buildIncomingOffer(assignedRide, 60);
                        setIncomingOffer(offer);

                        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
                            new Notification("🚖 AfriCab: New Assigned Ride Request!", {
                                body: `Passenger: ${offer.customerName} • Pickup: ${offer.originAddress} • Fare: $${Number(offer.fare || 5).toFixed(2)}`,
                                icon: "/favicon.ico",
                            });
                        }

                        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                        let secondsLeft = 60;
                        countdownTimerRef.current = setInterval(() => {
                            secondsLeft -= 1;
                            if (secondsLeft <= 0) {
                                clearInterval(countdownTimerRef.current!);
                                setIncomingOffer(null);
                            } else {
                                setIncomingOffer((prev) => prev ? { ...prev, countdown: secondsLeft } : null);
                            }
                        }, 1000);
                    }
                    if (user?.id) fetchRides(user.id);
                } else if (payload.type === "RIDE_ACCEPTED") {
                    const isForMe = payload.driverId === driverProfileId ||
                        payload.driverId === user.id ||
                        payload.driverId === user.driverProfileId ||
                        payload.data?.driverId === driverProfileId ||
                        payload.data?.driver?.userId === user.id;

                    const acceptedRideId = payload.rideId || payload.data?.id;

                    if (isForMe && payload.data) {
                        setActiveRide(payload.data);
                        activeRideRef.current = payload.data;
                        setIncomingOffer(null);
                        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                        setAvailableRides(prev => prev.filter(r => r.id !== acceptedRideId));
                        playChimeSound();
                    } else {
                        // Accepted by another driver: remove from my available list
                        setAvailableRides(prev => prev.filter(r => r.id !== acceptedRideId));
                        if (incomingOfferRef.current?.rideId === acceptedRideId) {
                            setIncomingOffer(null);
                            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                        }
                    }
                    if (user?.id) fetchRides(user.id);
                } else if (payload.type === "RIDE_CANCELLED") {
                    const cancelledRideId = payload.rideId || payload.data?.id;

                    // 1. Check if this was my active ride or target driver
                    const currentActive = activeRideRef.current;
                    const isMyActiveRide = currentActive && currentActive.id === cancelledRideId;
                    const isMyTargetDriver = payload.driverId && (
                        payload.driverId === user?.id ||
                        payload.driverId === user?.driverProfileId ||
                        payload.driverId === driverProfileId ||
                        payload.driverId === currentUser?.driverProfileId
                    );

                    if (isMyActiveRide || isMyTargetDriver) {
                        playCancelSound();
                        setActiveRide(null);
                        activeRideRef.current = null;
                        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                        setIncomingOffer(null);

                        const customerName = payload.data?.rider?.name || payload.data?.guestName || currentActive?.rider?.name || currentActive?.guestName || "Customer";
                        const bookingRef = payload.data?.bookingReference || currentActive?.bookingReference || (cancelledRideId ? cancelledRideId.slice(-6).toUpperCase() : "");

                        setCancelledRideAlert({
                            rideId: cancelledRideId,
                            reference: bookingRef,
                            clientName: customerName,
                            reason: payload.data?.reason || "Cancelled by customer/dispatch",
                            cancelledBy: payload.data?.cancelledBy || "RIDER"
                        });

                        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                            new Notification("❌ Trip Cancelled", {
                                body: `Trip #${bookingRef} was cancelled by ${customerName}.`,
                                icon: "/favicon.ico",
                            });
                        }
                    }

                    // 2. Always remove from available rides queue
                    setAvailableRides(prev => prev.filter(r => r.id !== cancelledRideId));

                    // 3. Clear from incoming offer if matching
                    if (incomingOfferRef.current?.rideId === cancelledRideId) {
                        setIncomingOffer(null);
                        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                    }

                    // 4. Trigger database synchronization
                    if (user?.id) fetchRides(user.id);
                } else if (payload.type === "RIDE_TAKEN") {
                    const takenRideId = payload.rideId || payload.data?.id;
                    setAvailableRides(prev => prev.filter(r => r.id !== takenRideId));
                    if (incomingOfferRef.current?.rideId === takenRideId) {
                        setIncomingOffer(null);
                        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                    }
                    if (user?.id) fetchRides(user.id);
                } else if (payload.type === "DRIVER_ARRIVED" || payload.type === "RIDE_STARTED") {
                    const targetId = payload.rideId || payload.data?.id;
                    if (activeRideRef.current && activeRideRef.current.id === targetId && payload.data) {
                        setActiveRide(payload.data);
                        activeRideRef.current = payload.data;
                    }
                    if (user?.id) fetchRides(user.id);
                } else if (payload.type === "RIDE_UPDATED") {
                    const rideData = payload.data;
                    const updateRideId = payload.rideId || rideData?.id;

                    if (rideData?.status === "CANCELLED") {
                        if (activeRideRef.current && activeRideRef.current.id === updateRideId) {
                            playCancelSound();
                            setActiveRide(null);
                            activeRideRef.current = null;
                            setCancelledRideAlert({
                                rideId: updateRideId,
                                reference: rideData.bookingReference || updateRideId.slice(-6).toUpperCase(),
                                clientName: rideData.rider?.name || rideData.guestName || "Customer",
                                reason: rideData.reason || "Cancelled by customer/dispatch",
                                cancelledBy: rideData.cancelledBy || "RIDER"
                            });
                        }
                        setAvailableRides(prev => prev.filter(r => r.id !== updateRideId));
                    } else if (activeRideRef.current && activeRideRef.current.id === updateRideId) {
                        if (rideData?.status === "COMPLETED") {
                            setViewingReceiptRide(rideData);
                            setActiveRide(null);
                            activeRideRef.current = null;
                        } else {
                            setActiveRide(rideData);
                            activeRideRef.current = rideData;
                        }
                    }
                    if (user?.id) fetchRides(user.id);
                }
            } catch { }
        };

        return () => {
            sse.close();
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        };
    }, [user, isOnline, approvalStatus, playChimeSound, playCancelSound, driverProfileId, currentUser]);

    const fetchRides = useCallback(async (userId: string) => {
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch(`/api/rides?_t=${Date.now()}`, {
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                }
            });
            if (!res || !res.ok) return;
            const data = await res.json();

            if (Array.isArray(data)) {
                // 1. Find my active ride (Assigned / Pending / Accepted / Arrived / In Progress)
                const myActiveRide = data.find(r =>
                    (
                        r.driver?.userId === userId ||
                        r.driverId === userId ||
                        r.driver?.id === userId ||
                        r.driverId === driverProfileId ||
                        r.driver?.id === driverProfileId ||
                        r.driver?.userId === user?.id
                    ) &&
                    (r.status === "ASSIGNED" || r.status === "PENDING" || r.status === "ACCEPTED" || r.status === "ARRIVED" || r.status === "IN_PROGRESS")
                );

                const prevActive = activeRideRef.current;

                // Play chime and trigger alert modal if a new assigned ride alert arrives
                if (myActiveRide && (!prevActive || prevActive.id !== myActiveRide.id) && (myActiveRide.status === "ASSIGNED" || myActiveRide.status === "PENDING")) {
                    playChimeSound();
                    if (!incomingOfferRef.current) {
                        const offer = buildIncomingOffer(myActiveRide, 45);
                        setIncomingOffer(offer);
                        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                        let secondsLeft = 45;
                        countdownTimerRef.current = setInterval(() => {
                            secondsLeft -= 1;
                            if (secondsLeft <= 0) {
                                clearInterval(countdownTimerRef.current!);
                                setIncomingOffer(null);
                            } else {
                                setIncomingOffer((prev) => prev ? { ...prev, countdown: secondsLeft } : null);
                            }
                        }, 1000);
                    }
                }

                // Detect cancellation: if we had an active ride that was cancelled on the backend
                if (prevActive && !myActiveRide) {
                    const found = data.find(r => r.id === prevActive.id);
                    if (found && found.status === "CANCELLED") {
                        playCancelSound();
                        setCancelledRideAlert({
                            rideId: found.id,
                            reference: found.bookingReference || found.id.slice(-6).toUpperCase(),
                            clientName: found.rider?.name || found.guestName || "Customer",
                            reason: found.notes || "Trip cancelled by customer/dispatch",
                            cancelledBy: "RIDER"
                        });
                    }
                }

                setActiveRide(myActiveRide || null);
                activeRideRef.current = myActiveRide || null;

                // 2. Find completed rides for history & receipts
                const myCompleted = data.filter(r =>
                    (
                        r.driver?.userId === userId ||
                        r.driverId === userId ||
                        r.driver?.id === userId ||
                        r.driverId === driverProfileId ||
                        r.driver?.id === driverProfileId ||
                        r.driver?.userId === user?.id
                    ) &&
                    r.status === "COMPLETED"
                );
                setCompletedRides(myCompleted);

                // 3. Find available requested rides
                const requests = data.filter(r => r.status === "REQUESTED" && !r.driverId);
                setAvailableRides(requests);
            }
        } catch {
            // Silently absorb transient disconnects
        } finally {
            setLoading(false);
        }
    }, [driverProfileId, user, playCancelSound]);

    useEffect(() => {
        if (user) {
            fetchRides(user.id);
            const interval = setInterval(() => fetchRides(user.id), 3000);
            return () => clearInterval(interval);
        }
    }, [user, fetchRides]);

    // Atomic Ride Acceptance via /api/rides/accept
    const handleAcceptRide = async (rideId: string) => {
        if (!user) return;
        setAcceptingRideId(rideId);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/rides/accept", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    rideId,
                    driverPaymentPhone: user.phone || currentUser?.phone || "+231 88 012 3456"
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setIncomingOffer(null);
                if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                if (data.ride) {
                    setActiveRide(data.ride);
                    activeRideRef.current = data.ride;
                    // Auto-open navigation to customer pickup location upon acceptance
                    if (data.ride.originLat && data.ride.originLng) {
                        openGoogleMapsNavigation(data.ride.originLat, data.ride.originLng, data.ride.originAddress);
                    }
                }
                setShowDirectionsPrompt(true);
                fetchRides(user.id);
                // Immediately broadcast current coordinates so customer's tracking map updates instantly
                if (myCoords) {
                    broadcastLocation(myCoords.lat, myCoords.lng);
                }
            } else if (data.code === "RIDE_CANCELLED") {
                alert(data.error || "This ride request was cancelled by the customer.");
                setIncomingOffer(null);
                if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                setAvailableRides(prev => prev.filter(r => r.id !== rideId));
                fetchRides(user.id);
            } else if (res.status === 409 || data.code === "ALREADY_TAKEN") {
                alert("Trip Claimed: Another nearby driver accepted this ride request.");
                setIncomingOffer(null);
                if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                setAvailableRides(prev => prev.filter(r => r.id !== rideId));
                fetchRides(user.id);
            } else if (res.status === 402 || data.code === "INSUFFICIENT_WALLET_BALANCE") {
                setIncomingOffer(null);
                if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                setWalletInsufficientAlert({
                    balance: data?.balance ?? 0,
                    minBalance: data?.minBalance ?? 500,
                    shortfall: data?.shortfall ?? 500,
                });
                setShowWalletTab(true);
                fetchWallet();
                alert(data?.error || "Insufficient Wallet Balance. Please fund your wallet to accept ride requests.");
            } else {
                alert(data.error || "Failed to accept ride request.");
            }
        } catch (error) {
            console.error("Failed to accept ride", error);
        } finally {
            setAcceptingRideId(null);
        }
    };

    // Decline Ride Offer
    const handleDeclineRide = async (rideId: string) => {
        setIncomingOffer(null);
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            await fetch("/api/rides/decline", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ rideId })
            });
        } catch { }
    };

    // Test Audio & Notification
    const handleTestNotification = async () => {
        setTestingPush(true);
        playChimeSound();

        if (typeof Notification !== "undefined") {
            if (Notification.permission === "granted") {
                new Notification("🔔 AfriCab Driver Sound & Alert Test", {
                    body: "Background push alerts and audible chimes are active and functioning correctly.",
                    icon: "/favicon.ico",
                });
            } else if (Notification.permission !== "denied") {
                const perm = await Notification.requestPermission();
                setPushPermission(perm);
                if (perm === "granted") {
                    new Notification("🔔 AfriCab Notifications Enabled!", {
                        body: "You will now receive incoming ride alerts even when your browser tab is minimized.",
                    });
                }
            }
        }

        setTimeout(() => setTestingPush(false), 800);
    };

    const handleUpdateStatus = async (status: string) => {
        if (!activeRide) return;
        setStatusUpdating(true);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/rides", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    id: activeRide.id,
                    status,
                    driverPaymentPhone: user.phone || currentUser?.phone || "+231 88 012 3456"
                })
            });
            if (res.status === 402) {
                const data = await res.json().catch(() => ({}));
                setWalletInsufficientAlert({
                    balance: data?.balance ?? 0,
                    minBalance: data?.depositAmount ?? 200,
                    shortfall: Math.max(0, (data?.depositAmount ?? 200) - (data?.balance ?? 0)),
                });
                setShowWalletTab(true);
                fetchWallet();
                alert(`Cannot Start Ride: ${data?.error || "Insufficient wallet balance to pay required ride deposit. Please fund your wallet to continue."}`);
                return;
            }
            if (res.status === 400 || res.status === 409) {
                const data = await res.json().catch(() => ({}));
                if (data?.error?.toLowerCase().includes("cancel")) {
                    alert(data.error || "This ride was cancelled by the customer.");
                    setActiveRide(null);
                    activeRideRef.current = null;
                    if (user?.id) fetchRides(user.id);
                    return;
                }
            }
            if (res.ok) {
                const updated = await res.json();
                setActiveRide(updated);
                activeRideRef.current = updated;
                if (status === "IN_PROGRESS") {
                    fetchWallet();
                    // Requirement 4: Once ride is started, automatically display customer destination and activate navigation!
                    openGoogleMapsNavigation(
                        updated.destLat || activeRide.destLat,
                        updated.destLng || activeRide.destLng,
                        updated.destAddress || activeRide.destAddress
                    );
                }
                // Immediately broadcast coordinates so customer sees driver at pickup or on journey
                if (myCoords) {
                    broadcastLocation(myCoords.lat, myCoords.lng);
                }
            }
        } catch (e) {
            console.error("Failed to update status", e);
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleCompleteRide = async () => {
        if (!activeRide) return;
        setCompletingTrip(true);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/rides", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    id: activeRide.id,
                    status: "COMPLETED",
                    paymentStatus: "PAID",
                    driverPaymentPhone: user.phone || "+231 88 012 3456"
                })
            });

            if (res.ok) {
                const completed = await res.json();
                setViewingReceiptRide(completed);
                setActiveRide(null);
                fetchRides(user.id);
            }
        } catch (error) {
            console.error("Failed to complete ride", error);
        } finally {
            setCompletingTrip(false);
        }
    };

    const broadcastLocation = useCallback(async (lat: number, lng: number, speed = 0, heading = 0) => {
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            await fetch("/api/driver/location", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ lat, lng, speed, heading, batteryLevel: 100, signalStrength: 95 })
            });
        } catch { }
    }, []);

    // ─── Wallet Data Fetch ──────────────────────────────────────────────────
    const fetchWallet = useCallback(async () => {
        setWalletLoading(true);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            if (!token) return;
            const res = await fetch("/api/driver/wallet", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setWalletData(data);
            }
        } catch { }
        finally { setWalletLoading(false); }
    }, []);

    useEffect(() => {
        if (approvalStatus === "APPROVED") {
            fetchWallet();
        }
    }, [approvalStatus, fetchWallet]);

    // ─── Fund Wallet ────────────────────────────────────────────────────────
    const handleFundWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fundingAmount || parseFloat(fundingAmount) <= 0) return;
        setFundingLoading(true);
        setFundingResult(null);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/driver/wallet/fund", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ amount: parseFloat(fundingAmount), provider: fundingProvider, phoneNumber: fundingPhone || user?.phone || "+231880000000" }),
            });
            const data = await res.json();
            setFundingResult({ success: res.ok && data.success, message: data.message || data.error || "Unknown response" });
            if (res.ok && data.success) {
                setFundingAmount("");
                fetchWallet();
                setWalletInsufficientAlert(null);
            }
        } catch { setFundingResult({ success: false, message: "Network error. Please try again." }); }
        finally { setFundingLoading(false); }
    };

    const toggleStatus = async () => {
        // Block going online if not approved — inform driver clearly
        if (!isOnline && approvalStatus !== "APPROVED") {
            const msg = approvalStatus === "PENDING"
                ? "Your registration is currently pending administrator review. You cannot go online until your account is approved."
                : `Your application was rejected${rejectionReason ? `: "${rejectionReason}"` : "."} Please contact support for assistance.`;
            alert(msg);
            return;
        }

        const newStatus = !isOnline;
        setIsOnline(newStatus);
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (token) {
            try {
                const res = await fetch("/api/driver/profile", {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ isOnline: newStatus })
                });

                // Backend 403 = driver not approved — revert and inform
                if (res.status === 403) {
                    const data = await res.json().catch(() => ({}));
                    setIsOnline(false);
                    if (data?.approvalStatus) setApprovalStatus(data.approvalStatus);
                    if (data?.rejectionReason) setRejectionReason(data.rejectionReason);
                    const backendMsg = data?.error || "You are not authorized to go online at this time.";
                    alert(backendMsg);
                    return;
                }

                // Backend 402 = insufficient wallet balance
                if (res.status === 402) {
                    const data = await res.json().catch(() => ({}));
                    setIsOnline(false);
                    setWalletInsufficientAlert({
                        balance: data?.balance ?? 0,
                        minBalance: data?.minBalance ?? 500,
                        shortfall: data?.shortfall ?? 500,
                    });
                    setShowWalletTab(true);
                    return;
                }
            } catch { }
        }
        if (newStatus) {
            try {
                if (typeof navigator !== "undefined" && navigator?.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                        setMyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        broadcastLocation(pos.coords.latitude, pos.coords.longitude);
                    }, () => { }, { enableHighAccuracy: true });
                }
            } catch { }
        } else {
            if (gpsIntervalRef.current) {
                clearInterval(gpsIntervalRef.current);
                gpsIntervalRef.current = null;
                setGpsBroadcasting(false);
            }
        }
    };

    // GPS broadcast loop when online
    useEffect(() => {
        if (!isOnline || typeof navigator === "undefined" || !navigator.geolocation) return;

        const startBroadcast = () => {
            setGpsBroadcasting(true);
            const intervalMs = activeRide ? 4000 : 8000;
            gpsIntervalRef.current = setInterval(() => {
                try {
                    if (typeof navigator !== "undefined" && navigator?.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            (pos) => {
                                const { latitude: lat, longitude: lng, speed } = pos.coords;
                                setMyCoords({ lat, lng });
                                broadcastLocation(lat, lng, speed ? speed * 3.6 : 0, 0);
                            },
                            () => { },
                            { enableHighAccuracy: true, timeout: 5000 }
                        );
                    }
                } catch { }
            }, intervalMs);
        };

        // Initial position grab
        try {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setMyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    broadcastLocation(pos.coords.latitude, pos.coords.longitude);
                    startBroadcast();
                },
                () => startBroadcast(),
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } catch {
            startBroadcast();
        }

        return () => {
            if (gpsIntervalRef.current) {
                clearInterval(gpsIntervalRef.current);
                gpsIntervalRef.current = null;
                setGpsBroadcasting(false);
            }
        };
    }, [isOnline, broadcastLocation]);

    // Calculate total earned today
    const totalEarningsToday = completedRides.reduce((sum, r) => sum + (r.fare || 0) * 0.85, 0);

    return (
        <div className="min-h-screen bg-white text-slate-900 transition-colors duration-300">
            {/* Top Status Bar */}
            <div className="border-b border-slate-200 bg-white sticky top-16 z-30 shadow-sm">
                <div className="container mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span className="font-black text-[10px] sm:text-xs uppercase tracking-wider text-slate-800 truncate">
                            <span className="hidden sm:inline">{isOnline ? 'Active & Receiving Dispatch Requests' : 'You are currently Offline'}</span>
                            <span className="sm:hidden">{isOnline ? 'Active & Online' : 'Offline'}</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all shadow-sm active:scale-95"
                            title="Change Driver Password"
                        >
                            <KeyRound size={12} className="text-emerald-700 shrink-0" />
                            <span className="hidden sm:inline">Change Password</span>
                            <span className="sm:hidden">Pwd</span>
                        </button>

                        <button
                            onClick={toggleStatus}
                            className={`flex items-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all shadow-sm ${isOnline
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                        >
                            <Power size={12} className="shrink-0" />
                            <span className="hidden xs:inline">Go </span>{isOnline ? 'Offline' : 'Online'}
                        </button>

                        {/* Wallet Button */}
                        {approvalStatus === "APPROVED" && (
                            <button
                                type="button"
                                onClick={() => { setShowWalletTab(v => !v); if (!walletData) fetchWallet(); }}
                                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 ${showWalletTab
                                        ? 'bg-slate-900 text-white border border-slate-700'
                                        : walletInsufficientAlert
                                            ? 'bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 animate-pulse'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                                    }`}
                                title="My Wallet"
                            >
                                <Wallet size={12} className="shrink-0" />
                                <span className="hidden sm:inline">My Wallet</span>
                                {walletData?.wallet && (
                                    <span className="hidden md:inline font-black text-emerald-600 ml-0.5">
                                        {(Number(walletData.wallet.balance) || 0).toFixed(0)} LRD
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Approval Status Banner (PENDING / REJECTED) ────────────────────── */}
            {approvalStatus === "PENDING" && (
                <div className="bg-amber-400 text-amber-950 px-4 py-4 border-b-2 border-amber-500 shadow-inner">
                    <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-start gap-3 text-left">
                            <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
                                <ShieldAlert size={18} className="text-amber-950" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider mb-0.5">Account Under Review</p>
                                <p className="text-[11px] font-semibold leading-relaxed">
                                    Your driver registration is <strong>pending administrator approval</strong>. You cannot go online or receive ride requests until your account is reviewed and approved. You will be notified once a decision is made.
                                </p>
                            </div>
                        </div>
                        <span className="shrink-0 px-4 py-1.5 bg-amber-500 border border-amber-600 text-amber-950 text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse whitespace-nowrap">
                            Pending Review
                        </span>
                    </div>
                </div>
            )}

            {approvalStatus === "REJECTED" && (
                <div className="bg-red-600 text-white px-4 py-4 border-b-2 border-red-700 shadow-inner">
                    <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-start gap-3 text-left">
                            <div className="w-9 h-9 bg-red-700 rounded-xl flex items-center justify-center shrink-0">
                                <ShieldAlert size={18} className="text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider mb-0.5">Application Rejected</p>
                                <p className="text-[11px] font-semibold leading-relaxed">
                                    Your driver application has been <strong>rejected</strong> by the system administrator.
                                    {rejectionReason && <span> Reason: <em>"{rejectionReason}"</em>.</span>}
                                    {" "}Please contact AfriCab support for further assistance.
                                </p>
                            </div>
                        </div>
                        <span className="shrink-0 px-4 py-1.5 bg-red-700 border border-red-800 text-white text-[10px] font-black uppercase tracking-widest rounded-full whitespace-nowrap">
                            Access Restricted
                        </span>
                    </div>
                </div>
            )}

            {/* ─── Insufficient Wallet Balance Alert ───────────────────────────────── */}
            {walletInsufficientAlert && approvalStatus === "APPROVED" && (
                <div className="bg-orange-50 border-b-2 border-orange-400 px-4 py-4">
                    <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-start gap-3 text-left">
                            <div className="w-9 h-9 bg-orange-400 rounded-xl flex items-center justify-center shrink-0">
                                <Wallet size={18} className="text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider text-orange-900 mb-0.5">Insufficient Wallet Balance</p>
                                <p className="text-[11px] font-semibold leading-relaxed text-orange-800">
                                    Your current balance is <strong>{walletInsufficientAlert.balance.toFixed(2)} LRD</strong>.
                                    You need at least <strong>{walletInsufficientAlert.minBalance.toFixed(2)} LRD</strong> to go online.
                                    {" "}Please fund your wallet with <strong>{walletInsufficientAlert.shortfall.toFixed(2)} LRD</strong> or more.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={() => { setShowWalletTab(true); fetchWallet(); }}
                                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full whitespace-nowrap transition-all"
                            >
                                Fund Wallet
                            </button>
                            <button
                                onClick={() => setWalletInsufficientAlert(null)}
                                className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-800 text-[10px] font-black uppercase tracking-widest rounded-full whitespace-nowrap transition-all"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Temporary Password Alert Banner */}
            {currentUser?.forcePasswordChange && (
                <div className="bg-amber-500 text-slate-950 px-4 py-3 font-bold text-xs border-b border-amber-600 shadow-inner">
                    <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-center sm:text-left">
                            <AlertTriangle size={18} className="text-slate-950 shrink-0" />
                            <span>
                                <strong>Action Required:</strong> You are currently using an initial password assigned by the administrator. Please update your password to secure your account.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="px-4 py-1.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 transition-all shadow-sm active:scale-95"
                        >
                            Change Password Now
                        </button>
                    </div>
                </div>
            )}

            {/* ─── My Wallet Panel ──────────────────────────────────────────────────── */}
            {showWalletTab && approvalStatus === "APPROVED" && (
                <div className="border-b border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                    <div className="container mx-auto px-4 sm:px-6 py-6 max-w-6xl">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <Wallet size={20} className="text-emerald-400" />
                                <h2 className="text-lg font-black tracking-tight">My Wallet</h2>
                                <span className="text-[9px] font-black text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                    {walletData?.wallet?.status ?? "LOADING"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={fetchWallet}
                                    className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 transition-all text-slate-400 hover:text-white"
                                    title="Refresh wallet"
                                >
                                    <RefreshCw size={13} className={walletLoading ? "animate-spin" : ""} />
                                </button>
                                <button
                                    onClick={() => setShowWalletTab(false)}
                                    className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 transition-all text-slate-400 hover:text-white"
                                >
                                    <XCircle size={13} />
                                </button>
                            </div>
                        </div>

                        {walletLoading && !walletData ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 size={24} className="animate-spin text-emerald-400" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {/* Balance Card */}
                                <div className="lg:col-span-1 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl p-6 relative overflow-hidden">
                                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                                    <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full blur-xl" />
                                    <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-1">Available Balance</p>
                                    <h3 className="text-4xl font-black text-white mb-1 relative z-10">
                                        {walletData?.wallet?.balance?.toFixed(2) ?? "0.00"}
                                    </h3>
                                    <p className="text-emerald-300 font-bold text-sm">LRD</p>
                                    <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-2 text-xs relative z-10">
                                        <div>
                                            <p className="text-emerald-300 text-[9px] font-black uppercase tracking-wider">Min. Required</p>
                                            <p className="text-white font-black">{walletData?.config?.minBalance?.toFixed(2) ?? "500.00"} LRD</p>
                                        </div>
                                        <div>
                                            <p className="text-emerald-300 text-[9px] font-black uppercase tracking-wider">Ride Deposit</p>
                                            <p className="text-white font-black">
                                                {walletData?.config?.depositMode === "PERCENT"
                                                    ? `${walletData?.config?.depositPercent ?? 10}% of fare`
                                                    : `${walletData?.config?.depositAmount?.toFixed(2) ?? "200.00"} LRD`}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-emerald-300 text-[9px] font-black uppercase tracking-wider">Total Funded</p>
                                            <p className="text-white font-black">{walletData?.wallet?.totalDeposited?.toFixed(2) ?? "0.00"} LRD</p>
                                        </div>
                                        <div>
                                            <p className="text-emerald-300 text-[9px] font-black uppercase tracking-wider">Total Deducted</p>
                                            <p className="text-white font-black">{walletData?.wallet?.totalDeducted?.toFixed(2) ?? "0.00"} LRD</p>
                                        </div>
                                    </div>
                                    <div className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider w-fit ${walletData?.eligible
                                            ? "bg-white/20 text-emerald-100"
                                            : "bg-red-500/30 text-red-200 animate-pulse"
                                        }`}>
                                        {walletData?.eligible ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                                        {walletData?.eligible ? "Eligible to Go Online" : "Insufficient Balance"}
                                    </div>
                                </div>

                                {/* Fund Wallet Form */}
                                <div className="lg:col-span-1 bg-slate-700/60 rounded-3xl p-5 border border-slate-600/50 backdrop-blur-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <PlusCircle size={16} className="text-emerald-400" />
                                        <h4 className="font-black text-sm uppercase tracking-wider">Fund Wallet</h4>
                                        <span className="text-[9px] bg-amber-500/20 text-amber-400 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Sandbox Mode</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                                        Official MTN &amp; Orange Money integration is ready — credentials will be activated by the administrator. Use sandbox mode to test wallet funding.
                                    </p>

                                    {fundingResult && (
                                        <div className={`mb-3 p-3 rounded-2xl text-[11px] font-semibold leading-relaxed ${fundingResult.success ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"
                                            }`}>
                                            {fundingResult.success ? <CheckCircle2 size={12} className="inline mr-1" /> : <AlertTriangle size={12} className="inline mr-1" />}
                                            {fundingResult.message}
                                        </div>
                                    )}

                                    <form onSubmit={handleFundWallet} className="space-y-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Provider</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(["MTN", "ORANGE"] as const).map(p => (
                                                    <button
                                                        key={p}
                                                        type="button"
                                                        onClick={() => setFundingProvider(p)}
                                                        className={`py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${fundingProvider === p
                                                                ? p === "MTN" ? "bg-yellow-500 text-black" : "bg-orange-500 text-white"
                                                                : "bg-slate-600 text-slate-300 hover:bg-slate-500"
                                                            }`}
                                                    >
                                                        {p === "MTN" ? "🟡 MTN" : "🟠 Orange"}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Amount (LRD)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                step="0.01"
                                                placeholder="e.g. 500"
                                                value={fundingAmount}
                                                onChange={e => setFundingAmount(e.target.value)}
                                                className="w-full bg-slate-600 border border-slate-500 rounded-xl px-3 py-2 text-sm font-semibold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Mobile Number</label>
                                            <input
                                                type="tel"
                                                placeholder={user?.phone || "+231 88 000 0000"}
                                                value={fundingPhone}
                                                onChange={e => setFundingPhone(e.target.value)}
                                                className="w-full bg-slate-600 border border-slate-500 rounded-xl px-3 py-2 text-sm font-semibold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={fundingLoading}
                                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:text-slate-400 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            {fundingLoading ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />}
                                            {fundingLoading ? "Processing..." : "Fund My Wallet"}
                                        </button>
                                    </form>
                                </div>

                                {/* Transaction History */}
                                <div className="lg:col-span-1 bg-slate-700/60 rounded-3xl p-5 border border-slate-600/50 backdrop-blur-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <History size={16} className="text-emerald-400" />
                                        <h4 className="font-black text-sm uppercase tracking-wider">Transaction History</h4>
                                    </div>
                                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-hide">
                                        {(walletData?.wallet?.transactions ?? []).length === 0 ? (
                                            <p className="text-slate-400 text-[11px] text-center py-6">No transactions yet.</p>
                                        ) : (
                                            (walletData?.wallet?.transactions ?? []).map((tx: any) => (
                                                <div key={tx.id} className="flex items-start gap-2 p-3 bg-slate-800/60 rounded-2xl border border-slate-600/30">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${tx.type === "CREDIT" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                                                        }`}>
                                                        {tx.type === "CREDIT" ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <p className="text-[10px] font-black text-white truncate capitalize">
                                                                {tx.category?.replace(/_/g, " ") ?? tx.type}
                                                            </p>
                                                            <p className={`text-[10px] font-black shrink-0 ${tx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}>
                                                                {tx.type === "CREDIT" ? "+" : "-"}{tx.amount.toFixed(2)} LRD
                                                            </p>
                                                        </div>
                                                        <p className="text-[9px] text-slate-500 mt-0.5">{new Date(tx.createdAt).toLocaleString()}</p>
                                                        {tx.note && <p className="text-[9px] text-slate-400 mt-0.5 truncate">{tx.note}</p>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Live Position Map — Always rendered with live telemetry */}
            <div className="border-b border-slate-100 bg-slate-50">
                <div className="container mx-auto px-4 sm:px-6 py-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                    {isOnline ? "Live Driver GPS Radar" : "Driver Map (Standby)"}
                                </span>
                                {gpsBroadcasting && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                        <Wifi size={9} /> Broadcasting GPS
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-slate-500">
                                    {myCoords.lat.toFixed(5)}°N, {Math.abs(myCoords.lng).toFixed(5)}°W
                                </span>
                                <button
                                    type="button"
                                    onClick={() => openGoogleMapsNavigation(
                                        activeRide?.status === "IN_PROGRESS"
                                            ? activeRide?.destLat
                                            : activeRide?.originLat,
                                        activeRide?.status === "IN_PROGRESS"
                                            ? activeRide?.destLng
                                            : activeRide?.originLng,
                                        activeRide?.status === "IN_PROGRESS"
                                            ? activeRide?.destAddress
                                            : activeRide?.originAddress
                                    )}
                                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                                    title={activeRide?.status === "IN_PROGRESS" ? "Open Google Maps navigation to destination" : "Open Google Maps navigation to pickup location"}
                                >
                                    <Navigation size={12} className="text-emerald-400" />
                                    <span>{activeRide?.status === "IN_PROGRESS" ? "Destination Directions" : "Pickup Directions"}</span>
                                </button>
                            </div>
                        </div>

                        <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-md h-[340px] sm:h-[400px] w-full relative">
                            {/* Google Maps Turn-by-Turn Top Banner Overlay (styled like user's navigation screenshot) */}
                            <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl border border-white/10 shadow-lg">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                                        <Navigation size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block">
                                            {activeRide
                                                ? (activeRide.status === "IN_PROGRESS"
                                                    ? "Navigation to Drop-off Destination"
                                                    : activeRide.status === "ARRIVED"
                                                        ? "At Pickup Location · Waiting for Boarding"
                                                        : "Navigation to Customer Pickup")
                                                : "Live Road Radar"}
                                        </span>
                                        <p className="text-xs font-bold truncate">
                                            {activeRide
                                                ? (activeRide.status === "IN_PROGRESS"
                                                    ? `toward ${activeRide.destAddress}`
                                                    : `toward ${activeRide.originAddress}`)
                                                : "Monrovia Road Network"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => openGoogleMapsNavigation(
                                        activeRide?.status === "IN_PROGRESS"
                                            ? activeRide?.destLat
                                            : activeRide?.originLat,
                                        activeRide?.status === "IN_PROGRESS"
                                            ? activeRide?.destLng
                                            : activeRide?.originLng,
                                        activeRide?.status === "IN_PROGRESS"
                                            ? activeRide?.destAddress
                                            : activeRide?.originAddress
                                    )}
                                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow shrink-0 transition-transform active:scale-95 cursor-pointer"
                                >
                                    <Navigation size={13} className="fill-current" />
                                    <span>{activeRide?.status === "IN_PROGRESS" ? "To Destination" : "To Pickup"}</span>
                                </button>
                            </div>

                            <MapComponent
                                center={[myCoords.lat, myCoords.lng]}
                                zoom={14}
                                className="h-full w-full"
                                markers={[
                                    {
                                        id: "driver-self",
                                        lat: myCoords.lat,
                                        lng: myCoords.lng,
                                        title: driverFullName || "You",
                                        subtitle: isOnline ? "Active on duty" : "Offline",
                                        type: "ASSIGNED_DRIVER" as const,
                                        vehicleType: "Car",
                                    },
                                    // Step 1 & 2: Show customer pickup location ONLY
                                    ...(activeRide?.originLat && activeRide?.originLng ? [{
                                        id: "customer-pickup",
                                        lat: activeRide.originLat,
                                        lng: activeRide.originLng,
                                        title: activeRide.customer?.name || "Customer Pickup",
                                        subtitle: activeRide.originAddress || "Pickup Location",
                                        type: "PICKUP" as const,
                                    }] : []),
                                    // Step 3 & 4: Drop-off destination revealed ONLY after driver starts the ride!
                                    ...(activeRide?.status === "IN_PROGRESS" && activeRide?.destLat && activeRide?.destLng ? [{
                                        id: "customer-dest",
                                        lat: activeRide.destLat,
                                        lng: activeRide.destLng,
                                        title: "Customer Destination",
                                        subtitle: activeRide.destAddress || "Dropoff Destination",
                                        type: "DESTINATION" as const,
                                    }] : []),
                                    ...availableRides.filter(r => r.originLat && r.originLng).map(r => ({
                                        id: `avail-${r.id}`,
                                        lat: r.originLat!,
                                        lng: r.originLng!,
                                        title: `Pickup: ${r.originAddress}`,
                                        subtitle: `Fare: $${r.fare?.toFixed(2) || "0.00"}`,
                                        type: "PICKUP" as const,
                                    }))
                                ]}
                                routes={
                                    activeRide?.status === "IN_PROGRESS" && activeRide?.destLat && activeRide?.destLng
                                        ? [{
                                            id: "to-dest",
                                            origin: [myCoords.lat, myCoords.lng] as [number, number],
                                            destination: [activeRide.destLat, activeRide.destLng] as [number, number],
                                            color: "#2563eb",
                                        }]
                                        : activeRide && activeRide.status !== "IN_PROGRESS" && activeRide?.originLat && activeRide?.originLng
                                            ? [{
                                                id: "to-pickup",
                                                origin: [myCoords.lat, myCoords.lng] as [number, number],
                                                destination: [activeRide.originLat, activeRide.originLng] as [number, number],
                                                color: "#0f172a",
                                            }]
                                            : []
                                }
                            />

                            {/* Floating bottom-right quick navigation button */}
                            <div className="absolute bottom-3 right-3 z-20">
                                <button
                                    type="button"
                                    onClick={() => openGoogleMapsNavigation(
                                        activeRide?.status === "IN_PROGRESS"
                                            ? activeRide?.destLat
                                            : activeRide?.originLat,
                                        activeRide?.status === "IN_PROGRESS"
                                            ? activeRide?.destLng
                                            : activeRide?.originLng,
                                        activeRide?.status === "IN_PROGRESS"
                                            ? activeRide?.destAddress
                                            : activeRide?.originAddress
                                    )}
                                    className="p-3 bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-2 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer font-black text-xs"
                                    title={activeRide?.status === "IN_PROGRESS" ? "Launch Google Maps Navigation to Destination" : "Launch Google Maps Navigation to Pickup"}
                                >
                                    <Navigation size={18} className={activeRide?.status === "IN_PROGRESS" ? "text-blue-600" : "text-emerald-600"} />
                                    <span>{activeRide?.status === "IN_PROGRESS" ? "To Destination" : "To Pickup"}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 py-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Real-Time Incoming Ride Offer Modal (Step 1: Ride Alert) */}
                    {incomingOffer && (
                        <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl max-w-lg w-full border-2 border-emerald-500 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 animate-pulse">
                                            <Bell size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black tracking-wider uppercase text-emerald-400 block">Instant Ride Alert</span>
                                                {incomingOffer.bookingReference && (
                                                    <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                                                        #{incomingOffer.bookingReference}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-black text-white">New Assigned Ride Request</h3>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-amber-400 font-mono">{incomingOffer.countdown}s</span>
                                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Auto-Expires</span>
                                    </div>
                                </div>

                                <div className="h-1.5 w-full bg-slate-100">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
                                        style={{ width: `${Math.min(100, Math.max(0, (incomingOffer.countdown / 45) * 100))}%` }}
                                    />
                                </div>

                                <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                                    {/* 1. Customer Details Card */}
                                    <div className="flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shrink-0">
                                                {incomingOffer.customerName?.charAt(0) || "P"}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <h4 className="font-black text-slate-900 text-sm truncate">{incomingOffer.customerName}</h4>
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">Verified</span>
                                                </div>
                                                <p className="text-xs font-mono text-slate-500 truncate">
                                                    {incomingOffer.customerPhone || "Phone on file"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="px-2.5 py-1 bg-slate-200/80 rounded-lg text-[10px] font-black uppercase text-slate-700 block">
                                                {incomingOffer.vehicleType || "Car"} • {incomingOffer.rideCategory || "Regular"}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-500 mt-1 block">
                                                {incomingOffer.paymentMethod || "MOMO"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 2. Fare & Proximity */}
                                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase block">Estimated Fare</span>
                                            <span className="text-xl font-black text-slate-900">{formatDual(incomingOffer.fare)}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-slate-400 uppercase block">Pickup Proximity</span>
                                            <span className="text-xl font-black text-emerald-600">{incomingOffer.distanceKm.toFixed(1)} km</span>
                                            <span className="text-[10px] font-bold text-slate-500 block">~{incomingOffer.etaMinutes} mins away</span>
                                        </div>
                                    </div>

                                    {/* 3. Pickup & Destination Locations */}
                                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                        <div className="flex items-start gap-3">
                                            <MapPin size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                                            <div className="min-w-0">
                                                <span className="text-[9px] font-black text-slate-400 uppercase block">Pickup Location</span>
                                                <p className="text-xs font-bold text-slate-900 truncate">{incomingOffer.originAddress}</p>
                                            </div>
                                        </div>
                                        <div className="border-t border-slate-200 pt-2 flex items-start gap-3">
                                            <Navigation size={16} className="text-red-600 mt-0.5 shrink-0" />
                                            <div className="min-w-0">
                                                <span className="text-[9px] font-black text-slate-400 uppercase block">Customer Destination</span>
                                                <p className="text-xs font-bold text-slate-900 truncate">{incomingOffer.destAddress}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. Customer Comfort Preferences / Notes */}
                                    {(incomingOffer.acPreference || incomingOffer.atmospherePreference || incomingOffer.luggageAssistance || incomingOffer.notes) && (
                                        <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                                            <span className="text-[9px] font-black uppercase text-slate-400 w-full mb-1">Customer Requests:</span>
                                            {incomingOffer.acPreference && incomingOffer.acPreference !== "NO_PREFERENCE" && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                    {incomingOffer.acPreference === "AC_ON" ? "❄️ AC On" : "🌬️ Windows Down"}
                                                </span>
                                            )}
                                            {incomingOffer.atmospherePreference === "QUIET" && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                    🤫 Quiet Ride
                                                </span>
                                            )}
                                            {incomingOffer.luggageAssistance && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    🧳 Luggage Help
                                                </span>
                                            )}
                                            {incomingOffer.notes && (
                                                <p className="text-xs text-slate-600 italic w-full mt-1">
                                                    &ldquo;{incomingOffer.notes}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* 5. Accept & Decline Action Buttons */}
                                    <div className="flex items-center gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => handleDeclineRide(incomingOffer.rideId)}
                                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
                                        >
                                            Decline
                                        </button>
                                        <button
                                            type="button"
                                            disabled={acceptingRideId === incomingOffer.rideId}
                                            onClick={() => handleAcceptRide(incomingOffer.rideId)}
                                            className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer active:scale-95"
                                        >
                                            {acceptingRideId === incomingOffer.rideId ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" /> Accepting Ride...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 size={16} /> Accept Ride
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Driver-Initiated Ride Cancellation Modal */}
                    {isCancelModalOpen && activeRide && (
                        <div className="fixed inset-0 z-[210] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl max-w-lg w-full border-2 border-red-500 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                                            <AlertTriangle size={20} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black tracking-wider uppercase text-red-400 block">Driver Cancellation</span>
                                            <h3 className="text-lg font-black text-white">Cancel Assigned Ride</h3>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsCancelModalOpen(false)}
                                        className="text-slate-400 hover:text-white p-2 rounded-xl transition-colors cursor-pointer"
                                    >
                                        <XCircle size={20} />
                                    </button>
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* Ride Info Pill */}
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Trip Reference</p>
                                            <p className="font-black text-slate-900 text-sm">#{activeRide.bookingReference || activeRide.id.slice(-6).toUpperCase()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Passenger</p>
                                            <p className="font-bold text-slate-800 text-sm">{activeRide.rider?.name || activeRide.guestName || "Customer"}</p>
                                        </div>
                                    </div>

                                    {/* Reason Selector */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                                            Reason for Cancellation
                                        </label>
                                        <select
                                            value={cancelReason}
                                            onChange={(e) => setCancelReason(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                                        >
                                            <option value="Passenger no-show / uncontactable">Passenger no-show / uncontactable</option>
                                            <option value="Vehicle issue / mechanical trouble / flat tire">Vehicle issue / mechanical trouble</option>
                                            <option value="Road impassable / severe traffic delay">Road impassable / severe traffic delay</option>
                                            <option value="Passenger requested cancellation via call">Passenger requested cancellation via call</option>
                                            <option value="Personal emergency / safety concern">Personal emergency / safety concern</option>
                                            <option value="Other">Other reason (specify below)</option>
                                        </select>
                                    </div>

                                    {cancelReason === "Other" && (
                                        <div className="space-y-1">
                                            <input
                                                type="text"
                                                placeholder="Please specify reason..."
                                                value={cancelCustomReason}
                                                onChange={(e) => setCancelCustomReason(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                                            />
                                        </div>
                                    )}

                                    {/* Reassignment Option */}
                                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-2">
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={cancelReturnToPool}
                                                onChange={(e) => setCancelReturnToPool(e.target.checked)}
                                                className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                            />
                                            <div className="text-xs">
                                                <p className="font-bold text-amber-900">Return to Dispatch Queue (Recommended)</p>
                                                <p className="text-amber-700 font-medium mt-0.5">
                                                    Allows the AfriCab dispatch engine to instantly offer this trip to the next nearest driver so the passenger is not stranded.
                                                </p>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsCancelModalOpen(false)}
                                            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
                                        >
                                            Keep Ride
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isCancellingTrip}
                                            onClick={handleDriverCancelRide}
                                            className="flex-[2] py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                        >
                                            {isCancellingTrip ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                            {isCancellingTrip ? "Cancelling..." : "Confirm Cancellation"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Google Maps Turn-by-Turn Navigation Prompt Modal */}
                    {showDirectionsPrompt && activeRide && (
                        <div className="fixed inset-0 z-[220] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl max-w-md w-full border-2 border-emerald-500 shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                                        <Navigation size={24} className="animate-pulse" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">Navigation Assistant</span>
                                        <h3 className="text-lg font-black text-slate-900">Get Directions in Google Maps?</h3>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Target Location</p>
                                    <p className="text-xs font-bold text-slate-800">
                                        {activeRide.status === "IN_PROGRESS"
                                            ? activeRide.destAddress
                                            : activeRide.originAddress}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                        {activeRide.status === "IN_PROGRESS"
                                            ? "Launch live turn-by-turn driving navigation to the customer's destination in Google Maps."
                                            : "Launch live voice-guided driving navigation to the customer's pickup location in Google Maps."}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowDirectionsPrompt(false)}
                                        className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                                    >
                                        Stay in App
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowDirectionsPrompt(false);
                                            openGoogleMapsNavigation(
                                                activeRide.status === "IN_PROGRESS"
                                                    ? activeRide.destLat
                                                    : activeRide.originLat,
                                                activeRide.status === "IN_PROGRESS"
                                                    ? activeRide.destLng
                                                    : activeRide.originLng,
                                                activeRide.status === "IN_PROGRESS"
                                                    ? activeRide.destAddress
                                                    : activeRide.originAddress
                                            );
                                        }}
                                        className="flex-[2] py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                    >
                                        <Navigation size={15} /> Start Navigation
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Customer Cancellation Notification Alert */}
                    {cancelledRideAlert && (
                        <div className="fixed inset-0 z-[230] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl max-w-md w-full border-2 border-red-500 shadow-2xl overflow-hidden p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center mx-auto border-2 border-red-200">
                                    <AlertTriangle size={32} />
                                </div>
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-black uppercase text-red-600 tracking-wider">Ride Update Alert</span>
                                    <h3 className="text-xl font-black text-slate-900">Ride Cancelled by Customer</h3>
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                        Passenger <span className="font-bold text-slate-900">{cancelledRideAlert.clientName}</span> has cancelled trip <span className="font-bold text-slate-900">#{cancelledRideAlert.reference}</span>.
                                    </p>
                                    {cancelledRideAlert.reason && (
                                        <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-medium italic">
                                            "{cancelledRideAlert.reason}"
                                        </p>
                                    )}
                                </div>
                                <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 py-2 rounded-xl">
                                    ✅ Your queue is clear. You are online and ready for new trips.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setCancelledRideAlert(null)}
                                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-md cursor-pointer"
                                >
                                    Acknowledge & Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Receipt Modal / Viewer if viewing receipt */}
                    {viewingReceiptRide && (
                        <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm overflow-y-auto flex" onClick={(e) => { if (e.target === e.currentTarget) setViewingReceiptRide(null); }}>
                            <div className="w-full max-w-xl mx-auto my-6 px-4">
                                <RideReceipt
                                    ride={viewingReceiptRide}
                                    role="DRIVER"
                                    onClose={() => setViewingReceiptRide(null)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Change Password Modal */}
                    {isPasswordModalOpen && (
                        <div
                            className="fixed inset-0 z-[220] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
                            onClick={(e) => {
                                if (e.target === e.currentTarget && !currentUser?.forcePasswordChange) {
                                    setIsPasswordModalOpen(false);
                                }
                            }}
                        >
                            <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                                            <KeyRound size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white">Change Password</h3>
                                            <p className="text-[11px] text-slate-400 font-medium">Driver Account Security</p>
                                        </div>
                                    </div>
                                    {!currentUser?.forcePasswordChange && (
                                        <button
                                            type="button"
                                            onClick={() => setIsPasswordModalOpen(false)}
                                            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg transition-colors"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                                    {currentUser?.forcePasswordChange && (
                                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-semibold leading-relaxed">
                                            An initial password was assigned by the System Administrator. Please verify your current password and create a new personal password.
                                        </div>
                                    )}

                                    {/* Current Password */}
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                                            Current / Initial Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showCurrentPass ? "text" : "password"}
                                                required
                                                className="block w-full px-3.5 py-3 pr-10 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm font-semibold transition-all"
                                                placeholder="Enter current password"
                                                value={currentPass}
                                                onChange={(e) => setCurrentPass(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPass(!showCurrentPass)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                            >
                                                {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* New Password */}
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                                            New Password (min. 6 characters)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showNewPass ? "text" : "password"}
                                                required
                                                className="block w-full px-3.5 py-3 pr-10 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm font-semibold transition-all"
                                                placeholder="Enter new strong password"
                                                value={newPass}
                                                onChange={(e) => setNewPass(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPass(!showNewPass)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                            >
                                                {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm New Password */}
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                                            Confirm New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPass ? "text" : "password"}
                                                required
                                                className="block w-full px-3.5 py-3 pr-10 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm font-semibold transition-all"
                                                placeholder="Re-enter new password"
                                                value={confirmPass}
                                                onChange={(e) => setConfirmPass(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPass(!showConfirmPass)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                            >
                                                {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {passError && (
                                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl text-center">
                                            {passError}
                                        </div>
                                    )}

                                    {passSuccess && (
                                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2">
                                            <CheckCircle2 size={16} />
                                            {passSuccess}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 pt-2">
                                        {!currentUser?.forcePasswordChange && (
                                            <button
                                                type="button"
                                                onClick={() => setIsPasswordModalOpen(false)}
                                                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={passSubmitting}
                                            className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {passSubmitting ? (
                                                <>
                                                    <Loader2 size={15} className="animate-spin" />
                                                    Updating...
                                                </>
                                            ) : (
                                                "Update Password"
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-8 space-y-8">
                            {/* Profile Header */}
                            <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-50 border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm">
                                <div className="w-20 h-20 bg-white border border-slate-200 rounded-2xl p-2.5 flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
                                    <Image
                                        src="/africab-logo.png"
                                        alt="AfriCab Logo"
                                        width={72}
                                        height={72}
                                        className="w-full h-full object-contain drop-shadow-sm"
                                        priority
                                    />
                                </div>
                                <div className="text-center md:text-left space-y-1.5 flex-1 min-w-0">
                                    <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                                            {driverFullName}
                                        </h1>
                                        <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-bold shrink-0">
                                            PRO PARTNER
                                        </span>
                                    </div>

                                    {/* Rotating Motivational Message */}
                                    <div className="h-6 sm:h-7 flex items-center justify-center md:justify-start overflow-hidden">
                                        <div
                                            className={`flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-700 transition-all duration-500 ease-in-out transform ${msgFade === "in"
                                                    ? "opacity-100 translate-y-0"
                                                    : "opacity-0 -translate-y-2 pointer-events-none"
                                                }`}
                                            role="status"
                                            aria-live="polite"
                                        >
                                            <Sparkles size={14} className="text-emerald-600 shrink-0 animate-pulse" />
                                            <span className="italic tracking-tight">“{MOTIVATIONAL_MESSAGES[msgIndex]}”</span>
                                        </div>
                                    </div>

                                    <p className="text-slate-500 font-medium text-xs">
                                        {currentUser?.phone || user?.phone ? `MoMo Account: ${currentUser?.phone || user?.phone}` : "Verified Driver"} • Registered AfriCab Partner
                                    </p>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                                        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">
                                            <Star size={13} className="text-amber-500 fill-amber-400" /> 4.9 Rating
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-700">
                                            <Shield size={13} className="fill-emerald-600 text-emerald-600" /> Verified Pro
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">
                                            <Car size={13} className="text-slate-700" /> Toyota Sedan • Verified Plate
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsPasswordModalOpen(true)}
                                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                                        >
                                            <KeyRound size={13} /> Change Password
                                        </button>
                                    </div>
                                </div>
                                <div className="text-right hidden md:block shrink-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Partner ID</p>
                                    <p className="text-base font-mono font-bold text-slate-700">LC-8842</p>
                                </div>
                            </div>

                            {/* Earnings & Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm relative">
                                    <div className="absolute top-4 right-4 flex bg-white rounded-lg p-0.5 border border-slate-200">
                                        <button
                                            onClick={() => setEarningsPeriod("TODAY")}
                                            className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all ${earningsPeriod === "TODAY" ? "bg-slate-900 text-white" : "text-slate-500"}`}
                                        >DAY</button>
                                        <button
                                            onClick={() => setEarningsPeriod("WEEKLY")}
                                            className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all ${earningsPeriod === "WEEKLY" ? "bg-slate-900 text-white" : "text-slate-500"}`}
                                        >WEEK</button>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-100">
                                        <DollarSign size={20} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                                        {earningsPeriod === "TODAY" ? "Today's Net Earnings" : "Weekly Net Earnings"}
                                    </p>
                                    <h3 className="text-2xl font-black text-slate-900">
                                        {earningsPeriod === "TODAY" ? formatDual(totalEarningsToday) : formatDual(totalEarningsToday * 7)}
                                    </h3>
                                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                        <Activity size={11} /> {completedRides.length > 0 ? (earningsPeriod === "TODAY" ? "Based on today's trips" : "Estimated from daily average") : "No trips completed yet"}
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4 border border-blue-100">
                                        <Clock size={20} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">Hours Online</p>
                                    <h3 className="text-2xl font-black text-slate-900">{isOnline ? "Active" : "0.0h"}</h3>
                                    <p className="mt-2 text-[10px] font-bold text-slate-400">{isOnline ? "Currently on duty" : "Go online to start earning"}</p>
                                </div>

                                <div className="bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-4 border border-slate-200">
                                        <Activity size={20} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">Completed Rides</p>
                                    <h3 className="text-2xl font-black text-slate-900">{completedRides.length}</h3>
                                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                        <TrendingUp size={11} /> {completedRides.length > 0 ? `${completedRides.length} trip${completedRides.length > 1 ? 's' : ''} today` : "No completed trips yet"}
                                    </div>
                                </div>
                            </div>

                            {/* Active Mission Card OR Available Requests */}
                            {/* Active Mission Card OR Available Requests */}
                            {activeRide ? (
                                <div className="bg-white border-2 border-slate-900 p-6 sm:p-8 rounded-3xl shadow-md space-y-6 relative overflow-hidden">
                                    {/* Card Top: Status & Booking Reference */}
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${activeRide.status === "PENDING" || activeRide.status === "ASSIGNED"
                                                    ? "bg-amber-500 animate-ping"
                                                    : activeRide.status === "ACCEPTED"
                                                        ? "bg-blue-500 animate-ping"
                                                        : activeRide.status === "ARRIVED"
                                                            ? "bg-emerald-500 animate-pulse"
                                                            : "bg-emerald-500 animate-ping"
                                                }`} />
                                            <h3 className="text-lg font-black text-slate-900">
                                                {activeRide.status === "PENDING" || activeRide.status === "ASSIGNED"
                                                    ? "New Ride Alert · Action Required"
                                                    : activeRide.status === "ACCEPTED"
                                                        ? "En Route to Pickup Location"
                                                        : activeRide.status === "ARRIVED"
                                                            ? "Arrived at Pickup · Waiting for Passenger"
                                                            : "Active Ride in Progress · Navigating to Destination"}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {activeRide.rideCategory && (
                                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-900 text-white">
                                                    {activeRide.rideCategory}
                                                </span>
                                            )}
                                            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                #{activeRide.bookingReference || activeRide.id.slice(-6).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 4-Step Driver Ride Management Workflow Progress Tracker */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                        <div className="grid grid-cols-4 gap-2 text-center relative">
                                            {/* Step 1: Ride Alert */}
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                                                    <CheckCircle2 size={16} />
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-slate-900 mt-1.5">1. Ride Alert</span>
                                                <span className="text-[9px] font-semibold text-emerald-600">Assigned</span>
                                            </div>

                                            {/* Step 2: Pickup Navigation */}
                                            <div className="flex flex-col items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-sm transition-all ${activeRide.status === "PENDING" || activeRide.status === "ASSIGNED"
                                                        ? "bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse"
                                                        : activeRide.status === "ACCEPTED"
                                                            ? "bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse"
                                                            : "bg-emerald-600 text-white"
                                                    }`}>
                                                    {activeRide.status === "PENDING" || activeRide.status === "ASSIGNED"
                                                        ? "2"
                                                        : activeRide.status === "ACCEPTED"
                                                            ? <Navigation size={15} />
                                                            : <CheckCircle2 size={16} />}
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-slate-900 mt-1.5">2. Pickup Route</span>
                                                <span className={`text-[9px] font-semibold ${activeRide.status === "PENDING" || activeRide.status === "ASSIGNED"
                                                        ? "text-amber-600 animate-pulse font-bold"
                                                        : activeRide.status === "ACCEPTED"
                                                            ? "text-blue-600 font-bold animate-pulse"
                                                            : "text-emerald-600"
                                                    }`}>
                                                    {activeRide.status === "PENDING" || activeRide.status === "ASSIGNED"
                                                        ? "Tap Accept"
                                                        : activeRide.status === "ACCEPTED"
                                                            ? "En Route"
                                                            : "Reached"}
                                                </span>
                                            </div>

                                            {/* Step 3: Confirm Arrival & Start */}
                                            <div className="flex flex-col items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-sm transition-all ${activeRide.status === "IN_PROGRESS"
                                                        ? "bg-emerald-600 text-white"
                                                        : activeRide.status === "ARRIVED"
                                                            ? "bg-emerald-500 text-white ring-4 ring-emerald-100 animate-bounce"
                                                            : "bg-slate-200 text-slate-500"
                                                    }`}>
                                                    {activeRide.status === "IN_PROGRESS" ? <CheckCircle2 size={16} /> : <MapPin size={15} />}
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-slate-900 mt-1.5">3. Arrival</span>
                                                <span className={`text-[9px] font-semibold ${activeRide.status === "IN_PROGRESS"
                                                        ? "text-emerald-600"
                                                        : activeRide.status === "ARRIVED"
                                                            ? "text-emerald-600 font-bold animate-pulse"
                                                            : "text-slate-400"
                                                    }`}>
                                                    {activeRide.status === "IN_PROGRESS"
                                                        ? "Started"
                                                        : activeRide.status === "ARRIVED"
                                                            ? "Tap Start"
                                                            : activeRide.status === "ACCEPTED"
                                                                ? "Drive to Pickup"
                                                                : "Waiting"}
                                                </span>
                                            </div>

                                            {/* Step 4: Drop-off Destination Navigation */}
                                            <div className="flex flex-col items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-sm transition-all ${activeRide.status === "IN_PROGRESS"
                                                        ? "bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse"
                                                        : "bg-slate-200 text-slate-500"
                                                    }`}>
                                                    {activeRide.status === "IN_PROGRESS" ? <Navigation size={15} /> : <Lock size={14} />}
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-slate-900 mt-1.5">4. Drop-off Route</span>
                                                <span className={`text-[9px] font-semibold ${activeRide.status === "IN_PROGRESS"
                                                        ? "text-blue-600 font-bold animate-pulse"
                                                        : "text-slate-400"
                                                    }`}>
                                                    {activeRide.status === "IN_PROGRESS" ? "Live to Dest" : "Revealed on Start"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Workflow Contextual Guidance & Quick Navigation Banner */}
                                    {(activeRide.status === "PENDING" || activeRide.status === "ASSIGNED") && (
                                        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shrink-0 animate-bounce">
                                                    <Bell size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black uppercase tracking-wider text-amber-900">Step 1 · New Ride Alert</p>
                                                    <p className="text-xs text-amber-800 font-medium mt-0.5 truncate">
                                                        A customer request has been assigned to you. Click <strong>Accept Ride</strong> below to begin navigation to pickup.
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={acceptingRideId === activeRide.id}
                                                onClick={() => handleAcceptRide(activeRide.id)}
                                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer disabled:opacity-50"
                                            >
                                                {acceptingRideId === activeRide.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                Accept Ride
                                            </button>
                                        </div>
                                    )}

                                    {activeRide.status === "ACCEPTED" && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0">
                                                    <Navigation size={20} className="animate-pulse" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black uppercase tracking-wider text-blue-900">Step 2 · Drive to Pickup Location</p>
                                                    <p className="text-xs text-blue-800 font-medium mt-0.5 truncate">
                                                        Pickup: <strong>{activeRide.originAddress}</strong>. Once you arrive at the passenger&apos;s location, tap <strong>Arrived at Pickup</strong>.
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => openGoogleMapsNavigation(activeRide.originLat, activeRide.originLng, activeRide.originAddress)}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
                                            >
                                                <Navigation size={14} /> Directions to Pickup
                                            </button>
                                        </div>
                                    )}

                                    {activeRide.status === "ARRIVED" && (
                                        <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0">
                                                    <MapPin size={20} className="text-white" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black uppercase tracking-wider text-emerald-900">Step 3 · Arrived at Pickup · Confirm Arrival &amp; Start Ride</p>
                                                    <p className="text-xs text-emerald-800 font-medium mt-0.5 truncate">
                                                        You have arrived at the pickup location. Once passenger is aboard, tap <strong>Start Ride</strong> to reveal the destination and activate navigation.
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={statusUpdating}
                                                onClick={() => handleUpdateStatus("IN_PROGRESS")}
                                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer disabled:opacity-50 animate-pulse"
                                            >
                                                {statusUpdating ? <Loader2 size={16} className="animate-spin" /> : <Car size={16} />}
                                                Start Ride (Reveal Destination)
                                            </button>
                                        </div>
                                    )}

                                    {/* Requirement 4: Once ride is started, automatically display customer destination and activate navigation */}
                                    {activeRide.status === "IN_PROGRESS" && (
                                        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg border border-blue-500/30">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-11 h-11 rounded-2xl bg-blue-500/30 text-blue-300 flex items-center justify-center shrink-0 border border-blue-400/30">
                                                    <Navigation size={22} className="animate-pulse" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping inline-block" />
                                                        Step 4 · Active Trip · Navigating to Customer Destination
                                                    </span>
                                                    <p className="text-sm font-black truncate text-white mt-0.5">
                                                        {activeRide.destAddress}
                                                    </p>
                                                    <p className="text-[11px] text-blue-200 mt-0.5 font-medium">
                                                        {activeRide.distanceKm ? `${activeRide.distanceKm.toFixed(1)} km · ` : ""}Drop-off location revealed &amp; turn-by-turn navigation active
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => openGoogleMapsNavigation(activeRide.destLat, activeRide.destLng, activeRide.destAddress)}
                                                className="px-5 py-3 bg-blue-500 hover:bg-blue-400 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/30 shrink-0 active:scale-95 transition-all cursor-pointer"
                                            >
                                                <Navigation size={15} className="text-slate-950 fill-current" />
                                                <span>Launch Google Maps Turn-by-Turn</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Passenger Info & Direct Contact */}
                                    <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shrink-0">
                                                {activeRide.rider?.name?.charAt(0) || activeRide.guestName?.charAt(0) || "P"}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-black text-slate-900 text-sm truncate">{activeRide.rider?.name || activeRide.guestName || "Passenger"}</h4>
                                                <p className="text-xs font-mono text-slate-500 truncate">{activeRide.customerPaymentPhone || activeRide.rider?.phone || activeRide.guestPhone || "Phone on file"}</p>
                                            </div>
                                        </div>

                                        {(activeRide.rider?.phone || activeRide.customerPaymentPhone || activeRide.guestPhone) && (
                                            <a
                                                href={`tel:${activeRide.customerPaymentPhone || activeRide.rider?.phone || activeRide.guestPhone}`}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm shrink-0"
                                            >
                                                <Phone size={14} /> Call Passenger
                                            </a>
                                        )}
                                    </div>

                                    {/* Passenger Comfort Preferences & Notes (if any) */}
                                    {(activeRide.acPreference || activeRide.atmospherePreference || activeRide.luggageAssistance || activeRide.notes) && (
                                        <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                                            <span className="text-[9px] font-black uppercase text-slate-400 w-full mb-1">Customer Preferences:</span>
                                            {activeRide.acPreference && activeRide.acPreference !== "NO_PREFERENCE" && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                    {activeRide.acPreference === "AC_ON" ? "❄️ AC On" : "🌬️ Windows Down"}
                                                </span>
                                            )}
                                            {activeRide.atmospherePreference === "QUIET" && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                    🤫 Quiet Ride
                                                </span>
                                            )}
                                            {activeRide.luggageAssistance && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    🧳 Luggage Help
                                                </span>
                                            )}
                                            {activeRide.notes && (
                                                <p className="text-xs text-slate-600 italic w-full mt-1">
                                                    &ldquo;{activeRide.notes}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Route Details: Sequential Pickup & Drop-off */}
                                    <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="text-emerald-600 mt-0.5 shrink-0" size={16} />
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-slate-400 uppercase">1. Customer Pickup Location</p>
                                                <p className="font-bold text-sm text-slate-900 break-words">{activeRide.originAddress}</p>
                                            </div>
                                        </div>
                                        <div className="ml-2 border-l-2 border-dashed border-slate-300 h-3" />
                                        <div className="flex items-start gap-3">
                                            <MapPin className={`${activeRide.status === "IN_PROGRESS" ? "text-red-600" : "text-slate-400"} mt-0.5 shrink-0`} size={16} />
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-slate-400 uppercase">2. Drop-off Destination</p>
                                                {activeRide.status === "IN_PROGRESS" ? (
                                                    <p className="font-bold text-sm text-slate-900 break-words">{activeRide.destAddress}</p>
                                                ) : (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded-lg">
                                                            <Lock size={12} className="text-slate-500" />
                                                            Destination revealed upon clicking &quot;Start Ride&quot;
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fare & Step-by-Step Action Buttons */}
                                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase block">Expected Fare</span>
                                            <span className="text-xl font-black text-slate-900">{formatDual(activeRide.fare || 5.0)}</span>
                                            <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Payment: {activeRide.paymentMethod || "MOMO / Cash"}</span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Cancel Ride Option for Driver: Always accessible across all ride phases */}
                                            <button
                                                type="button"
                                                onClick={() => setIsCancelModalOpen(true)}
                                                className="px-4 py-3.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                                                title="Cancel or release this trip"
                                            >
                                                <XCircle size={15} /> Cancel Ride
                                            </button>

                                            {/* Stage 1: Accept Ride (when ride alert / assignment reaches driver first) */}
                                            {(activeRide.status === "PENDING" || activeRide.status === "ASSIGNED") && (
                                                <button
                                                    type="button"
                                                    disabled={acceptingRideId === activeRide.id}
                                                    onClick={() => handleAcceptRide(activeRide.id)}
                                                    className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                                >
                                                    {acceptingRideId === activeRide.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                                    Accept Ride
                                                </button>
                                            )}

                                            {/* Stage 2: En Route to Pickup (Accepted -> Directions to Pickup & Confirm Arrival) */}
                                            {activeRide.status === "ACCEPTED" && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => openGoogleMapsNavigation(activeRide.originLat, activeRide.originLng, activeRide.originAddress)}
                                                        className="px-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                                                    >
                                                        <Navigation size={15} /> Directions to Pickup
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={statusUpdating}
                                                        onClick={() => handleUpdateStatus("ARRIVED")}
                                                        className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {statusUpdating ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} className="text-emerald-400" />}
                                                        Arrived at Pickup
                                                    </button>
                                                </>
                                            )}

                                            {/* Stage 3: Arrived at Pickup (Start Ride confirms arrival, reveals drop-off destination & activates destination navigation) */}
                                            {activeRide.status === "ARRIVED" && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => openGoogleMapsNavigation(activeRide.originLat, activeRide.originLng, activeRide.originAddress)}
                                                        className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-slate-200"
                                                    >
                                                        <MapPin size={15} /> Pickup Location
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={statusUpdating}
                                                        onClick={() => handleUpdateStatus("IN_PROGRESS")}
                                                        className="px-7 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer animate-pulse"
                                                    >
                                                        {statusUpdating ? <Loader2 size={16} className="animate-spin" /> : <Car size={16} />}
                                                        Start Ride (Reveal Drop-off)
                                                    </button>
                                                </>
                                            )}

                                            {/* Stage 4: In Progress (Active trip -> Destination Navigation & Complete Ride) */}
                                            {activeRide.status === "IN_PROGRESS" && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => openGoogleMapsNavigation(activeRide.destLat, activeRide.destLng, activeRide.destAddress)}
                                                        className="px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                                                    >
                                                        <Navigation size={15} /> Google Maps Navigation
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={completingTrip}
                                                        onClick={handleCompleteRide}
                                                        className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                                                    >
                                                        {completingTrip ? <RefreshCw className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                                                        {completingTrip ? "Settling..." : "End Ride & Issue Receipt"}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : approvalStatus !== "APPROVED" ? (
                                // Approval-blocked state
                                <div className={`p-10 rounded-3xl border-2 text-center flex flex-col items-center justify-center space-y-4 ${approvalStatus === "PENDING"
                                        ? "bg-amber-50 border-amber-200"
                                        : "bg-red-50 border-red-200"
                                    }`}>
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${approvalStatus === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                        }`}>
                                        <ShieldAlert size={32} />
                                    </div>
                                    <div className="space-y-2 max-w-sm">
                                        <h3 className={`text-lg font-black ${approvalStatus === "PENDING" ? "text-amber-900" : "text-red-900"
                                            }`}>
                                            {approvalStatus === "PENDING" ? "Awaiting Admin Approval" : "Account Restricted"}
                                        </h3>
                                        <p className={`text-xs leading-relaxed font-medium ${approvalStatus === "PENDING" ? "text-amber-700" : "text-red-700"
                                            }`}>
                                            {approvalStatus === "PENDING"
                                                ? "Your registration is currently under review. You will be notified and can start accepting rides once an administrator approves your account."
                                                : `Your application was rejected${rejectionReason ? `: "${rejectionReason}"` : "."} Please contact AfriCab support for assistance.`
                                            }
                                        </p>
                                    </div>
                                </div>
                            ) : availableRides.length > 0 && isOnline ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-lg font-black text-slate-900">Available Trip Requests ({availableRides.length})</h3>
                                        <span className="text-xs text-slate-400">Tap to accept immediate pickup</span>
                                    </div>
                                    {availableRides.map((ride: any) => (
                                        <div key={ride.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4 hover:border-slate-300 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 border border-emerald-100">
                                                        <DollarSign size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase">Estimated Fare</p>
                                                        <p className="text-lg font-black text-slate-900">{formatDual(ride.fare || 4.50)}</p>
                                                    </div>
                                                </div>
                                                <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-700">
                                                    {ride.vehicleType || "Car"} • {ride.rideCategory || "Regular"}
                                                </span>
                                            </div>

                                            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                                <div className="flex items-start gap-2.5">
                                                    <MapPin size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                                                    <p className="text-xs font-bold text-slate-800">{ride.originAddress}</p>
                                                </div>
                                                <div className="flex items-start gap-2.5">
                                                    <MapPin size={14} className="text-red-600 mt-0.5 shrink-0" />
                                                    <p className="text-xs font-bold text-slate-800">{ride.destAddress}</p>
                                                </div>
                                            </div>

                                            {/* ❄️ Customer Ride Preferences */}
                                            {(ride.acPreference || ride.atmospherePreference || ride.luggageAssistance || ride.notes) && (
                                                <div className="flex flex-wrap gap-1.5 px-1">
                                                    <span className="text-[9px] font-black uppercase text-slate-400 w-full">Customer requests:</span>
                                                    {ride.acPreference && ride.acPreference !== "NO_PREFERENCE" && (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${ride.acPreference === "AC_ON"
                                                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            }`}>
                                                            {ride.acPreference === "AC_ON" ? "❄️ AC On" : "🌬️ Windows Down"}
                                                        </span>
                                                    )}
                                                    {ride.atmospherePreference === "QUIET" && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-slate-100 text-slate-700 border-slate-200">
                                                            🤫 Quiet Ride
                                                        </span>
                                                    )}
                                                    {ride.luggageAssistance && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-amber-50 text-amber-700 border-amber-200">
                                                            🧳 Luggage Help
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <button
                                                disabled={acceptingRideId === ride.id}
                                                onClick={() => handleAcceptRide(ride.id)}
                                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-75"
                                            >
                                                {acceptingRideId === ride.id ? (
                                                    <>
                                                        <Loader2 size={16} className="animate-spin" /> Accepting Ride...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 size={16} /> Accept Ride
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-12 rounded-3xl border border-slate-200 text-center flex flex-col items-center justify-center space-y-4">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isOnline ? 'bg-amber-100 text-slate-950' : 'bg-slate-200 text-slate-400'}`}>
                                        <Car size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-black text-slate-900">
                                            {isOnline ? 'Waiting for passenger requests...' : 'You are currently offline'}
                                        </h3>
                                        <p className="text-xs text-slate-500 max-w-sm">
                                            {isOnline ? 'New trip requests in your area will appear here automatically.' : 'Click "Go Online" above to start receiving ride requests.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Completed Rides History & Receipts */}
                            {completedRides.length > 0 && (
                                <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                            <FileText size={16} className="text-slate-600" /> Today&apos;s Completed Trips &amp; Receipts
                                        </h3>
                                        <span className="text-xs text-slate-400">{completedRides.length} Trips</span>
                                    </div>

                                    <div className="space-y-3 max-h-72 overflow-y-auto">
                                        {completedRides.slice(0, 5).map((r) => (
                                            <div key={r.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs font-black text-slate-900 truncate">
                                                            {r.rider?.name || r.guestName || "Passenger"}
                                                        </p>
                                                        <span className="text-[9px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">PAID</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                                        {r.originAddress} ➔ {r.destAddress}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0 flex items-center gap-3">
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900">{formatDual(r.fare || 0)}</p>
                                                        <p className="text-[10px] text-emerald-700 font-semibold">Net: ${((r.fare || 0) * 0.85).toFixed(2)}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingReceiptRide(r)}
                                                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold shadow-sm"
                                                    >
                                                        View Receipt
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Ride Alert & Push Notification Status Card */}
                            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                            <Bell size={16} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900">Ride Alerts</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Background Push &amp; Sound</p>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                                        {isOnline ? 'Active' : 'Offline'}
                                    </span>
                                </div>

                                <p className="text-xs text-slate-500 leading-relaxed">
                                    When customers place ride requests in your radius, your device receives instant high-priority audio &amp; vibration alerts.
                                </p>

                                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={testingPush}
                                        onClick={handleTestNotification}
                                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 border border-slate-200"
                                    >
                                        <Volume2 size={14} className="text-emerald-600" />
                                        {testingPush ? "Playing Test Chime..." : "Test Chime & Alert"}
                                    </button>
                                </div>
                            </div>

                            {/* Account & Password Security Card */}
                            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                                        <Lock size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900">Account Security</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Password Management</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Update your password or replace the initial password provided by the administrator at any time.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsPasswordModalOpen(true)}
                                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 border border-slate-200"
                                >
                                    <KeyRound size={14} className="text-emerald-600" />
                                    Change Password
                                </button>
                            </div>

                            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                                <AnnouncementFeed />
                            </div>

                            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm space-y-4">
                                <div className="flex items-center gap-3 text-red-400">
                                    <Shield size={24} />
                                    <h4 className="text-base font-black text-white">Emergency Driver SOS</h4>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    Direct instant priority channel to AfriCab Dispatch Center and local authorities if you face any danger or roadside issue.
                                </p>
                                <button
                                    onClick={() => alert("🚨 DRIVER EMERGENCY ALERT BROADCAST TO AFRICAB DISPATCH")}
                                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors shadow-sm"
                                >
                                    Broadcast Emergency SOS
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
