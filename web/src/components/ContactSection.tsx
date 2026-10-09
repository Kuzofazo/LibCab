"use client";

import React, { useState } from "react";
import {
    MapPin,
    Mail,
    Phone,
    Send,
    CheckCircle2,
    Building2,
    User,
    MessageSquare,
    Clock,
    ShieldCheck,
    Loader2,
    Sparkles,
    AlertCircle
} from "lucide-react";

export default function ContactSection() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        organization: "",
        subject: "Corporate & Business Fleet",
        message: "",
    });

    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

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
                subject: "Corporate & Business Fleet",
                message: "",
            });
        } catch (err: any) {
            setStatus("error");
            setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
        }
    };

    return (
        <section id="contact" className="py-20 md:py-28 bg-gray-50/70 relative overflow-hidden border-t border-gray-100">
            {/* Ambient background glows */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="px-4 py-1.5 bg-red-50 border border-red-100 text-red-600 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider inline-flex items-center gap-2 mb-4 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                        Client Support &amp; Inquiries
                    </span>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-gray-900 mb-6 leading-tight">
                        Let&apos;s Connect with <br />
                        <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                            AfriCab Liberia
                        </span>
                    </h2>
                    <p className="text-base sm:text-xl text-gray-600 leading-relaxed">
                        Have a question about our enterprise solutions, guest bookings, or partnerships? Our dedicated Monrovia team is ready to assist you.
                    </p>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start max-w-6xl mx-auto">
                    {/* Left Column: Direct Info & Trust Badges */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-xl space-y-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 to-red-500" />
                            
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                                <Sparkles className="w-6 h-6 text-red-500 shrink-0" />
                                Monrovia Operations Center
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Reach our dispatch command and business support team directly for rapid assistance and enterprise consultations.
                            </p>

                            <div className="space-y-4 pt-2">
                                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100/70 transition-colors">
                                    <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-sm">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900">Headquarters</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">Tubman Boulevard, Sinkor, Monrovia, Liberia</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100/70 transition-colors">
                                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900">Direct Hotline</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">+231 77 000 0000 / +231 88 000 0000</p>
                                        <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                                            24/7 Available
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100/70 transition-colors">
                                    <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900">Official Inquiries</h4>
                                        <a href="mailto:hello@africab.com" className="text-xs text-red-600 hover:underline font-semibold block mt-0.5">
                                            hello@africab.com
                                        </a>
                                        <p className="text-[11px] text-gray-500 mt-0.5">Client &amp; Corporate Desk</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Trust card */}
                        <div className="p-6 rounded-3xl bg-gradient-to-br from-gray-900 to-black text-white shadow-xl flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">Guaranteed Rapid Response</h4>
                                <p className="text-xs text-gray-400 mt-0.5">Enterprise and client inquiries receive priority review in under 2 hours.</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Professional Client Form */}
                    <div className="lg:col-span-7">
                        <div className="p-8 sm:p-10 rounded-3xl bg-white border border-gray-100 shadow-2xl relative">
                            {status === "success" ? (
                                <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
                                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg ring-8 ring-emerald-50 mb-2">
                                        <CheckCircle2 className="w-9 h-9" />
                                    </div>
                                    <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                                        Message Sent Successfully!
                                    </h3>
                                    <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto leading-relaxed">
                                        Thank you for reaching out. A client specialist from our Monrovia office will get back to you shortly.
                                    </p>
                                    <button
                                        onClick={() => setStatus("idle")}
                                        className="mt-6 px-8 py-3.5 bg-gray-900 text-white text-sm font-bold rounded-2xl hover:bg-black transition-all shadow-md active:scale-95"
                                    >
                                        Send Another Inquiry
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="border-b border-gray-100 pb-4">
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Send Us a Message</h3>
                                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                            Fill in your details and our team will get in touch with you promptly.
                                        </p>
                                    </div>

                                    {status === "error" && (
                                        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                                            <div>
                                                <p className="font-bold">Submission Failed</p>
                                                <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Name and Email */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                                Full Name <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <User className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="text"
                                                    name="name"
                                                    required
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    placeholder="e.g. Samuel K. Doe"
                                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                                Email Address <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="email"
                                                    name="email"
                                                    required
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    placeholder="e.g. samuel@company.com"
                                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Phone and Organization */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                                Phone Number
                                            </label>
                                            <div className="relative flex items-center">
                                                <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none text-xs font-bold text-gray-500">
                                                    <span>🇱🇷</span>
                                                    <span>+231</span>
                                                </div>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    placeholder="77 000 0000"
                                                    className="w-full pl-20 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                                Organization / Company
                                            </label>
                                            <div className="relative">
                                                <Building2 className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="text"
                                                    name="organization"
                                                    value={formData.organization}
                                                    onChange={handleChange}
                                                    placeholder="e.g. UN, NGO, Hotel, Enterprise"
                                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Inquiry Category */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                            Inquiry Purpose <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                                        >
                                            <option value="Corporate & Business Fleet">Corporate &amp; Business Fleet Solutions</option>
                                            <option value="Rider Support & Inquiries">Rider Support &amp; App Assistance</option>
                                            <option value="Driver Partner Onboarding">Driver Partner Onboarding &amp; Verification</option>
                                            <option value="Guest & VIP Booking Inquiries">Guest &amp; VIP Booking Inquiries</option>
                                            <option value="Partnership & Sponsorship">Partnership &amp; Investor Relations</option>
                                            <option value="General Question">General Question</option>
                                        </select>
                                    </div>

                                    {/* Message */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                            Message / Details <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <textarea
                                                name="message"
                                                required
                                                rows={4}
                                                value={formData.message}
                                                onChange={handleChange}
                                                placeholder="Tell us how we can help your organization or journey..."
                                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium resize-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={status === "loading"}
                                        className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-base rounded-2xl hover:from-red-700 hover:to-red-600 transition-all shadow-xl shadow-red-500/25 flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {status === "loading" ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Submitting Inquiry...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                <span>Send Client Inquiry</span>
                                            </>
                                        )}
                                    </button>

                                    <p className="text-center text-[11px] text-gray-400">
                                        🔒 Your information is secure and only used to respond to your request.
                                    </p>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
