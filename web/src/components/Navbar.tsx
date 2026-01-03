"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils"; // We'll need to create this or just inline

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Navbar failed to load user", e);
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
        isScrolled
          ? "bg-white/80 backdrop-blur-md shadow-sm border-gray-100 py-3"
          : "bg-transparent py-5"
      )}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <img
            src="/libcab-logo.png"
            alt="LibCab Logo"
            className="h-12 w-auto object-contain group-hover:scale-105 transition-transform"
          />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {["Ride", "Drive", "Business", "About"].map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
            >
              {item}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-6">
              <Link
                href={user.role === "ADMIN" ? "/admin" : user.role === "DRIVER" ? "/driver" : "/rider"}
                className="text-sm font-bold text-gray-900 flex items-center gap-2 hover:text-[#D32F2F] transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem("user");
                  window.location.href = "/";
                }}
                className="text-sm font-medium text-gray-500 hover:text-black"
              >
                Log out
              </button>
              <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold text-xs ring-4 ring-gray-100">
                {user.name.charAt(0)}
              </div>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-900 hover:text-gray-600">
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 bg-[#D32F2F] text-white text-sm font-bold rounded-full hover:bg-red-700 transition-all hover:shadow-lg flex items-center gap-2"
              >
                Sign up <ChevronRight size={16} />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-gray-900"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 p-6 shadow-xl animate-in slide-in-from-top-5">
          <div className="flex flex-col gap-4">
            {["Ride", "Drive", "Business", "About"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-lg font-medium text-gray-900"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item}
              </Link>
            ))}
            <hr className="my-2" />
            <Link href="/login" className="text-lg font-medium text-gray-900">
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-5 py-3 bg-black text-white text-center text-sm font-bold rounded-full"
            >
              Sign up
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
