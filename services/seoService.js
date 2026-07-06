/** Generates the small companion files every deployed site ships alongside index.html */

function generateRobotsTxt(liveUrl) {
  return `User-agent: *
Allow: /

Sitemap: ${liveUrl}/sitemap.xml
`;
}

function generateSitemap(liveUrl) {
  const today = new Date().toISOString().split('T')[0];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${liveUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
}

module.exports = { generateRobotsTxt, generateSitemap };
