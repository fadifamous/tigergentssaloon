import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = "http://127.0.0.1:4173";
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true
});

const waitForServer = async () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Local server did not start.");
};

const paths = [
  "/", "/services.html", "/team.html", "/standard.html", "/products.html",
  "/gallery.html", "/about.html", "/contact.html", "/faq.html", "/privacy.html",
  "/cookies.html", "/terms.html", "/accessibility.html", "/404.html"
];

const primeScrollReveals = async (page) => {
  await page.evaluate(() => {
    document.querySelectorAll(".reveal").forEach((element) => element.classList.add("in-view"));
    scrollTo(0, 0);
  });
  await page.waitForTimeout(100);
};

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await desktop.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("fonts.googleapis.com") &&
      !message.text().includes("ERR_NETWORK_ACCESS_DENIED")
    ) {
      consoleErrors.push(message.text());
    }
  });
  await page.addInitScript(() => localStorage.setItem("tiger-cookie-choice", "essential"));

  for (const path of paths) {
    const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
    if (!response || response.status() !== 200) throw new Error(`${path}: HTTP ${response?.status()}`);
    if (!(await page.locator("#main-content").count())) throw new Error(`${path}: missing main content`);
    if (!(await page.locator(".site-header").count())) throw new Error(`${path}: header did not render`);
    if (!(await page.locator(".site-footer").count())) throw new Error(`${path}: footer did not render`);
  }

  await page.goto(base, { waitUntil: "networkidle" });
  const logoData = await page.locator(".brand img").evaluate((image) => ({
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    source: image.getAttribute("src"),
    objectFit: getComputedStyle(image).objectFit
  }));
  if (
    logoData.source !== "assets/brand/logo_transparent.png" ||
    logoData.naturalWidth !== 1535 ||
    logoData.naturalHeight !== 1024 ||
    logoData.objectFit !== "contain"
  ) {
    throw new Error(`Primary logo failed source, intrinsic-dimension, or fit checks: ${JSON.stringify(logoData)}`);
  }

  await page.goto(`${base}/services.html`, { waitUntil: "networkidle" });
  const allCount = await page.locator(".service-row:not([hidden])").count();
  await page.getByRole("button", { name: "Nail care" }).click();
  const nailCount = await page.locator('.service-row[data-category="nails"]:not([hidden])').count();
  const otherVisible = await page.locator('.service-row:not([data-category="nails"]):not([hidden])').count();
  if (allCount < 10 || nailCount !== 4 || otherVisible !== 0) throw new Error("Service filters failed.");

  await page.goto(`${base}/gallery.html`, { waitUntil: "networkidle" });
  await page.locator(".gallery-item").first().click();
  if (!(await page.locator(".lightbox").evaluate((dialog) => dialog.open))) throw new Error("Gallery dialog failed to open.");
  await page.keyboard.press("Escape");

  mkdirSync("test-artifacts", { recursive: true });
  await page.goto(base, { waitUntil: "networkidle" });
  await primeScrollReveals(page);
  await page.screenshot({ path: "test-artifacts/home-desktop.png", fullPage: true });
  await page.goto(`${base}/services.html`, { waitUntil: "networkidle" });
  await primeScrollReveals(page);
  await page.screenshot({ path: "test-artifacts/services-desktop.png", fullPage: true });
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.addInitScript(() => localStorage.setItem("tiger-cookie-choice", "essential"));
  await mobilePage.goto(base, { waitUntil: "networkidle" });
  await mobilePage.locator(".menu-toggle").click();
  if ((await mobilePage.locator(".menu-toggle").getAttribute("aria-expanded")) !== "true") throw new Error("Mobile menu failed to open.");
  await mobilePage.keyboard.press("Escape");
  if ((await mobilePage.locator(".menu-toggle").getAttribute("aria-expanded")) !== "false") throw new Error("Mobile menu failed to close.");
  const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) throw new Error("Homepage has horizontal overflow at 390px.");
  await primeScrollReveals(mobilePage);
  await mobilePage.screenshot({ path: "test-artifacts/home-mobile.png", fullPage: true });
  await mobilePage.goto(`${base}/team.html`, { waitUntil: "networkidle" });
  await primeScrollReveals(mobilePage);
  await mobilePage.screenshot({ path: "test-artifacts/team-mobile.png", fullPage: true });
  await mobile.close();

  if (consoleErrors.length) throw new Error(`Browser console errors:\n${consoleErrors.join("\n")}`);
  console.log(`Smoke test passed: ${paths.length} pages, filters, dialog, mobile menu, overflow, and responsive screenshots.`);
} finally {
  await browser?.close();
  server.kill();
}
