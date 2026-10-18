"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                // In a real app, we'd store the token in a cookie or state management
                localStorage.setItem("user", JSON.stringify(data.user));
                localStorage.setItem("token", data.token);

                if (data.user.role === "ADMIN" || data.user.role === "SUPER_ADMIN") {
                    if (data.user.forcePasswordChange) {
                        router.push("/admin/change-password");
                    } else {
                        router.push("/admin");
                    }
                } else if (data.user.role === "DRIVER") {
                    router.push("/driver");
                } else {
                    router.push("/");
                }
            } else {
                const msg = data.error || "Login failed";
                setErrorMessage(msg);
                alert(msg);
            }
        } catch (error) {
            setErrorMessage("An unexpected network error occurred. Please try again.");
            alert("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Link href="/" className="flex justify-center mb-6 group">
                    <div className="w-14 h-14 bg-[#042a22] text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform overflow-hidden p-1.5 border border-emerald-900/40">
                        <Image
                            src="/africab-logo.png"
                            alt="AfriCab Logo"
                            width={56}
                            height={56}
                            className="w-full h-full object-contain"
                            priority
                        />
                    </div>
                </Link>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Sign in to your account
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Or{" "}
                    <Link href="/signup" className="font-medium text-[#042a22] hover:text-emerald-900">
                        create a new account
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
                    {errorMessage && (
                        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}
                    <form className="space-y-6" onSubmit={(e) => { setErrorMessage(""); handleSubmit(e); }}>
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Email address
                            </label>
                            <div className="mt-1 relative rounded-lg shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="block w-full pl-11 pr-4 py-3 sm:text-base border border-gray-300 rounded-lg bg-white text-gray-900 font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-[#042a22] focus:border-[#042a22] outline-none transition-colors"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Password
                            </label>
                            <div className="mt-1 relative rounded-lg shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    className="block w-full pl-11 pr-12 py-3 sm:text-base border border-gray-300 rounded-lg bg-white text-gray-900 font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-[#042a22] focus:border-[#042a22] outline-none transition-colors"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-800 focus:outline-none transition-colors cursor-pointer"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-[#042a22] focus:ring-[#042a22] border-gray-300 rounded"
                                />
                                <label
                                    htmlFor="remember-me"
                                    className="ml-2 block text-sm text-gray-900"
                                >
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <a
                                    href="#"
                                    className="font-medium text-[#042a22] hover:text-emerald-900"
                                >
                                    Forgot your password?
                                </a>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#042a22] hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#042a22] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin h-5 w-5" />
                                ) : (
                                    "Sign in"
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <GoogleSignInButton 
                                onSuccess={(token, user) => {
                                    localStorage.setItem("user", JSON.stringify(user));
                                    localStorage.setItem("token", token);
                                    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
                                        router.push("/admin");
                                    } else {
                                        router.push("/");
                                    }
                                }} 
                                onError={(err) => alert(err)} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
