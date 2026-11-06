import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { SITE_URL } from "@/lib/brand";
const BASE_URL = SITE_URL;

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/categories", changefreq: "weekly", priority: "0.8" },
        ];

        try {
          const url = process.env["VITE_SUPABASE_URL"];
          const key = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
          if (url && key) {
            const res = await fetch(`${url}/rest/v1/products?select=id&limit=1000`, {
              headers: { apikey: key, Authorization: `Bearer ${key}` },
            });
            if (res.ok) {
              const rows = (await res.json()) as { id: string }[];
              for (const row of rows) {
                entries.push({
                  path: `/products/${row.id}`,
                  changefreq: "weekly",
                  priority: "0.7",
                });
              }
            }
          }
        } catch {
          // sitemap stays limited to static routes when products can't be fetched
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
