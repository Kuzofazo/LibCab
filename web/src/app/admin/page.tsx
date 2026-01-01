"use client";

import React, { useState, useEffect } from "react";
import { Users, Car, DollarSign, Activity, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDual } from "@/utils/currency";


export default function AdminDashboard() {
    const [statsData, setStatsData] = useState<any>(null);
    const [recentRides, setRecentRides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
        // Poll every 10 seconds
        const interval = setInterval(fetchDashboardData, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [statsRes, ridesRes] = await Promise.all([
                fetch("/api/admin/stats"),
                fetch("/api/rides")
            ]);
            const stats = await statsRes.json();
            const rides = await ridesRes.json();

            setStatsData(stats);
            setRecentRides(Array.isArray(rides) ? rides.slice(0, 5) : []);
        } catch (error) {
            console.error("Dashboard Load Error", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin h-12 w-12 text-red-600" />
            </div>
        );
    }

    const statsConfig = [
        { label: "Total Users", value: statsData?.totalUsers?.toLocaleString() || "0", icon: Users, color: "from-blue-500 to-blue-600" },
        { label: "Active Drivers", value: statsData?.activeDrivers?.toString() || "0", icon: Car, color: "from-green-500 to-green-600" },
        { label: "Total Revenue", value: statsData?.totalRevenue ? formatDual(statsData.totalRevenue) : "$0.00", icon: DollarSign, color: "from-purple-500 to-purple-600" },

        { label: "Pending Requests", value: statsData?.pendingRides?.toString() || "0", icon: Activity, color: "from-orange-500 to-orange-600" },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
                <p className="text-gray-600">Welcome to Paye Admin! Monitoring ride-sharing operations in real-time.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsConfig.map((stat, index) => (
                    <div key={index} className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                        <div className="relative">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    <stat.icon size={24} />
                                </div>
                            </div>
                            <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                            <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity Section */}
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-xl text-gray-900">Live Operations</h3>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Live
                        </span>
                    </div>
                    <div className="h-[400px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center text-gray-400 relative overflow-hidden">
                        <div className="relative text-center">
                            <TrendingUp size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="font-medium">Operations Activity</p>
                            <p className="text-sm text-gray-400">Database monitoring active</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-xl text-gray-900">Recent Rides</h3>
                        <Link href="/admin/dispatch" className="text-sm text-red-600 font-semibold hover:text-red-700">View All</Link>
                    </div>
                    <div className="space-y-3">
                        {recentRides.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-10">No recent rides found</p>
                        ) : recentRides.map((ride) => (
                            <div key={ride.id} className={`group flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer border ${ride.status === 'REQUESTED' ? 'bg-orange-50 border-orange-200' : 'hover:bg-gray-50 border-transparent hover:border-gray-200'}`}>
                                <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-700 group-hover:scale-110 transition-transform">
                                    {ride.rider?.name?.[0] || "R"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">{ride.rider?.name || "Unknown"}</p>
                                    <p className="text-xs text-gray-600 truncate"><span className="font-semibold">From:</span> {ride.originAddress}</p>
                                    <p className="text-xs text-gray-500 truncate">To: {ride.destAddress}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${ride.status === 'REQUESTED' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                    {ride.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-red-600 to-red-500 rounded-2xl p-8 text-white shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold mb-2">Need to dispatch a ride?</h3>
                        <p className="text-red-100">Quickly assign drivers to pending requests</p>
                    </div>
                    <Link href="/admin/dispatch" className="bg-white text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-all hover:scale-105 active:scale-95 shadow-lg">
                        Go to Dispatch
                    </Link>
                </div>
            </div>
        </div>
    );
}
