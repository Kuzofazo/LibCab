"use client";

import React from "react";
import Image from "next/image";
import AdminSidebar from "@/components/admin/Sidebar";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminNotificationListener from "@/components/admin/AdminNotificationListener";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminGuard>
            <div className="min-h-screen bg-red-700 flex font-sans selection:bg-black selection:text-white">
                <AdminSidebar />
                <main className="flex-1 ml-72 p-10 relative z-10">
                    <div className="bg-slate-100 rounded-[3rem] min-h-[calc(100vh-5rem)] shadow-2xl p-10 border border-white/40 backdrop-blur-sm">
                        <header className="flex justify-between items-center mb-8 border-b border-slate-200/60 pb-6">
                            <div>
                                <h1 className="text-3xl font-black text-[#0F2F2F] tracking-tight">Intelligence Center</h1>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Operational Fleet Oversight</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <AdminNotificationListener />
                                <div className="text-right hidden md:block pl-2 border-l border-slate-200">
                                    <p className="text-xl font-black text-[#0F2F2F]">AfriCab Elite</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Terminal</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-xl rotate-3 hover:rotate-0 transition-transform">
                                    <Image
                                        src="/africab-logo.png"
                                        alt="AfriCab Logo"
                                        width={56}
                                        height={56}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        </header>

                        <div className="relative z-10">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </AdminGuard>
    );
}
