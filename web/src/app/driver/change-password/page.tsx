"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, KeyRound } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function DriverChangePasswordPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem("user");
            if (!storedUser) {
                router.push("/login");
                return;
            }
            const parsed = JSON.parse(storedUser);
            if (parsed.role !== "DRIVER") {
                router.push("/");
                return;
            }
            setUser(parsed);
        } catch {
            router.push("/login");
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        if (!currentPassword) {
            setError("Please enter your current or temporary password.");
            return;
        }

        if (newPassword.length < 6) {
            setError("New password must be at least 6 characters long.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("New password and confirmation do not match.");
            return;
        }

        if (newPassword === currentPassword) {
            setError("New password cannot be the same as your current password.");
            return;
        }

        setIsLoading(true);

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/login");
                return;
            }

            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to update password");
            }

            // Update token and user in storage
            if (data.token) {
                localStorage.setItem("token", data.token);
            }
            if (data.user) {
                localStorage.setItem("user", JSON.stringify(data.user));
            } else if (user) {
                const updated = { ...user, forcePasswordChange: false };
                localStorage.setItem("user", JSON.stringify(updated));
            }

            setSuccessMessage("Password changed successfully! Returning to Driver Dashboard...");
            setTimeout(() => {
                router.push("/driver");
            }, 1200);
        } catch (err: any) {
            setError(err.message || "An error occurred while updating password.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
            <Navbar />
            <main className="container mx-auto px-4 py-12 flex items-center justify-center">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <button
                        type="button"
                        onClick={() => router.push("/driver")}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
                    >
                        <ArrowLeft size={14} /> Back to Dashboard
                    </button>

                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                            <KeyRound className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            Driver Password Settings
                        </h1>
                        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                            {user.forcePasswordChange
                                ? "Your administrator assigned an initial temporary password. Please set a private, permanent password."
                                : "Update your driver account password. Enter your current password followed by your new password."}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Current Password */}
                        <div>
                            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                Current / Temporary Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showCurrent ? "text" : "password"}
                                    required
                                    className="block w-full px-4 py-3.5 pr-11 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm font-semibold transition-all"
                                    placeholder="Enter current password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* New Password */}
                        <div>
                            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                New Password (min. 6 characters)
                            </label>
                            <div className="relative">
                                <input
                                    type={showNew ? "text" : "password"}
                                    required
                                    className="block w-full px-4 py-3.5 pr-11 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm font-semibold transition-all"
                                    placeholder="Enter new strong password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm New Password */}
                        <div>
                            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    required
                                    className="block w-full px-4 py-3.5 pr-11 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm font-semibold transition-all"
                                    placeholder="Re-enter new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl text-center">
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2">
                                <ShieldCheck size={16} />
                                {successMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving New Password...
                                </>
                            ) : (
                                "Update Password"
                            )}
                        </button>
                    </form>
                </div>
            </main>
            <Footer />
        </div>
    );
}
