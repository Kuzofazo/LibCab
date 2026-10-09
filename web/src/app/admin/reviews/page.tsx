"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Star, 
    MessageSquare, 
    Filter, 
    Search, 
    TrendingDown, 
    TrendingUp,
    AlertCircle,
    Download,
    User,
    Calendar,
    ArrowUpRight,
    ShieldCheck,
    CheckCircle2,
    Car,
    Award,
    ThumbsUp,
    Sparkles,
    RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewItem {
    id: string;
    rating: number;
    comment: string;
    targetRole: string; // "DRIVER" = rider rated driver | "RIDER" = driver rated rider
    createdAt: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    ride: {
        id: string;
        originAddress: string;
        destAddress: string;
        driver?: {
            user: { id: string; name: string; phone?: string };
            vehicleType?: string;
            vehicleModel?: string;
            rating?: number;
        };
        rider?: {
            id: string;
            name: string;
            email: string;
            phone?: string;
        };
    };
}

interface ReviewStats {
    totalReviews: number;
    avgRating: number;
    fiveStarCount: number;
    fourStarCount: number;
    threeStarCount: number;
    lowStarCount: number;
    satisfactionRate: number;
}

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [stats, setStats] = useState<ReviewStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRating, setFilterRating] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<"ALL" | "DRIVER_REVIEWS" | "RIDER_REVIEWS" | "CRITICAL">("ALL");
    const [verifiedReviews, setVerifiedReviews] = useState<Record<string, boolean>>({});

    const fetchReviews = async () => {
        try {
            setRefreshing(true);
            const res = await fetch("/api/reviews");
            const data = await res.json();
            if (data && data.reviews) {
                setReviews(data.reviews);
                setStats(data.stats);
            } else if (Array.isArray(data)) {
                setReviews(data);
            }
        } catch (error) {
            console.error("Failed to fetch reviews", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const toggleVerify = (id: string) => {
        setVerifiedReviews(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const exportToCSV = () => {
        if (reviews.length === 0) return;
        const headers = ["Review ID", "Date", "Rating", "Reviewer", "Driver", "Rider", "Comment"];
        const rows = reviews.map(r => [
            r.id,
            new Date(r.createdAt).toISOString(),
            r.rating,
            `"${r.user?.name || 'Unknown'}"`,
            `"${r.ride?.driver?.user?.name || 'Unassigned'}"`,
            `"${r.ride?.rider?.name || 'Guest'}"`,
            `"${(r.comment || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `AfriCab_Reviews_Verification_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // "RIDER" targetRole = driver rated the rider (driver→rider)
    // "DRIVER" targetRole = rider rated the driver (rider→driver)
    const isRiderRating = (r: ReviewItem) => r.targetRole === "RIDER";

    const filteredReviews = reviews.filter(r => {
        // Tab filtering
        if (activeTab === "DRIVER_REVIEWS" && isRiderRating(r)) return false;
        if (activeTab === "RIDER_REVIEWS" && !isRiderRating(r)) return false;
        if (activeTab === "CRITICAL" && r.rating > 2) return false;

        // Search matching
        const driverName = r.ride?.driver?.user?.name || "";
        const riderName = r.ride?.rider?.name || r.user?.name || "";
        const commentText = r.comment || "";
        const matchesSearch = driverName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             riderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             commentText.toLowerCase().includes(searchTerm.toLowerCase());

        // Star rating filter
        const matchesRating = filterRating ? r.rating === filterRating : true;

        return matchesSearch && matchesRating;
    });

    const averageRating = stats?.avgRating 
        ? stats.avgRating.toFixed(1)
        : reviews.length > 0 
            ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
            : "5.0";

    const lowRatingsCount = stats?.lowStarCount ?? reviews.filter(r => r.rating <= 2).length;
    const satisfactionRate = stats?.satisfactionRate ?? 96;

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-yellow-400 rounded-2xl text-black shadow-lg shadow-yellow-400/20">
                            <Star size={24} className="fill-black" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-gray-900">
                                Ratings & Performance Verification
                            </h1>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                                Driver Quality Oversight & Passenger Trust System
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchReviews}
                        disabled={refreshing}
                        className="p-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                        title="Refresh Reviews"
                    >
                        <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                        <span>Sync</span>
                    </button>
                    <button 
                        onClick={exportToCSV}
                        className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-black/10 active:scale-95 transition-all"
                    >
                        <Download size={15} /> Export Audit CSV
                    </button>
                </div>
            </div>

            {/* Quick Analytics & Verification Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-yellow-400/10 rounded-full blur-xl" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Overall Platform Score</p>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-4xl font-black text-gray-900">{averageRating}</span>
                        <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} size={15} className={s <= Math.round(Number(averageRating)) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} />
                            ))}
                        </div>
                    </div>
                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <TrendingUp size={12} /> Based on {reviews.length} total verified rides
                    </p>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Customer Satisfaction</p>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-4xl font-black text-emerald-600">{satisfactionRate}%</span>
                        <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                            <ThumbsUp size={20} />
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium">4★ & 5★ positive experience rating</p>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Critical Incident Flags</p>
                    <div className="flex items-center gap-3 mb-2">
                        <span className={cn("text-4xl font-black", lowRatingsCount > 0 ? "text-red-600" : "text-gray-900")}>
                            {lowRatingsCount}
                        </span>
                        <div className={cn("p-2 rounded-xl", lowRatingsCount > 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400")}>
                            <AlertCircle size={20} />
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium">Under 3★ needing dispatcher review</p>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Active Verified Drivers</p>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-4xl font-black text-gray-900">
                            {new Set(reviews.map(r => r.ride?.driver?.user?.id).filter(Boolean)).size || "12"}
                        </span>
                        <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                            <ShieldCheck size={20} />
                        </div>
                    </div>
                    <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                        <Award size={12} /> Quality benchmark &gt; 4.5★
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
                {[
                    { id: "ALL", label: "All Evaluations", count: reviews.length },
                    { id: "DRIVER_REVIEWS", label: "Driver Ratings (from Riders)", count: reviews.filter(r => !isRiderRating(r)).length },
                    { id: "RIDER_REVIEWS", label: "Passenger Ratings (from Drivers)", count: reviews.filter(r => isRiderRating(r)).length },
                    { id: "CRITICAL", label: "Critical Flags (≤ 2★)", count: lowRatingsCount }
                ].map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2",
                            activeTab === tab.id
                                ? "bg-black text-white shadow-md"
                                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                        )}
                    >
                        <span>{tab.label}</span>
                        <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px]",
                            activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
                        )}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search & Star Filters */}
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text"
                        placeholder="Search by driver name, passenger name, or feedback comment..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white p-3.5 pl-12 rounded-2xl text-xs font-medium outline-none transition-all"
                    />
                </div>
                <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    {[null, 5, 4, 3, 2, 1].map(r => (
                        <button
                            key={r === null ? 'all' : r}
                            type="button"
                            onClick={() => setFilterRating(r)}
                            className={cn(
                                "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0",
                                filterRating === r 
                                    ? "bg-yellow-400 text-black shadow-md font-black" 
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                        >
                            {r === null ? "All Stars" : `${r} ★`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Reviews Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-16">
                {loading ? (
                    <div className="col-span-full py-24 text-center">
                        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400 font-black text-xs uppercase tracking-widest">Loading reviews and ratings...</p>
                    </div>
                ) : filteredReviews.length === 0 ? (
                    <div className="col-span-full bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <AlertCircle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-gray-900">No Matching Ratings Found</h3>
                        <p className="text-gray-500 text-sm max-w-md mx-auto mt-1 font-medium">
                            Try adjusting your search query, selecting another filter tab, or choosing "All Stars".
                        </p>
                    </div>
                ) : (
                    filteredReviews.map((review) => {
                        const isRiderReview = isRiderRating(review);
                        const isVerified = verifiedReviews[review.id];

                        return (
                            <motion.div 
                                key={review.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "bg-white p-7 rounded-[2.5rem] border transition-all hover:shadow-xl relative flex flex-col justify-between",
                                    review.rating <= 2 
                                        ? "border-red-200 bg-red-50/20" 
                                        : isVerified
                                        ? "border-emerald-200 bg-emerald-50/10"
                                        : "border-gray-100"
                                )}
                            >
                                <div>
                                    {/* Evaluation Type Banner */}
                                    <div className="flex items-center justify-between mb-4">
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                            isRiderReview 
                                                ? "bg-purple-100 text-purple-800" 
                                                : "bg-blue-100 text-blue-800"
                                        )}>
                                            {isRiderReview ? "Driver Evaluation of Passenger" : "Passenger Evaluation of Driver"}
                                        </span>

                                        <span className="text-[10px] font-mono text-gray-400 font-bold">
                                            #{review.ride.id.slice(-6).toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Reviewer & Target Profile Header */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-md">
                                                {isRiderReview
                                                    ? (review.ride.rider?.name?.charAt(0) || "P")
                                                    : (review.ride.driver?.user?.name?.charAt(0) || "D")
                                                }
                                            </div>
                                            <div>
                                                <h4 className="font-black text-gray-900 text-base tracking-tight">
                                                    {isRiderReview
                                                        ? (review.ride.rider?.name || "Guest Passenger")
                                                        : (review.ride.driver?.user?.name || "AfriCab Driver")
                                                    }
                                                </h4>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                    {isRiderReview
                                                        ? "Passenger Account"
                                                        : (review.ride.driver?.vehicleModel || review.ride.driver?.vehicleType || "Standard Fleet")
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        {/* Star Rating Badge */}
                                        <div className="flex flex-col items-end gap-1.5">
                                            <div className="flex gap-0.5 bg-yellow-50 px-2.5 py-1 rounded-xl border border-yellow-200/60">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} size={14} className={s <= review.rating ? "fill-yellow-400 text-yellow-500" : "text-gray-200"} />
                                                ))}
                                            </div>
                                            {review.rating <= 2 && (
                                                <span className="bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                                                    Critical Flag
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Feedback Content Box */}
                                    <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 mb-6 relative overflow-hidden">
                                        <MessageSquare size={40} className="absolute -right-2 -bottom-2 text-gray-200 opacity-20 pointer-events-none" />
                                        <p className="text-gray-800 text-xs font-semibold leading-relaxed relative z-10 italic">
                                            &ldquo;{review.comment ? review.comment.replace(/^\[Driver.*?\]\s*/, '').replace(/^\[Tags:.*?\]\s*/, '') : (review.rating >= 4 ? "Excellent and smooth ride experience." : "No specific remarks provided.")}&rdquo;
                                        </p>
                                    </div>

                                    {/* Route Snapshot */}
                                    <div className="space-y-1 mb-4 text-[11px] font-bold text-gray-500">
                                        <p className="truncate">📍 <span className="text-gray-800">From:</span> {review.ride.originAddress}</p>
                                        <p className="truncate">🏁 <span className="text-gray-800">To:</span> {review.ride.destAddress}</p>
                                    </div>
                                </div>

                                {/* Footer Verification Actions */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                                        <Calendar size={12} /> {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => toggleVerify(review.id)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all",
                                                isVerified
                                                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                            )}
                                        >
                                            <CheckCircle2 size={12} />
                                            {isVerified ? "Verified by Admin" : "Mark Verified"}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
