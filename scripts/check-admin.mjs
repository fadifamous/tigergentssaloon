import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const required = [
  "admin.html",
  "assets/admin/admin.css",
  "assets/admin/admin.js",
  "assets/data/site-content.json",
  "src/worker.js",
  "wrangler.jsonc",
  ".dev.vars.example"
];
const failures = [];
for (const file of required) if (!existsSync(join(root, file))) failures.push(`Missing: ${file}`);

const sensitiveSources = ["admin.html", "assets/admin/admin.js", "src/worker.js", "wrangler.jsonc"];
const initialPassword = ["tiger", "salon", "admin"].join("");
for (const file of sensitiveSources) {
  const source = readFileSync(join(root, file), "utf8");
  if (source.toLowerCase().includes(initialPassword)) failures.push(`${file}: contains the initial password; store it only as a Cloudflare secret`);
  if (/github_pat_|ghp_[a-z0-9]/i.test(source)) failures.push(`${file}: appears to contain a GitHub token`);
}

const worker = readFileSync(join(root, "src/worker.js"), "utf8");
const workerChecks = [
  ["ADMIN_PASSWORD", "password secret"],
  ["GITHUB_TOKEN", "GitHub token secret"],
  ["SameSite=Strict", "strict session cookie"],
  ["HttpOnly", "HTTP-only session cookie"],
  ["HMAC", "signed stateless session"],
  ["sameOrigin", "same-origin mutation check"],
  ["/git/blobs", "GitHub blob creation"],
  ["/git/trees", "GitHub tree creation"],
  ["/git/commits", "GitHub commit creation"],
  ["/git/refs/heads/", "GitHub branch update"],
  ["normalizeBooking", "booking provider validation"],
  ["fresha.com", "Fresha URL restriction"],
  ["setmore.com", "Setmore URL restriction"],
  ["hasValidImageSignature", "uploaded image signature validation"],
  ["MAX_IMAGE_BYTES", "uploaded image size limit"],
  ["Content-Security-Policy", "admin content security policy"]
];
for (const [token, feature] of workerChecks) if (!worker.includes(token)) failures.push(`src/worker.js: missing ${feature}`);
for (const forbidden of ["env.DB", "env.MEDIA", "ADMIN_BOOTSTRAP_PASSWORD", "PBKDF2"]) {
  if (worker.includes(forbidden)) failures.push(`src/worker.js: obsolete storage/authentication dependency remains: ${forbidden}`);
}

const adminHtml = readFileSync(join(root, "admin.html"), "utf8");
for (const section of ["dashboard", "employees", "gallery", "booking"]) {
  if (!adminHtml.includes(`data-section="${section}"`)) failures.push(`admin.html: missing ${section} section`);
}
for (const obsolete of ["services", "media", "homepage", "business", "reviews", "pages", "audit"]) {
  if (adminHtml.includes(`data-section="${obsolete}"`)) failures.push(`admin.html: obsolete ${obsolete} section remains`);
}

const adminJs = readFileSync(join(root, "assets/admin/admin.js"), "utf8");
for (const feature of ["/auth/login", "/content", "/publish", "prepareUpload", "baseCommitSha", "renderBooking", "normalizeBookingState"]) {
  if (!adminJs.includes(feature)) failures.push(`assets/admin/admin.js: missing admin feature ${feature}`);
}

const site = readFileSync(join(root, "assets/js/site.js"), "utf8");
for (const feature of ["/assets/data/site-content.json", "hydrateEmployees", "hydrateGallery", "hydrateManagedPictures", "applyBookingConfiguration", "booking_provider"]) {
  if (!site.includes(feature)) failures.push(`assets/js/site.js: missing GitHub-content integration ${feature}`);
}
if (site.includes("/api/content")) failures.push("assets/js/site.js: obsolete database content endpoint remains");

try {
  const data = JSON.parse(readFileSync(join(root, "assets/data/site-content.json"), "utf8"));
  if (!["setmore", "fresha"].includes(data.content?.booking?.provider)) failures.push("assets/data/site-content.json: active booking provider is invalid");
  if (!data.content?.booking?.setmoreUrl) failures.push("assets/data/site-content.json: Setmore URL is missing");
  if (!Array.isArray(data.content?.employees) || !data.content.employees.length) failures.push("assets/data/site-content.json: employees are missing");
  if (!Array.isArray(data.content?.gallery) || !data.content.gallery.length) failures.push("assets/data/site-content.json: gallery is missing");
} catch {
  failures.push("assets/data/site-content.json: invalid JSON");
}

const build = readFileSync(join(root, "scripts/build.mjs"), "utf8");
if (!build.includes('"assets"')) failures.push("scripts/build.mjs: assets and content data are not copied to dist");

const wrangler = readFileSync(join(root, "wrangler.jsonc"), "utf8");
if (!wrangler.includes('"keep_vars": true')) failures.push("wrangler.jsonc: dashboard runtime secrets will not be preserved across automatic deployments");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Simplified GitHub-backed admin check passed.");
