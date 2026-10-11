"use client";

import React, { useEffect, useState } from "react";
import { 
    Search, Edit, Trash, Ban, 
    UserPlus, Download, CheckCircle, Loader2,
    Car, User as UserIcon, Phone, Mail, CreditCard, ShieldCheck
} from "lucide-react";
import { useRouter } from "next/navigation";

interface DriverProfile {
    id: string;
    vehicleType: string | null;
    vehicleModel: string | null;
    vehicleColor: string | null;
    licensePlate: string | null;
    driverLicense: string | null;
}

interface User {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: string;
    isActive: boolean;
    preferredPaymentMethod: string | null;
    createdAt: string;
    driverProfile?: DriverProfile | null;
}

interface Toast {
    id: number;
    message: string;
    type: "success" | "error";
}

export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState("ALL");
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [currentTab, setCurrentTab] = useState<"ALL" | "DRIVER" | "RIDER">("ALL");

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        role: "RIDER",
        password: "",
        isActive: true,
        preferredPaymentMethod: "MOBILE_MONEY",
        // Driver specific
        vehicleType: "",
        vehicleModel: "",
        vehicleColor: "",
        licensePlate: "",
        driverLicense: ""
    });

    const showToast = (message: string, type: "success" | "error" = "success") => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
                setIsSuperAdmin(user.role === "SUPER_ADMIN");
                fetchUsers();
            } else {
                router.push("/dashboard");
            }
        } else {
            router.push("/login");
        }
    }, [router]);

    async function fetchUsers() {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/users", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    }

    const handleOpenCreate = () => {
        setIsEditing(false);
        setSelectedUser(null);
        setFormData({
            name: "", email: "", phone: "", role: "RIDER", password: "User123!",
            isActive: true, preferredPaymentMethod: "MOBILE_MONEY",
            vehicleType: "", vehicleModel: "", vehicleColor: "", licensePlate: "", driverLicense: ""
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (user: User) => {
        if (!isSuperAdmin) return;
        setIsEditing(true);
        setSelectedUser(user);
        setFormData({
            name: user.name || "",
            email: user.email,
            phone: user.phone || "",
            role: user.role,
            password: "", // Don't show password
            isActive: user.isActive,
            preferredPaymentMethod: user.preferredPaymentMethod || "MOBILE_MONEY",
            vehicleType: user.driverProfile?.vehicleType || "",
            vehicleModel: user.driverProfile?.vehicleModel || "",
            vehicleColor: user.driverProfile?.vehicleColor || "",
            licensePlate: user.driverProfile?.licensePlate || "",
            driverLicense: user.driverProfile?.driverLicense || ""
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const url = isEditing ? `/api/users/${selectedUser?.id}` : "/api/users";
        const method = isEditing ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const err = await res.json();
                showToast(err.error || "Operation failed", "error");
                return;
            }

            showToast(isEditing ? "User updated successfully!" : "User created successfully!", "success");
            setIsModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error(error);
            showToast("An unexpected error occurred", "error");
        }
    };

    const handleToggleStatus = async (user: User) => {
        if (!isSuperAdmin) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/users/${user.id}`, {
                method: "PUT",
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ isActive: !user.isActive })
            });

            if (res.ok) {
                // Optimistic update
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
                showToast(`${user.name || user.email} has been ${user.isActive ? "deactivated" : "activated"}.`, "success");
            } else {
                const err = await res.json();
                showToast(err.error || "Failed to toggle status", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("An unexpected error occurred", "error");
        }
    };

    const handleDeleteUser = (user: User, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click if any
        if (!isSuperAdmin) return;
        setSelectedUser(user);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedUser || isDeleting) return;
        setIsDeleting(true);
        try {
            const token = localStorage.getItem("token");
            // Optimistic removal from UI immediately
            setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
            setIsDeleteModalOpen(false);

            const res = await fetch(`/api/users/${selectedUser.id}`, {
                method: "DELETE",
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.ok) {
                showToast(`${selectedUser.name || selectedUser.email} has been deleted.`, "success");
                setSelectedUser(null);
            } else {
                const data = await res.json();
                showToast(data.error || "Failed to delete user", "error");
                // Revert optimistic update on failure
                fetchUsers();
            }
        } catch (error) {
            console.error("Delete request exception:", error);
            showToast("An error occurred while deleting the user.", "error");
            fetchUsers();
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             user.phone?.includes(searchQuery));
        const matchesRole = currentTab === "ALL" || user.role === currentTab;
        const matchesFilterRole = filterRole === "ALL" || user.role === filterRole;
        return matchesSearch && matchesRole && matchesFilterRole;
    });

    if (loading && users.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-[#042a22]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Toast Notifications */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold text-white
                            transition-all duration-300 animate-fade-in-up
                            ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}
                        style={{ animation: "slideInUp 0.3s ease" }}
                    >
                        {toast.type === "success"
                            ? <CheckCircle size={18} />
                            : <Ban size={18} />}
                        {toast.message}
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
                    <p className="text-gray-500 mt-1 font-medium">Control center for Riders, Drivers, and Admins.</p>
                </div>
                {isSuperAdmin && (
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 px-6 py-3 bg-[#042a22] text-white rounded-xl font-bold hover:bg-emerald-900 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                        <UserPlus size={20} />
                        Create New User
                    </button>
                )}
            </div>

            {/* Stats & Tabs */}
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: "Total Users", value: users.length, color: "bg-gray-100 text-gray-700" },
                        { label: "Drivers", value: users.filter(u => u.role === "DRIVER").length, color: "bg-blue-100 text-blue-700" },
                        { label: "Riders", value: users.filter(u => u.role === "RIDER").length, color: "bg-green-100 text-green-700" },
                        { label: "Active Admins", value: users.filter(u => u.role.includes("ADMIN")).length, color: "bg-purple-100 text-purple-700" }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                            <p className={`text-2xl font-black mt-1 ${stat.color.split(' ')[1]}`}>
                                {stat.value}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
                    {[
                        { id: "ALL", label: "All Users", icon: UserIcon },
                        { id: "DRIVER", label: "Drivers", icon: Car },
                        { id: "RIDER", label: "Riders (Clients)", icon: UserIcon },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setCurrentTab(tab.id as "ALL" | "DRIVER" | "RIDER")}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                                currentTab === tab.id 
                                ? "bg-white text-gray-900 shadow-sm" 
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-[#042a22] outline-none transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select 
                        title="Filter by Role"
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-600 outline-none focus:border-[#042a22] transition-all flex-1 md:flex-none"
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                    >
                        <option value="ALL">All Roles</option>
                        <option value="RIDER">Riders</option>
                        <option value="DRIVER">Drivers</option>
                        <option value="ADMIN">Admins</option>
                        <option value="SUPER_ADMIN">Super Admins</option>
                    </select>
                    <button title="Download Users" aria-label="Download Users" className="p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all text-gray-600">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Contact Info</th>
                                <th className="px-6 py-4">Role & Status</th>
                                <th className="px-6 py-4">Vehicle / Payment</th>
                                {isSuperAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-gray-400 font-bold">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            ) : filteredUsers.map((user) => {
                                // Masking for non-Super Admins
                                const maskEmail = (email: string) => {
                                    if (isSuperAdmin) return email;
                                    const [name, domain] = email.split('@');
                                    return `${name[0]}***@${domain}`;
                                };
                                const maskPhone = (phone: string | null) => {
                                    if (!phone) return null;
                                    if (isSuperAdmin) return phone;
                                    return phone.slice(0, 4) + "****" + phone.slice(-2);
                                };

                                return (
                                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm ${
                                                    user.role === 'DRIVER' ? 'bg-blue-600' :
                                                    user.role.includes('ADMIN') ? 'bg-purple-600' : 'bg-[#042a22]'
                                                }`}>
                                                    {(user.name || user.email).charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-gray-900 font-bold">{user.name || "N/A"}</p>
                                                    <p className="text-xs text-gray-400">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600 font-bold">
                                                    <Mail size={14} className="text-gray-400" />
                                                    {maskEmail(user.email)}
                                                </div>
                                                {user.phone && (
                                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                        <Phone size={14} className="text-gray-400" />
                                                        {maskPhone(user.phone)}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-2">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider w-fit ${
                                                    user.role === 'DRIVER' ? 'bg-blue-100 text-blue-700' :
                                                    user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                                                    user.role === 'ADMIN' ? 'bg-purple-50 text-purple-500' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                    {user.role}
                                                </span>
                                                <span className={`flex items-center gap-1 text-xs font-bold ${user.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {user.isActive ? <CheckCircle size={14} /> : <Ban size={14} />}
                                                    {user.isActive ? "Active" : "Disabled"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.role === 'DRIVER' ? (
                                                <div className="text-xs space-y-1">
                                                    <p className="font-bold text-gray-700 flex items-center gap-1">
                                                        <Car size={13} /> {user.driverProfile?.vehicleModel || "No Model"}
                                                    </p>
                                                    <p className="text-gray-400">{user.driverProfile?.licensePlate || "No Plate"}</p>
                                                </div>
                                            ) : (
                                                <div className="text-xs flex items-center gap-1 font-bold text-gray-600 uppercase">
                                                    <CreditCard size={13} /> {user.preferredPaymentMethod || "NONE"}
                                                </div>
                                            )}
                                        </td>
                                        {isSuperAdmin && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button 
                                                        onClick={() => handleOpenEdit(user)}
                                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-all"
                                                        title="Edit User"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleToggleStatus(user)}
                                                        className={`p-2 hover:bg-gray-100 rounded-lg transition-all ${user.isActive ? 'text-gray-400 hover:text-[#042a22]' : 'text-emerald-400 hover:text-emerald-600'}`}
                                                        title={user.isActive ? "Deactivate" : "Activate"}
                                                    >
                                                        {user.isActive ? <Ban size={18} /> : <CheckCircle size={18} />}
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleDeleteUser(user, e)}
                                                        className="p-2 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-[#042a22] transition-all"
                                                        title="Delete User"
                                                    >
                                                        <Trash size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Enhanced Creation/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">{isEditing ? "Update Profile" : "Onboard New User"}</h3>
                                <p className="text-sm text-gray-500 font-medium">Provide details to {isEditing ? "modify" : "register"} this account.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:scale-110 transition-all">✕</button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[75vh]">
                            <div className="p-8 space-y-6">
                                {/* Basic Info Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Full Name</label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text" required
                                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-[#042a22] outline-none transition-all font-bold"
                                                value={formData.name}
                                                onChange={e => setFormData({...formData, name: e.target.value})}
                                                placeholder="John Doe"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="tel" required
                                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-[#042a22] outline-none transition-all font-bold"
                                                value={formData.phone}
                                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                                placeholder="+231..."
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="email" required
                                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-[#042a22] outline-none transition-all font-bold"
                                                value={formData.email}
                                                onChange={e => setFormData({...formData, email: e.target.value})}
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Status</label>
                                        <select
                                            title="Account Status"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-[#042a22] outline-none transition-all font-bold text-gray-600 appearance-none"
                                            value={formData.isActive ? "TRUE" : "FALSE"}
                                            onChange={e => setFormData({...formData, isActive: e.target.value === "TRUE"})}
                                        >
                                            <option value="TRUE">Active Account</option>
                                            <option value="FALSE">Deactivated Account</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1 block">Account Role</label>
                                    <div className="flex gap-3">
                                        {['RIDER', 'DRIVER'].map((role) => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setFormData({...formData, role})}
                                                className={`flex-1 py-4 rounded-2xl border-2 transition-all font-black uppercase tracking-widest flex flex-col items-center gap-2 ${
                                                    formData.role === role 
                                                    ? 'border-[#042a22] bg-emerald-50 text-[#042a22] ring-4 ring-emerald-500/10' 
                                                    : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:text-gray-500'
                                                }`}
                                            >
                                                {role === 'DRIVER' ? <Car size={24} /> : <UserIcon size={24} />}
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">
                                        {isEditing ? "Reset Password (Optional)" : "Temporary Password"}
                                    </label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text" required={!isEditing}
                                            title="Temporary Password"
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold"
                                            value={formData.password}
                                            onChange={e => setFormData({...formData, password: e.target.value})}
                                            placeholder={isEditing ? "Leave blank to keep current password" : "Password123!"}
                                        />
                                    </div>
                                    {isEditing && (
                                        <p className="text-[10px] text-gray-400 pl-2">If provided, the user will be forced to change it on next login.</p>
                                    )}
                                </div>

                                {/* Role Specific Sections */}
                                {formData.role === 'DRIVER' ? (
                                    <div className="pt-6 border-t border-gray-100 space-y-6">
                                        <h4 className="flex items-center gap-2 font-black text-gray-900 uppercase tracking-widest text-sm">
                                            <Car size={18} className="text-[#042a22]" />
                                            Vehicle Information
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vehicle Type</label>
                                                <input
                                                    type="text" placeholder="e.g. Sedan, SUV"
                                                    title="Vehicle Type"
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none focus:border-[#042a22] transition-all"
                                                    value={formData.vehicleType}
                                                    onChange={e => setFormData({...formData, vehicleType: e.target.value})}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Plate Number</label>
                                                <input
                                                    type="text" placeholder="A12345"
                                                    title="Plate Number"
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none focus:border-[#042a22] transition-all"
                                                    value={formData.licensePlate}
                                                    onChange={e => setFormData({...formData, licensePlate: e.target.value})}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Model & Year</label>
                                                <input
                                                    type="text" placeholder="Toyota Corolla 2018"
                                                    title="Model & Year"
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none focus:border-[#042a22] transition-all"
                                                    value={formData.vehicleModel}
                                                    onChange={e => setFormData({...formData, vehicleModel: e.target.value})}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Color</label>
                                                <input
                                                    type="text" placeholder="Silver"
                                                    title="Color"
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none focus:border-[#042a22] transition-all"
                                                    value={formData.vehicleColor}
                                                    onChange={e => setFormData({...formData, vehicleColor: e.target.value})}
                                                />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Driver License # (Optional)</label>
                                                <input
                                                    type="text"
                                                    title="Driver License Number"
                                                    placeholder="Enter Driver License"
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none focus:border-[#042a22] transition-all"
                                                    value={formData.driverLicense}
                                                    onChange={e => setFormData({...formData, driverLicense: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pt-6 border-t border-gray-100 space-y-6">
                                        <h4 className="flex items-center gap-2 font-black text-gray-900 uppercase tracking-widest text-sm">
                                            <CreditCard size={18} className="text-[#042a22]" />
                                            Preferences
                                        </h4>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Preferred Payment Method</label>
                                            <select
                                                title="Preferred Payment Method"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-600 appearance-none outline-none focus:border-[#042a22] transition-all"
                                                value={formData.preferredPaymentMethod}
                                                onChange={e => setFormData({...formData, preferredPaymentMethod: e.target.value})}
                                            >
                                                <option value="MOBILE_MONEY">Mobile Money</option>
                                                <option value="CARD">Debit/Credit Card</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    title="Close Modal"
                                    className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:bg-gray-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    title="Confirm Action"
                                    className="flex-1 py-4 bg-[#042a22] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-900 transition-all shadow-lg shadow-emerald-500/30 active:scale-95"
                                >
                                    {isEditing ? "Save Changes" : "Confirm Onboarding"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {isDeleteModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-8 space-y-6 text-center">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash size={40} className="text-[#042a22]" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900">Confirm Deletion</h3>
                            <p className="text-gray-500 font-medium">
                                Are you absolutely sure you want to permanently delete <strong>{selectedUser.name || selectedUser.email}</strong>? 
                                <br/><br/>
                                This action will also delete all associated profiles, reviews, and complaints. <span className="text-[#042a22] font-bold">This cannot be undone.</span>
                            </p>
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setSelectedUser(null);
                                }}
                                className="flex-1 py-3 bg-white border border-gray-200 rounded-2xl font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 py-3 bg-[#042a22] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-900 transition-all shadow-lg shadow-emerald-500/30 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <><Loader2 size={16} className="animate-spin" /> Deleting...</> : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
