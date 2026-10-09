"use client";

import React, { useEffect, useState } from "react";
import {
    CloudRain,
    Sun,
    CloudLightning,
    CloudFog,
    CloudDrizzle,
    Cloud,
    Wind,
    Droplets,
    Thermometer,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    ChevronRight,
    TrendingUp,
    RefreshCw,
    MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WeatherData {
    location: string;
    current: {
        temp: number;
        humidity: number;
        windSpeed: number;
        condition: string;
        icon: string;
        hazardLevel: "LOW" | "MEDIUM" | "HIGH";
        advisory: string;
        surgeMultiplier: number;
    };
    today: {
        dateLabel: string;
        dateFormatted: string;
        tempMax: number;
        tempMin: number;
        condition: string;
        icon: string;
        rainChance: number;
        hazardLevel: "LOW" | "MEDIUM" | "HIGH";
    };
    tomorrow: {
        dateLabel: string;
        dateFormatted: string;
        tempMax: number;
        tempMin: number;
        condition: string;
        icon: string;
        rainChance: number;
        hazardLevel: "LOW" | "MEDIUM" | "HIGH";
        forecastOutlook: string;
    };
}

interface WeatherAlertWidgetProps {
    variant?: "driver" | "admin";
    className?: string;
}

export default function WeatherAlertWidget({ variant = "driver", className }: WeatherAlertWidgetProps) {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchWeather = async () => {
        try {
            const res = await fetch("/api/weather");
            if (res.ok) {
                const data = await res.json();
                setWeather(data);
            }
        } catch (err) {
            console.error("Failed to load weather data:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchWeather();
        // Refresh every 15 minutes
        const interval = setInterval(fetchWeather, 15 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchWeather();
    };

    const renderWeatherIcon = (icon: string, size: number = 24, className?: string) => {
        switch (icon) {
            case "sunny":
                return <Sun size={size} className={cn("text-amber-400 animate-spin-slow", className)} />;
            case "partly_cloudy":
                return <Cloud size={size} className={cn("text-sky-300", className)} />;
            case "drizzle":
                return <CloudDrizzle size={size} className={cn("text-blue-400", className)} />;
            case "heavy_rain":
                return <CloudRain size={size} className={cn("text-blue-500 animate-bounce-subtle", className)} />;
            case "thunderstorm":
                return <CloudLightning size={size} className={cn("text-yellow-400 animate-pulse", className)} />;
            case "fog":
                return <CloudFog size={size} className={cn("text-slate-400", className)} />;
            default:
                return <CloudRain size={size} className={cn("text-blue-400", className)} />;
        }
    };

    const isDriver = variant === "driver";

    if (loading) {
        return (
            <div className={cn(
                "p-6 rounded-[2.5rem] animate-pulse flex items-center justify-between",
                isDriver ? "bg-slate-900/60 border border-white/5 text-white" : "bg-white border border-slate-200 text-slate-900",
                className
            )}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/10" />
                    <div className="space-y-2">
                        <div className="h-4 w-32 bg-white/10 rounded-md" />
                        <div className="h-3 w-48 bg-white/10 rounded-md" />
                    </div>
                </div>
                <div className="h-8 w-24 bg-white/10 rounded-xl" />
            </div>
        );
    }

    if (!weather) return null;

    return (
        <div className={cn("space-y-4", className)}>
            {/* Real-time Weather Alert Banner */}
            <div className={cn(
                "p-5 sm:p-6 rounded-[2.5rem] relative overflow-hidden transition-all duration-300 shadow-xl",
                isDriver 
                    ? weather.current.hazardLevel === "HIGH"
                        ? "bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-900 border-2 border-red-500/40 text-white shadow-red-950/30"
                        : "bg-slate-900/80 backdrop-blur-2xl border border-white/10 text-white"
                    : weather.current.hazardLevel === "HIGH"
                        ? "bg-gradient-to-r from-red-50 via-amber-50 to-white border-2 border-red-300 text-slate-900 shadow-red-100"
                        : "bg-white border border-slate-200/90 text-slate-900 shadow-md"
            )}>
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-4">
                        <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                            isDriver ? "bg-white/10 border border-white/15" : "bg-slate-100 border border-slate-200"
                        )}>
                            {renderWeatherIcon(weather.current.icon, 32)}
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className={cn(
                                    "px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5",
                                    weather.current.hazardLevel === "HIGH"
                                        ? "bg-red-500 text-white"
                                        : isDriver ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-blue-100 text-blue-800"
                                )}>
                                    <MapPin size={10} />
                                    {weather.location} Live Weather
                                </span>
                                {weather.current.surgeMultiplier > 1.0 && (
                                    <span className="px-2.5 py-0.5 bg-amber-500 text-black text-[10px] font-black uppercase rounded-full animate-pulse flex items-center gap-1">
                                        <TrendingUp size={11} /> +{Math.round((weather.current.surgeMultiplier - 1) * 100)}% Surge Demand
                                    </span>
                                )}
                            </div>
                            <h4 className={cn("text-base sm:text-lg font-black tracking-tight", isDriver ? "text-white" : "text-slate-900")}>
                                {weather.current.advisory}
                            </h4>
                        </div>
                    </div>

                    {/* Quick Telemetry Indicators */}
                    <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
                        <div className="flex items-center gap-3">
                            <div className={cn("px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold", isDriver ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-700")}>
                                <Thermometer size={14} className="text-red-400" />
                                <span>{weather.current.temp}°C</span>
                            </div>
                            <div className={cn("px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold", isDriver ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-700")}>
                                <Droplets size={14} className="text-blue-400" />
                                <span>{weather.current.humidity}%</span>
                            </div>
                            <div className={cn("px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold", isDriver ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-700")}>
                                <Wind size={14} className="text-teal-400" />
                                <span>{weather.current.windSpeed} km/h</span>
                            </div>
                        </div>
                        <button
                            onClick={handleRefresh}
                            title="Refresh weather data"
                            aria-label="Refresh weather data"
                            className={cn(
                                "p-2 rounded-xl transition-all",
                                isDriver ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                            )}
                        >
                            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Current Day vs Day To Come (Tomorrow) Dual Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. CURRENT DAY (Today) */}
                <div className={cn(
                    "p-6 rounded-[2.5rem] relative overflow-hidden transition-all duration-300 shadow-lg",
                    isDriver 
                        ? "bg-slate-900/60 backdrop-blur-xl border border-white/5 text-white hover:border-white/15" 
                        : "bg-white border border-slate-200 text-slate-900 hover:shadow-xl"
                )}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className={cn("text-xs font-black uppercase tracking-widest", isDriver ? "text-slate-400" : "text-slate-500")}>
                                Current Day
                            </span>
                        </div>
                        <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                            isDriver ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-700"
                        )}>
                            {weather.today.dateFormatted}
                        </span>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center",
                                isDriver ? "bg-white/10" : "bg-blue-50 text-blue-600"
                            )}>
                                {renderWeatherIcon(weather.today.icon, 28)}
                            </div>
                            <div>
                                <h5 className={cn("text-lg font-black tracking-tight", isDriver ? "text-white" : "text-slate-900")}>
                                    {weather.today.condition}
                                </h5>
                                <p className={cn("text-xs font-bold", isDriver ? "text-slate-400" : "text-slate-500")}>
                                    Rain Chance: <span className="text-blue-500 font-black">{weather.today.rainChance}%</span>
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className={cn("text-2xl font-black tracking-tight", isDriver ? "text-white" : "text-slate-900")}>
                                {weather.today.tempMax}°C
                            </p>
                            <p className={cn("text-[10px] font-bold uppercase tracking-wider", isDriver ? "text-slate-500" : "text-slate-400")}>
                                Low: {weather.today.tempMin}°C
                            </p>
                        </div>
                    </div>

                    <div className={cn(
                        "p-3 rounded-2xl text-xs font-medium flex items-center gap-2",
                        isDriver ? "bg-white/5 text-slate-300" : "bg-slate-50 text-slate-700 border border-slate-100"
                    )}>
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        <span>Real-time dispatching active. Drive safely and maintain headlight visibility.</span>
                    </div>
                </div>

                {/* 2. THE DAY TO COME (Tomorrow) */}
                <div className={cn(
                    "p-6 rounded-[2.5rem] relative overflow-hidden transition-all duration-300 shadow-lg",
                    isDriver 
                        ? "bg-slate-900/60 backdrop-blur-xl border border-white/5 text-white hover:border-white/15" 
                        : "bg-white border border-slate-200 text-slate-900 hover:shadow-xl"
                )}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Calendar size={13} className={isDriver ? "text-yellow-400" : "text-red-500"} />
                            <span className={cn("text-xs font-black uppercase tracking-widest", isDriver ? "text-yellow-400" : "text-red-600")}>
                                The Day to Come
                            </span>
                        </div>
                        <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                            isDriver ? "bg-yellow-400/10 text-yellow-300 border border-yellow-400/20" : "bg-red-50 text-red-700 border border-red-100"
                        )}>
                            {weather.tomorrow.dateFormatted}
                        </span>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center",
                                isDriver ? "bg-white/10" : "bg-amber-50 text-amber-600"
                            )}>
                                {renderWeatherIcon(weather.tomorrow.icon, 28)}
                            </div>
                            <div>
                                <h5 className={cn("text-lg font-black tracking-tight", isDriver ? "text-white" : "text-slate-900")}>
                                    {weather.tomorrow.condition}
                                </h5>
                                <p className={cn("text-xs font-bold", isDriver ? "text-slate-400" : "text-slate-500")}>
                                    Precipitation: <span className="text-blue-500 font-black">{weather.tomorrow.rainChance}%</span>
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className={cn("text-2xl font-black tracking-tight", isDriver ? "text-white" : "text-slate-900")}>
                                {weather.tomorrow.tempMax}°C
                            </p>
                            <p className={cn("text-[10px] font-bold uppercase tracking-wider", isDriver ? "text-slate-500" : "text-slate-400")}>
                                Low: {weather.tomorrow.tempMin}°C
                            </p>
                        </div>
                    </div>

                    <div className={cn(
                        "p-3 rounded-2xl text-xs font-medium flex items-center gap-2",
                        isDriver ? "bg-white/5 text-slate-300" : "bg-slate-50 text-slate-700 border border-slate-100"
                    )}>
                        <TrendingUp size={14} className="text-amber-500 shrink-0" />
                        <span className="truncate">{weather.tomorrow.forecastOutlook}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
