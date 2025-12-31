"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Map,
    Car,
    CreditCard,
    Bell,
    Settings,
    Ticket,
    MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
    { icon: Map, label: "Dispatch Panel", href: "/admin/dispatch" },
    { icon: Users, label: "Users", href: "/admin/users" },
    { icon: Car, label: "Fleet & Drivers", href: "/admin/drivers" },
    { icon: MapPin, label: "Pricing & Zones", href: "/admin/pricing" },
    { icon: Ticket, label: "Coupons", href: "/admin/coupons" },
    { icon: CreditCard, label: "Payments", href: "/admin/payments" },
    { icon: Bell, label: "Announcements", href: "/admin/announcements" },
    { icon: Settings, label: "Settings", href: "/admin/settings" },
];

export default function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-black text-white h-screen fixed left-0 top-0 overflow-y-auto border-r border-gray-800">
            <div className="p-6">
                <h2 className="text-2xl font-bold tracking-tighter mb-8">LibCab Admin</h2>
                <nav className="space-y-2">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                    isActive
                                        ? "bg-[#D32F2F] text-white font-bold shadow-md"
                                        : "text-gray-400 hover:text-white hover:bg-gray-900"
                                )}
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}
