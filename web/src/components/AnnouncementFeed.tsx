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
            case "PROMO": return <Megaphone size={18} className="text-purple-600" />;
            case "ALERT": return <AlertTriangle size={18} className="text-red-600" />;
            case "UPDATE": return <Info size={18} className="text-blue-600" />;
            default: return <Bell size={18} className="text-gray-600" />;
        }
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
                ))}
            </div>
        );
    }

    if (announcements.length === 0) {
        return (
            <div className="p-8 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                <Bell className="mx-auto text-gray-300 mb-3" size={32} />
                <p className="text-sm font-bold text-gray-400">No new announcements</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="font-black text-gray-900 flex items-center gap-2">
                    <Bell size={20} className="text-red-600" />
                    Latest Updates
                </h3>
            </div>

            <div className="space-y-3">
                {announcements.map((ann) => (
                    <div key={ann.id} className="group p-4 bg-white border border-gray-100 rounded-2xl hover:border-red-600 transition-all cursor-default shadow-sm hover:shadow-md">
                        <div className="flex gap-4">
                            <div className={`p-3 rounded-xl h-fit ${ann.type === "PROMO" ? "bg-purple-50" :
                                    ann.type === "ALERT" ? "bg-red-50" : "bg-blue-50"
                                }`}>
                                {getTypeIcon(ann.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-1">
                                    <h4 className="font-bold text-gray-900 truncate pr-2">{ann.title}</h4>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">
                                        {new Date(ann.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed font-medium">
                                    {ann.content}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button className="w-full py-4 text-xs font-black text-gray-400 hover:text-red-600 transition-colors uppercase tracking-widest flex items-center justify-center gap-1 group">
                View All Announcements
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );
}
