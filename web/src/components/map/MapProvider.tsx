"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
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
    const hasGoogleKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
    const hasMapboxKey = Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);

    // Only invoke useJsApiLoader if a Google Maps key is actually configured
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
        preventGoogleFontsLoading: true,
    });

    let locationProvider: ILocationProvider;
    if (isLoaded && hasGoogleKey && !loadError) {
        locationProvider = new GoogleMapsProvider();
    } else if (hasMapboxKey) {
        locationProvider = new MapboxProvider();
    } else {
        locationProvider = new OSMProvider();
    }

    return (
        <MapContext.Provider value={{ locationProvider, isLoaded: hasGoogleKey ? isLoaded : true, loadError }}>
            {children}
        </MapContext.Provider>
    );
};

export const useMapProvider = () => {
    const context = useContext(MapContext);
    if (!context) {
        // Fallback to OSMProvider instead of throwing so it never crashes unmounted consumers
        return {
            locationProvider: new OSMProvider(),
            isLoaded: true,
            loadError: undefined,
        };
    }
    return context;
};
