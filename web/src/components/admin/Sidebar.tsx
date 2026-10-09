"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Users,
    Map,
    CreditCard,
    Settings,
    Ticket,
    MapPin,
    Lightbulb,
    ChevronUp,
    ChevronDown,
    Radio,
    Star,
    Building2
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
    { icon: LayoutDashboard, label: "DASHBOARD", href: "/admin" },
    { icon: Radio, label: "FLEET TRACKING", href: "/admin/fleet" },
    { icon: Building2, label: "COMPANIES", href: "/admin/companies" },
    { icon: Map, label: "DISPATCH", href: "/admin/dispatch" },
    { icon: Star, label: "REVIEWS & QUALITY", href: "/admin/reviews" },
    { icon: Lightbulb, label: "INSIGHTS", href: "/admin/insights" },
    { icon: Users, label: "USERS", href: "/admin/users" },
    { icon: MapPin, label: "PRICING", href: "/admin/pricing" },
    { icon: Ticket, label: "COUPONS", href: "/admin/coupons" },
    { icon: CreditCard, label: "PAYMENTS", href: "/admin/payments" },
    { icon: Settings, label: "SETTINGS", href: "/admin/settings" },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const [user, setUser] = useState<{name: string, email: string} | null>(null);
    const navRef = useRef<HTMLElement>(null);
    const [showUpBtn, setShowUpBtn] = useState(false);
    const [showDownBtn, setShowDownBtn] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            try {
                const u = JSON.parse(userStr);
                setUser(u);
            } catch {}
        }
    }, []);

    const checkScroll = () => {
        if (navRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = navRef.current;
            setShowUpBtn(scrollTop > 10);
            setShowDownBtn(scrollTop + clientHeight < scrollHeight - 10);
        }
    };

    useEffect(() => {
        const nav = navRef.current;
        if (nav) {
            nav.addEventListener("scroll", checkScroll);
            // Initial check
            checkScroll();
            // Also check on window resize
            window.addEventListener("resize", checkScroll);
            
            // Check again after a short delay to account for rendering
            const timer = setTimeout(checkScroll, 500);
            return () => {
                nav.removeEventListener("scroll", checkScroll);
                window.removeEventListener("resize", checkScroll);
                clearTimeout(timer);
            };
        }
    }, []);

    const scrollNav = (direction: 'up' | 'down') => {
        if (navRef.current) {
            const scrollAmount = direction === 'up' ? -150 : 150;
            navRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <aside className="w-72 bg-black text-white h-screen fixed left-0 top-0 overflow-hidden flex flex-col z-50 border-r border-white/5">
            {/* Jothan Taylor Style Profile Header */}
            <div className="p-6 pb-2">
                <div className="bg-[#111111] rounded-[2rem] p-6 text-center relative overflow-hidden border border-white/5">
                    <div className="absolute top-2 left-4 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[7px] font-black text-green-500 uppercase tracking-widest">Active</span>
                    </div>
                    <div className="absolute top-2 right-4 text-white/20">
                        <Settings size={12} className="cursor-pointer hover:text-white transition-colors" />
                    </div>
                    
                    <div className="w-16 h-16 rounded-full mx-auto mb-3 overflow-hidden border-2 border-white/10">
                        <Image
                            src="/africab-logo.png"
                            alt="AfriCab Logo"
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <h2 className="text-sm font-black tracking-tight">{user?.name || "JOTHAN TAYLOR"}</h2>
                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Fleet Administrator</p>
                </div>
            </div>

            {/* Navigation with Scroll Buttons */}
            <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
                <AnimatePresence>
                    {showUpBtn && (
                        <motion.button
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            onClick={() => scrollNav('up')}
                            className="absolute top-0 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-b from-black to-transparent w-full pt-2 pb-8 flex justify-center text-white/40 hover:text-white transition-colors"
                        >
                            <ChevronUp size={20} strokeWidth={3} />
                        </motion.button>
                    )}
                </AnimatePresence>

                <nav 
                    ref={navRef}
                    className="flex-1 mt-2 space-y-1 overflow-y-auto relative pr-0 scrollbar-hide"
                >
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                prefetch={true}
                                className={cn(
                                    "flex items-center gap-4 px-8 py-4 text-[11px] font-black tracking-[0.15em] transition-all relative group",
                                    isActive 
                                        ? "text-black z-10" 
                                        : "text-white/40 hover:text-white"
                                )}
                            >
                                {/* The "Bubble" active state */}
                                {isActive && (
                                    <div className="absolute inset-0 left-4 bg-slate-100 rounded-l-[2rem] -mr-0">
                                        <div className="absolute top-[-2rem] right-0 w-8 h-8 bg-slate-100 rounded-full shadow-[16px_16px_0_0_#f1f5f9]" />
                                        <div className="absolute bottom-[-2rem] right-0 w-8 h-8 bg-slate-100 rounded-full shadow-[16px_-16px_0_0_#f1f5f9]" />
                                    </div>
                                )}
                                
                                <item.icon size={18} className={cn("relative z-10", isActive ? "text-black" : "text-white/40 group-hover:text-white")} />
                                <span className="relative z-10">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <AnimatePresence>
                    {showDownBtn && (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            onClick={() => scrollNav('down')}
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-t from-black to-transparent w-full pb-2 pt-8 flex justify-center text-white/40 hover:text-white transition-colors"
                        >
                            <ChevronDown size={20} strokeWidth={3} />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Section */}
            <div className="p-8 pt-4">
                <div className="bg-white/5 rounded-3xl p-6 relative overflow-hidden group hover:bg-white/10 transition-all cursor-pointer border border-white/5">
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-white/5 rounded-full blur-xl group-hover:bg-white/10" />
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">System Status</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-white/80">FLEET ONLINE</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
