// app/sitemap.ts
//
// Served at /sitemap.xml so Google can find every page worth showing
// in search: the homepage, each active cook's listing, and the legal
// pages. Refreshed hourly so new cooks appear without a redeploy.

import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE = "https://mealprepmarket.com.au";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/disclaimer`, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data } = await supabase
      .from("cm_cooks")
      .select("id, updated_at")
      .eq("is_active", true);

    for (const cook of (data ?? []) as { id: string; updated_at: string | null }[]) {
      pages.push({
        url: `${SITE}/cooks/${cook.id}`,
        lastModified: cook.updated_at ? new Date(cook.updated_at) : undefined,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // If the database can't be reached, still serve the main pages.
  }

  return pages;
}
