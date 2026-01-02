import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MainPageContent from "@/components/MainPageContent";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <MainPageContent />
      <Footer />
    </main>
  );
}

