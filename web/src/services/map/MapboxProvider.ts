import { ILocationProvider, AutocompletePrediction, Coordinates } from "./LocationProvider";

export class MapboxProvider implements ILocationProvider {
    private accessToken: string;

    constructor() {
        this.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
    }

    async autocomplete(query: string): Promise<AutocompletePrediction[]> {
        if (!this.accessToken) return [];

        try {
            // Using Mapbox Geocoding API v5 for autocomplete
            // Bounding box for Liberia: approx -11.5, 4.3, -7.5, 8.5
            const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${this.accessToken}&autocomplete=true&limit=5&country=lr`
            );
            if (!res.ok) return [];
            
            const data = await res.json();
            if (!data.features) return [];

            return data.features.map((feature: any) => ({
                description: feature.place_name,
                placeId: feature.id,
            }));
        } catch (error) {
            console.error("Mapbox Autocomplete failed", error);
            return [];
        }
    }

    async geocode(address: string): Promise<Coordinates | null> {
        if (!this.accessToken) return null;

        try {
            // First check if the address is actually a placeId (feature id from autocomplete)
            const isPlaceId = address.includes(".");
            
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${this.accessToken}&limit=1&country=lr`;
            
            const res = await fetch(url);
            if (!res.ok) return null;
            
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                // Mapbox returns [longitude, latitude]
                const [lng, lat] = data.features[0].center;
                return { lat, lng };
            }
            return null;
        } catch (error) {
            console.error("Mapbox Geocoding failed", error);
            return null;
        }
    }
}
