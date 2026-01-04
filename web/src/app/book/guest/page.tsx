"use strict";
"use client";

import React, { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
    Phone,
    MapPin,
    ArrowRight,
    Loader2,
    ShieldCheck,
    CreditCard,
    CheckCircle2
} from "lucide-react";

function GuestBookingContent() {
    const searchParams = useSearchParams();
    const [step, setStep] = useState(searchParams.get("pickup") || searchParams.get("destination") ? 3 : 1); // 1: Phone, 2: OTP, 3: Details, 4: Finding Driver
    const [loading, setLoading] = useState(false);
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [session, setSession] = useState(null);
    const [trip, setTrip] = useState({
        pickup: searchParams.get("pickup") || "",
        destination: searchParams.get("destination") || "",
        payment: searchParams.get("payment") || "CASH"
    });
    const [fareEstimate, setFareEstimate] = useState(3.50);

    // Dynamic Price Calculation
    useEffect(() => {
        if (trip.pickup && trip.destination) {
            // Mock logic: base fare + (length sum / 10)
            const base = 2.5;
            const distanceFactor = (trip.pickup.length + trip.destination.length) / 8;
            const paymentMultiplier = trip.payment === "STRIPE" ? 1.1 : 1.0;
            const total = (base + distanceFactor) * paymentMultiplier;
            setFareEstimate(parseFloat(total.toFixed(2)));
        }
    }, [trip.pickup, trip.destination, trip.payment]);

    const [rideId, setRideId] = useState<string | null>(null);
    const [driver, setDriver] = useState<any>(null);

    // Polling for Driver
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (step === 4 && rideId) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/rides/${rideId}`);
                    if (res.ok) {
                        const data = await res.json();
                        // Check if driver is assigned
                        if (data.driver || data.status === "ACCEPTED" || data.status === "IN_PROGRESS") {
                            setDriver(data.driver || { user: { name: "Driver Found" } }); // Fallback if driver obj is partial
                            // Optionally move to next step or show driver details
                            // For now, we update the UI in Step 4 to show "Driver Found!"
                        }
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [step, rideId]);

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

        if (!session) {
            alert("Please verify your phone number to complete the booking.");
            setStep(1);
            return;
        }

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
                setRideId(ride.id); // Save ride ID
                setStep(4);
            } else {
                const errData = await res.json();
                console.error("Ride request failed", errData);
                alert(`Failed to request ride: ${errData.details || errData.error}`);
            }
        } catch (err: any) {
            console.error(err);
            alert(`Error requesting ride: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex flex-col transition-colors duration-500 ${step === 4 ? "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500" : "bg-gray-50"}`}>
            {/* Header - Hide or change style when in Step 4 for immersion? Or keep it transparent? */}
            <div className={`p-4 shadow-sm border-b sticky top-0 z-10 transition-colors duration-500 ${step === 4 ? "bg-white/10 backdrop-blur-md border-white/20 text-white" : "bg-white border-gray-100"}`}>
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/libcab-logo.png" alt="LibCab" className={`h-20 w-auto ${step === 4 ? "brightness-0 invert" : ""}`} />
                        <span className={`font-medium text-sm ${step === 4 ? "text-white/80" : "text-gray-400"}`}>Guest</span>
                    </div>
                    {step < 4 && (
                        <div className="text-xs font-bold px-2 py-1 bg-gray-100 rounded-lg text-black">
                            Step {step} of 4
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6">
                <div className={`w-full max-w-md rounded-3xl overflow-hidden min-h-[400px] flex flex-col relative transition-all duration-500 ${step === 4 ? "bg-transparent shadow-none" : "bg-white shadow-xl"}`}>

                    {/* Progress Bar (Hidden in Step 4) */}
                    {step < 4 && (
                        <div className="h-1 bg-gray-100 w-full">
                            <div className="h-full bg-black transition-all duration-500 ease-out" style={{ width: `${step * 25}%` }} />
                        </div>
                    )}

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
                        <form onSubmit={handleRequestRide} className="p-8 flex-1 flex flex-col animate-in slide-in-from-right duration-300 overflow-y-auto">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold mb-1 text-gray-900">Where to?</h2>
                            </div>

                            <div className="space-y-4 flex-1">
                                <div className="relative">
                                    <div className="absolute left-4 top-3.5 text-green-600"><MapPin size={20} /></div>
                                    <input
                                        type="text"
                                        placeholder="Pickup Location"
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black outline-none transition-all"
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
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black outline-none transition-all"
                                        value={trip.destination}
                                        onChange={e => setTrip({ ...trip, destination: e.target.value })}
                                        required
                                    />
                                </div>

                                {/* Estimated Price Display */}
                                <div className="bg-gradient-to-r from-gray-50 to-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase">Estimated Fare</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-gray-900">${fareEstimate.toFixed(2)}</span>
                                            <span className="text-sm font-medium text-gray-500">/ L$ {(fareEstimate * 190).toFixed(0)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">Standard</div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Payment Method</label>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setTrip({ ...trip, payment: "CASH" })}
                                                className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${trip.payment === "CASH" ? "border-black bg-black text-white" : "border-gray-100 text-gray-400 hover:bg-gray-50 bg-white"}`}
                                            >
                                                <span>💵</span> Cash
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTrip({ ...trip, payment: "MOMO" })}
                                                className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${["MOMO", "MTN", "ORANGE", "TIPME"].includes(trip.payment) ? "border-yellow-400 bg-yellow-50 text-black" : "border-gray-100 text-gray-400 hover:bg-gray-50 bg-white"}`}
                                            >
                                                <span>📱</span> Mobile Pay
                                            </button>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setTrip({ ...trip, payment: "STRIPE" })}
                                                className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${trip.payment === "STRIPE" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-100 text-gray-400 hover:bg-gray-50 bg-white"}`}
                                            >
                                                <span>💳</span> Card
                                            </button>
                                        </div>

                                        {(["MOMO", "MTN", "ORANGE", "TIPME"].includes(trip.payment)) && (
                                            <div className="grid grid-cols-3 gap-2 animate-in slide-in-from-top-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setTrip({ ...trip, payment: "MTN" })}
                                                    className={`py-2 px-1 rounded-lg border-2 font-bold text-[10px] uppercase transition-all ${trip.payment === "MTN" ? "border-yellow-400 bg-yellow-400 text-black" : "border-gray-100 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 bg-white text-gray-500"}`}
                                                >
                                                    MTN MoMo
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setTrip({ ...trip, payment: "ORANGE" })}
                                                    className={`py-2 px-1 rounded-lg border-2 font-bold text-[10px] uppercase transition-all ${trip.payment === "ORANGE" ? "border-orange-500 bg-orange-500 text-white" : "border-gray-100 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 bg-white text-gray-500"}`}
                                                >
                                                    Orange
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setTrip({ ...trip, payment: "TIPME" })}
                                                    className={`py-2 px-1 rounded-lg border-2 font-bold text-[10px] uppercase transition-all ${trip.payment === "TIPME" ? "border-blue-400 bg-blue-400 text-white" : "border-gray-100 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 bg-white text-gray-500"}`}
                                                >
                                                    TipMe
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
                        <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500 text-white relative overflow-hidden">
                            {/* Decorative bubbles */}
                            <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

                            {!driver ? (
                                <>
                                    <div className="relative mb-8 mt-10">
                                        <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-25"></div>
                                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl relative z-10">
                                            <Loader2 size={40} className="animate-spin text-orange-500" />
                                        </div>
                                    </div>

                                    <h2 className="text-3xl font-black mb-2 drop-shadow-md">Connecting to Drivers...</h2>
                                    <p className="text-white/90 max-w-[240px] font-medium mb-8">We are looking for the nearest LibCab for you.</p>
                                </>
                            ) : (
                                <div className="animate-in slide-in-from-bottom-5 duration-500 w-full flex flex-col items-center">
                                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mb-6 relative">
                                        <div className="absolute bottom-0 right-0 bg-green-500 p-1.5 rounded-full border-4 border-white">
                                            <CheckCircle2 size={16} className="text-white" />
                                        </div>
                                        <span className="text-3xl">🚖</span>
                                    </div>
                                    <h2 className="text-3xl font-black mb-2 drop-shadow-md">Driver Found!</h2>
                                    <p className="text-white/90 mb-8 font-medium">{driver.user?.name} is on the way.</p>
                                </div>
                            )}

                            <div className="w-full max-w-[85%] bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 text-left mb-8 shadow-inner">
                                <div className="flex items-center gap-3 mb-3">
                                    {driver ? (
                                        <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,1)]" />
                                    ) : (
                                        <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse shadow-[0_0_8px_rgba(134,239,172,0.8)]" />
                                    )}
                                    <span className="text-xs font-bold text-white/80 uppercase tracking-wider">{driver ? "Driver Arriving" : "Ride Details"}</span>
                                </div>
                                <div className="font-bold text-lg mb-1">{trip.pickup}</div>
                                <div className="text-white/60 text-sm mb-2 flex items-center gap-2">
                                    <div className="h-[1px] w-4 bg-white/40"></div>
                                    <span className="text-xs">TO</span>
                                    <div className="h-[1px] w-4 bg-white/40"></div>
                                </div>
                                <div className="font-bold text-lg">{trip.destination}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function GuestBookingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
            <GuestBookingContent />
        </Suspense>
    );
}

