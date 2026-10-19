"use client";

import React, { useEffect, useState, useRef } from "react";
import {
    Bell,
    Car,
    CheckCircle2,
    MapPin,
    Navigation,
    Phone,
    ShieldAlert,
    X,
    Volume2,
    VolumeX,
    AlertTriangle,
    Siren,
    ExternalLink
} from "lucide-react";
import Link from "next/link";

interface NotificationItem {
    id: string;
    type: "REQUEST" | "ACCEPTED" | "STATUS" | "SOS" | "SECURITY";
    title: string;
    message: string;
    details?: {
        rideId?: string;
        clientName?: string;
        clientPhone?: string;
        driverName?: string;
        driverPhone?: string;
        origin?: string;
        destination?: string;
        fare?: number;
        vehicleType?: string;
        vehicleModel?: string;
        licensePlate?: string;
        reason?: string;
        lat?: number;
        lng?: number;
        ip?: string;
        city?: string;
        country?: string;
        region?: string;
        deviceFingerprint?: string;
        attemptedUsername?: string;
        attackType?: string;
        maliciousPayload?: string;
        targetUrl?: string;
        severity?: string;
    };
    timestamp: Date;
    read: boolean;
}

export default function AdminNotificationListener() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
    const [emergencySos, setEmergencySos] = useState<NotificationItem | null>(null);
    const [securityAlert, setSecurityAlert] = useState<NotificationItem | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const soundEnabledRef = useRef(true);
    const processedIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        soundEnabledRef.current = soundEnabled;
    }, [soundEnabled]);

    // Synthesize audible chimes with Web Audio API
    const playNotificationSound = (type: "REQUEST" | "ACCEPTED" | "SOS") => {
        if (!soundEnabledRef.current) return;
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();

            if (type === "SOS") {
                // High-urgency European/Emergency 2-tone siren (Hi-Lo pulse)
                const now = ctx.currentTime;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = "sawtooth";
                // Modulate frequency between 960Hz and 770Hz
                for (let i = 0; i < 4; i++) {
                    osc.frequency.setValueAtTime(960, now + i * 0.3);
                    osc.frequency.setValueAtTime(770, now + i * 0.3 + 0.15);
                }

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
                gain.gain.setValueAtTime(0.5, now + 1.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 1.3);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + 1.3);
            } else if (type === "REQUEST") {
                // High-priority alert sound (2-tone chime)
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();

                osc1.type = "sine";
                osc2.type = "triangle";

                osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                osc1.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15); // A5

                osc2.frequency.setValueAtTime(1174.66, ctx.currentTime); // D6
                osc2.frequency.setValueAtTime(1760.00, ctx.currentTime + 0.15); // A6

                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);

                osc1.start(ctx.currentTime);
                osc2.start(ctx.currentTime);
                osc1.stop(ctx.currentTime + 0.5);
                osc2.stop(ctx.currentTime + 0.5);
            } else {
                // Soft success confirmation chime
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = "sine";
                osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
                osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
                osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5

                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.4);
            }
        } catch (e) {
            console.error("Audio playback warning:", e);
        }
    };

    const pushNotification = (item: NotificationItem) => {
        setNotifications(prev => [item, ...prev.slice(0, 39)]);

        if (item.type === "SECURITY") {
            setSecurityAlert(item);
            playNotificationSound("SOS");
        } else if (item.type === "SOS") {
            setEmergencySos(item);
            playNotificationSound("SOS");
        } else {
            setActiveToast(item);
            playNotificationSound(item.type === "REQUEST" ? "REQUEST" : "ACCEPTED");

            // Auto-dismiss standard active toast after 8 seconds
            setTimeout(() => {
                setActiveToast(curr => curr?.id === item.id ? null : curr);
            }, 8000);
        }
    };

    useEffect(() => {
        // 1. Establish SSE Connection to /api/rides/stream
        let eventSource: EventSource | null = null;
        try {
            eventSource = new EventSource("/api/rides/stream");

            // Suppress the native Event from bubbling to window.onerror
            // (which Next.js dev overlay catches and shows as "[object Event]")
            eventSource.onerror = (_ev: Event) => {
                // SSE connection dropped — silently handled; fallback polling will take over
            };

            eventSource.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    const eventType = parsed.type;
                    const data = parsed.data || {};
                    const rideId = parsed.rideId || data.id || `evt-${Date.now()}`;

                    if (eventType === "SECURITY_INTRUSION_ALERT") {
                        const inc = parsed.incident || data;
                        const notifKey = `sec-${Date.now()}-${inc.ip || ""}`;
                        pushNotification({
                            id: notifKey,
                            type: "SECURITY",
                            title: "🛑 CYBER INTRUSION ATTEMPT BLOCKED",
                            message: `${inc.attackType || "Intrusion"} intercepted from ${inc.ip} (${inc.city || "Monrovia"}, ${inc.country || "LR"}). Target: ${inc.attemptedUsername || "System Admin"}`,
                            details: {
                                ip: inc.ip,
                                city: inc.city,
                                country: inc.country,
                                region: inc.region,
                                deviceFingerprint: inc.deviceFingerprint,
                                attemptedUsername: inc.attemptedUsername,
                                attackType: inc.attackType,
                                maliciousPayload: inc.maliciousPayload,
                                targetUrl: inc.targetUrl,
                                severity: inc.severity || "CRITICAL"
                            },
                            timestamp: new Date(),
                            read: false
                        });
                    } else if (eventType === "SOS_ALERT") {
                        const notifKey = `sos-${rideId}-${Date.now()}`;
                        pushNotification({
                            id: notifKey,
                            type: "SOS",
                            title: "🚨 CRITICAL SOS PANIC ALERT",
                            message: `Emergency signal from ${data.clientName || "Passenger"} in ${data.originAddress || "Monrovia"}!`,
                            details: {
                                rideId: data.rideId,
                                clientName: data.clientName,
                                clientPhone: data.clientPhone,
                                driverName: data.driverName,
                                driverPhone: data.driverPhone,
                                origin: data.originAddress,
                                destination: data.destAddress,
                                vehicleModel: data.vehicleModel,
                                licensePlate: data.licensePlate,
                                reason: data.reason,
                                lat: data.originLat,
                                lng: data.originLng
                            },
                            timestamp: new Date(),
                            read: false
                        });
                    } else if (eventType === "RIDE_REQUESTED" || eventType === "RIDE_CREATED") {
                        const notifKey = `req-${rideId}`;
                        if (!processedIdsRef.current.has(notifKey)) {
                            processedIdsRef.current.add(notifKey);

                            pushNotification({
                                id: notifKey,
                                type: "REQUEST",
                                title: "🚨 New Ride Request",
                                message: `${data.rider?.name || data.guestName || "Client"} placed a ride request for ${data.vehicleType || "a vehicle"}.`,
                                details: {
                                    rideId: data.id,
                                    clientName: data.rider?.name || data.guestName || "Client",
                                    clientPhone: data.rider?.phone || data.guestPhone,
                                    origin: data.originAddress,
                                    destination: data.destAddress,
                                    fare: data.fare,
                                    vehicleType: data.vehicleType
                                },
                                timestamp: new Date(),
                                read: false
                            });
                        }
                    } else if (eventType === "RIDE_ACCEPTED" || eventType === "DRIVER_ASSIGNED") {
                        const notifKey = `acc-${rideId}-${data.driverId || ""}`;
                        if (!processedIdsRef.current.has(notifKey)) {
                            processedIdsRef.current.add(notifKey);

                            const driverName = data.driver?.user?.name || "Driver";
                            const clientName = data.rider?.name || data.guestName || "Passenger";

                            pushNotification({
                                id: notifKey,
                                type: "ACCEPTED",
                                title: "✅ Driver Accepted Ride",
                                message: `${driverName} accepted trip for ${clientName}.`,
                                details: {
                                    rideId: data.id,
                                    clientName,
                                    driverName,
                                    origin: data.originAddress,
                                    destination: data.destAddress
                                },
                                timestamp: new Date(),
                                read: false
                            });
                        }
                    }
                } catch (err) {}
            };
        } catch (e) {}

        // 2. Fallback polling from /api/admin/notifications only if SSE fails or disconnects (every 30s)
        let lastTimestamp = Date.now() - 30000;
        let sseActive = false;

        if (eventSource) {
            eventSource.onopen = () => { sseActive = true; };
            eventSource.onerror = () => { sseActive = false; };
        }

        const pollInterval = setInterval(async () => {
            if (sseActive) return; // Skip polling when SSE stream is healthy
            try {
                const res = await fetch(`/api/admin/notifications?since=${lastTimestamp}`);
                if (res.ok) {
                    const result = await res.json();
                    if (result.timestamp) lastTimestamp = result.timestamp;
                    if (Array.isArray(result.events)) {
                        result.events.forEach((ev: any) => {
                            const notifKey = `log-${ev.id}`;
                            if (!processedIdsRef.current.has(notifKey)) {
                                processedIdsRef.current.add(notifKey);
                                const d = ev.details || {};

                                if (ev.action === "SECURITY_INTRUSION_ALERT") {
                                    pushNotification({
                                        id: notifKey,
                                        type: "SECURITY",
                                        title: "🛑 CYBER INTRUSION ATTEMPT BLOCKED",
                                        message: `${d.attackType || "Attack"} intercepted from ${d.ip} (${d.city || "Unknown"}, ${d.country || "LR"}). Target: ${d.attemptedUsername || "Platform"}`,
                                        details: {
                                            ip: d.ip,
                                            city: d.city,
                                            country: d.country,
                                            region: d.region,
                                            deviceFingerprint: d.deviceFingerprint,
                                            attemptedUsername: d.attemptedUsername,
                                            attackType: d.attackType,
                                            maliciousPayload: d.maliciousPayload,
                                            targetUrl: d.targetUrl,
                                            severity: d.severity || "CRITICAL"
                                        },
                                        timestamp: new Date(ev.createdAt),
                                        read: false
                                    });
                                } else if (ev.action === "EMERGENCY_SOS_PANIC") {
                                    pushNotification({
                                        id: notifKey,
                                        type: "SOS",
                                        title: "🚨 CRITICAL SOS PANIC ALERT",
                                        message: `Emergency signal from ${d.clientName || "User"} (${d.originAddress || "Live Location"})`,
                                        details: {
                                            rideId: d.rideId,
                                            clientName: d.clientName,
                                            clientPhone: d.clientPhone,
                                            driverName: d.driverName,
                                            driverPhone: d.driverPhone,
                                            origin: d.originAddress,
                                            destination: d.destAddress,
                                            reason: d.reason,
                                            lat: d.lat,
                                            lng: d.lng
                                        },
                                        timestamp: new Date(ev.createdAt),
                                        read: false
                                    });
                                } else if (ev.action === "RIDE_REQUESTED") {
                                    pushNotification({
                                        id: notifKey,
                                        type: "REQUEST",
                                        title: "🚨 New Ride Request",
                                        message: `${d.clientName || "Client"} requested a ride from ${d.originAddress || "Pickup"} to ${d.destAddress || "Destination"}.`,
                                        details: {
                                            rideId: d.rideId,
                                            clientName: d.clientName,
                                            origin: d.originAddress,
                                            destination: d.destAddress,
                                            vehicleType: d.vehicleType
                                        },
                                        timestamp: new Date(ev.createdAt),
                                        read: false
                                    });
                                } else if (ev.action === "RIDE_ACCEPTED") {
                                    pushNotification({
                                        id: notifKey,
                                        type: "ACCEPTED",
                                        title: "✅ Driver Accepted Ride",
                                        message: `${d.driverName || "Driver"} accepted ride for ${d.clientName || "Client"}.`,
                                        details: {
                                            rideId: d.rideId,
                                            clientName: d.clientName,
                                            driverName: d.driverName,
                                            origin: d.originAddress,
                                            destination: d.destAddress
                                        },
                                        timestamp: new Date(ev.createdAt),
                                        read: false
                                    });
                                }
                            }
                        });
                    }
                }
            } catch (e) {}
        }, 30000);

        return () => {
            if (eventSource) eventSource.close();
            clearInterval(pollInterval);
        };
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    return (
        <>
            {/* Header Notification Bell Action */}
            <div className="relative inline-block text-left">
                <button
                    onClick={() => {
                        setIsOpen(!isOpen);
                        if (!isOpen) markAllRead();
                    }}
                    className="relative p-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all shadow-sm flex items-center justify-center group"
                    title="Platform Dispatch & Ride Alerts"
                >
                    <Bell size={18} className={unreadCount > 0 ? "text-red-600 animate-bounce" : "text-slate-600"} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </button>

                {/* Dropdown Notification Drawer */}
                {isOpen && (
                    <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell size={16} className="text-yellow-400" />
                                <span className="font-black text-xs uppercase tracking-wider">Live Dispatch Alerts</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSoundEnabled(!soundEnabled)}
                                    className="p-1 text-slate-400 hover:text-white transition-colors"
                                    title={soundEnabled ? "Mute audio alerts" : "Enable audio alerts"}
                                >
                                    {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} className="text-red-400" />}
                                </button>
                                <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-white">
                                    <X size={15} />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <Bell size={28} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-xs font-bold">No recent alerts</p>
                                    <p className="text-[10px] text-slate-400 mt-1">New ride bookings, SOS signals, and driver acceptances will stream here live.</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div key={n.id} className={`p-4 transition-colors hover:bg-slate-50 ${n.type === "SOS" ? "bg-red-100/70 border-l-4 border-red-600" : !n.read ? "bg-red-50/40" : ""}`}>
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                                n.type === "SECURITY"
                                                    ? "bg-black text-red-400 border-red-600 animate-pulse"
                                                    : n.type === "SOS"
                                                    ? "bg-red-600 text-white border-red-700 animate-pulse"
                                                    : n.type === "REQUEST"
                                                    ? "bg-red-100 text-red-700 border-red-200"
                                                    : "bg-emerald-100 text-emerald-700 border-emerald-200"
                                            }`}>
                                                {n.type === "SECURITY" ? "🛑 CYBER INTRUSION" : n.type === "SOS" ? "🚨 SOS EMERGENCY" : n.type === "REQUEST" ? "NEW REQUEST" : "ACCEPTED"}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                            </span>
                                        </div>
                                        <p className="text-xs font-black text-slate-900 mt-1">{n.title}</p>
                                        <p className="text-xs text-slate-600 font-medium mt-0.5">{n.message}</p>
                                        {n.details?.origin && (
                                            <div className="mt-2 text-[11px] font-semibold text-slate-500 bg-slate-100/80 p-2 rounded-xl space-y-1">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <MapPin size={12} className="text-red-500 shrink-0" />
                                                    <span className="truncate">{n.details.origin}</span>
                                                </div>
                                                {n.details.destination && (
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <Navigation size={12} className="text-slate-800 shrink-0" />
                                                        <span className="truncate">{n.details.destination}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400">{notifications.length} alerts logged</span>
                            <Link
                                href="/admin/dispatch"
                                onClick={() => setIsOpen(false)}
                                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                            >
                                <span>Go to Dispatch</span> →
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* CRITICAL SOS EMERGENCY MODAL / OVERLAY */}
            {emergencySos && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-4 border-red-600 overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header Banner */}
                        <div className="bg-red-600 text-white p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-2xl bg-white text-red-600 flex items-center justify-center shadow-lg animate-bounce">
                                        <Siren className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
                                            LIVE DISTRESS SIGNAL
                                        </span>
                                        <h3 className="text-xl font-black tracking-tight">CRITICAL SOS PANIC ALERT</h3>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEmergencySos(null)}
                                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-red-900 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-red-600">Passenger / Reporter</p>
                                        <h4 className="text-lg font-black">{emergencySos.details?.clientName || "Client"}</h4>
                                    </div>
                                    {emergencySos.details?.clientPhone && (
                                        <a
                                            href={`tel:${emergencySos.details.clientPhone}`}
                                            className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-md hover:bg-red-700"
                                        >
                                            <Phone size={13} /> Call Rider
                                        </a>
                                    )}
                                </div>
                                <p className="text-xs font-medium text-red-800">
                                    Reason: {emergencySos.details?.reason || "Emergency Panic Button Triggered"}
                                </p>
                            </div>

                            {/* Driver / Trip Location */}
                            <div className="space-y-2 text-xs font-bold text-gray-700 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-2">
                                    <MapPin className="text-red-500 w-4 h-4 shrink-0" />
                                    <span className="text-gray-900 font-black">Location:</span>
                                    <span className="truncate text-gray-600">{emergencySos.details?.origin || "Monrovia Corridor"}</span>
                                </div>
                                {emergencySos.details?.driverName && (
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                        <div>
                                            <span className="text-gray-500 font-normal">Driver: </span>
                                            <span className="font-bold text-gray-900">{emergencySos.details.driverName}</span>
                                            {emergencySos.details.vehicleModel && (
                                                <span className="text-gray-500 ml-1">({emergencySos.details.vehicleModel})</span>
                                            )}
                                        </div>
                                        {emergencySos.details.driverPhone && (
                                            <a
                                                href={`tel:${emergencySos.details.driverPhone}`}
                                                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                                            >
                                                <Phone size={12} /> Call Driver
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Emergency Actions Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <a
                                    href="tel:911"
                                    className="py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 active:scale-95 transition-all text-center"
                                >
                                    <Phone size={16} /> Contact LNP (911)
                                </a>
                                <Link
                                    href="/admin/dispatch"
                                    onClick={() => setEmergencySos(null)}
                                    className="py-3.5 px-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-center"
                                >
                                    <Navigation size={16} /> Open Dispatch Map
                                </Link>
                            </div>

                            <button
                                onClick={() => setEmergencySos(null)}
                                className="w-full py-2.5 text-center text-xs font-bold text-gray-500 hover:text-gray-900"
                            >
                                Acknowledge &amp; Dismiss Alert
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CYBER INTRUSION ALERT MODAL / OVERLAY */}
            {securityAlert && (
                <div className="fixed inset-0 z-[450] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="relative w-full max-w-lg bg-slate-950 text-white rounded-3xl shadow-2xl border-2 border-red-500 overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header Banner */}
                        <div className="bg-gradient-to-r from-red-600 via-red-700 to-black text-white p-6 relative overflow-hidden">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-white text-red-600 flex items-center justify-center shadow-lg animate-pulse">
                                        <ShieldAlert size={28} />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest bg-black/40 text-red-200 px-2.5 py-0.5 rounded-full inline-block border border-red-400/30">
                                            SHIELD WAF • INTRUSION INTERCEPTED
                                        </span>
                                        <h3 className="text-xl font-black tracking-tight mt-0.5">CYBER ATTACK BLOCKED</h3>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSecurityAlert(null)}
                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Intruder Telemetry & Coordinates */}
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Targeted Username</span>
                                    <span className="text-sm font-black text-yellow-400 truncate block mt-0.5">
                                        {securityAlert.details?.attemptedUsername || "Anonymous Attacker"}
                                    </span>
                                </div>
                                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attack Vector</span>
                                    <span className="text-sm font-black text-red-400 truncate block mt-0.5">
                                        {securityAlert.details?.attackType || "INTRUSION"}
                                    </span>
                                </div>
                            </div>

                            {/* Attacker Origin & Geolocation */}
                            <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-2xl space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 font-bold uppercase text-[10px]">Attacker Origin IP:</span>
                                    <span className="font-mono font-black text-red-300 text-sm">{securityAlert.details?.ip || "Unknown"}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-white/5 pt-2">
                                    <span className="text-slate-400 font-bold uppercase text-[10px]">Physical Geolocation:</span>
                                    <span className="font-bold text-white">
                                        📍 {securityAlert.details?.city || "Unknown City"}, {securityAlert.details?.region || ""}, {securityAlert.details?.country || "LR"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between border-t border-white/5 pt-2">
                                    <span className="text-slate-400 font-bold uppercase text-[10px]">Device / Hardware Fingerprint:</span>
                                    <span className="font-mono text-[11px] text-emerald-400 truncate max-w-[200px]">
                                        {securityAlert.details?.deviceFingerprint || "N/A"}
                                    </span>
                                </div>
                            </div>

                            {/* Malicious Payload Intercepted */}
                            {securityAlert.details?.maliciousPayload && (
                                <div className="p-3 bg-black/60 border border-white/10 rounded-2xl">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                        Intercepted Exploit Payload:
                                    </span>
                                    <pre className="text-[11px] font-mono text-red-300 bg-red-950/20 p-2 rounded-xl overflow-x-auto whitespace-pre-wrap break-all border border-red-900/40">
                                        {securityAlert.details.maliciousPayload}
                                    </pre>
                                </div>
                            )}

                            {/* Defense Status & Action */}
                            <div className="flex items-center justify-between p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300">
                                <span className="font-bold flex items-center gap-1.5">
                                    <CheckCircle2 size={15} /> Request Terminated • IP Auto-Blacklisted (15m)
                                </span>
                            </div>

                            <button
                                onClick={() => setSecurityAlert(null)}
                                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer"
                            >
                                Acknowledge &amp; Dismiss Incident
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Live Pop-Up Toast Alert */}
            {activeToast && !emergencySos && (
                <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto">
                    <div className={`p-5 rounded-3xl shadow-2xl border backdrop-blur-xl ${
                        activeToast.type === "REQUEST"
                            ? "bg-slate-900/95 text-white border-red-500/40 shadow-red-950/40"
                            : "bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-950/40"
                    }`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${activeToast.type === "REQUEST" ? "bg-red-500 animate-ping" : "bg-emerald-400"}`} />
                                <h4 className="text-sm font-black tracking-tight">{activeToast.title}</h4>
                            </div>
                            <button
                                onClick={() => setActiveToast(null)}
                                className="text-slate-400 hover:text-white p-1"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <p className="text-xs font-semibold text-slate-300 mb-3">{activeToast.message}</p>

                        {activeToast.details?.origin && (
                            <div className="bg-white/10 rounded-2xl p-3 text-xs space-y-1.5 mb-3 font-medium">
                                <div className="flex items-center gap-2 text-slate-200">
                                    <MapPin size={13} className="text-red-400 shrink-0" />
                                    <span className="truncate">{activeToast.details.origin}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-200">
                                    <Navigation size={13} className="text-yellow-400 shrink-0" />
                                    <span className="truncate">{activeToast.details.destination}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-1">
                            <Link
                                href="/admin/dispatch"
                                onClick={() => setActiveToast(null)}
                                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black rounded-xl transition-all shadow-md active:scale-95"
                            >
                                View Dispatch Terminal
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
