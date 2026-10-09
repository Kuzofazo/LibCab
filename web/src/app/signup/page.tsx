"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Phone, Loader2, Car, Bike, Tag, Palette, Hash, ShieldCheck } from "lucide-react";

export default function SignupPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    
    const [registrationType, setRegistrationType] = useState<"DRIVER_CAR" | "RIDER_BIKE" | "">("");

    const [formData, setFormData] = useState({
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

    const isBaseValid = formData.fullName && formData.email && formData.phone && formData.password.length >= 8;
    const isVehicleValid = formData.vehicleType && formData.vehicleColor && formData.vehicleModel && formData.licensePlate && formData.driverLicense;
    const isFormValid = isBaseValid && registrationType !== "" && isVehicleValid;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isFormValid) return;
        
        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    name: formData.fullName,
                    phone: formData.phone,
                    role: "DRIVER", // Both Car and Bike act as drivers
                    vehicleType: registrationType === "DRIVER_CAR" ? "Car" : "Bike", // Overrides form input of specific model "Sedan" etc via mapped DriverProfile logic... Wait, no!
                    // Let me map the specific string (e.g. `Sedan`) to `vehicleType` in driverProfile, rather than just "Car" / "Bike". 
                    // The prompt asked for: "Car Type (e.g., Sedan, SUV)" and "Bike Type (e.g., Motorcycle, Scooter)". 
                    // So we will pass the user input `formData.vehicleType` instead of overriding it.
                    vehicleModel: formData.vehicleModel,
                    vehicleColor: formData.vehicleColor,
                    licensePlate: formData.licensePlate,
                    driverLicense: formData.driverLicense
                }),
            });

            // Re-assigning because I made a mistake reading the prompt in my internal thought block
            // In API route it saves vehicleType to DriverProfile. vehicleType input field captures "Sedan", "SUV", etc.
            // Oh wait, I actually need to overwrite the body definition. Let me re-write the body correctly directly here.

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem("user", JSON.stringify(data.user));
                localStorage.setItem("token", data.token);
                router.push("/");
            } else {
                alert(data.error || "Signup failed");
            }
        } catch (error) {
            alert("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Note: Reacting to my internal reflection, the body inside JSON.stringify should be:
    // role: "DRIVER", vehicleType: formData.vehicleType, etc.
    const submitPayload = {
        email: formData.email,
        password: formData.password,
        name: formData.fullName,
        phone: formData.phone,
        role: "DRIVER", 
        vehicleType: formData.vehicleType, 
        vehicleModel: formData.vehicleModel,
        vehicleColor: formData.vehicleColor,
        licensePlate: formData.licensePlate,
        driverLicense: formData.driverLicense
    };

    const handleActualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(submitPayload),
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("user", JSON.stringify(data.user));
                localStorage.setItem("token", data.token);
                router.push("/");
            } else {
                alert(data.error || "Signup failed");
            }
        } catch (error) {
            alert("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-xl animate-in slide-in-from-bottom-4 duration-500">
                <Link href="/" className="flex justify-center mb-6">
                    <div className="w-14 h-14 bg-[#042a22] text-white rounded-2xl flex items-center justify-center font-black text-3xl shadow-lg hover:scale-105 transition-transform">
                        P
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
                    <form className="space-y-8" onSubmit={handleActualSubmit}>
                        
                        {/* Base Details */}
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
                                            type="text"
                                            required
                                            className="focus:ring-[#042a22] focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-bold text-gray-900 transition-all outline-none"
                                            placeholder="John Doe"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email / Username</label>
                                    <div className="relative rounded-2xl shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            className="focus:ring-emerald-200 focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-bold text-gray-900 transition-all outline-none"
                                            placeholder="you@domain.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                                            type="tel"
                                            required
                                            className="focus:ring-[#042a22] focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-bold text-gray-900 transition-all outline-none"
                                            placeholder="077 000 0000"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                                            type="password"
                                            required
                                            className="focus:ring-[#042a22] focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-black tracking-widest text-[#042a22] transition-all outline-none"
                                            placeholder="••••••••"
                                            minLength={8}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
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
                                                type="text"
                                                required
                                                className="focus:ring-[#042a22] focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-bold text-gray-900 transition-all outline-none"
                                                placeholder={registrationType === "DRIVER_CAR" ? "Sedan" : "Motorcycle"}
                                                value={formData.vehicleType}
                                                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
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
                                                type="text"
                                                required
                                                className="focus:ring-[#042a22] focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-bold text-gray-900 transition-all outline-none"
                                                placeholder={registrationType === "DRIVER_CAR" ? "Toyota Corolla" : "TVS Boxer"}
                                                value={formData.vehicleModel}
                                                onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
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
                                                type="text"
                                                required
                                                className="focus:ring-[#042a22] focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-bold text-gray-900 transition-all outline-none"
                                                placeholder="Silver"
                                                value={formData.vehicleColor}
                                                onChange={(e) => setFormData({ ...formData, vehicleColor: e.target.value })}
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
                                                type="text"
                                                required
                                                className="focus:ring-[#042a22] focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-black tracking-widest text-[#042a22] transition-all outline-none uppercase"
                                                placeholder="ABC-123"
                                                value={formData.licensePlate}
                                                onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
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
                                                type="text"
                                                required
                                                className="focus:ring-[#042a22] focus:border-[#042a22] block w-full pl-12 sm:text-sm border-2 border-gray-100 rounded-2xl p-3 bg-gray-50/50 font-black tracking-widest text-emerald-700 transition-all outline-none uppercase"
                                                placeholder="DL-XYZ123"
                                                value={formData.driverLicense}
                                                onChange={(e) => setFormData({ ...formData, driverLicense: e.target.value.toUpperCase() })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={!isFormValid || isLoading}
                                className={`w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-3xl shadow-xl text-lg font-black text-white transition-all 
                                    ${isFormValid ? "bg-black hover:bg-gray-900 hover:scale-[1.02] active:scale-95 shadow-black/20" : "bg-gray-200 text-gray-500 cursor-not-allowed shadow-none"}`}
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin h-6 w-6" />
                                ) : (
                                    "Complete Registration"
                                )}
                            </button>
                        </div>
                    </form>

                    <p className="mt-8 text-center text-xs font-bold text-gray-400">
                        By signing up, you agree to our{" "}
                        <a href="#" className="font-black text-[#042a22] hover:text-emerald-700">
                            Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" className="font-black text-[#042a22] hover:text-emerald-700">
                            Privacy Policy
                        </a>
                        .
                    </p>
                </div>
            </div>
        </div>
    );
}
