"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Car,
  Building2,
  Info,
  PhoneCall,
} from "lucide-react";
import { triggerWhatsAppBooking } from "@/components/WhatsAppFloatingButton";
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<NavbarUser | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isDashboard =
    pathname?.includes("/driver") ||
    pathname?.includes("/rider") ||
    pathname?.includes("/admin");

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
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close user dropdown menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [userMenuOpen]);

  // Close mobile and user dropdown menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    if (pathname === "/") {
      e.preventDefault();
      const el = document.getElementById(targetId.toLowerCase());
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const dashboardUrl = isAdmin
    ? "/admin"
    : user?.role === "DRIVER"
    ? "/driver"
    : "/rider";

  const navItems = [
    { name: "Ride", href: "/#ride", icon: Car },
    { name: "Drive", href: "/#drive", icon: ShieldCheck },
    { name: "Business", href: "/#business", icon: Building2 },
    { name: "About", href: "/#about", icon: Info },
    { name: "Contact", href: "/#contact", icon: PhoneCall },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-[200] transition-all duration-300 border-b",
        isScrolled || isDashboard
          ? "bg-white/95 backdrop-blur-md shadow-xs border-slate-200/80 py-3"
          : "bg-transparent border-transparent py-4 sm:py-5"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-6 min-w-0">
        {/* Brand Logo */}
        <Link
          href="/"
          prefetch={true}
          className="flex items-center gap-2.5 sm:gap-3 shrink-0 group select-none"
        >
          <Image
            src="/africab-logo.png"
            alt="AfriCab Logo"
            width={52}
            height={52}
            className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm group-hover:scale-105 transition-transform shrink-0"
            priority
          />
          <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 shrink-0">
            AfriCab
          </span>
        </Link>

        {/* Desktop Navigation Links (Visible on lg: screens and up) */}
        <div className="hidden lg:flex items-center gap-4 xl:gap-7 shrink-0">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              onClick={(e) => handleNavClick(e, item.name)}
              className="text-xs xl:text-sm font-bold text-slate-600 hover:text-slate-950 transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
            >
              {item.name}
            </Link>
          ))}

          {/* Fleet Portal pill (visible to logged-in admins on xl: and up) */}
          {isAdmin && (
            <Link
              href="/fleet"
              prefetch={true}
              className="hidden xl:inline-flex text-xs font-black px-3 py-1.5 rounded-full transition-all items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 whitespace-nowrap shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Fleet Portal
            </Link>
          )}
        </div>

        {/* Actions Area */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* WhatsApp Quick-Booking Pill */}
          <button
            type="button"
            onClick={() => triggerWhatsAppBooking()}
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-black flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
            title="Book Ride via WhatsApp (10s)"
          >
            <MessageCircle size={15} className="text-[#25D366] fill-[#25D366] shrink-0" />
            <span className="hidden sm:inline">WhatsApp Dispatch</span>
            <span className="sm:hidden font-bold">WhatsApp</span>
          </button>

          {/* User Profile Pill or Guest Auth */}
          {user ? (
            <div className="relative shrink-0" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-full hover:bg-slate-100/90 border border-transparent hover:border-slate-200 transition-all cursor-pointer shrink-0"
                aria-expanded={userMenuOpen}
                aria-label="User profile menu"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-black text-xs text-white bg-slate-900 ring-2 ring-emerald-500/20 shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-tight max-w-[100px] truncate">
                    {user.name.split(" ")[0]}
                  </span>
                  <span className="text-[10px] font-medium text-emerald-700 capitalize leading-tight">
                    {user.role ? user.role.toLowerCase() : "user"}
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-slate-500 transition-transform hidden sm:block",
                    userMenuOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Floating User Profile Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[250] animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user.name}
                    </p>
                    {user.email && (
                      <p className="text-[11px] text-slate-500 truncate">
                        {user.email}
                      </p>
                    )}
                    <span className="inline-block mt-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {user.role || "Rider"}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      href={dashboardUrl}
                      prefetch={true}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-colors"
                    >
                      <LayoutDashboard size={15} className="text-emerald-600" />
                      <span>Dashboard</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/fleet"
                        prefetch={true}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-colors"
                      >
                        <ShieldCheck size={15} className="text-emerald-600" />
                        <span>Enterprise Fleet Portal</span>
                      </Link>
                    )}

                    <Link
                      href="/#ride"
                      prefetch={true}
                      onClick={(e) => {
                        setUserMenuOpen(false);
                        handleNavClick(e, "Ride");
                      }}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-colors"
                    >
                      <Car size={15} className="text-slate-500" />
                      <span>Book a Ride</span>
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 pt-1 mt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <LogOut size={15} />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <Link
                href="/login"
                prefetch={true}
                className="text-xs font-bold text-slate-700 hover:text-slate-950 px-3 py-1.5 transition-colors whitespace-nowrap"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                prefetch={true}
                className="px-4 py-2 bg-[#042a22] text-white text-xs font-bold rounded-full hover:bg-emerald-900 transition-all hover:shadow-md flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>Sign up</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          )}

          {/* Mobile/Tablet Menu Button (Visible on < lg screens) */}
          <button
            type="button"
            className="lg:hidden p-2 rounded-xl text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Responsive Drawer (< lg) */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-white/98 backdrop-blur-xl border-b border-slate-200 shadow-2xl transition-all animate-in fade-in slide-in-from-top-3 duration-200 max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="container mx-auto px-4 py-5 flex flex-col gap-3">
            {/* User Profile Card (if logged in) */}
            {user && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white bg-slate-900 shrink-0 ring-2 ring-emerald-500/20">
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {user.name}
                    </p>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {user.role || "Rider"}
                    </span>
                  </div>
                </div>
                <Link
                  href={dashboardUrl}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-emerald-800 transition-colors shrink-0 whitespace-nowrap"
                >
                  Dashboard →
                </Link>
              </div>
            )}

            {/* Fast WhatsApp Booking Card */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                triggerWhatsAppBooking();
              }}
              className="w-full py-3 px-4 rounded-2xl text-sm font-black flex items-center justify-between bg-gradient-to-r from-emerald-50 to-emerald-100/60 text-emerald-950 border border-emerald-200 hover:border-emerald-300 transition-all cursor-pointer shadow-xs"
            >
              <span className="flex items-center gap-2.5">
                <MessageCircle size={18} className="text-[#25D366] fill-[#25D366] shrink-0" />
                <span>Book on WhatsApp</span>
              </span>
              <span className="text-[11px] bg-[#25D366] text-white px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                10s Instant
              </span>
            </button>

            {/* Navigation Links */}
            <div className="flex flex-col gap-1 py-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch={true}
                    className="flex items-center justify-between text-base font-bold text-slate-800 py-3 px-4 rounded-xl hover:bg-slate-50 transition-colors"
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      handleNavClick(e, item.name);
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <IconComponent size={18} className="text-slate-500" />
                      {item.name}
                    </span>
                    <ChevronRight size={16} className="text-slate-400" />
                  </Link>
                );
              })}

              {isAdmin && (
                <Link
                  href="/fleet"
                  prefetch={true}
                  className="flex items-center justify-between text-base font-bold text-emerald-800 bg-emerald-50/80 py-3 px-4 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="flex items-center gap-3">
                    <ShieldCheck size={18} className="text-emerald-600" />
                    Enterprise Fleet Portal
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </Link>
              )}
            </div>

            {/* Account Controls / Auth */}
            <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 text-sm font-bold text-red-600 py-3 px-4 rounded-xl bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Log out</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Link
                    href="/login"
                    prefetch={true}
                    className="text-center text-sm font-bold text-slate-800 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    prefetch={true}
                    className="text-center text-sm font-bold text-white py-3 px-4 rounded-xl bg-[#042a22] hover:bg-emerald-900 transition-colors shadow-xs"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
