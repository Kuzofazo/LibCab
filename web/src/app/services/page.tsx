import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affordable and Reliable Taxi Services in Monrovia | AfriCab",
  description: "Explore AfriCab's services: fast ride-hailing in Monrovia, safe private car hire across Liberia, and quick bike taxis near you. Reliable transport 24/7.",
  keywords: ["Taxi service in Liberia", "Bike taxi near me", "Private car hire Liberia", "Reliable transport in Monrovia"],
};

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-red-600 to-red-800 text-white text-center">
        <div className="container mx-auto px-6">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Affordable and Reliable Taxi Services in Monrovia
          </h1>
          <p className="text-xl max-w-2xl mx-auto text-red-100">
            From quick bike rides to premium private car hire, AfriCab offers the best transport solutions in Liberia.
          </p>
        </div>
      </section>

      {/* Services List */}
      <section className="py-20">
        <div className="container mx-auto px-6 space-y-24">
          
          {/* Ride Booking */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-red-600 font-bold tracking-widest uppercase text-sm">Most Popular</span>
              <h2 className="text-4xl font-bold text-gray-900">Standard Cab Booking</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                The best cab booking in Liberia. Whether you are commuting to work in Sinkor or heading to Red Light, our standard rides offer safe, air-conditioned comfort with professional drivers.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3"><span className="text-green-500">✓</span> Fast pickups under 5 minutes</li>
                <li className="flex items-center gap-3"><span className="text-green-500">✓</span> Cash & Mobile Money accepted</li>
                <li className="flex items-center gap-3"><span className="text-green-500">✓</span> Vetted and tracked drivers</li>
              </ul>
            </div>
            <div className="bg-gray-100 rounded-3xl h-80 flex items-center justify-center p-8">
              <div className="w-full h-full bg-white rounded-2xl shadow-xl border border-gray-200 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <h3 className="text-xl font-bold mb-2">Ride in Comfort</h3>
                <p className="text-sm text-gray-500">Secure your standard ride instantly.</p>
              </div>
            </div>
          </div>

          {/* Bike Taxi */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 bg-gray-100 rounded-3xl h-80 flex items-center justify-center p-8">
              <div className="w-full h-full bg-white rounded-2xl shadow-xl border border-gray-200 p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-100 rounded-full blur-2xl -ml-10 -mt-10"></div>
                <h3 className="text-xl font-bold mb-2">Beat the Traffic</h3>
                <p className="text-sm text-gray-500">Fast and agile bike taxis.</p>
              </div>
            </div>
            <div className="order-1 md:order-2 space-y-6">
              <span className="text-yellow-600 font-bold tracking-widest uppercase text-sm">Fastest Option</span>
              <h2 className="text-4xl font-bold text-gray-900">Bike Taxi Near Me</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Need to beat the traffic? Our bike taxi service in Monrovia gets you to your destination faster than ever. Every ride includes a helmet for your safety.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3"><span className="text-green-500">✓</span> Skip heavily congested routes</li>
                <li className="flex items-center gap-3"><span className="text-green-500">✓</span> Experienced riders</li>
                <li className="flex items-center gap-3"><span className="text-green-500">✓</span> Most affordable option</li>
              </ul>
            </div>
          </div>

          {/* Private Car Hire */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-blue-600 font-bold tracking-widest uppercase text-sm">Premium Transport</span>
              <h2 className="text-4xl font-bold text-gray-900">Private Car Hire in Liberia</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Planning a trip outside Monrovia or need a vehicle for the whole day? Our private car hire gives you a dedicated vehicle and driver for a stress-free travel experience across Liberia.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3"><span className="text-green-500">✓</span> Hourly or daily rates available</li>
                <li className="flex items-center gap-3"><span className="text-green-500">✓</span> Premium SUVs and Sedans</li>
                <li className="flex items-center gap-3"><span className="text-green-500">✓</span> Interstate travel supported</li>
              </ul>
            </div>
            <div className="bg-gray-100 rounded-3xl h-80 flex items-center justify-center p-8">
              <div className="w-full h-full bg-slate-900 rounded-2xl shadow-xl border border-gray-800 p-6 relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <h3 className="text-xl font-bold mb-2">Ride Premium</h3>
                <p className="text-sm text-gray-400">Exclusive travel experience.</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-50 border-t border-gray-200 text-center">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready for a reliable ride?</h2>
          <a href="/book/guest" className="inline-block bg-red-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg hover:scale-105 active:scale-95">
            Book a Taxi Now
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
