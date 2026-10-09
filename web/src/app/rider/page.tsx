"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RiderDashboardContent from "@/components/RiderDashboardContent";
import { useRouter } from "next/navigation";
import { MapProvider } from "@/components/map/MapProvider";

export default function RiderPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem("user");
            if (!storedUser) {
                router.push("/login");
                return;
            }
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.role !== "RIDER") {
                router.push("/");
                return;
            }
            setUser(parsedUser);
        } catch (e) {
            console.error("Rider page auth failed", e);
            localStorage.removeItem("user");
            router.push("/login");
        } finally {
            setLoading(false);
        }
    }, [router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <MapProvider>
            <main className="min-h-screen bg-white">
                <Navbar />
                <RiderDashboardContent user={user} />
                <Footer />
            </main>
        </MapProvider>
    );
}
