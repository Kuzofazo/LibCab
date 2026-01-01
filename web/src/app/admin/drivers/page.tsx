"use client";

import React, { useState, useEffect } from "react";
import {
    Search,
    Filter,
    MoreHorizontal,
    Car,
    Star,
    TrendingUp,
    UserCheck,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Loader2
} from "lucide-react";

export default function DriversPage() {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newDriver, setNewDriver] = useState({
        name: "",
        email: "",
        phone: "",
        vehicle: "",
        licensePlate: "",
        driverLicense: "",
        issuedDate: "",
        expiryDate: "",
        dob: "",
        pob: "",
        country: "Liberia"
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDrivers();
    }, []);

    const fetchDrivers = async () => {
        try {
            const res = await fetch("/api/admin/drivers");
            const data = await res.json();
            setDrivers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Fetch failed", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "ONLINE":
                return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold ring-1 ring-green-200">ONLINE</span>;
            case "BUSY":
                return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold ring-1 ring-blue-200">ON TRIP</span>;
            case "OFFLINE":
                return <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold ring-1 ring-gray-200">OFFLINE</span>;
            default:
                return null;
        }
    };

    const handleAddDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/admin/drivers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newDriver)
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Failed to add driver");
                setLoading(false);
                return;
            }

            await fetchDrivers(); // Refresh list from backend
            setIsAddModalOpen(false);
            setNewDriver({
                name: "",
                email: "",
                phone: "",
                vehicle: "",
                licensePlate: "",
                driverLicense: "",
                issuedDate: "",
                expiryDate: "",
                dob: "",
                pob: "",
                country: "Liberia"
            });
            alert("Driver added successfully!");
        } catch (error) {
            console.error(error);
            alert("An error occurred");
        } finally {
            setLoading(false);
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Fleet & Driver Management</h1>
                    <p className="text-gray-500">Monitor and manage your vehicle fleet and driver performance.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                >
                    <UserCheck size={20} />
                    Add New Driver
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Car size={20} /></div>
                    </div>
                    <p className="text-sm font-medium text-gray-500">Total Drivers</p>
                    <h3 className="text-2xl font-bold text-gray-900">{drivers.length}</h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Star size={20} /></div>
                    </div>
                    <p className="text-sm font-medium text-gray-500">Avg. Rating</p>
                    <h3 className="text-2xl font-bold text-gray-900">
                        {(drivers.reduce((acc, curr) => acc + curr.rating, 0) / (drivers.length || 1)).toFixed(1)}
                    </h3>
                </div>
            </div>

            {/* Drivers List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-1 w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, vehicle, or license plate..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-transparent rounded-xl focus:ring-2 focus:ring-red-100 focus:bg-white focus:border-red-600 outline-none transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 text-gray-500 text-xs font-black uppercase tracking-wider">
                                <th className="px-6 py-4">Driver & Vehicle</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Rating</th>
                                <th className="px-6 py-4 text-center">Joined Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {drivers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No drivers found</td>
                                </tr>
                            ) : drivers.map((driver) => (
                                <tr key={driver.id} className="hover:bg-gray-50/50 transition-all group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 font-bold">
                                                {driver.name ? driver.name[0] : "D"}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900">{driver.name || "Unnamed"}</span>
                                                    <span className="text-[10px] font-black text-gray-400 font-mono tracking-tighter truncate w-20">{driver.id}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <p className="text-xs text-gray-600 font-medium">{driver.vehicle}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{driver.licensePlate}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {getStatusBadge(driver.status)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Star size={14} className="text-orange-400 fill-orange-400" />
                                            <span className="font-bold text-gray-900">{driver.rating}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-gray-500">
                                        {driver.joinedDate}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
                                            <MoreHorizontal size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 bg-gray-50/30 border-t border-gray-50 flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-400">Total: {drivers.length} drivers</p>
                </div>
            </div>

            {/* Add Driver Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Add New Driver</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddDriver} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border rounded-xl"
                                        value={newDriver.name}
                                        onChange={e => setNewDriver({ ...newDriver, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full px-4 py-2 border rounded-xl"
                                        value={newDriver.email}
                                        onChange={e => setNewDriver({ ...newDriver, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    required
                                    className="w-full px-4 py-2 border rounded-xl"
                                    value={newDriver.phone}
                                    onChange={e => setNewDriver({ ...newDriver, phone: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Vehicle Model</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Toyota Corolla"
                                        className="w-full px-4 py-2 border rounded-xl"
                                        value={newDriver.vehicle}
                                        onChange={e => setNewDriver({ ...newDriver, vehicle: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">License Plate</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border rounded-xl"
                                        value={newDriver.licensePlate}
                                        onChange={e => setNewDriver({ ...newDriver, licensePlate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Add Driver</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
