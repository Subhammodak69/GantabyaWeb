const fs = require("fs");
const path = require("path");

const SITE_URL = "https://gantabyaa.com";
const API_URL = "https://api.gantabyaa.in";
const PUBLIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/tours", changefreq: "daily", priority: "0.9" },
  { path: "/destinations", changefreq: "weekly", priority: "0.8" },
  { path: "/leaderboard", changefreq: "weekly", priority: "0.6" },
  { path: "/custom-tour-enquiry", changefreq: "monthly", priority: "0.8" },
  { path: "/contact", changefreq: "monthly", priority: "0.7" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms-of-service", changefreq: "yearly", priority: "0.3" },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalisePackage(item) {
  const slug = item?.slug || item?.package_id || item?.id;
  if (!slug) return null;

  const updatedAt = item.updated_at || item.modified_at || item.updatedAt;
  return {
    path: `/journey/${encodeURIComponent(String(slug))}`,
    changefreq: "weekly",
    priority: "0.8",
    ...(updatedAt ? { lastmod: new Date(updatedAt).toISOString().slice(0, 10) } : {}),
  };
}

async function fetchPackages() {
  const packages = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const response = await fetch(
      `${API_URL}/api/v1/tour-packages?page=${page}&page_size=${pageSize}&sort_by=created_at&sort_order=desc`,
      { headers: { Accept: "application/json" } }
    );
    if (!response.ok) throw new Error(`Tour API returned ${response.status}`);

    const body = await response.json();
    const raw = body?.data;
    const items = Array.isArray(raw) ? raw : raw?.items || raw?.results || raw?.packages || [];
    packages.push(...items);

    const pagination = body?.pagination || raw?.pagination || {};
    const totalPages = Number(pagination.total_pages || Math.ceil(Number(pagination.total_items || items.length) / pageSize));
    if (!items.length) break;
    if (pagination.has_next === true) {
      page += 1;
      continue;
    }
    if (pagination.has_next === false || page >= totalPages) break;
    page += 1;
  }

  return packages.map(normalisePackage).filter(Boolean);
}

function renderSitemap(routes) {
  const entries = routes.map((route) => {
    const lastmod = route.lastmod ? `\n    <lastmod>${escapeXml(route.lastmod)}</lastmod>` : "";
    return `  <url>\n    <loc>${escapeXml(`${SITE_URL}${route.path}`)}</loc>${lastmod}\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
}

async function main() {
  let routes = [...PUBLIC_ROUTES];

  try {
    const packageRoutes = await fetchPackages();
    routes = routes.concat(packageRoutes);
    console.log(`Sitemap: added ${packageRoutes.length} published tour page(s).`);
  } catch (error) {
    // A temporary API outage must not prevent the frontend from building.
    console.warn(`Sitemap: could not load tour pages (${error.message}). Using public routes only.`);
  }

  const uniqueRoutes = [...new Map(routes.map((route) => [route.path, route])).values()];
  const outputPath = path.join(__dirname, "..", "public", "sitemap.xml");
  fs.writeFileSync(outputPath, renderSitemap(uniqueRoutes), "utf8");
  console.log(`Sitemap: wrote ${uniqueRoutes.length} URL(s) to public/sitemap.xml.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
