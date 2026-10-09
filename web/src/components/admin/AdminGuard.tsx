"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const userStr = localStorage.getItem("user");
        if (!userStr) {
            router.push("/login");
            return;
        }
        try {
            const user = JSON.parse(userStr);
            if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
                router.push("/login");
                return;
            }
            if (user.forcePasswordChange && window.location.pathname !== "/admin/change-password") {
                router.push("/admin/change-password");
                return;
            }
            setAuthorized(true);
        } catch {
            router.push("/login");
        }
    }, [router]);

    if (!isClient || !authorized) return null;

    return <>{children}</>;
}
