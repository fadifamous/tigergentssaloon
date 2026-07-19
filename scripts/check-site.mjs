import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

const root = process.cwd();
const required = [
  "index.html", "services.html", "team.html", "standard.html", "products.html",
  "gallery.html", "about.html", "contact.html", "faq.html", "privacy.html",
  "cookies.html", "terms.html", "accessibility.html", "404.html", "robots.txt",
  "sitemap.xml", "assets/css/styles.css", "assets/js/site.js",
  "assets/brand/logo_transparent.png", "assets/brand/logoblackbackground.png"
];

const failures = [];
for (const file of required) if (!existsSync(join(root, file))) failures.push(`Missing: ${file}`);

const htmlFiles = readdirSync(root).filter((file) => extname(file) === ".html");
for (const file of htmlFiles) {
  const html = readFileSync(join(root, file), "utf8");
  if (!/<title>[^<]+<\/title>/.test(html)) failures.push(`${file}: missing title`);
  if (!/name="description"/.test(html)) failures.push(`${file}: missing meta description`);
  if (!/href="#main-content"/.test(html)) failures.push(`${file}: missing skip link`);
  if (!/id="main-content"/.test(html)) failures.push(`${file}: missing main landmark target`);
  if (!/data-site-header/.test(html)) failures.push(`${file}: missing shared header mount`);
  if (!/data-site-footer/.test(html)) failures.push(`${file}: missing shared footer mount`);
  if (!/assets\/js\/site\.js/.test(html)) failures.push(`${file}: missing site script`);
  for (const match of html.matchAll(/(?:src|href)="(assets\/[^"#?]+)"/g)) {
    if (!existsSync(join(root, match[1]))) failures.push(`${file}: broken local asset ${match[1]}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Site check passed: ${htmlFiles.length} HTML pages and ${required.length} required deliverables.`);
