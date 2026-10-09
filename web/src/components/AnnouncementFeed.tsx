"use client";

import React, { useEffect, useState } from "react";
import { Bell, Megaphone, AlertTriangle, Info, Calendar, ChevronRight } from "lucide-react";

interface Announcement {
    id: string;
    title: string;
    content: string;
    type: "PROMO" | "ALERT" | "UPDATE";
    createdAt: string;
}

export default function AnnouncementFeed() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const res = await fetch("/api/announcements");
                const data = await res.json();
                if (Array.isArray(data)) {
                    setAnnouncements(data);
                }
            } catch (error) {
                console.error("Failed to fetch announcements", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnnouncements();
    }, []);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "PROMO": return <Megaphone size={18} className="text-purple-400" />;
            case "ALERT": return <AlertTriangle size={18} className="text-red-400" />;
            case "UPDATE": return <Info size={18} className="text-blue-400" />;
            default: return <Bell size={18} className="text-slate-400" />;
        }
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                {[1, 2].map(i => (
                    <div key={i} className="h-20 bg-white/5 rounded-2xl" />
                ))}
            </div>
        );
    }

    if (announcements.length === 0) {
        return (
            <div className="p-8 text-center bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 group hover:bg-white/10 transition-all">
                <Bell className="mx-auto text-slate-600 mb-3 group-hover:scale-110 transition-transform" size={32} />
                <p className="text-sm font-black text-slate-500 uppercase tracking-widest">No new updates</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-black text-white text-sm uppercase tracking-[0.2em] flex items-center gap-2">
                    <Bell size={16} className="text-red-500" />
                    Dispatch Feed
                </h3>
            </div>

            <div className="space-y-3">
                {announcements.map((ann) => (
                    <div key={ann.id} className="group p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-default">
                        <div className="flex gap-4">
                            <div className={`p-3 rounded-xl h-fit ${ann.type === "PROMO" ? "bg-purple-500/10" :
                                    ann.type === "ALERT" ? "bg-red-500/10" : "bg-blue-500/10"
                                }`}>
                                {getTypeIcon(ann.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-1">
                                    <h4 className="font-black text-white text-xs truncate pr-2 tracking-tight">{ann.title}</h4>
                                    <span className="text-[9px] font-black text-slate-500 uppercase whitespace-nowrap">
                                        {new Date(ann.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400 line-clamp-1 leading-relaxed font-bold">
                                    {ann.content}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button className="w-full py-2 text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-[0.2em] flex items-center justify-center gap-1 group mt-4">
                View History
                <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );
}
