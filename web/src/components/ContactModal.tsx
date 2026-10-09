"use client";

import React, { useState, useEffect } from "react";
import {
    X,
    Send,
    CheckCircle2,
    Mail,
    Phone,
    User,
    Building2,
    Loader2,
    AlertCircle
} from "lucide-react";

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultSubject?: string;
    initialSubject?: string;
    title?: string;
    subtitle?: string;
}

export default function ContactModal({
    isOpen,
    onClose,
    defaultSubject = "General Inquiry & Support",
    initialSubject,
    title,
    subtitle
}: ContactModalProps) {
    const effectiveSubject = initialSubject || defaultSubject;
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        organization: "",
        subject: effectiveSubject,
        message: "",
    });

    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (isOpen) {
            setFormData((prev) => ({ ...prev, subject: effectiveSubject }));
        }
    }, [isOpen, effectiveSubject]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "auto";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setErrorMessage("");

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to send message.");
            }

            setStatus("success");
            setFormData({
                name: "",
                email: "",
                phone: "",
                organization: "",
                subject: defaultSubject,
                message: "",
            });
        } catch (err: unknown) {
            setStatus("error");
            const msg = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
            setErrorMessage(msg);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="px-8 py-6 bg-gradient-to-r from-red-600 to-red-500 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
                            <Mail size={22} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight">{title || "Contact AfriCab Liberia"}</h3>
                            <p className="text-xs text-red-100 font-medium">
                                {subtitle || "Headquartered in Monrovia • We reply in under 15 minutes"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold transition-all hover:scale-105 active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body / Form */}
                <div className="p-8 overflow-y-auto">
                    {status === "success" ? (
                        <div className="py-12 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                                <CheckCircle2 size={36} />
                            </div>
                            <h4 className="text-2xl font-black text-gray-900">Message Received!</h4>
                            <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                                Thank you for contacting AfriCab. Our team in Monrovia has received your inquiry and will reach out promptly via phone or email.
                            </p>
                            <div className="pt-4">
                                <button
                                    onClick={() => {
                                        setStatus("idle");
                                        onClose();
                                    }}
                                    className="px-8 py-3.5 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-2xl transition-all shadow-md active:scale-95"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {status === "error" && (
                                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                                    <AlertCircle size={16} className="shrink-0 text-red-600" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {/* Name & Phone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                                        Your Full Name *
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. John Doe"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                                        Phone Number *
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="tel"
                                            required
                                            placeholder="+231..."
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Email & Subject */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                                        Email Address *
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="email"
                                            required
                                            placeholder="john@example.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                                        Inquiry Subject
                                    </label>
                                    <select
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                    >
                                        <option value="General Inquiry & Support">General Inquiry & Support</option>
                                        <option value="Corporate & Business Fleet">Corporate & Business Fleet</option>
                                        <option value="Driver Onboarding & Recruitment">Driver Onboarding & Recruitment</option>
                                        <option value="Airport Transfer Booking">Airport Transfer Booking</option>
                                        <option value="Lost Item / Trip Assistance">Lost Item / Trip Assistance</option>
                                        <option value="Partnership & Sponsorship">Partnership & Sponsorship</option>
                                    </select>
                                </div>
                            </div>

                            {/* Organization (Optional) */}
                            <div>
                                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                                    Company / Organization Name <span className="text-gray-400 font-normal">(Optional)</span>
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="e.g. NGO, Enterprise, Embassy, Hotel"
                                        value={formData.organization}
                                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                                    Your Message *
                                </label>
                                <div className="relative">
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="Tell us how we can help you..."
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            {/* Footer & Direct Hotline */}
                            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                                    <Phone size={13} className="text-red-600" />
                                    <span>Direct Dispatch: <strong>+231-770-000000</strong></span>
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 sm:flex-none px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={status === "loading"}
                                        className="flex-1 sm:flex-none px-8 py-3.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                                    >
                                        {status === "loading" ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                <span>Sending...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Send size={16} />
                                                <span>Send Message</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
