import React from "react";
import Link from "next/link";
import { Instagram, Twitter, Facebook } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-black text-white py-20">
            <div className="container mx-auto px-6">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold tracking-tighter">Paye</h2>
                        <p className="text-gray-400">Moving people, changing lives.</p>
                    </div>

                    <div>
                        <h4 className="font-bold mb-4">Company</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><Link href="#" className="hover:text-white transition-colors">About us</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Our offerings</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Newsroom</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Investors</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold mb-4">Products</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><Link href="#" className="hover:text-white transition-colors">Ride</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Drive</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Deliver</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Business</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold mb-4">Social</h4>
                        <div className="flex gap-4">
                            <Link href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                                <Facebook size={20} />
                            </Link>
                            <Link href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                                <Twitter size={20} />
                            </Link>
                            <Link href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                                <Instagram size={20} />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
                    <p>© 2025 Paye Technologies Inc.</p>
                    <div className="flex gap-6">
                        <Link href="#" className="hover:text-white">Privacy</Link>
                        <Link href="#" className="hover:text-white">Accessibility</Link>
                        <Link href="#" className="hover:text-white">Terms</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
