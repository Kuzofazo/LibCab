"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    User, Mail, Lock, Phone, Loader2, Car, Bike,
    Tag, Palette, Hash, ShieldCheck, Eye, EyeOff,
    Clock, CheckCircle2, AlertTriangle, ArrowRight
} from "lucide-react";

type RegistrationType = "DRIVER_CAR" | "RIDER_BIKE" | "";

interface FormData {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    vehicleType: string;
    vehicleColor: string;
    vehicleModel: string;
    licensePlate: string;
    driverLicense: string;
}

export default function SignupPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [registrationType, setRegistrationType] = useState<RegistrationType>("");
    const [submitted, setSubmitted] = useState(false);
    const [submittedName, setSubmittedName] = useState("");

    const [formData, setFormData] = useState<FormData>({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        vehicleType: "",
        vehicleColor: "",
        vehicleModel: "",
        licensePlate: "",
        driverLicense: "",
    });

    const updateField = (field: keyof FormData, value: string) =>
        setFormData((prev) => ({ ...prev, [field]: value }));

    const isBaseValid =
        formData.fullName.trim() &&
        formData.email.trim() &&
        formData.phone.trim() &&
        formData.password.length >= 8;
    const isVehicleValid =
        formData.vehicleType.trim() &&
        formData.vehicleColor.trim() &&
        formData.vehicleModel.trim() &&
        formData.licensePlate.trim() &&
        formData.driverLicense.trim();
    const isFormValid = isBaseValid && registrationType !== "" && isVehicleValid;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        setIsLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email.trim(),
                    password: formData.password,
                    name: formData.fullName.trim(),
                    phone: formData.phone.trim(),
                    role: "DRIVER",
                    vehicleType: formData.vehicleType.trim(),
                    vehicleModel: formData.vehicleModel.trim(),
                    vehicleColor: formData.vehicleColor.trim(),
                    licensePlate: formData.licensePlate.trim(),
                    driverLicense: formData.driverLicense.trim(),
                }),
            });

            const data = await res.json();

            if (res.ok) {
                // Store credentials so driver can view their pending-status dashboard
                localStorage.setItem("user", JSON.stringify(data.user));
                localStorage.setItem("token", data.token);
                setSubmittedName(data.user?.name || formData.fullName);
                setSubmitted(true);
            } else {
                setError(data.error || "Registration failed. Please try again.");
            }
        } catch {
            setError("A network error occurred. Please check your connection and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Success / Pending Review Screen ─────────────────────────────────────
    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#042a22] via-[#0d1f1a] to-black flex flex-col items-center justify-center px-4 py-16">
                <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-6 duration-500">
                    {/* Card */}
                    <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#042a22] to-[#0a4033] px-8 py-10 text-center relative overflow-hidden">
                            <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl" />
                            <div className="relative z-10">
                                <div className="w-20 h-20 bg-amber-400 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-xl rotate-3">
                                    <Clock size={36} className="text-[#042a22]" strokeWidth={2.5} />
                                </div>
                                <h1 className="text-2xl font-black text-white tracking-tight">
                                    Application Submitted!
                                </h1>
                                <p className="text-emerald-300 text-sm font-medium mt-1">
                                    Pending Administrator Review
                                </p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-8 py-8 space-y-6">
                            <div className="text-center">
                                <p className="text-slate-700 font-semibold text-sm leading-relaxed">
                                    Thank you, <span className="font-black text-[#042a22]">{submittedName}</span>!
                                    Your driver registration has been received and sent to the
                                    AfriCab System Administrator for review.
                                </p>
                            </div>

                            {/* Status Steps */}
                            <div className="space-y-3">
                                {[
                                    { icon: CheckCircle2, label: "Registration submitted successfully", done: true, color: "emerald" },
                                    { icon: Clock, label: "Pending administrator review & approval", done: false, active: true, color: "amber" },
                                    { icon: ArrowRight, label: "Account activation & onboarding", done: false, color: "slate" },
                                ].map((step, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                                            step.done
                                                ? "bg-emerald-50 border-emerald-200"
                                                : step.active
                                                ? "bg-amber-50 border-amber-200"
                                                : "bg-slate-50 border-slate-200"
                                        }`}
                                    >
                                        <div
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                step.done
                                                    ? "bg-emerald-600 text-white"
                                                    : step.active
                                                    ? "bg-amber-400 text-[#042a22]"
                                                    : "bg-slate-200 text-slate-500"
                                            }`}
                                        >
                                            <step.icon size={18} strokeWidth={2.5} />
                                        </div>
                                        <span
                                            className={`text-xs font-bold ${
                                                step.done
                                                    ? "text-emerald-800"
                                                    : step.active
                                                    ? "text-amber-900"
                                                    : "text-slate-500"
                                            }`}
                                        >
                                            {step.label}
                                        </span>
                                        {step.active && (
                                            <span className="ml-auto text-[9px] font-black uppercase tracking-wider bg-amber-400 text-[#042a22] px-2 py-0.5 rounded-full animate-pulse shrink-0">
                                                In Progress
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
                                <AlertTriangle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-800 font-medium leading-relaxed">
                                    You will not be able to go online or accept ride requests until your
                                    application is approved. You will be notified once a decision is made.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => router.push("/driver")}
                                    className="w-full py-4 bg-[#042a22] hover:bg-emerald-900 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-[#042a22]/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <ArrowRight size={16} />
                                    View My Driver Dashboard
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.push("/")}
                                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all"
                                >
                                    Return to Homepage
                                </button>
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-white/40 text-xs font-medium mt-6">
                        AfriCab — Ride-Hailing Network • Liberia
                    </p>
                </div>
            </div>
        );
    }

    // ─── Registration Form ────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-xl animate-in slide-in-from-bottom-4 duration-500">
                <Link href="/" className="flex justify-center mb-6 group">
                    <div className="w-14 h-14 bg-[#042a22] text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform overflow-hidden p-1.5 border border-emerald-900/40">
                        <Image
                            src="/africab-logo.png"
                            alt="AfriCab"
                            width={56}
                            height={56}
                            className="w-full h-full object-contain"
                            priority
                        />
                    </div>
                </Link>
                <h2 className="mt-6 text-center text-3xl font-black text-gray-900 tracking-tight">
                    Partner with Us
                </h2>
                <p className="mt-2 text-center text-sm font-bold text-gray-500">
                    Already have an account?{" "}
                    <Link href="/login" className="font-black text-[#042a22] hover:text-emerald-700">
                        Sign in
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
                <div className="bg-white py-8 px-4 shadow-xl sm:rounded-[2.5rem] sm:px-10 border border-gray-100 relative overflow-hidden">
                    <form className="space-y-8" onSubmit={handleSubmit}>

                        {/* Personal Details */}
                        <div className="space-y-5">
                            <h3 className="text-lg font-black text-gray-900 border-b pb-2">Personal Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                                    <div className="relative rounded-2xl shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            id="signup-fullname"
                                            type="text"
                                            required
                                            className="focus:ring-[#042a22] focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-bold text-gray-900 transition-all outline-none"
                                            placeholder="John Doe"
                                            value={formData.fullName}
                                            onChange={(e) => updateField("fullName", e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                                    <div className="relative rounded-2xl shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            id="signup-email"
                                            type="email"
                                            required
                                            className="focus:ring-emerald-200 focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-bold text-gray-900 transition-all outline-none"
                                            placeholder="you@domain.com"
                                            value={formData.email}
                                            onChange={(e) => updateField("email", e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Phone</label>
                                    <div className="relative rounded-2xl shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Phone className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            id="signup-phone"
                                            type="tel"
                                            required
                                            className="focus:ring-[#042a22] focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-bold text-gray-900 transition-all outline-none"
                                            placeholder="077 000 0000"
                                            value={formData.phone}
                                            onChange={(e) => updateField("phone", e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Secure Password</label>
                                    <div className="relative rounded-2xl shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            id="signup-password"
                                            type={showPassword ? "text" : "password"}
                                            required
                                            className="focus:ring-[#042a22] focus:border-[#042a22] block w-full pl-12 pr-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-white font-bold text-gray-900 transition-all outline-none"
                                            placeholder="At least 8 characters"
                                            minLength={8}
                                            value={formData.password}
                                            onChange={(e) => updateField("password", e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-700 focus:outline-none transition-colors cursor-pointer"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-4 pt-6 border-t border-gray-100">
                            <h3 className="text-lg font-black text-gray-900 border-b pb-2">Provide a Service</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    id="select-driver-car"
                                    onClick={() => setRegistrationType("DRIVER_CAR")}
                                    className={`flex flex-col items-center justify-center p-6 border-2 rounded-3xl transition-all duration-300 ${
                                        registrationType === "DRIVER_CAR"
                                            ? "border-[#042a22] bg-emerald-50 text-[#042a22] scale-[1.02] shadow-xl shadow-emerald-100"
                                            : "border-gray-100 bg-white text-gray-400 hover:border-gray-300 hover:bg-gray-50"
                                    }`}
                                >
                                    <Car size={40} className="mb-3 drop-shadow-md" />
                                    <span className="font-black">Driver (Car)</span>
                                </button>
                                <button
                                    type="button"
                                    id="select-rider-bike"
                                    onClick={() => setRegistrationType("RIDER_BIKE")}
                                    className={`flex flex-col items-center justify-center p-6 border-2 rounded-3xl transition-all duration-300 ${
                                        registrationType === "RIDER_BIKE"
                                            ? "border-emerald-600 bg-emerald-50 text-emerald-700 scale-[1.02] shadow-xl shadow-emerald-100"
                                            : "border-gray-100 bg-white text-gray-400 hover:border-gray-300 hover:bg-gray-50"
                                    }`}
                                >
                                    <Bike size={40} className="mb-3 drop-shadow-md" />
                                    <span className="font-black">Rider (Bike)</span>
                                </button>
                            </div>
                        </div>

                        {/* Dynamic Vehicle Form */}
                        {registrationType && (
                            <div className="space-y-5 pt-6 border-t border-gray-100 animate-in slide-in-from-bottom-4 duration-300">
                                <h3 className="text-lg font-black text-gray-900 border-b pb-2">
                                    {registrationType === "DRIVER_CAR" ? "Vehicle Details" : "Bike Details"}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                            {registrationType === "DRIVER_CAR" ? "Car Type (e.g. Sedan, SUV)" : "Bike Type (e.g. Motorcycle, Scooter)"}
                                        </label>
                                        <div className="relative rounded-2xl shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Tag className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                id="signup-vehicle-type"
                                                type="text"
                                                required
                                                className="focus:ring-[#042a22] focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-bold text-gray-900 transition-all outline-none"
                                                placeholder={registrationType === "DRIVER_CAR" ? "Sedan" : "Motorcycle"}
                                                value={formData.vehicleType}
                                                onChange={(e) => updateField("vehicleType", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                            {registrationType === "DRIVER_CAR" ? "Car Make/Model" : "Bike Make/Model"}
                                        </label>
                                        <div className="relative rounded-2xl shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Car className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                id="signup-vehicle-model"
                                                type="text"
                                                required
                                                className="focus:ring-[#042a22] focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-bold text-gray-900 transition-all outline-none"
                                                placeholder={registrationType === "DRIVER_CAR" ? "Toyota Corolla" : "TVS Boxer"}
                                                value={formData.vehicleModel}
                                                onChange={(e) => updateField("vehicleModel", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Color</label>
                                        <div className="relative rounded-2xl shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Palette className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                id="signup-vehicle-color"
                                                type="text"
                                                required
                                                className="focus:ring-[#042a22] focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-bold text-gray-900 transition-all outline-none"
                                                placeholder="Silver"
                                                value={formData.vehicleColor}
                                                onChange={(e) => updateField("vehicleColor", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                            {registrationType === "DRIVER_CAR" ? "License Plate Number" : "Bike License Plate"}
                                        </label>
                                        <div className="relative rounded-2xl shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Hash className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                id="signup-license-plate"
                                                type="text"
                                                required
                                                className="focus:ring-[#042a22] focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-black tracking-widest text-[#042a22] transition-all outline-none uppercase"
                                                placeholder="ABC-123"
                                                value={formData.licensePlate}
                                                onChange={(e) => updateField("licensePlate", e.target.value.toUpperCase())}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                            {registrationType === "DRIVER_CAR" ? "Driver's License" : "Rider's License"}
                                        </label>
                                        <div className="relative rounded-2xl shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <ShieldCheck className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                id="signup-driver-license"
                                                type="text"
                                                required
                                                className="focus:ring-[#042a22] focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-black tracking-widest text-emerald-700 transition-all outline-none uppercase"
                                                placeholder="DL-XYZ123"
                                                value={formData.driverLicense}
                                                onChange={(e) => updateField("driverLicense", e.target.value.toUpperCase())}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm font-bold text-red-700">{error}</p>
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                id="signup-submit"
                                type="submit"
                                disabled={!isFormValid || isLoading}
                                className={`w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-3xl shadow-xl text-lg font-black text-white transition-all 
                                    ${isFormValid && !isLoading
                                        ? "bg-black hover:bg-gray-900 hover:scale-[1.02] active:scale-95 shadow-black/20"
                                        : "bg-gray-200 text-gray-500 cursor-not-allowed shadow-none"}`}
                            >
                                {isLoading ? (
                                    <><Loader2 className="animate-spin h-6 w-6 mr-2" /> Submitting Application...</>
                                ) : (
                                    "Complete Registration"
                                )}
                            </button>
                        </div>
                    </form>

                    <p className="mt-8 text-center text-xs font-bold text-gray-400">
                        By signing up, you agree to our{" "}
                        <a href="#" className="font-black text-[#042a22] hover:text-emerald-700">Terms of Service</a>
                        {" "}and{" "}
                        <a href="#" className="font-black text-[#042a22] hover:text-emerald-700">Privacy Policy</a>.
                    </p>
                </div>
            </div>
        </div>
    );
}
