import React from "react";
import Link from "next/link";
import { Instagram, Twitter, Facebook, MapPin, Mail, Phone } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-black text-white py-16 sm:py-20">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1 space-y-4">
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tighter">AfriCab</h2>
                        <p className="text-gray-400 text-sm leading-relaxed">Moving people, changing lives — Liberia&apos;s most trusted ride-hailing platform.</p>
                        <div className="space-y-2 text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                                <MapPin size={13} className="text-red-500" />
                                <span>Sinkor, Monrovia, Liberia</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail size={13} className="text-red-500" />
                                <a href="mailto:hello@africab.com" className="hover:text-white transition-colors">hello@africab.com</a>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone size={13} className="text-red-500" />
                                <span>+231 77 000 0000</span>
                            </div>
                        </div>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-300">Company</h4>
                        <ul className="space-y-2.5 text-gray-400 text-sm">
                            <li><Link href="#about" className="hover:text-white transition-colors">About Us</Link></li>
                            <li><Link href="#contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Newsroom</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Investors</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                        </ul>
                    </div>

                    {/* Products */}
                    <div>
                        <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-300">Products</h4>
                        <ul className="space-y-2.5 text-gray-400 text-sm">
                            <li><Link href="#ride" className="hover:text-white transition-colors">Ride</Link></li>
                            <li><Link href="#drive" className="hover:text-white transition-colors">Drive</Link></li>
                            <li><Link href="#business" className="hover:text-white transition-colors">Business</Link></li>
                            <li><Link href="/fleet" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">Fleet Tracking Portal 🚀</Link></li>
                            <li><Link href="/book/guest" className="hover:text-white transition-colors">Guest Booking</Link></li>
                        </ul>
                    </div>

                    {/* Social & Legal */}
                    <div>
                        <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-300">Follow Us</h4>
                        <div className="flex gap-3 mb-6">
                            <Link href="#" className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                                <Facebook size={16} />
                            </Link>
                            <Link href="#" className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                                <Twitter size={16} />
                            </Link>
                            <Link href="#" className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                                <Instagram size={16} />
                            </Link>
                        </div>
                        <div className="space-y-2 text-xs text-gray-500">
                            <p>Available on Android & iOS</p>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 bg-gray-800 rounded text-[10px]">Google Play</span>
                                <span className="px-2 py-1 bg-gray-800 rounded text-[10px]">App Store</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
                    <p>© {new Date().getFullYear()} LTP Services Inc. · AfriCab™ · Monrovia, Liberia</p>
                    <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                        <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="#" className="hover:text-white transition-colors">Accessibility</Link>
                        <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
                        <Link href="#" className="hover:text-white transition-colors">Cookie Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
