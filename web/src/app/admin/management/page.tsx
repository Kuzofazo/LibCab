"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, FileText, CheckCircle, XCircle } from "lucide-react";

interface Admin {
    id: string;
    name: string | null;
    email: string;
    role: string;
    isActive: boolean;
}

interface Log {
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
    dispatcherId: string;
    dispatcher?: {
        name: string | null;
    };
}


export default function AdminManagementPage() {
    const router = useRouter();
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

    // Form
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user.role === "SUPER_ADMIN") {
                setIsSuperAdmin(true);
                fetchAdmins();
                fetchLogs();
            } else {
                router.push("/admin");
            }
        } else {
            router.push("/login");
        }
    }, [router]);

    const fetchAdmins = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/admin/management", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAdmins(data.admins);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/admin/logs", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/admin/management", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name, email, phone, password, role: "ADMIN" })
            });

            if (res.ok) {
                alert("Admin created successfully! The admin must change their password on first login.");
                setShowCreateModal(false);
                setName("");
                setEmail("");
                setPhone("");
                setPassword("");
                fetchAdmins();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to create admin");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred");
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#042a22]" />
            </div>
        );
    }

    if (!isSuperAdmin) return null;

    const filteredLogs = selectedAdminId ? logs.filter(log => log.dispatcherId === selectedAdminId) : logs;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Admin Management</h2>
                    <p className="text-sm text-gray-500">Manage Second-Level Admins and view activity logs.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    title="Create New Admin"
                    aria-label="Create New Admin"
                    className="flex items-center gap-2 bg-[#042a22] hover:bg-emerald-900 text-white px-4 py-2 rounded-xl transition-colors font-semibold"
                >
                    <UserPlus size={18} />
                    <span>Create New Admin</span>
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-600">
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {admins.map((admin) => (
                                <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{admin.name || "N/A"}</td>
                                    <td className="px-6 py-4 text-gray-500">{admin.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${admin.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {admin.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {admin.isActive ? (
                                            <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                                <CheckCircle size={16} /> Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[#042a22] text-sm font-medium">
                                                 <XCircle size={16} /> Inactive
                                             </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => {
                                                setSelectedAdminId(admin.id);
                                                setShowLogsModal(true);
                                            }}
                                            title="View activity logs for this admin"
                                            aria-label="View activity logs"
                                            className="inline-flex items-center gap-1 text-sm text-[#042a22] hover:text-emerald-900 font-medium"
                                        >
                                            <FileText size={16} /> View Logs
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Admin Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900">Create New Admin</h3>
                            <button title="Close" aria-label="Close" onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    title="Full Name"
                                    placeholder="Enter full name"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-[#042a22] focus:border-[#042a22]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    title="Email Address"
                                    placeholder="Enter email address"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-[#042a22] focus:border-[#042a22]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    title="Phone Number"
                                    placeholder="Enter phone number"
                                    required
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-[#042a22] focus:border-[#042a22]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                                <input
                                    type="password"
                                    title="Temporary Password"
                                    placeholder="Enter temporary password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-[#042a22] focus:border-[#042a22]"
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    title="Cancel"
                                    aria-label="Cancel"
                                    className="px-4 py-2 font-medium text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    title="Create Admin"
                                    aria-label="Create Admin"
                                    className="px-4 py-2 font-medium text-white bg-[#042a22] hover:bg-emerald-900 rounded-xl transition-colors"
                                >
                                    Create Admin
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Logs Modal */}
            {showLogsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900">Admin Activity Logs</h3>
                            <button 
                                title="Close" 
                                aria-label="Close" 
                                onClick={() => { setShowLogsModal(false); setSelectedAdminId(null); }} 
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                            {filteredLogs.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No activity logs found for this admin.</p>
                            ) : (
                                <div className="space-y-4">
                                    {filteredLogs.map(log => (
                                        <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-[#042a22]">{log.action}</span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Admin: {log.dispatcher?.name || log.dispatcherId || "System"}
                                            </p>
                                            {log.details && (
                                                <p className="text-sm text-gray-500 mt-2 bg-gray-50 p-2 rounded-lg break-words">
                                                    {log.details}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
