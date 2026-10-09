export interface AutocompletePrediction {
    description: string;
    placeId: string;
}

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface ILocationProvider {
    autocomplete(query: string): Promise<AutocompletePrediction[]>;
    geocode(address: string): Promise<Coordinates | null>;
}
