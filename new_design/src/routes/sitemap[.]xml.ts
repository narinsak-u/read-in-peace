import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://id-preview--ea3f1161-8ddd-47d0-ae98-7fae678099fc.lovable.app";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const paths = [
          "/",
          "/book/architecture-of-memory",
          "/book/the-hidden-sea",
          "/book/logic-and-form",
          "/book/paper-shadows",
          "/book/the-long-night",
        ];
        const urls = paths
          .map(
            (path) =>
              `  <url>\n    <loc>${BASE_URL}${path}</loc>\n    <changefreq>${path === "/" ? "daily" : "weekly"}</changefreq>\n    <priority>${path === "/" ? "1.0" : "0.8"}</priority>\n  </url>`,
          )
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
