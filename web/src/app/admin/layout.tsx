import React from "react";
import AdminSidebar from "@/components/admin/Sidebar";
import AdminGuard from "@/components/admin/AdminGuard";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminGuard>
            <div className="min-h-screen bg-gray-50 flex">
                <AdminSidebar />
                <main className="flex-1 ml-64 p-8">
                    <header className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                            <p className="text-gray-500">Welcome back, Admin.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#D32F2F] rounded-full flex items-center justify-center font-bold text-white shadow-md">
                                AD
                            </div>
                        </div>
                    </header>
                    {children}
                </main>
            </div>
        </AdminGuard>
    );
}
