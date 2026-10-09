"use client";

import FleetGuard from "@/components/auth/FleetGuard";
import { MapProvider } from "@/components/map/MapProvider";

export default function FleetLayout({ children }: { children: React.ReactNode }) {
    return (
        <FleetGuard>
            <MapProvider>
                {children}
            </MapProvider>
        </FleetGuard>
    );
}
