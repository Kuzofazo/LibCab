"use client";

import React, { useState, useEffect } from "react";
import {
    Send,
    Bell,
    Plus,
    History,
    CheckCircle2,
    AlertTriangle,
    Info,
    Megaphone,
    Calendar,
    Clock
} from "lucide-react";

interface Announcement {
    id: string;
    title: string;
    content: string;
    type: "PROMO" | "ALERT" | "UPDATE";
    target: "ALL" | "RIDERS" | "DRIVERS";
    status: "SENT" | "SCHEDULED";
    createdAt: string;
}

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newAnn, setNewAnn] = useState({ title: "", content: "", type: "UPDATE", target: "ALL" });

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const res = await fetch("/api/admin/announcements");
            const data = await res.json();
            setAnnouncements(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Fetch failed", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        try {
            const res = await fetch("/api/admin/announcements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newAnn),
            });
            if (res.ok) {
                setIsCreating(false);
                setNewAnn({ title: "", content: "", type: "UPDATE", target: "ALL" });
                fetchAnnouncements();
            }
        } catch (error) {
            console.error("Post failed", error);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "PROMO": return <Megaphone size={18} className="text-purple-600" />;
            case "ALERT": return <AlertTriangle size={18} className="text-[#042a22]" />;
            case "UPDATE": return <Info size={18} className="text-blue-600" />;
            default: return <Bell size={18} className="text-gray-600" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#042a22]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Broadcast Announcements</h1>
                    <p className="text-gray-500">Send instant or scheduled notifications to riders and drivers.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-[#042a22] text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-900 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                >
                    <Plus size={20} />
                    New Announcement
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Stats */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Send size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Total Sent</p>
                            <h3 className="text-xl font-bold">{announcements.length}</h3>
                        </div>
                    </div>
                </div>

                {/* History List */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
                        <div className="p-4 border-b border-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <History size={18} />
                                Announcement History
                            </h2>
                        </div>

                        <div className="divide-y divide-gray-50">
                            {announcements.length === 0 ? (
                                <div className="p-10 text-center text-gray-500">No history found</div>
                            ) : announcements.map((ann) => (
                                <div key={ann.id} className="p-5 hover:bg-gray-50/50 transition-all flex flex-col md:flex-row gap-4">
                                    <div className={`p-3 rounded-2xl h-fit ${ann.type === "PROMO" ? "bg-purple-50" :
                                        ann.type === "ALERT" ? "bg-emerald-50" : "bg-blue-50"
                                        }`}>
                                        {getTypeIcon(ann.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-1">
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg leading-tight">{ann.title}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-700">{ann.target}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1">
                                                        <Calendar size={10} /> {new Date(ann.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            {ann.status === "SENT" ? (
                                                <CheckCircle2 className="text-green-500" size={18} />
                                            ) : (
                                                <Clock className="text-orange-400" size={18} />
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 font-medium mb-3">{ann.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 pb-4">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Draft Announcement</h2>
                                <button
                                    onClick={() => setIsCreating(false)}
                                    title="Close Modal"
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <Plus className="rotate-45" size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Free Rides This Friday!"
                                        className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-[#042a22] focus:bg-white outline-none transition-all font-bold text-gray-900"
                                        value={newAnn.title}
                                        onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Message</label>
                                    <textarea
                                        rows={4}
                                        placeholder="Enter notification content..."
                                        className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-[#042a22] focus:bg-white outline-none transition-all font-medium text-gray-900 resize-none"
                                        value={newAnn.content}
                                        onChange={(e) => setNewAnn({ ...newAnn, content: e.target.value })}
                                    ></textarea>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Target Audience</label>
                                        <select
                                            title="Select Target Audience"
                                            className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-[#042a22] focus:bg-white outline-none transition-all font-bold text-gray-900 appearance-none"
                                            value={newAnn.target}
                                            onChange={(e) => setNewAnn({ ...newAnn, target: e.target.value })}
                                        >
                                            <option value="ALL">All Users</option>
                                            <option value="RIDERS">Riders Only</option>
                                            <option value="DRIVERS">Drivers Only</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Message Type</label>
                                        <select
                                            title="Select Message Type"
                                            className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-[#042a22] focus:bg-white outline-none transition-all font-bold text-gray-900 appearance-none"
                                            value={newAnn.type}
                                            onChange={(e) => setNewAnn({ ...newAnn, type: e.target.value })}
                                        >
                                            <option value="PROMO">Promotion</option>
                                            <option value="ALERT">Alert</option>
                                            <option value="UPDATE">System Update</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 pt-4 flex gap-3">
                            <button
                                onClick={() => setIsCreating(false)}
                                className="flex-1 py-4 bg-gray-100 text-gray-600 font-black rounded-2xl hover:bg-gray-200 transition-all uppercase tracking-widest text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSend}
                                className="flex-[2] py-4 bg-[#042a22] text-white font-black rounded-2xl hover:bg-emerald-900 transition-all shadow-lg shadow-emerald-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                            >
                                <Send size={18} />
                                Send Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
