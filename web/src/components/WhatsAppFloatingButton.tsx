"use client";

import React, { useState, useEffect } from "react";
import { MessageCircle, Zap } from "lucide-react";
import WhatsAppBookingModal, { WhatsAppInitialData } from "./WhatsAppBookingModal";

export default function WhatsAppFloatingButton() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<WhatsAppInitialData | undefined>(undefined);
    const [hasInteracted, setHasInteracted] = useState(false);

    useEffect(() => {
        const handleCustomOpen = (event: CustomEvent<WhatsAppInitialData>) => {
            if (event.detail) {
                setModalData(event.detail);
            }
            setIsModalOpen(true);
        };

        window.addEventListener("open-whatsapp-booking" as any, handleCustomOpen);
        return () => {
            window.removeEventListener("open-whatsapp-booking" as any, handleCustomOpen);
        };
    }, []);

    return (
        <>
            {/* Floating Action Button */}
            <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end group">
                {/* Tooltip / Hint on hover or initial pulse */}
                <div className="mb-2 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 backdrop-blur-md text-white text-[11px] font-bold shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Instant Ride Dispatch via WhatsApp</span>
                </div>

                <button
                    onClick={() => {
                        setHasInteracted(true);
                        setIsModalOpen(true);
                    }}
                    className="relative flex items-center gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5 rounded-full bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366] text-white shadow-[0_8px_30px_rgb(37,211,102,0.4)] hover:shadow-[0_12px_40px_rgb(37,211,102,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 font-black text-xs sm:text-sm tracking-wide border border-white/20 cursor-pointer"
                    aria-label="Open WhatsApp Quick Booking"
                >
                    {/* Pulsing ring animation */}
                    {!hasInteracted && (
                        <span className="absolute -inset-1 rounded-full bg-[#25D366] opacity-30 animate-ping pointer-events-none" />
                    )}

                    <div className="w-6 h-6 rounded-full bg-white text-[#25D366] flex items-center justify-center shrink-0">
                        <MessageCircle size={16} className="fill-current" />
                    </div>

                    <span className="font-extrabold whitespace-nowrap">Book on WhatsApp</span>

                    <span className="bg-black/20 text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-emerald-100 hidden md:inline-block">
                        ⚡ 10s
                    </span>
                </button>
            </div>

            {/* Modal */}
            <WhatsAppBookingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialData={modalData}
            />
        </>
    );
}

/**
 * Utility helper to open WhatsApp quick-booking modal from anywhere in the app
 */
export function triggerWhatsAppBooking(data?: WhatsAppInitialData) {
    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent("open-whatsapp-booking", { detail: data })
        );
    }
}
