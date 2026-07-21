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
const retiredPlatformPattern = /\x66\x72\x65\x73\x68\x61/i;
for (const file of required) if (!existsSync(join(root, file))) failures.push(`Missing: ${file}`);

const htmlFiles = readdirSync(root).filter((file) => extname(file) === ".html");
for (const file of htmlFiles) {
  const html = readFileSync(join(root, file), "utf8");
  if (retiredPlatformPattern.test(html)) failures.push(`${file}: contains a retired booking-platform reference`);
  if (!/<title>[^<]+<\/title>/.test(html)) failures.push(`${file}: missing title`);
  if (!/name="description"/.test(html)) failures.push(`${file}: missing meta description`);
  if (!/href="#main-content"/.test(html)) failures.push(`${file}: missing skip link`);
  if (!/id="main-content"/.test(html)) failures.push(`${file}: missing main landmark target`);
  if (!/data-site-header/.test(html)) failures.push(`${file}: missing shared header mount`);
  if (!/data-site-footer/.test(html)) failures.push(`${file}: missing shared footer mount`);
  if (!/assets\/js\/site\.js/.test(html)) failures.push(`${file}: missing site script`);
  if ((html.match(/GTM-K6LPRZ84/g) || []).length !== 2) failures.push(`${file}: Google Tag Manager snippets are incomplete`);
  if (!/<head>\s*<!-- Google Tag Manager -->/.test(html)) failures.push(`${file}: Google Tag Manager is not first in head`);
  if (!/<body>\s*<!-- Google Tag Manager \(noscript\) -->/.test(html)) failures.push(`${file}: GTM noscript is not first in body`);
  for (const match of html.matchAll(/<a\b[^>]*data-track="phone_click"[^>]*>/g)) {
    if (!/data-phone-location="[^"]+"/.test(match[0])) failures.push(`${file}: tracked phone link is missing its location`);
  }
  for (const match of html.matchAll(/(?:src|href)="(assets\/[^"#?]+)"/g)) {
    if (!existsSync(join(root, match[1]))) failures.push(`${file}: broken local asset ${match[1]}`);
  }
}

const homepage = readFileSync(join(root, "index.html"), "utf8");
if (!/100\+ customer reviews/.test(homepage)) {
  failures.push("index.html: missing the current Google review milestone");
}
if (!/Directly linked to Google/.test(homepage)) {
  failures.push("index.html: missing review-source transparency copy");
}
if (!/data-track="google_reviews_click"/.test(homepage)) {
  failures.push("index.html: missing the tracked direct Google reviews link");
}

const sharedSiteScript = readFileSync(join(root, "assets/js/site.js"), "utf8");
if (retiredPlatformPattern.test(sharedSiteScript)) {
  failures.push("assets/js/site.js: contains a retired booking-platform reference");
}
for (const match of sharedSiteScript.matchAll(/<a\b[^>]*data-track="phone_click"[^>]*>/g)) {
  if (!/data-phone-location="[^"]+"/.test(match[0])) failures.push("assets/js/site.js: tracked phone link is missing its location");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Site check passed: ${htmlFiles.length} HTML pages and ${required.length} required deliverables.`);
