import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GoogleMap, useJsApiLoader, Marker as GoogleMarker } from '@react-google-maps/api';

const containerStyle = {
    width: '100%',
    height: '100%'
};

// Default center if initialRegion not provided
const defaultCenter = {
    lat: 6.3156,
    lng: -10.7969
};

export const Marker = ({ coordinate, title, description, pinColor, children }: any) => {
    // Note: Custom marker views (children) are more complex in Google Maps JS API (requires OverlayView).
    // For simplicity in this web version, we'll stick to standard markers or basic customization if provided via icon prop.
    // If children are present, we might loose them unless we use OverlayView, but that adds complexity.
    // We will pass basic props.

    return (
        <GoogleMarker
            position={{ lat: coordinate.latitude, lng: coordinate.longitude }}
            title={title}
        // Simple icon color mapping could go here if needed, or use default
        />
    );
};

export default function MapView({ style, initialRegion, children }: any) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: "YOUR_WEB_GOOGLE_MAPS_API_KEY" // Replaceme with actual key or env var
    });

    const [map, setMap] = useState(null);

    const onLoad = useCallback((map: any) => {
        // const bounds = new window.google.maps.LatLngBounds(center);
        // map.fitBounds(bounds);
        setMap(map);
    }, []);

    const onUnmount = useCallback((map: any) => {
        setMap(null);
    }, []);

    if (!isLoaded) {
        return (
            <View style={[styles.container, style]}>
                <Text>Loading Map...</Text>
            </View>
        );
    }

    const center = initialRegion ? { lat: initialRegion.latitude, lng: initialRegion.longitude } : defaultCenter;

    return (
        <View style={[styles.container, style]}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={13}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                }}
            >
                {children}
            </GoogleMap>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: '100%',
        backgroundColor: '#e0e0e0',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
