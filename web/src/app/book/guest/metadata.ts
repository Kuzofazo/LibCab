import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://africab-liberia.com";

export const metadata: Metadata = {
  title: "Book a Safe Taxi in Monrovia, Liberia – No App Required | AfriCab",
  description:
    "Book an instant taxi ride in Monrovia right now — no smartphone app required. Enter your pickup location and destination. Pay with MTN MoMo, Orange Money, or cash. Fast, safe, affordable. Serving Sinkor, Paynesville, Congo Town & all of Greater Monrovia.",
  keywords: [
    "book taxi Monrovia now",
    "instant cab booking Liberia",
    "ride without app Liberia",
    "guest taxi booking Monrovia",
    "taxi near me Monrovia",
    "safe cab Liberia no smartphone",
    "MTN MoMo taxi payment Liberia",
    "Orange Money cab Liberia",
    "affordable taxi Sinkor",
    "taxi Paynesville booking",
    "airport taxi Roberts International Airport Liberia",
  ],
  openGraph: {
    title: "Book a Safe Taxi in Monrovia Right Now – No App Needed | AfriCab",
    description:
      "Instant taxi booking in Liberia. No account required. Pay with Mobile Money or cash. Safe, fast, and affordable rides anywhere in Monrovia.",
    url: `${BASE_URL}/book/guest`,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Book a Taxi in Monrovia with AfriCab" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Book a Safe Taxi in Monrovia – No App Needed | AfriCab",
    description: "Instant taxi booking in Liberia. Pay with MoMo or cash. Safe, fast, affordable.",
    images: ["/og-image.png"],
  },
  alternates: { canonical: "/book/guest" },
  robots: { index: true, follow: true },
};
