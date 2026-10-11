"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function ChangePasswordPage() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        if (!currentPassword) {
            setError("Please enter your current temporary password.");
            return;
        }

        if (password.length < 6) {
            setError("New password must be at least 6 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setError("New password and confirmation do not match.");
            return;
        }

        if (password === currentPassword) {
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
                    newPassword: password,
                    confirmPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to update password");
            }

            // Update local user and token state
            if (data.token) {
                localStorage.setItem("token", data.token);
            }
            if (data.user) {
                localStorage.setItem("user", JSON.stringify(data.user));
            } else {
                const userStr = localStorage.getItem("user");
                if (userStr) {
                    const user = JSON.parse(userStr);
                    user.forcePasswordChange = false;
                    localStorage.setItem("user", JSON.stringify(user));
                }
            }

            setSuccessMessage("Password updated successfully! Redirecting...");
            setTimeout(() => {
                router.push("/admin");
            }, 1200);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="text-center">
                    <div className="w-14 h-14 bg-emerald-100 text-[#042a22] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                        <Lock className="w-7 h-7" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-gray-900">
                        First-time Login Security
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Please update your temporary password provided by the System Administrator to secure your account.
                    </p>
                </div>

                <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                    {/* Current Password */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Current / Temporary Password
                        </label>
                        <div className="relative">
                            <input
                                type={showCurrent ? "text" : "password"}
                                required
                                className="block w-full px-3.5 py-3 pr-10 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#042a22] focus:border-[#042a22] text-sm font-medium"
                                placeholder="Enter current password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                            New Password (min. 6 characters)
                        </label>
                        <div className="relative">
                            <input
                                type={showNew ? "text" : "password"}
                                required
                                className="block w-full px-3.5 py-3 pr-10 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#042a22] focus:border-[#042a22] text-sm font-medium"
                                placeholder="Enter new strong password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm New Password */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirm ? "text" : "password"}
                                required
                                className="block w-full px-3.5 py-3 pr-10 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#042a22] focus:border-[#042a22] text-sm font-medium"
                                placeholder="Re-enter new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-700 text-xs font-semibold text-center bg-red-50 border border-red-200 py-3 px-4 rounded-xl">
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="text-emerald-700 text-xs font-semibold text-center bg-emerald-50 border border-emerald-200 py-3 px-4 rounded-xl flex items-center justify-center gap-2">
                            <ShieldCheck size={16} />
                            {successMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-[#042a22] hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#042a22] disabled:opacity-50 transition-colors shadow-lg shadow-emerald-900/20"
                    >
                        {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Save New Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}
