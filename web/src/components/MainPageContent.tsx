"use client";

import React, { useState, useEffect } from "react";
import Hero from "./Hero";
import FareEstimator from "./FareEstimator";
import RideSection from "./RideSection";
import DriveSection from "./DriveSection";
import BusinessSection from "./BusinessSection";
import AboutSection from "./AboutSection";
import ContactSection from "./ContactSection";
import RiderDashboardContent from "./RiderDashboardContent";
import DriverDashboardContent from "./DriverDashboardContent";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export default function MainPageContent() {
    const [user, setUser] = useState<User | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser && parsedUser.role) {
                    setUser(parsedUser);
                }
            }
        } catch (e) {
            console.error("Auth session load failed", e);
        }
    }, []);

    if (mounted && user) {
        if (user.role === "RIDER") {
            return <RiderDashboardContent user={user} />;
        }
        if (user.role === "DRIVER") {
            return <DriverDashboardContent user={user} />;
        }
    }

    return (
        <>
            <Hero />
            <FareEstimator />
            <RideSection />
            <DriveSection />
            <BusinessSection />
            <AboutSection />
            <ContactSection />

            {/* App Download CTA — fully responsive */}
            <section className="py-20 md:py-28 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" aria-hidden>
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
                </div>

                <div className="container mx-auto px-4 sm:px-6 relative z-10">
                    <div className="max-w-3xl mx-auto">
                        <span className="px-4 py-2 bg-white/10 text-gray-300 border border-white/10 rounded-full text-xs font-bold uppercase tracking-wider inline-block mb-6">
                            Available Now
                        </span>
                        <h2 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-tight">
                            Affordable &amp; Reliable{" "}
                            <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                                Taxi Services
                            </span>
                        </h2>
                        <p className="text-base sm:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Download the AfriCab app today or book instantly without an account. The fastest ride-hailing experience in Monrovia, at your fingertips.
                        </p>

                        {/* Instant book CTA */}
                        <div className="flex justify-center mb-10">
                            <a
                                href="/book/guest"
                                className="group relative bg-yellow-400 text-black px-8 sm:px-12 py-4 sm:py-5 rounded-2xl font-black text-base sm:text-xl hover:bg-yellow-300 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(250,204,21,0.6)] flex items-center gap-3"
                            >
                                <span className="relative flex h-3 w-3 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-black" />
                                </span>
                                BOOK INSTANT RIDE
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </a>
                        </div>

                        {/* App store buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button className="bg-white text-black px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 shadow-2xl flex items-center justify-center gap-2 text-sm sm:text-base">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                                </svg>
                                Download for iOS
                            </button>
                            <button className="bg-gradient-to-r from-red-600 to-red-500 border-2 border-red-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold hover:from-red-700 hover:to-red-600 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-red-500/30 flex items-center justify-center gap-2 text-sm sm:text-base">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z" />
                                </svg>
                                Download for Android
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
