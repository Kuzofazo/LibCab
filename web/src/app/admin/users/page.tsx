"use client";

import React, { useEffect, useState } from "react";
import { Search, Filter, MoreVertical, Edit, Trash, Ban, UserPlus, Download } from "lucide-react";

interface User {
    id: string;
    name: string | null;
    email: string;
    role: string;
    createdAt: string;
    status?: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchUsers() {
            try {
                const res = await fetch("/api/users");
                if (!res.ok) throw new Error("Failed");
                const data = await res.json();
                const usersWithStatus = data.map((u: any) => ({ ...u, status: "Active" }));
                setUsers(usersWithStatus);
            } catch (error) {
                console.error("Failed to fetch users", error);
            } finally {
                setLoading(false);
            }
        }
        fetchUsers();
    }, []);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: "", email: "", role: "RIDER" });

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...newUser,
                    password: "User123!" // Default password for admin-created users
                })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Failed");
                return;
            }

            // Refresh list (re-fetch)
            const created = await res.json();
            // Optimistic update or refetch. Let's trigger a refetch or simple state add.
            // Since we need the ID and full object, using the 'created' one is good.
            // But to get the proper "status" field which is mocked in fetch, let's just refetch.
            // For now, let's manually add to state to save a network call, assuming 'Active' status.

            setUsers([{ ...created, status: "Active" }, ...users]);
            setIsAddModalOpen(false);
            setNewUser({ name: "", email: "", role: "RIDER" });
            alert("User added successfully!");
        } catch (error) {
            console.error(error);
            alert("Failed to add user");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
                    <p className="text-gray-600 mt-1">Manage riders and drivers across the platform</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-bold hover:from-red-700 hover:to-red-600 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-500/30"
                >
                    <UserPlus size={20} />
                    Add User
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Active Drivers</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{users.filter(u => u.role === "DRIVER").length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Riders</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{users.filter(u => u.role === "RIDER").length}</p>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium">
                                <Filter size={20} />
                                Filter
                            </button>
                            <button className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium">
                                <Download size={20} />
                                Export
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 text-left text-sm text-gray-500 bg-gray-50">
                                <th className="py-4 px-6 font-semibold">User</th>
                                <th className="py-4 px-6 font-semibold">Role</th>
                                <th className="py-4 px-6 font-semibold">Status</th>
                                <th className="py-4 px-6 font-semibold">Joined</th>
                                <th className="py-4 px-6 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                                                <Search className="text-gray-400" size={32} />
                                            </div>
                                            <p className="font-semibold">No users found</p>
                                            <p className="text-sm">Try adjusting your search or filters</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : users.map((user) => (
                                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                                                {(user.name || "U").charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{user.name || "Unnamed"}</p>
                                                <p className="text-sm text-gray-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${user.role === "DRIVER"
                                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                                            : user.role === "ADMIN"
                                                ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white"
                                                : "bg-gray-100 text-gray-700"
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                            Active
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-gray-600 font-medium text-sm">
                                        {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors" title="Edit">
                                                <Edit size={16} />
                                            </button>
                                            <button className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors" title="Ban">
                                                <Ban size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {users.length > 0 && (
                    <div className="p-6 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            Showing <span className="font-semibold">1-{users.length}</span> of <span className="font-semibold">{users.length}</span> users
                        </p>
                        <div className="flex gap-2">
                            <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50" disabled>
                                Previous
                            </button>
                            <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50" disabled>
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Add New User</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="px-3 py-1 hover:bg-gray-100 rounded-full font-bold">✕</button>
                        </div>
                        <form onSubmit={handleAddUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border rounded-xl"
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-2 border rounded-xl"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
                                <select
                                    className="w-full px-4 py-2 border rounded-xl bg-white"
                                    value={newUser.role}
                                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                >
                                    <option value="RIDER">Rider</option>
                                    <option value="DRIVER">Driver</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
