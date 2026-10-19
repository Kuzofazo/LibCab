"use client";

import React, { useState } from "react";
import { 
    X, 
    Smartphone, 
    Wallet, 
    Briefcase, 
    FileText, 
    Shirt, 
    Key, 
    HelpCircle, 
    CheckCircle2, 
    AlertCircle,
    Send,
    ShieldAlert,
    Camera
} from "lucide-react";

interface LostItemReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    rideId: string;
    rideDetails?: {
        bookingReference?: string;
        pickup?: string;
        destination?: string;
        driverName?: string;
        vehicleInfo?: string;
        licensePlate?: string;
        date?: string;
    };
    userPhone?: string;
    userName?: string;
    onSuccess?: (report: any) => void;
}

const CATEGORIES = [
    { id: "PHONE", label: "Phone", icon: Smartphone },
    { id: "WALLET", label: "Wallet / Purse", icon: Wallet },
    { id: "BAG", label: "Bag / Backpack", icon: Briefcase },
    { id: "DOCUMENTS", label: "Documents", icon: FileText },
    { id: "CLOTHING", label: "Clothing / Jacket", icon: Shirt },
    { id: "KEYS", label: "Keys", icon: Key },
    { id: "OTHER", label: "Other Item", icon: HelpCircle },
];

export default function LostItemReportModal({
    isOpen,
    onClose,
    rideId,
    rideDetails,
    userPhone,
    userName,
    onSuccess
}: LostItemReportModalProps) {
    const [selectedCategory, setSelectedCategory] = useState("PHONE");
    const [description, setDescription] = useState("");
    const [contactPhone, setContactPhone] = useState(userPhone || "");
    const [contactName, setContactName] = useState(userName || "");
    const [photoUrl, setPhotoUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submittedCase, setSubmittedCase] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim() || !contactPhone.trim()) {
            setError("Please provide a description of the missing item and a contact phone number.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/support/lost-items", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    rideId,
                    category: selectedCategory,
                    description: description.trim(),
                    contactPhone: contactPhone.trim(),
                    contactName: contactName.trim() || "Passenger",
                    itemPhotoUrl: photoUrl.trim() || null
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to submit lost item report.");
            }

            const data = await res.json();
            setSubmittedCase(data);
            if (onSuccess) onSuccess(data);
        } catch (err: any) {
            setError(err.message || "An error occurred while submitting your report.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[350] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden my-6">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                            🎒
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-950">Report a Lost Item</h3>
                            <p className="text-xs text-slate-500">AfriCab Safe Recovery Support</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {submittedCase ? (
                    /* Success Screen */
                    <div className="p-6 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto">
                            <CheckCircle2 size={36} />
                        </div>
                        <div>
                            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Case Created</span>
                            <h4 className="text-2xl font-black text-slate-950 tracking-tight">Report Logged Successfully</h4>
                            <div className="mt-2 inline-block bg-slate-100 px-4 py-1.5 rounded-xl border border-slate-200">
                                <span className="text-xs text-slate-500 font-bold mr-2">Case Reference:</span>
                                <span className="text-sm font-mono font-black text-slate-950">{submittedCase.reference}</span>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                            Our support team has been notified. We will securely contact the driver to verify if your item was left in the vehicle and coordinate recovery.
                        </p>

                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-1">
                            <p className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                                <ShieldAlert size={15} /> Driver Contact Protection
                            </p>
                            <p className="text-[11px] text-amber-800">
                                For safety, your direct contact details are handled confidentially through AfriCab dispatch.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    /* Submission Form */
                    <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
                        {/* Associated Ride Summary */}
                        {rideDetails && (
                            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1">
                                <div className="flex items-center justify-between font-bold text-slate-700">
                                    <span>Trip Ref: {rideDetails.bookingReference || rideId.slice(0, 8)}</span>
                                    {rideDetails.date && <span className="text-slate-500">{rideDetails.date}</span>}
                                </div>
                                <p className="text-slate-500 truncate">
                                    Driver: <span className="font-bold text-slate-800">{rideDetails.driverName || "AfriCab Driver"}</span>
                                    {rideDetails.licensePlate && ` (${rideDetails.licensePlate})`}
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Category Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-600">Select Item Category</label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {CATEGORIES.map((cat) => {
                                    const Icon = cat.icon;
                                    const isSelected = selectedCategory === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                                                isSelected
                                                    ? "bg-slate-950 text-white border-slate-950 shadow-md ring-2 ring-slate-950"
                                                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                            }`}
                                        >
                                            <Icon size={18} />
                                            <span className="text-[10px] font-bold leading-tight">{cat.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                                Description &amp; Details <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                rows={3}
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the item (color, brand, case, where it might have been sitting e.g. back seat, trunk)..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs outline-none focus:border-slate-900 text-slate-900 placeholder:text-slate-400"
                            />
                        </div>

                        {/* Contact Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                                    Contact Phone <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    placeholder="+231 88 123 4567"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-slate-900 text-slate-900"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-600">Passenger Name</label>
                                <input
                                    type="text"
                                    value={contactName}
                                    onChange={(e) => setContactName(e.target.value)}
                                    placeholder="Your full name"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-slate-900 text-slate-900"
                                />
                            </div>
                        </div>

                        {/* Optional Photo URL */}
                        <div className="space-y-1">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                <Camera size={13} /> Photo URL (Optional)
                            </label>
                            <input
                                type="url"
                                value={photoUrl}
                                onChange={(e) => setPhotoUrl(e.target.value)}
                                placeholder="https://... (image link of similar item)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-slate-900 text-slate-900"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-4 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                        >
                            {submitting ? (
                                "Submitting Report..."
                            ) : (
                                <>
                                    <Send size={15} /> Submit Lost Item Report
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
