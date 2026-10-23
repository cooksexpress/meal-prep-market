// app/robots.ts
//
// Served at /robots.txt. Lets Google read the public pages and points
// it at the sitemap; keeps private areas (dashboards, inbox, admin,
// checkout, sign-in) out of search results.

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cook-dashboard", "/inbox", "/admin", "/order", "/auth", "/onboarding/", "/login"],
    },
    sitemap: "https://mealprepmarket.com.au/sitemap.xml",
    host: "https://mealprepmarket.com.au",
  };
}
