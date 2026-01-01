"use strict";
"use client";

import React, { useState } from "react";
import {
    Phone,
    MapPin,
    ArrowRight,
    Loader2,
    ShieldCheck,
    CreditCard,
    CheckCircle2
} from "lucide-react";

export default function GuestBookingPage() {
    const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Details, 4: Finding Driver
    const [loading, setLoading] = useState(false);
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [session, setSession] = useState(null);
    const [trip, setTrip] = useState({
        pickup: "",
        destination: "",
        payment: "CASH"
    });

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/auth/otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone })
            });
            if (res.ok) {
                setStep(2);
            } else {
                alert("Failed to send code. Please try again.");
            }
        } catch (err) {
            alert("Error sending code");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/auth/guest-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, code: otp })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSession(data.sessionId);
                setStep(3);
            } else {
                alert("Invalid code");
            }
        } catch (err) {
            alert("Verification failed");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestRide = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/rides/guest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId: session,
                    pickup: trip.pickup,
                    destination: trip.destination,
                    payment: trip.payment
                })
            });

            if (res.ok) {
                const ride = await res.json();
                setStep(4);
            } else {
                alert("Failed to request ride");
            }
        } catch (err) {
            alert("Error requesting ride");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white p-4 shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <h1 className="font-black text-xl tracking-tight">LibCab <span className="text-gray-400 font-medium text-sm">Guest</span></h1>
                    <div className="text-xs font-bold px-2 py-1 bg-gray-100 rounded-lg">
                        Step {step} of 4
                    </div>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden min-h-[400px] flex flex-col relative">

                    {/* Progress Bar */}
                    <div className="h-1 bg-gray-100 w-full">
                        <div className="h-full bg-black transition-all duration-500 ease-out" style={{ width: `${step * 25}%` }} />
                    </div>

                    {/* Step 1: Phone */}
                    {step === 1 && (
                        <form onSubmit={handleSendOTP} className="p-8 flex-1 flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="mb-8 text-center">
                                <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Phone size={28} />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">What's your number?</h2>
                                <p className="text-gray-500 text-sm">We'll send you a fast code to verify you. No password needed.</p>
                            </div>

                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    placeholder="077 000 0000"
                                    className="w-full text-2xl font-bold placeholder:text-gray-300 border-b-2 border-gray-200 focus:border-black outline-none py-2 transition-colors"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    required
                                />
                            </div>

                            <button disabled={loading} className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="animate-spin" /> : <>Send Code <ArrowRight size={20} /></>}
                            </button>
                        </form>
                    )}

                    {/* Step 2: OTP */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyOTP} className="p-8 flex-1 flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="mb-8 text-center">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ShieldCheck size={28} />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Verify it's you</h2>
                                <p className="text-gray-500 text-sm">Enter the code we sent to <b>{phone}</b></p>
                            </div>

                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Secure Code (try 1234)</label>
                                <input
                                    type="text"
                                    placeholder="1234"
                                    className="w-full text-4xl font-black text-center tracking-widest placeholder:text-gray-200 border-2 border-gray-100 rounded-2xl focus:border-black outline-none py-4 transition-colors"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value)}
                                    maxLength={4}
                                    required
                                />
                            </div>

                            <button disabled={loading} className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="animate-spin" /> : "Verify & Continue"}
                            </button>
                        </form>
                    )}

                    {/* Step 3: Trip Details */}
                    {step === 3 && (
                        <form onSubmit={handleRequestRide} className="p-8 flex-1 flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold mb-1">Where to?</h2>
                            </div>

                            <div className="space-y-4 flex-1">
                                <div className="relative">
                                    <div className="absolute left-4 top-3.5 text-green-600"><MapPin size={20} /></div>
                                    <input
                                        type="text"
                                        placeholder="Pickup Location"
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:border-black outline-none transition-all"
                                        value={trip.pickup}
                                        onChange={e => setTrip({ ...trip, pickup: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="relative">
                                    <div className="absolute left-4 top-3.5 text-red-600"><MapPin size={20} /></div>
                                    <input
                                        type="text"
                                        placeholder="Destination"
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:border-black outline-none transition-all"
                                        value={trip.destination}
                                        onChange={e => setTrip({ ...trip, destination: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="pt-4">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Payment Method</label>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setTrip({ ...trip, payment: "CASH" })}
                                                className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${trip.payment === "CASH" ? "border-black bg-black text-white" : "border-gray-100 text-gray-400 hover:bg-gray-50"}`}
                                            >
                                                💵 Cash
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTrip({ ...trip, payment: "MOBILE_MONEY" })}
                                                className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${trip.payment !== "CASH" ? "border-green-600 bg-green-50 text-green-700" : "border-gray-100 text-gray-400 hover:bg-gray-50"}`}
                                            >
                                                📶 Mobile Money
                                            </button>
                                        </div>

                                        {trip.payment !== "CASH" && (
                                            <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setTrip({ ...trip, payment: "MTN" })}
                                                    className={`py-2 px-3 rounded-lg border-2 font-bold text-sm transition-all ${trip.payment === "MTN" ? "border-yellow-400 bg-yellow-50" : "border-gray-100 grayscale opacity-50 hover:grayscale-0 hover:opacity-100"}`}
                                                >
                                                    <div className="w-full h-8 bg-yellow-400 rounded flex items-center justify-center text-xs">MTN</div>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setTrip({ ...trip, payment: "ORANGE" })}
                                                    className={`py-2 px-3 rounded-lg border-2 font-bold text-sm transition-all ${trip.payment === "ORANGE" ? "border-orange-500 bg-orange-50" : "border-gray-100 grayscale opacity-50 hover:grayscale-0 hover:opacity-100"}`}
                                                >
                                                    <div className="w-full h-8 bg-orange-500 rounded flex items-center justify-center text-xs text-white">Orange</div>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button disabled={loading} className="w-full mt-6 py-4 bg-black text-white rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/10">
                                {loading ? <Loader2 className="animate-spin" /> : "Request Ride Now"}
                            </button>
                        </form>
                    )}

                    {/* Step 4: Finding Driver */}
                    {step === 4 && (
                        <div className="p-8 flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-20"></div>
                                <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg relative z-10">
                                    <Loader2 size={48} className="animate-spin text-black" />
                                </div>
                            </div>

                            <h2 className="text-2xl font-black mb-2">Connecting to Drivers...</h2>
                            <p className="text-gray-500 max-w-[200px]">We are looking for the nearest LibCab for you.</p>

                            <div className="mt-8 w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-left">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ride Details</span>
                                </div>
                                <div className="font-bold text-lg mb-1">{trip.pickup}</div>
                                <div className="text-gray-400 text-sm mb-2">to</div>
                                <div className="font-bold text-lg">{trip.destination}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

