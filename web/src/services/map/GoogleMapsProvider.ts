import { ILocationProvider, AutocompletePrediction, Coordinates } from "./LocationProvider";

export class GoogleMapsProvider implements ILocationProvider {
    private autocompleteService: google.maps.places.AutocompleteService | null = null;
    private geocoder: google.maps.Geocoder | null = null;

    private init() {
        if (typeof window !== "undefined" && window.google && !this.autocompleteService) {
            this.autocompleteService = new window.google.maps.places.AutocompleteService();
            this.geocoder = new window.google.maps.Geocoder();
        }
    }

    async autocomplete(query: string): Promise<AutocompletePrediction[]> {
        this.init();
        if (!this.autocompleteService) return [];

        return new Promise((resolve) => {
            this.autocompleteService?.getPlacePredictions(
                { input: query, componentRestrictions: { country: "lr" } }, // Restricted to Liberia
                (predictions, status) => {
                    if (status !== "OK" || !predictions) {
                        resolve([]);
                        return;
                    }
                    resolve(
                        predictions.map((p) => ({
                            description: p.description,
                            placeId: p.place_id,
                        }))
                    );
                }
            );
        });
    }

    async geocode(address: string): Promise<Coordinates | null> {
        this.init();
        if (!this.geocoder) return null;

        return new Promise((resolve) => {
            this.geocoder?.geocode({ address }, (results, status) => {
                if (status !== "OK" || !results || !results[0]) {
                    resolve(null);
                    return;
                }
                const location = results[0].geometry.location;
                resolve({
                    lat: location.lat(),
                    lng: location.lng(),
                });
            });
        });
    }
}
