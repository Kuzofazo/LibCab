import React from "react";
import { Shield, Clock, Wallet, MessageCircle } from "lucide-react";

const features = [
    {
        icon: <Shield className="w-6 h-6 text-white" />,
        title: "Safety First",
        description: "Multi-level safety features including SOS, ride tracking, and vetted drivers.",
        color: "from-blue-500 to-blue-600",
        iconBg: "bg-blue-500",
    },
    {
        icon: <Clock className="w-6 h-6 text-white" />,
        title: "Always On Time",
        description: "Advanced dispatch algorithms ensure your driver arrives in minutes.",
        color: "from-green-500 to-green-600",
        iconBg: "bg-green-500",
    },
    {
        icon: <Wallet className="w-6 h-6 text-white" />,
        title: "Transparent Pricing",
        description: "Know your fare before you ride. No hidden fees or surprises.",
        color: "from-purple-500 to-purple-600",
        iconBg: "bg-purple-500",
    },
    {
        icon: <MessageCircle className="w-6 h-6 text-white" />,
        title: "24/7 Support",
        description: "Our dedicated support team is always available to help you via chat or call.",
        color: "from-orange-500 to-orange-600",
        iconBg: "bg-orange-500",
    },
];

export default function Features() {
    return (
        <section id="ride" className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-100 rounded-full blur-3xl opacity-20" />

            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold inline-block mb-4">
                        Why LibCab?
                    </span>
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-gray-900">
                        Built for your <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">comfort</span>
                    </h2>
                    <p className="text-xl text-gray-600">
                        LibCab is built to deliver the best ride-sharing experience in Liberia.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group bg-white p-8 rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 relative overflow-hidden"
                        >
                            {/* Gradient overlay on hover */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                            <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>

                {/* Trust Indicators */}
                <div className="mt-20 text-center">
                    <p className="text-sm text-gray-500 mb-6">Trusted by thousands of riders and drivers</p>
                    <div className="flex justify-center gap-12 flex-wrap">
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-white" />
                                ))}
                            </div>
                            <span className="text-sm font-semibold text-gray-700">10,000+ Users</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex text-yellow-400">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <span className="text-sm font-semibold text-gray-700">4.9 Rating</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
