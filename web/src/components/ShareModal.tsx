"use client";

import React, { useState } from "react";
import { 
    X, 
    Copy, 
    Check, 
    Share2, 
    MessageSquare, 
    Send, 
    Smartphone, 
    Globe, 
    ExternalLink,
    ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    trackingUrl: string;
    rideDetails?: {
        pickup?: string;
        destination?: string;
        passengerName?: string;
        driverName?: string;
        driverPhone?: string;
        vehicleInfo?: string;
        licensePlate?: string;
        eta?: string;
    };
}

export default function ShareModal({
    isOpen,
    onClose,
    title = "Share Live Route",
    description = "Share real-time GPS tracking and trip details with family & friends for safety.",
    trackingUrl,
    rideDetails
}: ShareModalProps) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const shareText = `🚨 AfriCab Live Ride Share: Track ${rideDetails?.passengerName || "my"} trip to ${rideDetails?.destination || "destination"} live here: ${trackingUrl}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(trackingUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            const input = document.createElement("input");
            input.value = trackingUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand("copy");
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleWhatsApp = () => {
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleMessenger = () => {
        // Direct Facebook Messenger Web / Deep Link
        const url = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(trackingUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(trackingUrl)}`;
        const fallbackUrl = `fb-messenger://share/?link=${encodeURIComponent(trackingUrl)}`;
        
        // Try opening messenger or fallback to standard web link
        try {
            window.open(url, "_blank", "noopener,noreferrer");
        } catch {
            window.location.href = fallbackUrl;
        }
    };

    const handleFacebook = () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(trackingUrl)}&quote=${encodeURIComponent(shareText)}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleTwitter = () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleTelegram = () => {
        const url = `https://t.me/share/url?url=${encodeURIComponent(trackingUrl)}&text=${encodeURIComponent(shareText)}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleSMS = () => {
        const url = `sms:?body=${encodeURIComponent(shareText)}`;
        window.location.href = url;
    };

    const handleNativeShare = async () => {
        if (typeof navigator !== "undefined" && navigator.share) {
            try {
                await navigator.share({
                    title: "AfriCab Live Ride Tracking",
                    text: shareText,
                    url: trackingUrl
                });
            } catch (err) {
                // User cancelled or share failed
            }
        } else {
            handleCopy();
        }
    };

    const socialChannels = [
        {
            name: "WhatsApp",
            icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.392-10.416c-4.294 0-7.784 3.489-7.785 7.784 0 1.372.358 2.711 1.037 3.886l-1.101 4.024 4.125-1.082c1.134.619 2.417.945 3.722.946 4.293 0 7.783-3.489 7.784-7.784.001-4.296-3.488-7.774-7.782-7.774zm0 14.074c-1.168 0-2.313-.314-3.311-.908l-.237-.141-2.46.645.657-2.399-.155-.247c-.651-1.036-1-2.24-1-3.479 0-3.468 2.823-6.29 6.295-6.29 3.471 0 6.292 2.822 6.293 6.29 0 3.47-2.823 6.29-6.294 6.29z"/>
                </svg>
            ),
            bg: "bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-emerald-500/20",
            onClick: handleWhatsApp
        },
        {
            name: "Messenger",
            icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.453 5.518 3.731 7.218v3.524l3.37-1.85c.917.254 1.89.39 2.899.39 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.443l-2.72-2.902-5.305 2.902 5.834-6.195 2.787 2.902 5.238-2.902-5.834 6.195z"/>
                </svg>
            ),
            bg: "bg-gradient-to-tr from-[#0084FF] to-[#00C6FF] hover:opacity-90 text-white shadow-blue-500/20",
            onClick: handleMessenger
        },
        {
            name: "Facebook",
            icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
            ),
            bg: "bg-[#1877F2] hover:bg-[#166fe5] text-white shadow-blue-600/20",
            onClick: handleFacebook
        },
        {
            name: "X (Twitter)",
            icon: (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
            ),
            bg: "bg-slate-950 hover:bg-slate-900 text-white shadow-slate-900/20",
            onClick: handleTwitter
        },
        {
            name: "Telegram",
            icon: (
                <Send className="w-4 h-4 text-white -translate-x-0.5 translate-y-0.5" />
            ),
            bg: "bg-[#229ED9] hover:bg-[#1e8ec3] text-white shadow-sky-500/20",
            onClick: handleTelegram
        },
        {
            name: "SMS Text",
            icon: (
                <Smartphone className="w-5 h-5 text-white" />
            ),
            bg: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20",
            onClick: handleSMS
        },
        {
            name: "More Apps",
            icon: (
                <Share2 className="w-5 h-5 text-white" />
            ),
            bg: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20",
            onClick: handleNativeShare
        }
    ];

    return (
        <div 
            className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-md bg-white border border-slate-200 rounded-[2rem] p-6 sm:p-7 shadow-2xl space-y-6 animate-scale-up selection:bg-amber-400 selection:text-slate-950"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-400/20">
                            <Share2 size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-slate-950 tracking-tight">{title}</h3>
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full border border-emerald-200 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Live GPS
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{description}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Optional Trip Snippet Card */}
                {rideDetails && (rideDetails.pickup || rideDetails.destination) && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                            <span>Active Mission Summary</span>
                            {rideDetails.eta && <span className="text-emerald-700 font-black">ETA: {rideDetails.eta}</span>}
                        </div>
                        <div className="space-y-1 text-slate-800 font-semibold truncate">
                            {rideDetails.pickup && (
                                <p className="truncate flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                                    <span className="text-slate-400 text-[11px]">From:</span> {rideDetails.pickup}
                                </p>
                            )}
                            {rideDetails.destination && (
                                <p className="truncate flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block shrink-0" />
                                    <span className="text-slate-400 text-[11px]">To:</span> {rideDetails.destination}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Social Media Share Grid */}
                <div className="space-y-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                        Share Directly via Apps
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-4 gap-2.5">
                        {socialChannels.slice(0, 4).map((ch) => (
                            <button
                                key={ch.name}
                                type="button"
                                onClick={ch.onClick}
                                className="group flex flex-col items-center gap-1.5 p-2.5 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
                            >
                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110", ch.bg)}>
                                    {ch.icon}
                                </div>
                                <span className="text-[11px] font-bold text-slate-700 leading-none">
                                    {ch.name}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                        {socialChannels.slice(4).map((ch) => (
                            <button
                                key={ch.name}
                                type="button"
                                onClick={ch.onClick}
                                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-slate-800 font-bold text-xs transition-all cursor-pointer active:scale-98"
                            >
                                <div className={cn("w-5 h-5 rounded-lg flex items-center justify-center", ch.bg)}>
                                    {ch.icon}
                                </div>
                                <span>{ch.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Copy Link Section */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-600">
                        <span>Or Copy Shareable Link</span>
                        {copied && (
                            <span className="text-emerald-600 font-black flex items-center gap-1 normal-case text-xs animate-fade-in">
                                <Check size={13} /> Link copied to clipboard!
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                        <div className="flex-1 px-3 py-1.5 overflow-hidden">
                            <p className="text-xs font-mono text-slate-700 truncate select-all">
                                {trackingUrl}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={cn(
                                "px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95 shrink-0",
                                copied 
                                    ? "bg-emerald-600 text-white shadow-emerald-500/20" 
                                    : "bg-slate-950 hover:bg-slate-800 text-white"
                            )}
                        >
                            {copied ? (
                                <>
                                    <Check size={14} /> Copied!
                                </>
                            ) : (
                                <>
                                    <Copy size={14} /> Copy Link
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Security Guarantee Banner */}
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-200/60 text-emerald-800 text-[11px] font-medium">
                    <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
                    <span>Protected GPS stream. Viewers see your route &amp; driver info in real time.</span>
                </div>
            </div>
        </div>
    );
}
