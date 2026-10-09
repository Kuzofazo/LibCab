"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

interface NavbarUser {
  id?: string;
  name: string;
  email?: string;
  role?: "RIDER" | "DRIVER" | "ADMIN" | "SUPER_ADMIN" | string;
}

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<NavbarUser | null>(null);
  const pathname = usePathname();
  const isDashboard = pathname?.includes("/driver") || pathname?.includes("/rider") || pathname?.includes("/admin");

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
      const scrolled = window.scrollY > 20;
      setIsScrolled(prev => (prev !== scrolled ? scrolled : prev));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    if (pathname === "/") {
      e.preventDefault();
      const el = document.getElementById(targetId.toLowerCase());
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-[200] transition-all duration-300 border-b",
        isScrolled || isDashboard
          ? "bg-white/95 backdrop-blur-md shadow-sm border-slate-200 py-3.5"
          : "bg-transparent border-transparent py-5"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" prefetch={true} className="flex items-center gap-3 group">
          <Image
            src="/africab-logo.png"
            alt="AfriCab Logo"
            width={56}
            height={56}
            className="h-12 sm:h-14 w-auto object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
            priority
          />
          <span
            className="text-xl font-black tracking-tight text-slate-900 hidden sm:block"
          >
            AfriCab
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-7">
          {["Ride", "Drive", "Business", "About", "Contact"].map((item) => (
            <Link
              key={item}
              href={`/#${item.toLowerCase()}`}
              prefetch={true}
              onClick={(e) => handleNavClick(e, item)}
              className="text-sm font-bold text-slate-600 hover:text-slate-950 transition-all hover:scale-105 cursor-pointer"
            >
              {item}
            </Link>
          ))}
          {/* Fleet Portal — only visible to logged-in admins */}
          {user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
            <Link
              href="/fleet"
              prefetch={true}
              className="text-xs font-black px-3 py-1 rounded-full transition-all flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Fleet Portal
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-6">
              <Link
                href={user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "/admin" : user.role === "DRIVER" ? "/driver" : "/rider"}
                prefetch={true}
                className="text-sm font-black flex items-center gap-2 text-slate-900 hover:text-emerald-700 transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem("user");
                  window.location.href = "/";
                }}
                className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
              >
                Log out
              </button>
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ring-4 bg-slate-900 text-white ring-slate-100 transition-all">
                {user.name.charAt(0)}
              </div>
            </div>
          ) : (
            <>
              <Link href="/login" prefetch={true} className="text-sm font-medium text-gray-900 hover:text-gray-600">
                Log in
              </Link>
              <Link
                href="/signup"
                prefetch={true}
                className="px-5 py-2.5 bg-[#042a22] text-white text-sm font-bold rounded-full hover:bg-emerald-900 transition-all hover:shadow-lg flex items-center gap-2"
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
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-2xl">
          <div className="container mx-auto px-4 py-6 flex flex-col gap-2">
            {["Ride", "Drive", "Business", "About", "Contact"].map((item) => (
              <Link
                key={item}
                href={`/#${item.toLowerCase()}`}
                prefetch={true}
                className="text-base font-semibold text-gray-800 py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors"
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleNavClick(e, item);
                }}
              >
                {item}
              </Link>
            ))}
            {/* Fleet Portal — only visible to logged-in admins */}
            {user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
              <Link
                href="/fleet"
                className="text-base font-bold text-emerald-700 bg-emerald-50 py-3 px-4 rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-between"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>Enterprise Fleet Portal</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </Link>
            )}
            <div className="border-t border-gray-100 mt-2 pt-4 flex flex-col gap-3">
              {user ? (
                <>
                  <Link
                    href={user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "/admin" : user.role === "DRIVER" ? "/driver" : "/rider"}
                    className="text-base font-bold text-gray-900 py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard →
                  </Link>
                  <button
                    onClick={() => { localStorage.removeItem("user"); window.location.href = "/"; }}
                    className="text-left text-base font-medium text-red-600 py-3 px-4 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-base font-medium text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="px-6 py-3 bg-[#042a22] text-white text-center text-sm font-bold rounded-2xl hover:bg-emerald-900 transition-all"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
