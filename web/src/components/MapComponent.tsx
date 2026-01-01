"use client";

// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// import "leaflet/dist/leaflet.css";
// import L from "leaflet";
// import { useEffect } from "react";

// // Fix Leaflet's default icon path issues in Next.js
// const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
// const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
// const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

// const DefaultIcon = L.icon({
//     iconUrl,
//     iconRetinaUrl,
//     shadowUrl,
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
// });

// L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
    center?: [number, number];
    zoom?: number;
    markers?: Array<{
        id: string;
        lat: number;
        lng: number;
        title?: string;
        type?: "RIDE" | "DRIVER";
    }>;
}

export default function MapComponent({ center = [6.3156, -10.8074], zoom = 13, markers = [] }: MapProps) {
    return (
        <div style={{ height: "400px", width: "100%", borderRadius: "8px", overflow: "hidden", background: "#eee", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p className="text-gray-500">Map Component Stubbed (Missing Dependencies)</p>
            {/* <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {markers.map((marker) => (
                    <Marker key={marker.id} position={[marker.lat, marker.lng]}>
                        <Popup>
                            {marker.title || "Unknown Location"}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer> */}
        </div>
    );
}
