"use client";

import React, { useState } from "react";
import { MapPin, Heart, Target, Lightbulb, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import ContactModal from "@/components/ContactModal";

const team = [
    {
        name: "Emmanuel J. Kollie",
        title: "Co-Founder & CEO",
        bio: "Monrovia-based entrepreneur with 10+ years in logistics and technology. Former transport coordinator for a leading Liberian NGO.",
        initials: "EK",
        gradient: "from-red-500 to-red-600",
    },
    {
        name: "Fatima Kamara",
        title: "Chief Technology Officer",
        bio: "Software engineer and fintech specialist. Led mobile payment integrations across West Africa for mobile money platforms.",
        initials: "FK",
        gradient: "from-purple-500 to-purple-600",
    },
    {
        name: "John S. Paye",
        title: "Head of Driver Operations",
        bio: "Former Monrovia Municipal transport official. Oversees driver onboarding, safety compliance, and route optimization.",
        initials: "JP",
        gradient: "from-emerald-500 to-emerald-600",
    },
    {
        name: "Gloria Weah",
        title: "VP of Customer Experience",
        bio: "Customer success leader dedicated to reducing wait times, resolving disputes, and ensuring every ride is 5-star worthy.",
        initials: "GW",
        gradient: "from-amber-500 to-amber-600",
    },
];

const milestones = [
    { year: "2022", event: "AfriCab founded in Monrovia by a team of Liberian entrepreneurs." },
    { year: "2023", event: "First 100 drivers onboarded. Guest booking system launched for non-smartphone users." },
    { year: "2024", event: "Mobile Money integration completed. 5,000+ active riders across Greater Monrovia." },
    { year: "2025", event: "Business accounts launched. Expansion to Paynesville, Harbel & Buchanan corridors." },
    { year: "2026", event: "10,000+ registered users. Liberia's most trusted ride-hailing platform." },
];

const values = [
    {
        icon: <Heart className="w-6 h-6" />,
        title: "Community First",
        desc: "Every decision we make is rooted in improving the lives of Liberians—riders, drivers, and their families.",
        color: "text-red-500",
        bg: "bg-red-50",
    },
    {
        icon: <ShieldCheck className="w-6 h-6" />,
        title: "Safety Above All",
        desc: "We have zero tolerance for unsafe drivers. Every partner is background-checked, licensed, and continuously rated.",
        color: "text-emerald-600",
        bg: "bg-emerald-50",
    },
    {
        icon: <Target className="w-6 h-6" />,
        title: "Reliability You Can Count On",
        desc: "We measure success in on-time arrivals, not just downloads. Our dispatch engine guarantees sub-5-minute response times.",
        color: "text-blue-600",
        bg: "bg-blue-50",
    },
    {
        icon: <Lightbulb className="w-6 h-6" />,
        title: "African Innovation",
        desc: "Built for Liberia's realities—Mobile Money, intermittent internet, guest bookings—solutions designed from the ground up.",
        color: "text-amber-600",
        bg: "bg-amber-50",
    },
];

export default function AboutSection() {
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);

    return (
        <section id="about" className="py-20 md:py-28 bg-white relative overflow-hidden">
            {/* Background accents */}
            <div className="absolute top-1/4 right-0 w-80 h-80 bg-red-50 rounded-full blur-3xl -z-10 pointer-events-none" />
            <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-emerald-50 rounded-full blur-3xl -z-10 pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider inline-block mb-4">
                        Our Story
                    </span>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-gray-900 mb-6 leading-tight">
                        Built in Liberia, <br />
                        <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                            Built for Liberia
                        </span>
                    </h2>
                    <p className="text-base sm:text-xl text-gray-600 leading-relaxed">
                        AfriCab was born out of a simple frustration: getting a reliable, safe, and affordable taxi in Monrovia was too hard. We built the solution ourselves—by Liberians, for Liberians.
                    </p>
                </div>

                {/* Mission & Vision */}
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
                    <div className="relative p-8 sm:p-10 md:p-12 rounded-3xl bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white border border-gray-800/80 shadow-2xl overflow-hidden flex flex-col items-center text-center transition-all duration-300 hover:border-gray-700 hover:-translate-y-1">
                        <div className="absolute top-0 right-0 w-36 h-36 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                        <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 text-red-400 flex items-center justify-center mb-6 shadow-inner">
                            <Target className="w-8 h-8" />
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">Our Mission</h3>
                        <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-md">
                            To build a world-class, affordable, and safe mobility ecosystem that connects every Liberian to opportunity, whether they have a smartphone or not. We believe transport is a right, not a privilege.
                        </p>
                    </div>
                    <div className="relative p-8 sm:p-10 md:p-12 rounded-3xl bg-gradient-to-br from-red-600 via-red-600 to-red-700 text-white border border-red-500/40 shadow-2xl shadow-red-600/20 overflow-hidden flex flex-col items-center text-center transition-all duration-300 hover:shadow-red-600/35 hover:-translate-y-1">
                        <div className="absolute top-0 right-0 w-36 h-36 bg-white/15 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                        <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 text-white flex items-center justify-center mb-6 shadow-inner">
                            <Lightbulb className="w-8 h-8" />
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">Our Vision</h3>
                        <p className="text-red-100 text-base sm:text-lg leading-relaxed max-w-md">
                            To become the most trusted and widely used transport platform across West Africa starting from Monrovia and expanding to every major city where safe, tech-enabled mobility is needed most.
                        </p>
                    </div>
                </div>

                {/* Core Values */}
                <div className="mb-16">
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">What Drives Us</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {values.map((v, i) => (
                            <div key={i} className="p-6 rounded-3xl bg-gray-50 border border-gray-100 hover:shadow-xl hover:border-gray-200 hover:bg-white transition-all group">
                                <div className={`w-12 h-12 rounded-2xl ${v.bg} ${v.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    {v.icon}
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 mb-2">{v.title}</h4>
                                <p className="text-sm text-gray-600 leading-relaxed">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Timeline */}
                <div className="mb-16">
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">Our Journey</h3>
                    <div className="relative max-w-3xl mx-auto">
                        <div className="absolute left-6 sm:left-1/2 sm:-translate-x-px top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-300 via-red-500 to-red-700" />
                        <div className="space-y-8">
                            {milestones.map((m, i) => (
                                <div key={i} className={`relative flex items-start gap-6 ${i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"} sm:gap-0`}>
                                    <div className="sm:w-1/2 sm:px-8">
                                        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
                                            <span className="text-xs font-black text-red-600 tracking-widest block mb-1">{m.year}</span>
                                            <p className="text-sm text-gray-700 leading-relaxed">{m.event}</p>
                                        </div>
                                    </div>
                                    <div className="absolute left-6 sm:left-1/2 sm:-translate-x-1/2 w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow-md mt-5" />
                                    <div className="sm:w-1/2" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Team */}
                <div className="mb-16">
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">The People Behind AfriCab</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {team.map((member, i) => (
                            <div key={i} className="p-6 rounded-3xl bg-white border border-gray-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all text-center">
                                <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${member.gradient} flex items-center justify-center text-white text-xl font-black mb-4 shadow-lg`}>
                                    {member.initials}
                                </div>
                                <h4 className="font-bold text-gray-900">{member.name}</h4>
                                <p className="text-xs text-red-600 font-semibold mb-3">{member.title}</p>
                                <p className="text-xs text-gray-500 leading-relaxed">{member.bio}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Presence */}
                <div className="p-8 sm:p-12 rounded-3xl bg-gray-50 border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 text-xl mb-2">Headquartered in Monrovia, Liberia</h4>
                            <p className="text-sm text-gray-500 leading-relaxed max-w-lg">
                                AfriCab is a proudly Liberian company, registered under LTP Services Inc. Operating across Greater Monrovia, Paynesville, Harbel, and Buchanan corridors with expanding national coverage.
                            </p>
                            <div className="flex flex-wrap gap-3 mt-4">
                                {["Monrovia CBD", "Sinkor", "Congo Town", "Paynesville", "Harbel", "Buchanan"].map((city) => (
                                    <span key={city} className="px-3 py-1 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-semibold">
                                        {city}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 shrink-0 w-full md:w-auto">
                        <Link
                            href="/signup"
                            className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-2xl hover:from-red-700 hover:to-red-600 transition-all text-center text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 active:scale-95"
                        >
                            Join AfriCab <ArrowRight size={16} />
                        </Link>
                        <button
                            type="button"
                            onClick={() => setIsContactModalOpen(true)}
                            className="px-8 py-4 bg-white border border-gray-200 text-gray-800 font-bold rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all text-center text-sm flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                        >
                            Contact Us
                        </button>
                    </div>
                </div>
            </div>

            {/* Pop-up Contact Form Modal */}
            <ContactModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                defaultSubject="General Inquiry & Support"
            />
        </section>
    );
}
