import { ILocationProvider, AutocompletePrediction, Coordinates } from "./LocationProvider";

export class OSMProvider implements ILocationProvider {
    async autocomplete(query: string): Promise<AutocompletePrediction[]> {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'AfriCab-App-Development'
                }
            });
            if (!res.ok) return [];
            const data = await res.json();
            return data.map((item: any) => ({
                description: item.display_name,
                placeId: item.place_id.toString()
            }));
        } catch (error) {
            console.error("OSM Autocomplete failed", error);
            return [];
        }
    }

    async geocode(address: string): Promise<Coordinates | null> {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'AfriCab-App-Development'
                }
            });
            if (!res.ok) return null;
            const data = await res.json();
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
            return null;
        } catch (error) {
            console.error("OSM Geocoding failed", error);
            return null;
        }
    }
}
