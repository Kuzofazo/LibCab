"use client";

import React, { useState, useEffect } from "react";
import { 
    X, 
    Home, 
    Briefcase, 
    MapPin, 
    Plus, 
    Trash2, 
    Edit2, 
    Check, 
    Heart, 
    GraduationCap, 
    Star,
    Navigation
} from "lucide-react";

export interface SavedPlaceItem {
    id: string;
    label: string;
    address: string;
    lat: number;
    lng: number;
    icon?: string;
}

interface SavedPlacesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPlace?: (place: SavedPlaceItem, target: "pickup" | "destination") => void;
    targetField?: "pickup" | "destination";
}

export default function SavedPlacesModal({
    isOpen,
    onClose,
    onSelectPlace,
    targetField = "destination"
}: SavedPlacesModalProps) {
    const [places, setPlaces] = useState<SavedPlaceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formLabel, setFormLabel] = useState("");
    const [formAddress, setFormAddress] = useState("");
    const [formIcon, setFormIcon] = useState("map-pin");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPlaces = async () => {
        setLoading(true);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/users/saved-places", {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });
            if (res.ok) {
                const data = await res.json();
                setPlaces(data);
            }
        } catch (err) {
            console.error("Failed to load saved places:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchPlaces();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSavePlace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formLabel.trim() || !formAddress.trim()) {
            setError("Label and Address are required.");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            if (editingId) {
                // Update
                const res = await fetch("/api/users/saved-places", {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        id: editingId,
                        label: formLabel.trim(),
                        address: formAddress.trim(),
                        icon: formIcon
                    })
                });
                if (!res.ok) throw new Error("Failed to update place");
            } else {
                // Create
                const res = await fetch("/api/users/saved-places", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        label: formLabel.trim(),
                        address: formAddress.trim(),
                        icon: formIcon,
                        lat: 6.3156,
                        lng: -10.8074
                    })
                });
                if (!res.ok) throw new Error("Failed to save place");
            }

            setFormLabel("");
            setFormAddress("");
            setFormIcon("map-pin");
            setIsAdding(false);
            setEditingId(null);
            fetchPlaces();
        } catch (err: any) {
            setError(err.message || "Failed to save place.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to remove this saved place?")) return;
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            await fetch(`/api/users/saved-places?id=${id}`, {
                method: "DELETE",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });
            fetchPlaces();
        } catch (err) {
            console.error("Delete place error:", err);
        }
    };

    const handleStartEdit = (place: SavedPlaceItem) => {
        setEditingId(place.id);
        setFormLabel(place.label);
        setFormAddress(place.address);
        setFormIcon(place.icon || "map-pin");
        setIsAdding(true);
    };

    const renderIcon = (icon?: string) => {
        switch (icon) {
            case "home":
                return <Home size={16} className="text-blue-500" />;
            case "briefcase":
                return <Briefcase size={16} className="text-amber-500" />;
            case "heart":
                return <Heart size={16} className="text-rose-500" />;
            case "graduation-cap":
                return <GraduationCap size={16} className="text-purple-500" />;
            case "star":
                return <Star size={16} className="text-amber-400 fill-amber-400" />;
            default:
                return <MapPin size={16} className="text-emerald-500" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[350] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden my-6">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                            📍
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-950">Saved Places</h3>
                            <p className="text-xs text-slate-500">Quick shortcuts for 1-tap bookings</p>
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

                <div className="p-5 space-y-4">
                    {/* Add / Edit Form */}
                    {isAdding ? (
                        <form onSubmit={handleSavePlace} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                                    {editingId ? "Edit Saved Place" : "Add New Saved Place"}
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => { setIsAdding(false); setEditingId(null); }}
                                    className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                                >
                                    Cancel
                                </button>
                            </div>

                            {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}

                            <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-1">Place Name / Label</label>
                                <input
                                    type="text"
                                    required
                                    value={formLabel}
                                    onChange={(e) => setFormLabel(e.target.value)}
                                    placeholder="e.g. Home, Work, School, Family..."
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-slate-900 text-slate-900"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-1">Full Street Address</label>
                                <input
                                    type="text"
                                    required
                                    value={formAddress}
                                    onChange={(e) => setFormAddress(e.target.value)}
                                    placeholder="e.g. 24th Street, Sinkor, Monrovia"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-slate-900 text-slate-900"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-1">Icon Style</label>
                                <div className="flex gap-2">
                                    {[
                                        { id: "home", label: "Home" },
                                        { id: "briefcase", label: "Work" },
                                        { id: "heart", label: "Family" },
                                        { id: "graduation-cap", label: "School" },
                                        { id: "map-pin", label: "Place" },
                                    ].map((ic) => (
                                        <button
                                            key={ic.id}
                                            type="button"
                                            onClick={() => setFormIcon(ic.id)}
                                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                                formIcon === ic.id
                                                    ? "bg-slate-900 text-white border-slate-900"
                                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                            }`}
                                        >
                                            {ic.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                            >
                                {saving ? "Saving..." : (editingId ? "Update Place" : "Save Place")}
                            </button>
                        </form>
                    ) : (
                        <button
                            type="button"
                            onClick={() => { setIsAdding(true); setEditingId(null); setFormLabel(""); setFormAddress(""); }}
                            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border border-dashed border-slate-300"
                        >
                            <Plus size={15} /> Add New Favorite Place
                        </button>
                    )}

                    {/* Places List */}
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {loading ? (
                            <div className="py-8 text-center text-xs text-slate-400 animate-pulse font-bold">
                                Loading saved locations...
                            </div>
                        ) : places.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-500">
                                No saved places yet. Click &quot;Add New Favorite Place&quot; to save Home, Work, or favorite destinations for quick 1-tap bookings!
                            </div>
                        ) : (
                            places.map((place) => (
                                <div
                                    key={place.id}
                                    className="p-3.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 transition-colors group"
                                >
                                    <div
                                        onClick={() => {
                                            if (onSelectPlace) {
                                                onSelectPlace(place, targetField);
                                                onClose();
                                            }
                                        }}
                                        className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0 mt-0.5">
                                            {renderIcon(place.icon)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-black text-slate-950 truncate">{place.label}</h4>
                                                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                                                    1-Tap Select
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{place.address}</p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleStartEdit(place)}
                                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(place.id)}
                                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 flex items-center justify-center transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
