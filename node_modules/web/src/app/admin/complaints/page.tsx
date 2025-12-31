"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, AlertCircle, Clock, CheckCircle2, Search, Filter, User, MoreHorizontal, Loader2 } from "lucide-react";

export default function ComplaintsPage() {
    const [complaints, setComplaints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const res = await fetch("/api/admin/complaints");
            const data = await res.json();
            setComplaints(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Fetch failed", error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await fetch("/api/admin/complaints", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status }),
            });
            fetchComplaints();
        } catch (error) {
            console.error("Update failed", error);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "PENDING": return <Clock size={16} className="text-orange-500" />;
            case "RESOLVED": return <CheckCircle2 size={16} className="text-green-500" />;
            case "DISMISSED": return <AlertCircle size={16} className="text-gray-500" />;
            default: return null;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "HIGH": return "text-red-600 bg-red-50";
            case "MEDIUM": return "text-orange-600 bg-orange-50";
            case "LOW": return "text-blue-600 bg-blue-50";
            default: return "text-gray-600 bg-gray-50";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Complaint Resolution</h1>
                <p className="text-gray-500">Review and resolve issues reported by users.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-orange-50 text-orange-600 rounded-xl">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pending</p>
                        <h3 className="text-2xl font-bold">
                            {complaints.filter(c => c.status === "PENDING").length}
                        </h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-green-50 text-green-600 rounded-xl">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Resolved</p>
                        <h3 className="text-2xl font-bold">
                            {complaints.filter(c => c.status === "RESOLVED").length}
                        </h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-gray-50 text-gray-600 rounded-xl">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Dismissed</p>
                        <h3 className="text-2xl font-bold">
                            {complaints.filter(c => c.status === "DISMISSED").length}
                        </h3>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by ID or Subject..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-600 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm">
                                <th className="px-6 py-4 font-semibold">ID & User</th>
                                <th className="px-6 py-4 font-semibold">Subject</th>
                                <th className="px-6 py-4 font-semibold">Priority</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">Date</th>
                                <th className="px-6 py-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {complaints.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">No complaints found</td>
                                </tr>
                            ) : complaints.map((complaint) => (
                                <tr key={complaint.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-mono text-gray-400 truncate w-24">{complaint.id}</span>
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-gray-400" />
                                                <span className="font-medium text-gray-900">{complaint.user?.name || "Unknown"}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-bold uppercase">
                                                    {complaint.user?.role}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{complaint.subject}</p>
                                        <p className="text-xs text-gray-500 truncate max-w-xs">{complaint.message}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${getPriorityColor(complaint.priority)}`}>
                                            {complaint.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(complaint.status)}
                                            <span className="text-sm font-medium capitalize text-gray-700">{complaint.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(complaint.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            {complaint.status === "PENDING" && (
                                                <>
                                                    <button
                                                        onClick={() => updateStatus(complaint.id, "RESOLVED")}
                                                        className="text-xs font-bold text-green-600 hover:text-green-700 uppercase"
                                                    >
                                                        Resolve
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(complaint.id, "DISMISSED")}
                                                        className="text-xs font-bold text-red-600 hover:text-red-700 uppercase"
                                                    >
                                                        Dismiss
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
