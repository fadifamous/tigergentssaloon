import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = "http://127.0.0.1:4174";
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: "4174" },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${base}/admin.html`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Local server did not start.");
}

const employee = {
  id: "employee-abed",
  slug: "abed",
  sortOrder: 0,
  data: {
    name: "ABED",
    role: "Barber",
    initial: "A",
    bio: "Senior barber",
    bookingUrl: "https://tigergentssaloon.setmore.com/",
    imageUrl: "",
    featured: true,
    status: "active"
  }
};
const picture = {
  id: "picture-salon",
  slug: "salon",
  sortOrder: 0,
  data: {
    title: "Salon interior",
    imageUrl: "/assets/images/salon-wide-opt.webp",
    altText: "Wide view of the salon interior",
    caption: "",
    layout: "wide",
    featured: true,
    status: "active"
  }
};

let browser;
try {
  await waitForServer();
  mkdirSync("test-artifacts", { recursive: true });
  browser = await chromium.launch({ headless: true });

  for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    let authenticated = false;
    let content = {
      booking: {
        provider: "setmore",
        setmoreUrl: "https://tigergentssaloon.setmore.com/",
        freshaUrl: ""
      },
      employees: [structuredClone(employee)],
      gallery: [structuredClone(picture)]
    };
    let headSha = "abc123";
    let contentAttempts = 0;

    await page.route(`${base}/api/admin/**`, async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path.endsWith("/auth/me")) {
        return route.fulfill(authenticated
          ? { status: 200, contentType: "application/json", body: JSON.stringify({ user: { username: "admin" }, repository: "fadifamous/tigergentssaloon" }) }
          : { status: 401, contentType: "application/json", body: JSON.stringify({ error: "Authentication required." }) });
      }
      if (path.endsWith("/auth/login")) {
        const body = request.postDataJSON();
        if (body.username !== "admin" || body.password !== "local-test-password") {
          return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Login form did not submit its field values." }) });
        }
        authenticated = true;
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { username: "admin" }, repository: "fadifamous/tigergentssaloon" }) });
      }
      if (path.endsWith("/auth/logout")) {
        authenticated = false;
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      }
      if (path.endsWith("/content")) {
        contentAttempts += 1;
        if (contentAttempts === 1) {
          return route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "The GitHub token has not been configured in Cloudflare yet." })
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ content, headSha, repository: "fadifamous/tigergentssaloon", branch: "main", updatedAt: new Date().toISOString(), lastCommitUrl: "https://github.com/fadifamous/tigergentssaloon/commit/abc123" })
        });
      }
      if (path.endsWith("/publish")) {
        const body = request.postDataJSON();
        content = { booking: body.booking, employees: body.employees, gallery: body.gallery };
        headSha = `${headSha}1`;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, content, headSha, updatedAt: new Date().toISOString(), commitUrl: `https://github.com/fadifamous/tigergentssaloon/commit/${headSha}` })
        });
      }
      return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Not found" }) });
    });

    await page.goto(`${base}/admin.html`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `test-artifacts/admin-login-${viewport.width}.png`, fullPage: false });
    await page.locator('[data-auth-view="login"] input[name="password"]').fill("local-test-password");
    await page.locator('[data-login-form] button[type="submit"]').click();
    await page.locator("[data-admin-app]").waitFor({ state: "visible" });
    await page.locator("[data-source-label]", { hasText: "fadifamous/tigergentssaloon · main" }).waitFor({ state: "attached" });
    if (contentAttempts < 2) throw new Error(`Admin did not retry a temporary GitHub connection failure at ${viewport.width}px.`);

    if (viewport.width < 900) await page.locator("[data-sidebar-toggle]").click();
    await page.locator('[data-section="booking"]').click();
    await page.locator('input[name="freshaUrl"]').fill("https://www.fresha.com/a/tiger-gents-salon-dubai");
    await page.locator('input[name="provider"][value="fresha"]').check();
    await page.getByRole("button", { name: "Save booking settings" }).click();
    await page.getByText("Fresha active", { exact: true }).waitFor();
    if (content.booking.provider !== "fresha" || !content.booking.freshaUrl.includes("fresha.com")) {
      throw new Error(`Booking settings were not published at ${viewport.width}px.`);
    }
    await page.screenshot({ path: `test-artifacts/admin-booking-${viewport.width}.png`, fullPage: viewport.width >= 900 });

    if (viewport.width < 900) await page.locator("[data-sidebar-toggle]").click();
    await page.locator('[data-section="employees"]').click();
    await page.getByText("ABED", { exact: true }).waitFor();
    if (!(await page.getByRole("button", { name: "Edit", exact: true }).isVisible())) {
      throw new Error(`Team edit action is not visible at ${viewport.width}px.`);
    }
    if (viewport.width < 900) await page.waitForTimeout(350);
    await page.screenshot({ path: `test-artifacts/admin-${viewport.width}.png`, fullPage: viewport.width >= 900 });

    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      scrollX,
      mainLeft: document.querySelector(".admin-workspace")?.getBoundingClientRect().left
    }));
    if (dimensions.width > dimensions.viewport + 1) throw new Error(`Admin dashboard overflows at ${viewport.width}px.`);
    if (viewport.width < 900 && (Math.abs(dimensions.scrollX) > 1 || Math.abs(dimensions.mainLeft) > 1)) {
      throw new Error(`Admin dashboard is horizontally displaced at ${viewport.width}px: ${JSON.stringify(dimensions)}`);
    }

    await context.close();
  }
  console.log("Simplified admin UI test passed at desktop and mobile sizes.");
} finally {
  await browser?.close();
  server.kill();
}
