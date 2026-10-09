"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
    Users, 
    ArrowUpRight, 
    Star, 
    Calendar, 
    Briefcase, 
    Clock
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import WeatherAlertWidget from "@/components/WeatherAlertWidget";

export default function AdminDashboard() {
    const [statsData, setStatsData] = useState<any>(null);
    const [recentRides, setRecentRides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const getAuthHeaders = useCallback((): HeadersInit => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, []);

    const fetchDashboardData = useCallback(async () => {
        try {
            const headers = getAuthHeaders();
            const [statsRes, ridesRes] = await Promise.allSettled([
                fetch("/api/admin/stats", { headers }),
                fetch("/api/admin/recent-rides", { headers }),
            ]);

            if (statsRes.status === "fulfilled" && statsRes.value.ok) {
                const stats = await statsRes.value.json();
                if (stats && !stats.error) setStatsData(stats);
            }

            if (ridesRes.status === "fulfilled" && ridesRes.value.ok) {
                const rides = await ridesRes.value.json();
                if (Array.isArray(rides)) setRecentRides(rides);
            }
        } catch {
            // Silently handle transient polling interruptions during server reload
        } finally {
            setLoading(false);
        }
    }, [getAuthHeaders]);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    return (
        <div className="space-y-10 animate-in fade-in duration-200">
            {/* Weather Alert & 2-Day Mobility Forecast — Dashboard Only */}
            <WeatherAlertWidget variant="admin" />
            
            {/* Top Stat Cards - Sleek Black Theme */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: "Total number of Staff", value: statsData?.totalUsers, icon: Users, bg: "bg-[#000000]" },
                    { label: "Total Number of positions", value: statsData?.activeDrivers, icon: Briefcase, bg: "bg-[#000000]" },
                    { label: "Tenure", value: "12", icon: Calendar, bg: "bg-[#000000]" },
                    { label: "Average Tenure", value: "3", icon: Calendar, bg: "bg-[#000000]" },
                ].map((stat, i) => (
                    <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn("p-7 rounded-[2.5rem] text-[#ffffff] relative overflow-hidden group hover:scale-[1.03] transition-all cursor-default shadow-2xl shadow-black/40 border border-white/10", stat.bg)}
                    >
                        {/* Subtle decorative circle */}
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
                        
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div>
                                <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#ffffff] mb-2">{stat.label}</p>
                                {loading ? (
                                    <div className="h-14 w-20 bg-white/20 rounded-xl animate-pulse mt-1" />
                                ) : (
                                    <h3 className="text-5xl sm:text-6xl font-black tracking-tight text-[#ffffff]">{stat.value ?? "—"}</h3>
                                )}
                            </div>
                            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                                <stat.icon size={22} className="text-[#ffffff]" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-6 relative z-10">
                            <p className="text-[10px] font-black text-[#ffffff]/90 uppercase tracking-widest">Updated Real-Time</p>
                            <div className="w-7 h-7 bg-white/15 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-all border border-white/10">
                                <ArrowUpRight size={14} className="text-[#ffffff]" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* Left: Observations (Live Trip Monitoring) */}
                <div className="lg:col-span-7 space-y-10">
                    <div className="bg-white rounded-[3rem] p-10 border border-slate-200/50 shadow-xl shadow-slate-200/20 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-black text-[#042a22] tracking-tight">Observations</h3>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Active monitoring logs</p>
                            </div>
                            <Link href="/admin/dispatch" className="px-6 py-2.5 bg-slate-50 rounded-2xl text-[10px] font-black text-[#042a22] uppercase tracking-widest hover:bg-[#042a22] hover:text-white transition-all border border-slate-100">View All</Link>
                        </div>

                        <div className="space-y-5">
                            {recentRides.map((ride, idx) => {
                                const progress = Math.floor(Math.random() * 40) + 60; 
                                return (
                                    <motion.div 
                                        key={idx} 
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="flex items-center gap-6 p-6 rounded-[2rem] border border-slate-100 hover:border-emerald-100 transition-all group bg-slate-50/40 hover:bg-white hover:shadow-lg hover:shadow-emerald-900/5"
                                    >
                                        <div className="relative w-14 h-14 flex-shrink-0">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle cx="28" cy="28" r="24" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                                                <circle cx="28" cy="28" r="24" fill="none" stroke="#042a22" strokeWidth="4" strokeDasharray="150.8" strokeDashoffset={150.8 * (1 - progress / 100)} strokeLinecap="round" className="transition-all duration-1000" />
                                            </svg>
                                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#042a22]">{progress}%</span>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="text-base font-black text-[#042a22] truncate tracking-tight">{ride.rider?.name || "Anonymous Rider"}</h4>
                                                <div className="flex gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} size={11} className={i < 4 ? "fill-emerald-500 text-emerald-500" : "text-slate-200"} />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock size={10} className="text-slate-400" />
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {new Date(ride.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="px-5 py-3 bg-white rounded-2xl text-[10px] font-black text-[#042a22] uppercase tracking-widest border border-slate-100 shadow-sm group-hover:bg-[#042a22] group-hover:text-white transition-all">
                                            Active
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Active Terminals - Professional Look */}
                    <div className="bg-[#042a22] rounded-[3rem] p-10 text-white shadow-2xl shadow-emerald-950/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700" />
                        
                        <div className="flex items-center justify-between mb-10 relative z-10">
                            <h3 className="text-xl font-black tracking-tight">Active Terminals</h3>
                            <button className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors">Manage Zones</button>
                        </div>
                        <div className="space-y-8 relative z-10">
                            <div>
                                <div className="flex items-end gap-3 mb-5">
                                    <p className="text-5xl font-black">5</p>
                                    <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Operational Zones</p>
                                </div>
                                <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden p-1">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: "80%" }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className="h-full bg-emerald-400 rounded-full" 
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Online</p>
                                    </div>
                                    <p className="text-3xl font-black">4</p>
                                </div>
                                <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-2 h-2 bg-white/20 rounded-full" />
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Offline</p>
                                    </div>
                                    <p className="text-3xl font-black text-white/40">1</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Activity Feed */}
                <div className="lg:col-span-5 space-y-10">
                    <div className="bg-white rounded-[3rem] p-10 border border-slate-200/50 shadow-xl shadow-slate-200/20 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-xl font-black text-[#042a22] tracking-tight">Recent Activity</h3>
                            <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">Full Log</button>
                        </div>

                        <div className="space-y-6 flex-1">
                            {[
                                { user: "Taylor Swift", action: "modified observations", time: "2m ago", initial: "TS", color: "bg-emerald-500" },
                                { user: "Admin User", action: "logged in", time: "15m ago", initial: "AU", color: "bg-[#042a22]" },
                                { user: "Ibrahim K.", action: "dispatched ride #82", time: "1h ago", initial: "IK", color: "bg-slate-800" },
                                { user: "System", action: "backup completed", time: "3h ago", initial: "SY", color: "bg-slate-400" },
                            ].map((item, i) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-center gap-5 p-5 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-md transition-all group"
                                >
                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-[11px] font-black text-white shrink-0 shadow-lg", item.color)}>
                                        {item.initial}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-600 truncate leading-snug">
                                            <span className="font-black text-[#042a22]">{item.user}</span> {item.action}
                                        </p>
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">{item.time}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Professional Team Section */}
                        <div className="mt-14 pt-10 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-black text-[#042a22]">Operational Team</h3>
                                <div className="flex -space-x-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold">+</div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                {[
                                    { name: "Erikson Taylor", role: "Fleet Supervisor", active: true },
                                    { name: "Ibrahim Konneh", role: "Regional Lead", active: false },
                                ].map((node, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-11 h-11 bg-white border border-slate-200 rounded-full flex items-center justify-center text-[11px] font-black text-[#042a22] shadow-sm">
                                                    {node.name.charAt(0)}
                                                </div>
                                                {node.active && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-[#042a22]">{node.name}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mt-0.5">{node.role}</p>
                                            </div>
                                        </div>
                                        <div className={cn("px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest", node.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                                            {node.active ? "Online" : "Away"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
