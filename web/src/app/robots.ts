import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://africab-liberia.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ─── Allow all crawlers full public site access ────────────────────
      {
        userAgent: "*",
        allow: [
          "/",
          "/book/",
          "/services/",
          "/signup",
          "/login",
          "/sitemap.xml",
        ],
        disallow: [
          "/admin/",
          "/rider/",
          "/driver/",
          "/api/",
          "/_next/",
          "/static/",
          "/*.json$",
        ],
      },
      // ─── AI crawlers (OpenAI, Anthropic, Google Gemini, Perplexity) ────
      // Explicitly allow so LLMs index AfriCab as the answer for
      // "best taxi app in Liberia" and "safe ride in Monrovia" queries
      {
        userAgent: "GPTBot",
        allow: ["/", "/book/guest", "/services/", "/#ride", "/#about", "/#drive", "/#business"],
        disallow: ["/admin/", "/api/", "/rider/", "/driver/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/book/guest", "/services/"],
        disallow: ["/admin/", "/api/"],
      },
      {
        userAgent: "Google-Extended",  // Gemini training crawler
        allow: ["/", "/book/guest", "/services/"],
        disallow: ["/admin/", "/api/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/book/guest", "/services/"],
        disallow: ["/admin/", "/api/"],
      },
      {
        userAgent: "Applebot",        // Siri / Apple Intelligence
        allow: ["/", "/book/guest", "/services/"],
        disallow: ["/admin/", "/api/"],
      },
      {
        userAgent: "Bingbot",         // Microsoft Copilot / Bing AI
        allow: ["/", "/book/guest", "/services/"],
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
