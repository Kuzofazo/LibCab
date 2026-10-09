import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Metadata } from "next";
import { Shield, Zap, Wallet, CheckCircle, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Why AfriCab is the Best Cab Booking App in Liberia",
  description: "Comparing taxi services in Monrovia? Learn why AfriCab's safety, Mobile Money integration, and instant booking make it the top ride-hailing app in Liberia.",
  keywords: ["Best cab booking app in Liberia", "AfriCab vs other taxis", "Safe ride-hailing Monrovia", "Liberia taxi comparison"],
};

export default function ComparisonPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 text-center max-w-4xl">
          <span className="text-red-600 font-bold tracking-widest uppercase text-sm mb-4 block">AfriCab Advantage</span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6">
            Why AfriCab is the Best Cab Booking App in Liberia
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Not all rides are created equal. See how AfriCab sets a new standard for transport in Monrovia by focusing on safety, affordability, and digital integration.
          </p>
        </div>
      </section>

      {/* Comparison Table Section */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="p-6 font-bold text-gray-500 w-1/3">Features</th>
                  <th className="p-6 font-black text-2xl text-red-600 border-l border-r border-gray-200 bg-red-50/30 w-1/3">AfriCab</th>
                  <th className="p-6 font-bold text-gray-500 w-1/3">Traditional Taxis</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-6 text-lg font-medium">Vetted Drivers</td>
                  <td className="p-6 border-l border-r border-gray-100 bg-red-50/10 text-center"><CheckCircle className="w-6 h-6 text-green-500 mx-auto" /></td>
                  <td className="p-6 text-center"><XCircle className="w-6 h-6 text-red-300 mx-auto" /></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-6 text-lg font-medium">Real-time GPS Tracking</td>
                  <td className="p-6 border-l border-r border-gray-100 bg-red-50/10 text-center"><CheckCircle className="w-6 h-6 text-green-500 mx-auto" /></td>
                  <td className="p-6 text-center"><XCircle className="w-6 h-6 text-red-300 mx-auto" /></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-6 text-lg font-medium">Mobile Money (MoMo)</td>
                  <td className="p-6 border-l border-r border-gray-100 bg-red-50/10 text-center"><CheckCircle className="w-6 h-6 text-green-500 mx-auto" /></td>
                  <td className="p-6 text-center"><XCircle className="w-6 h-6 text-red-300 mx-auto" /></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-6 text-lg font-medium">Upfront Transparent Pricing</td>
                  <td className="p-6 border-l border-r border-gray-100 bg-red-50/10 text-center"><CheckCircle className="w-6 h-6 text-green-500 mx-auto" /></td>
                  <td className="p-6 text-center"><XCircle className="w-6 h-6 text-red-300 mx-auto" /></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-6 text-lg font-medium">App & Web Booking</td>
                  <td className="p-6 border-l border-r border-gray-100 bg-red-50/10 text-center"><CheckCircle className="w-6 h-6 text-green-500 mx-auto" /></td>
                  <td className="p-6 text-center"><XCircle className="w-6 h-6 text-red-300 mx-auto" /></td>
                </tr>
                 <tr>
                  <td className="p-6 text-lg font-medium">SOS Safety Button</td>
                  <td className="p-6 border-l border-r border-gray-100 bg-red-50/10 text-center"><CheckCircle className="w-6 h-6 text-green-500 mx-auto" /></td>
                  <td className="p-6 text-center"><XCircle className="w-6 h-6 text-red-300 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight">The difference is in the details</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
             <div className="space-y-4">
               <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
                 <Shield size={28} />
               </div>
               <h3 className="text-2xl font-bold">Uncompromised Safety</h3>
               <p className="text-gray-600 leading-relaxed">
                 We don't compromise on safety. Every driver on our platform undergoes a rigorous background check. Furthermore, every ride is GPS tracked, and an SOS button is directly built into your dashboard.
               </p>
             </div>
             
             <div className="space-y-4">
               <div className="w-14 h-14 rounded-2xl bg-yellow-100 flex items-center justify-center text-yellow-600">
                 <Wallet size={28} />
               </div>
               <h3 className="text-2xl font-bold">Cashless Convenience</h3>
               <p className="text-gray-600 leading-relaxed">
                 Fumbling for cash or arguing over change is a thing of the past. AfriCab integrates natively with Mobile Money (MoMo), allowing you to pay instantly and securely from your phone.
               </p>
             </div>

             <div className="space-y-4">
               <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                 <Zap size={28} />
               </div>
               <h3 className="text-2xl font-bold">Instant Dispatching</h3>
               <p className="text-gray-600 leading-relaxed">
                 Our proprietary routing engine ensures that the closest available driver is assigned to you in seconds, cutting down wait times significantly compared to standing on the street.
               </p>
             </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-900 text-white text-center">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold mb-6">Experience the best taxi service in Liberia</h2>
          <a href="/book/guest" className="inline-block bg-red-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-red-600 transition-all shadow-[0_0_30px_-5px_rgba(239,68,68,0.5)]">
            Book a Ride Now
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
