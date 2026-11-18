"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DriverDashboardContent from "@/components/DriverDashboardContent";
import { useRouter } from "next/navigation";

// Local Error Boundary to catch any unexpected driver dashboard rendering crash
class DriverDashboardErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Driver Dashboard Rendering Error caught by Boundary:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-white">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-200">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Driver Dashboard Recovering</h2>
                    <p className="text-slate-500 text-sm max-w-md mb-6 leading-relaxed">
                        A temporary display interruption occurred. Click below to refresh your live telemetry and dispatch queue.
                    </p>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                        >
                            Reload Dashboard
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                localStorage.removeItem("user");
                                localStorage.removeItem("token");
                                window.location.href = "/login";
                            }}
                            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                        >
                            Re-login
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function DriverPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem("user");
            if (!storedUser) {
                router.push("/login");
                return;
            }
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.role !== "DRIVER") {
                router.push("/");
                return;
            }
            setUser(parsedUser);
        } catch (e) {
            console.error("Driver page auth failed", e);
            localStorage.removeItem("user");
            router.push("/login");
        } finally {
            setLoading(false);
        }
    }, [router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-white text-slate-900">
            <Navbar />
            <DriverDashboardErrorBoundary>
                <DriverDashboardContent user={user} />
            </DriverDashboardErrorBoundary>
            <Footer />
        </main>
    );
}
