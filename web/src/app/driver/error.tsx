"use client";

import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function DriverError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Driver Route Error:", error);
    }, [error]);

    const handleClearAndReload = () => {
        try {
            // Re-fetch token or user if corrupted
            reset();
        } catch {
            window.location.reload();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
            <Navbar />
            <main className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
                <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl shadow-sm border border-slate-200">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-100">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Driver Portal Notice</h2>
                    <p className="text-slate-500 text-xs sm:text-sm mb-6 leading-relaxed">
                        Your driver dashboard encountered a temporary loading pause. Click below to reconnect to AfriCab dispatch.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            onClick={handleClearAndReload}
                            className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                        >
                            Reconnect Dashboard
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                localStorage.removeItem("user");
                                localStorage.removeItem("token");
                                window.location.href = "/login";
                            }}
                            className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                        >
                            Log Out &amp; Re-enter
                        </button>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
