"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { useMapProvider } from './MapProvider';
import { AutocompletePrediction } from '@/services/map/LocationProvider';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationSearchProps {
    value: string;
    onChange: (value: string) => void;
    onSelect?: (prediction: AutocompletePrediction) => void;
    placeholder?: string;
    className?: string;
    icon?: React.ReactNode;
}

export const LocationSearch = ({ 
    value, 
    onChange, 
    onSelect, 
    placeholder = "Search location...", 
    className,
    icon 
}: LocationSearchProps) => {
    const { locationProvider } = useMapProvider();
    const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchPredictions = async (query: string) => {
        if (query.length < 3) {
            setPredictions([]);
            return;
        }
        setIsLoading(true);
        const results = await locationProvider.autocomplete(query);
        setPredictions(results);
        setIsLoading(false);
        setShowDropdown(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange(val);
        fetchPredictions(val);
    };

    return (
        <div className={cn("relative w-full", className)} ref={dropdownRef}>
            <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:scale-110 transition-transform duration-300">
                    {icon || <MapPin size={20} />}
                </div>
                <input
                    type="text"
                    placeholder={placeholder}
                    className="w-full pl-14 pr-12 py-5 bg-white text-gray-900 border-none rounded-[2rem] outline-none font-bold text-lg placeholder:text-gray-300 focus:ring-4 focus:ring-white/20 transition-all shadow-sm"
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => value.length >= 3 && setShowDropdown(true)}
                />
                {isLoading && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                        <Loader2 size={18} className="animate-spin text-gray-400" />
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showDropdown && predictions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 5, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute left-0 right-0 z-[100] bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden"
                    >
                        <div className="p-2">
                            {predictions.map((p) => (
                                <button
                                    key={p.placeId}
                                    type="button"
                                    onClick={() => {
                                        onChange(p.description);
                                        setShowDropdown(false);
                                        onSelect?.(p);
                                    }}
                                    className="w-full flex items-start gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-all text-left group"
                                >
                                    <div className="mt-1 p-2 bg-gray-100 rounded-lg group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                                        <MapPin size={14} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm line-clamp-1">{p.description}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Location Discovery</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
