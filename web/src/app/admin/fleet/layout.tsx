"use client";

import { MapProvider } from "@/components/map/MapProvider";

export default function FleetLayout({ children }: { children: React.ReactNode }) {
    return <MapProvider>{children}</MapProvider>;
}
