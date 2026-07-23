import worker from "../src/worker.js";

const origin = "https://tigergentssalon.com";
const initialDocument = {
  version: 1,
  updatedAt: null,
  content: {
    booking: {
      provider: "setmore",
      setmoreUrl: "https://tigergentssaloon.setmore.com/",
      freshaUrl: ""
    },
    employees: [{ id: "employee-abed", slug: "abed", sortOrder: 0, data: { name: "ABED", role: "Barber", initial: "A", bio: "", bookingUrl: "https://example.com/book", imageUrl: "", featured: true, status: "active" } }],
    gallery: [{ id: "picture-salon", slug: "salon", sortOrder: 0, data: { title: "Salon", imageUrl: "/assets/images/salon-wide-opt.webp", altText: "Salon interior", caption: "", layout: "wide", featured: true, status: "active" } }]
  }
};

const env = {
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "local-test-password",
  ADMIN_SESSION_HOURS: "12",
  GITHUB_TOKEN: "test-token",
  GITHUB_OWNER: "fadifamous",
  GITHUB_REPO: "tigergentssaloon",
  GITHUB_BRANCH: "main",
  ASSETS: { fetch: async () => new Response("asset") }
};

let headSha = "head-1";
let latestDocument = structuredClone(initialDocument);
const calls = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  calls.push({ path: url.pathname, method: init.method || "GET" });
  const path = url.pathname.replace("/repos/fadifamous/tigergentssaloon", "");
  const body = init.body ? JSON.parse(init.body) : null;

  if (path === "/git/ref/heads/main") return githubJson({ object: { sha: headSha } });
  if (path === `/git/commits/${headSha}`) return githubJson({ sha: headSha, tree: { sha: "tree-1" }, html_url: `https://github.com/example/commit/${headSha}` });
  if (path === "/contents/assets/data/site-content.json") {
    return githubJson({ encoding: "base64", content: Buffer.from(JSON.stringify(latestDocument), "utf8").toString("base64") });
  }
  if (path === "/git/blobs" && init.method === "POST") {
    if (body.encoding === "utf-8") latestDocument = JSON.parse(body.content);
    return githubJson({ sha: body.encoding === "utf-8" ? "content-blob" : "image-blob" }, 201);
  }
  if (path === "/git/trees" && init.method === "POST") return githubJson({ sha: "tree-2" }, 201);
  if (path === "/git/commits" && init.method === "POST") return githubJson({ sha: "head-2", html_url: "https://github.com/example/commit/head-2" }, 201);
  if (path === "/git/refs/heads/main" && init.method === "PATCH") {
    headSha = body.sha;
    return githubJson({ object: { sha: headSha } });
  }
  return githubJson({ message: `Unexpected mock request: ${init.method || "GET"} ${path}` }, 500);
};

try {
  const failedLogin = await worker.fetch(jsonRequest("/api/admin/auth/login", { username: "admin", password: "wrong" }), env);
  assert(failedLogin.status === 401, "Wrong password should be rejected.");

  const login = await worker.fetch(jsonRequest("/api/admin/auth/login", { username: "admin", password: env.ADMIN_PASSWORD }), env);
  assert(login.status === 200, "Correct password should log in.");
  const cookie = login.headers.get("Set-Cookie")?.split(";")[0];
  assert(cookie?.startsWith("tiger_admin_session="), "Login should set the admin session cookie.");

  const me = await worker.fetch(new Request(`${origin}/api/admin/auth/me`, { headers: { Cookie: cookie } }), env);
  assert(me.status === 200, "Signed session should authenticate.");

  const contentResponse = await worker.fetch(new Request(`${origin}/api/admin/content`, { headers: { Cookie: cookie } }), env);
  const contentPayload = await contentResponse.json();
  assert(contentResponse.status === 200 && contentPayload.headSha === "head-1", "Admin should read content and branch version from GitHub.");

  const employees = structuredClone(contentPayload.content.employees);
  employees[0].data.role = "Senior Barber";
  const invalidBooking = await worker.fetch(jsonRequest("/api/admin/publish", {
    baseCommitSha: contentPayload.headSha,
    booking: {
      provider: "fresha",
      setmoreUrl: "https://tigergentssaloon.setmore.com/",
      freshaUrl: "https://example.com/not-fresha"
    },
    employees,
    gallery: contentPayload.content.gallery,
    summary: "invalid booking provider"
  }, cookie), env);
  assert(invalidBooking.status === 400, "A Fresha selection with a non-Fresha URL should be rejected.");

  const publish = await worker.fetch(jsonRequest("/api/admin/publish", {
    baseCommitSha: contentPayload.headSha,
    booking: {
      provider: "fresha",
      setmoreUrl: "https://tigergentssaloon.setmore.com/",
      freshaUrl: "https://www.fresha.com/a/tiger-gents-salon-dubai"
    },
    employees,
    gallery: contentPayload.content.gallery,
    summary: "update ABED"
  }, cookie), env);
  const publishPayload = await publish.json();
  assert(publish.status === 200 && publishPayload.headSha === "head-2", "Admin should create and advance a GitHub commit.");
  assert(latestDocument.content.employees[0].data.role === "Senior Barber", "Committed JSON should contain the edit.");
  assert(latestDocument.content.booking.provider === "fresha", "Committed JSON should contain the selected booking provider.");
  assert(latestDocument.content.booking.freshaUrl.startsWith("https://www.fresha.com/"), "Committed JSON should contain the validated Fresha URL.");

  for (const expected of ["/git/blobs", "/git/trees", "/git/commits", "/git/refs/heads/main"]) {
    assert(calls.some((call) => call.path.endsWith(expected)), `GitHub flow did not call ${expected}.`);
  }

  console.log("Worker login and GitHub commit flow test passed.");
} finally {
  globalThis.fetch = originalFetch;
}

function jsonRequest(path, body, cookie = "") {
  const headers = { "Content-Type": "application/json", Origin: origin };
  if (cookie) headers.Cookie = cookie;
  return new Request(`${origin}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
}

function githubJson(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
