"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { GoogleMapsProvider } from '@/services/map/GoogleMapsProvider';
import { MapboxProvider } from '@/services/map/MapboxProvider';
import { OSMProvider } from '@/services/map/OSMProvider';
import { ILocationProvider } from '@/services/map/LocationProvider';

interface MapContextType {
    locationProvider: ILocationProvider;
    isLoaded: boolean;
    loadError: Error | undefined;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

const libraries: ("places" | "geometry")[] = ["places"];

export const MapProvider = ({ children }: { children: ReactNode }) => {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    // Strategy: Use Google if loaded and key exists, else fallback to Mapbox, then OSM
    const hasGoogleKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const hasMapboxKey = !!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    
    let locationProvider: ILocationProvider;
    if (isLoaded && hasGoogleKey) {
        locationProvider = new GoogleMapsProvider();
    } else if (hasMapboxKey) {
        locationProvider = new MapboxProvider();
    } else {
        locationProvider = new OSMProvider();
    }

    return (
        <MapContext.Provider value={{ locationProvider, isLoaded, loadError }}>
            {children}
        </MapContext.Provider>
    );
};

export const useMapProvider = () => {
    const context = useContext(MapContext);
    if (!context) {
        throw new Error('useMapProvider must be used within a MapProvider');
    }
    return context;
};
