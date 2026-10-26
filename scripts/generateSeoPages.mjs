import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEO_ROUTES, sectionMetadata } from "../src/services/seo.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(projectRoot, "dist");
const siteUrl = "https://lexor392.github.io/my-app-two_genshin/";
const imageUrl = new URL("assets/teyvat-world.png", siteUrl).href;
const rootHtml = await readFile(path.join(distRoot, "index.html"), "utf8");

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function withMetadata(section, canonical) {
  const { title, description } = sectionMetadata(section, "en");
  const tags = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Genshin Impact Random Lab" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${imageUrl}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<script id="seo-jsonld" type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url: canonical,
      isPartOf: { "@type": "WebSite", name: "Genshin Impact Random Lab", url: siteUrl },
    })}</script>`,
  ].join("\n    ");
  let html = rootHtml
    .replace(/<html lang="[^"]*"/i, '<html lang="en"')
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/\s*<meta name="description"[^>]*>/i, "")
    .replace(/\s*<meta (?:property="og:[^"]*"|name="twitter:[^"]*")[^>]*>/gi, "")
    .replace(/\s*<link rel="canonical"[^>]*>/gi, "")
    .replace(/\s*<script id="seo-jsonld"[\s\S]*?<\/script>/gi, "");
  html = html.replace("</head>", `    ${tags}\n  </head>`);
  return html;
}

await writeFile(path.join(distRoot, "index.html"), withMetadata("dashboard", siteUrl));

for (const { section, slug } of SEO_ROUTES) {
  if (!slug) continue;
  const directory = path.join(distRoot, slug);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), withMetadata(section, new URL(`${slug}/`, siteUrl).href));
}

const sitemapEntries = SEO_ROUTES.map(({ section, slug }) => {
  const { url } = sectionMetadata(section, "en");
  return `  <url><loc>${url}</loc><changefreq>weekly</changefreq><priority>${section === "dashboard" ? "1.0" : "0.7"}</priority></url>`;
}).join("\n");
await writeFile(path.join(distRoot, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`);
