"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * FleetGuard — Restricts access to the Fleet Portal to ADMIN and SUPER_ADMIN roles only.
 * Non-authenticated or non-admin users are redirected to /login.
 */
export default function FleetGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const tokenStr = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    useEffect(() => {
        if (!userStr || !tokenStr) {
            // Not logged in — redirect to login, with a return URL
            router.push("/login?redirect=/fleet");
            return;
        }
        try {
            const user = JSON.parse(userStr);
            if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
                // Logged in but not an admin — redirect to their own dashboard
                const dest = user.role === "DRIVER" ? "/driver" : "/rider";
                router.push(dest);
            }
        } catch {
            router.push("/login?redirect=/fleet");
        }
    }, [router, userStr, tokenStr]);

    // Don't render anything until we confirm the user is an admin
    if (!userStr || !tokenStr) return null;

    try {
        const user = JSON.parse(userStr);
        if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return null;
    } catch {
        return null;
    }

    return <>{children}</>;
}
