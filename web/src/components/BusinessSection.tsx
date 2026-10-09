"use client";

import React, { useState } from "react";
import { Building2, Users, Clock, BarChart3, HeadphonesIcon, CreditCard, CheckCircle2, ArrowRight, Globe } from "lucide-react";
import Link from "next/link";
import ContactModal from "./ContactModal";

const plans = [
    {
        name: "Starter",
        price: "$49",
        currency: "USD / month",
        description: "Perfect for small businesses and NGOs with occasional staff transport needs.",
        features: [
            "Up to 10 employees",
            "Monthly consolidated invoice",
            "Standard priority dispatch",
            "Email support",
            "Basic usage reports",
        ],
        cta: "Get Started",
        highlight: false,
    },
    {
        name: "Business Pro",
        price: "$149",
        currency: "USD / month",
        description: "Designed for growing companies, embassies, and international organizations.",
        features: [
            "Up to 50 employees",
            "Dedicated account manager",
            "Priority & VIP dispatch",
            "Mobile Money & card billing",
            "Real-time ride tracking dashboard",
            "Advanced analytics & reports",
        ],
        cta: "Start Free Trial",
        highlight: true,
    },
    {
        name: "Enterprise",
        price: "Custom",
        currency: "pricing",
        description: "For large corporations, mining operations, and government transport contracts.",
        features: [
            "Unlimited employees",
            "Fleet & zone management",
            "API integration support",
            "SLA guarantees",
            "24/7 dedicated hotline",
            "On-site fleet coordination",
        ],
        cta: "Contact Sales",
        highlight: false,
    },
];

const businessClients = [
    "NGO / International Aid Orgs",
    "Hotels & Hospitality Groups",
    "Government Agencies",
    "Mining & Extractive Industries",
    "Embassies & Diplomatic Missions",
    "Healthcare Institutions",
];

export default function BusinessSection() {
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [modalSubject, setModalSubject] = useState("Corporate & Business Fleet");

    const handleOpenModal = (subject: string = "Corporate & Business Fleet") => {
        setModalSubject(subject);
        setIsContactModalOpen(true);
    };

    return (
        <section id="business" className="py-20 md:py-28 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white relative overflow-hidden">
            {/* Decorative background orbs */}
            <div className="absolute top-0 right-1/3 w-96 h-96 bg-red-900/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-emerald-900/20 rounded-full blur-3xl pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="px-4 py-2 bg-emerald-900/50 text-emerald-400 border border-emerald-800 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider inline-block mb-4">
                        AfriCab for Business
                    </span>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
                        Corporate Transport, <br />
                        <span className="bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">
                            Simplified & Scalable
                        </span>
                    </h2>
                    <p className="text-base sm:text-xl text-gray-400 leading-relaxed">
                        AfriCab Business empowers companies across Liberia to manage employee transport, airport pickups, and client logistics through a single centralized platform at guaranteed corporate rates.
                    </p>
                </div>

                {/* Value Propositions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-14">
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-bold mb-1.5 text-white">Centralized Billing & Reporting</h3>
                        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                            Receive consolidated monthly invoices. Access detailed ride reports and cost-per-department breakdowns for clean financial auditing.
                        </p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                            <Users className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-bold mb-1.5 text-white">Staff & Fleet Management</h3>
                        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                            Add unlimited staff profiles, set ride budgets per employee, and restrict pickup zones to designated company locations.
                        </p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                            <Clock className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-bold mb-1.5 text-white">Scheduled & Pre-Booked Rides</h3>
                        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                            Schedule airport runs, morning shifts, and meeting transfers days in advance with guaranteed driver availability.
                        </p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-bold mb-1.5 text-white">Flexible Payment Options</h3>
                        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                            Pay via Mobile Money (MTN/Orange), corporate bank transfer, or USD card. LRD and USD invoicing supported.
                        </p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                            <HeadphonesIcon className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-bold mb-1.5 text-white">Dedicated Account Manager</h3>
                        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                            Every Business Pro and Enterprise client receives a dedicated AfriCab account manager reachable via WhatsApp, call, or email.
                        </p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                            <Globe className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-bold mb-1.5 text-white">Multi-City Coverage</h3>
                        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                            Operating across Monrovia, Paynesville, Buchanan, and Harbel—with coverage expanding quarterly to more Liberian cities.
                        </p>
                    </div>
                </div>

                {/* Who We Serve */}
                <div className="mb-16">
                    <h3 className="text-center text-xl font-bold text-gray-300 mb-8">Trusted by Organizations Across Liberia</h3>
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                        {businessClients.map((client, i) => (
                            <span key={i} className="px-4 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-full text-xs sm:text-sm font-medium">
                                {client}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Pricing Plans */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-16">
                    {plans.map((plan, i) => (
                        <div
                            key={i}
                            className={`relative p-6 sm:p-8 rounded-3xl flex flex-col transition-all duration-300 ${
                                plan.highlight
                                    ? "bg-gradient-to-b from-red-600/30 to-red-900/20 border-2 border-red-500/60 shadow-2xl shadow-red-500/20 scale-[1.02]"
                                    : "bg-white/5 border border-white/10 hover:border-white/20"
                            }`}
                        >
                            {plan.highlight && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-600 to-red-500 text-white text-[11px] font-black uppercase tracking-wider px-5 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                                    Most Popular
                                </span>
                            )}
                            <div className="mb-6">
                                <h3 className="text-xl font-bold mb-1 text-white">{plan.name}</h3>
                                <div className="flex items-baseline gap-2 mb-3">
                                    <span className="text-4xl font-black text-white">{plan.price}</span>
                                    <span className="text-sm text-gray-400">{plan.currency}</span>
                                </div>
                                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{plan.description}</p>
                            </div>
                            <ul className="space-y-3 mb-8 flex-grow">
                                {plan.features.map((feature, j) => (
                                    <li key={j} className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-300">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            {plan.cta === "Contact Sales" ? (
                                <button
                                    onClick={() => handleOpenModal("Enterprise Transport Contract")}
                                    className="w-full py-4 rounded-2xl font-bold text-center flex items-center justify-center gap-2 transition-all text-sm bg-white/10 text-white hover:bg-white/20 border border-white/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                                >
                                    {plan.cta} <ArrowRight size={16} />
                                </button>
                            ) : (
                                <Link
                                    href="/signup"
                                    className={`w-full py-4 rounded-2xl font-bold text-center flex items-center justify-center gap-2 transition-all text-sm ${
                                        plan.highlight
                                            ? "bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600 shadow-lg shadow-red-500/30"
                                            : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                                    }`}
                                >
                                    {plan.cta} <ArrowRight size={16} />
                                </Link>
                            )}
                        </div>
                    ))}
                </div>

                {/* Contact CTA */}
                <div className="text-center p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10">
                    <Building2 className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-2xl sm:text-3xl font-bold mb-3">Need a Custom Enterprise Solution?</h3>
                    <p className="text-gray-400 mb-8 max-w-xl mx-auto text-sm sm:text-base">
                        Our enterprise team is ready to design a transport solution tailored to your organization&apos;s scale, coverage area, and reporting requirements.
                    </p>
                    <button
                        onClick={() => handleOpenModal("Custom Enterprise Solution")}
                        className="inline-flex items-center gap-2 px-10 py-4 bg-white text-gray-900 font-bold rounded-2xl hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all text-sm shadow-lg cursor-pointer"
                    >
                        Contact Our Business Team <ArrowRight size={16} />
                    </button>
                </div>
            </div>

            {/* Contact Modal Popup */}
            <ContactModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                initialSubject={modalSubject}
                title="Contact Our Business Team"
                subtitle="Reach our Monrovia enterprise specialists to tailor a dedicated corporate mobility package for your organization."
            />
        </section>
    );
}

