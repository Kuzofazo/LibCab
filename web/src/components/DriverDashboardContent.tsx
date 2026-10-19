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
    const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsBroadcasting, setGpsBroadcasting] = useState(false);
    const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [completingTrip, setCompletingTrip] = useState(false);
    const [incomingOffer, setIncomingOffer] = useState<{
        rideId: string;
        originAddress: string;
        destAddress: string;
        fare: number;
        distanceKm: number;
        etaMinutes: number;
        vehicleType?: string;
        countdown: number;
    } | null>(null);
    const [pushPermission, setPushPermission] = useState<string>("default");
    const [testingPush, setTestingPush] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
    const incomingOfferRef = useRef<any>(null);
    incomingOfferRef.current = incomingOffer;

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
                            } catch {}
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
                        }).catch(() => {});
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
                            } catch {}
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

                if (payload.type === "RIDE_OFFER_RECEIVED" || payload.type === "RIDE_REQUESTED") {
                    const offerData = payload.data?.ride || payload.data;
                    const targetDriverId = payload.driverId;

                    const isTargetDriver = !targetDriverId ||
                        targetDriverId === user.id ||
                        targetDriverId === user.driverProfileId ||
                        targetDriverId === driverProfileId ||
                        targetDriverId === currentUser?.driverProfileId;

                    if (isTargetDriver && !activeRide) {
                        playChimeSound();

                        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
                            new Notification("🚖 New AfriCab Ride Request!", {
                                body: `Pickup: ${offerData.originAddress} • Fare: $${Number(offerData.fare || 5).toFixed(2)}`,
                                icon: "/favicon.ico",
                            });
                        }

                        setIncomingOffer({
                            rideId: offerData.id || payload.rideId,
                            originAddress: offerData.originAddress,
                            destAddress: offerData.destAddress,
                            fare: offerData.fare || 5.0,
                            distanceKm: offerData.distanceKm || 1.8,
                            etaMinutes: offerData.etaMinutes || 4,
                            vehicleType: offerData.vehicleType || "Car",
                            countdown: 45,
                        });

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
                } else if (payload.type === "RIDE_ACCEPTED") {
                    const isForMe = payload.driverId === driverProfileId ||
                        payload.driverId === user.id ||
                        payload.data?.driverId === driverProfileId ||
                        payload.data?.driver?.userId === user.id;

                    if (isForMe && payload.data) {
                        setActiveRide(payload.data);
                        setIncomingOffer(null);
                        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                    } else if (incomingOfferRef.current?.rideId === payload.rideId) {
                        setIncomingOffer(null);
                        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                    }
                } else if (payload.type === "RIDE_TAKEN" || payload.type === "RIDE_CANCELLED") {
                    if (incomingOfferRef.current?.rideId === payload.rideId) {
                        setIncomingOffer(null);
                        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                    }
                }
            } catch {}
        };

        return () => {
            sse.close();
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        };
    }, [user, isOnline, approvalStatus, playChimeSound, activeRide, driverProfileId, currentUser]);

    const fetchRides = useCallback(async (userId: string) => {
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/rides", {
                headers: {
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                }
            });
            if (!res || !res.ok) return;
            const data = await res.json();

            if (Array.isArray(data)) {
                // 1. Find my active ride (Accepted / Arrived / In Progress)
                const myActiveRide = data.find(r =>
                    (
                        r.driver?.userId === userId || 
                        r.driverId === userId || 
                        r.driver?.id === userId ||
                        r.driverId === driverProfileId ||
                        r.driver?.id === driverProfileId ||
                        r.driver?.userId === user?.id
                    ) &&
                    (r.status === "ACCEPTED" || r.status === "ARRIVED" || r.status === "IN_PROGRESS")
                );
                setActiveRide(myActiveRide || null);

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
    }, [driverProfileId, user]);

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
                }
                fetchRides(user.id);
                // Immediately broadcast current coordinates so customer's tracking map updates instantly
                if (myCoords) {
                    broadcastLocation(myCoords.lat, myCoords.lng);
                }
            } else if (res.status === 409 || data.code === "ALREADY_TAKEN") {
                alert("Trip Claimed: Another nearby driver accepted this ride request.");
                setIncomingOffer(null);
                if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
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
        } catch {}
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
            if (res.ok) {
                const updated = await res.json();
                setActiveRide(updated);
                if (status === "IN_PROGRESS") {
                    fetchWallet();
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
        } catch {}
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
        } catch {}
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
            } catch {}
        }
        if (newStatus) {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    setMyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    broadcastLocation(pos.coords.latitude, pos.coords.longitude);
                }, () => {}, { enableHighAccuracy: true });
            }
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
        if (!isOnline || typeof navigator === "undefined") return;

        const startBroadcast = () => {
            setGpsBroadcasting(true);
            const intervalMs = activeRide ? 4000 : 8000;
            gpsIntervalRef.current = setInterval(() => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const { latitude: lat, longitude: lng, speed } = pos.coords;
                        setMyCoords({ lat, lng });
                        broadcastLocation(lat, lng, speed ? speed * 3.6 : 0, 0);
                    },
                    () => {},
                    { enableHighAccuracy: true, timeout: 5000 }
                );
            }, intervalMs);
        };

        // Initial position grab
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setMyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                broadcastLocation(pos.coords.latitude, pos.coords.longitude);
                startBroadcast();
            },
            () => startBroadcast(),
            { enableHighAccuracy: true, timeout: 5000 }
        );

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
                            className={`flex items-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all shadow-sm ${
                                isOnline 
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
                                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 ${
                                    showWalletTab
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
                                        {walletData.wallet.balance.toFixed(0)} LRD
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
                                    <div className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider w-fit ${
                                        walletData?.eligible
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
                                        <div className={`mb-3 p-3 rounded-2xl text-[11px] font-semibold leading-relaxed ${
                                            fundingResult.success ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"
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
                                                        className={`py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                                                            fundingProvider === p
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
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                                        tx.type === "CREDIT" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
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

            {/* Live Position Map */}

            {myCoords && (
                <div className="border-b border-slate-100 bg-slate-50">
                    <div className="container mx-auto px-4 sm:px-6 py-4">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                        {isOnline ? "Live Driver GPS Radar" : "Driver Map (Offline Standby)"}
                                    </span>
                                    {gpsBroadcasting && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                            <Wifi size={9} /> Broadcasting GPS
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-mono text-slate-500">
                                    {myCoords.lat.toFixed(5)}°N, {Math.abs(myCoords.lng).toFixed(5)}°W
                                </span>
                            </div>
                            <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-md h-[340px] sm:h-[380px] w-full relative">
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
                                        ...(activeRide?.originLat && activeRide?.originLng ? [{
                                            id: "customer-pickup",
                                            lat: activeRide.originLat,
                                            lng: activeRide.originLng,
                                            title: activeRide.customer?.name || "Customer Pickup",
                                            subtitle: activeRide.originAddress || "Pickup Location",
                                            type: "PICKUP" as const,
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
                                        activeRide?.originLat && activeRide?.originLng
                                            ? [{
                                                id: "to-pickup",
                                                origin: [myCoords.lat, myCoords.lng] as [number, number],
                                                destination: [activeRide.originLat, activeRide.originLng] as [number, number],
                                                color: "#0f172a",
                                            }]
                                            : []
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="container mx-auto px-4 sm:px-6 py-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Real-Time Incoming Ride Offer Modal */}
                    {incomingOffer && (
                        <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl max-w-lg w-full border-2 border-emerald-500 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30 animate-pulse">
                                            <Bell size={20} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black tracking-wider uppercase text-emerald-400 block">Instant Match Available</span>
                                            <h3 className="text-lg font-black text-white">New Ride Request</h3>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-amber-400">{incomingOffer.countdown}s</span>
                                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Expires</span>
                                    </div>
                                </div>

                                <div className="h-1.5 w-full bg-slate-100">
                                    <div 
                                        className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
                                        style={{ width: `${(incomingOffer.countdown / 45) * 100}%` }}
                                    />
                                </div>

                                <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase block">Estimated Fare</span>
                                            <span className="text-xl font-black text-slate-900">{formatDual(incomingOffer.fare)}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-slate-400 uppercase block">Distance to Pickup</span>
                                            <span className="text-xl font-black text-emerald-600">{incomingOffer.distanceKm.toFixed(1)} km</span>
                                            <span className="text-[10px] font-bold text-slate-500 block">~{incomingOffer.etaMinutes} mins away</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                        <div className="flex items-start gap-3">
                                            <MapPin size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                                            <div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase block">Pickup Address</span>
                                                <p className="text-xs font-bold text-slate-900">{incomingOffer.originAddress}</p>
                                            </div>
                                        </div>
                                        <div className="border-t border-slate-200 pt-2 flex items-start gap-3">
                                            <Navigation size={16} className="text-red-600 mt-0.5 shrink-0" />
                                            <div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase block">Destination Address</span>
                                                <p className="text-xs font-bold text-slate-900">{incomingOffer.destAddress}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => handleDeclineRide(incomingOffer.rideId)}
                                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors"
                                        >
                                            Decline
                                        </button>
                                        <button
                                            type="button"
                                            disabled={acceptingRideId === incomingOffer.rideId}
                                            onClick={() => handleAcceptRide(incomingOffer.rideId)}
                                            className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-75"
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
                                            className={`flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-700 transition-all duration-500 ease-in-out transform ${
                                                msgFade === "in"
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
                            {activeRide ? (
                                <div className="bg-white border-2 border-slate-900 p-6 sm:p-8 rounded-3xl shadow-md space-y-6 relative overflow-hidden">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                                            <h3 className="text-lg font-black text-slate-900">Active Ride in Progress</h3>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                                            #{activeRide.id.slice(-6).toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Passenger Info */}
                                    <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg">
                                                {activeRide.rider?.name?.charAt(0) || activeRide.guestName?.charAt(0) || "P"}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 text-sm">{activeRide.rider?.name || activeRide.guestName || "Passenger"}</h4>
                                                <p className="text-xs font-mono text-slate-500">{activeRide.customerPaymentPhone || activeRide.rider?.phone || "Phone on file"}</p>
                                            </div>
                                        </div>

                                        {(activeRide.rider?.phone || activeRide.customerPaymentPhone) && (
                                            <a
                                                href={`tel:${activeRide.customerPaymentPhone || activeRide.rider?.phone}`}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm"
                                            >
                                                <Phone size={14} /> Call Passenger
                                            </a>
                                        )}
                                    </div>

                                    {/* Route */}
                                    <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="text-emerald-600 mt-0.5 shrink-0" size={16} />
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">Pickup Location</p>
                                                <p className="font-bold text-sm text-slate-900">{activeRide.originAddress}</p>
                                            </div>
                                        </div>
                                        <div className="ml-2 border-l-2 border-dashed border-slate-300 h-3" />
                                        <div className="flex items-start gap-3">
                                            <MapPin className="text-red-600 mt-0.5 shrink-0" size={16} />
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">Dropoff Destination</p>
                                                <p className="font-bold text-sm text-slate-900">{activeRide.destAddress}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fare & Stage Actions */}
                                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase block">Expected Fare</span>
                                            <span className="text-xl font-black text-slate-900">{formatDual(activeRide.fare || 5.0)}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {activeRide.status === "ACCEPTED" && (
                                                <button
                                                    type="button"
                                                    disabled={statusUpdating}
                                                    onClick={() => handleUpdateStatus("ARRIVED")}
                                                    className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {statusUpdating ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} className="text-emerald-400" />}
                                                    Arrived
                                                </button>
                                            )}

                                            {activeRide.status === "ARRIVED" && (
                                                <button
                                                    type="button"
                                                    disabled={statusUpdating}
                                                    onClick={() => handleUpdateStatus("IN_PROGRESS")}
                                                    className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {statusUpdating ? <Loader2 size={15} className="animate-spin" /> : <Car size={15} />}
                                                    Start Ride
                                                </button>
                                            )}

                                            {activeRide.status === "IN_PROGRESS" && (
                                                <button
                                                    type="button"
                                                    disabled={completingTrip}
                                                    onClick={handleCompleteRide}
                                                    className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                                                >
                                                    {completingTrip ? <RefreshCw className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                                                    {completingTrip ? "Settling..." : "End Ride & Issue Receipt"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : approvalStatus !== "APPROVED" ? (
                                // Approval-blocked state
                                <div className={`p-10 rounded-3xl border-2 text-center flex flex-col items-center justify-center space-y-4 ${
                                    approvalStatus === "PENDING"
                                        ? "bg-amber-50 border-amber-200"
                                        : "bg-red-50 border-red-200"
                                }`}>
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                                        approvalStatus === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                    }`}>
                                        <ShieldAlert size={32} />
                                    </div>
                                    <div className="space-y-2 max-w-sm">
                                        <h3 className={`text-lg font-black ${
                                            approvalStatus === "PENDING" ? "text-amber-900" : "text-red-900"
                                        }`}>
                                            {approvalStatus === "PENDING" ? "Awaiting Admin Approval" : "Account Restricted"}
                                        </h3>
                                        <p className={`text-xs leading-relaxed font-medium ${
                                            approvalStatus === "PENDING" ? "text-amber-700" : "text-red-700"
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
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                                            ride.acPreference === "AC_ON"
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
                                                        <p className="text-[10px] text-emerald-700 font-semibold">Net: ${( (r.fare || 0) * 0.85).toFixed(2)}</p>
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
