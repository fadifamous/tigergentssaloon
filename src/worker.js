const SESSION_COOKIE = "tiger_admin_session";
const CONTENT_PATH = "assets/data/site-content.json";
const MAX_JSON_BYTES = 7 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const API_VERSION = "2026-03-10";
const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/admin" || path === "/admin/" || path.startsWith("/admin/")) {
        return serveAdminShell(request, env);
      }

      if (path.startsWith("/api/admin/")) return handleAdminApi(request, env, path);
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not found", { status: 404 });
    } catch (error) {
      if (error instanceof GitHubError) return json({ error: error.message }, error.status);
      console.error("Unhandled admin error", error);
      return json({ error: "The admin service could not complete the request." }, 500);
    }
  }
};

async function handleAdminApi(request, env, path) {
  if (path === "/api/admin/auth/login" && request.method === "POST") return login(request, env);
  if (path === "/api/admin/auth/logout" && request.method === "POST") {
    if (!sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
  }

  const user = await authenticatedUser(request, env);
  if (!user) return json({ error: "Authentication required." }, 401);

  if (path === "/api/admin/auth/me" && request.method === "GET") {
    return json({ user, repository: repositoryLabel(env) });
  }

  if (path === "/api/admin/content" && request.method === "GET") {
    assertGitHubConfigured(env);
    const result = await readRepositoryContent(env);
    return json({
      content: result.document.content,
      headSha: result.headSha,
      repository: repositoryLabel(env),
      branch: githubConfig(env).branch,
      updatedAt: result.document.updatedAt || null,
      lastCommitUrl: result.lastCommitUrl
    });
  }

  if (path === "/api/admin/publish" && request.method === "POST") {
    if (!sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);
    assertGitHubConfigured(env);
    return publishContent(request, env, user);
  }

  return json({ error: "Not found." }, 404);
}

async function login(request, env) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);
  if (!env.ADMIN_PASSWORD) return json({ error: "The admin password has not been configured in Cloudflare yet." }, 503);

  const body = await readJson(request);
  if (!body) return json({ error: "Enter the username and password." }, 400);

  const expectedUsername = String(env.ADMIN_USERNAME || "admin");
  const validUsername = await secureTextEqual(String(body.username || ""), expectedUsername);
  const validPassword = await secureTextEqual(String(body.password || ""), String(env.ADMIN_PASSWORD));
  if (!validUsername || !validPassword) return json({ error: "Incorrect username or password." }, 401);

  const hours = clamp(Number(env.ADMIN_SESSION_HOURS || 12), 1, 72);
  const expiresAt = Date.now() + hours * 60 * 60 * 1000;
  const token = await createSessionToken(expectedUsername, expiresAt, env.ADMIN_PASSWORD);
  return json(
    { user: { username: expectedUsername }, repository: repositoryLabel(env) },
    200,
    { "Set-Cookie": sessionCookie(request, token, hours * 60 * 60) }
  );
}

async function authenticatedUser(request, env) {
  if (!env.ADMIN_PASSWORD) return null;
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const session = await verifySessionToken(token, env.ADMIN_PASSWORD);
  const expectedUsername = String(env.ADMIN_USERNAME || "admin");
  if (!session || session.username !== expectedUsername || session.expiresAt <= Date.now()) return null;
  return { username: expectedUsername };
}

async function publishContent(request, env, user) {
  const body = await readJson(request);
  if (!body || !Array.isArray(body.employees) || !Array.isArray(body.gallery)) {
    return json({ error: "The website content is incomplete." }, 400);
  }

  const current = await readRepositoryContent(env);
  if (!body.baseCommitSha || body.baseCommitSha !== current.headSha) {
    return json({ error: "The GitHub version changed since this page was loaded. Refresh the admin and try again." }, 409);
  }

  let employees;
  let gallery;
  try {
    employees = normalizeRecords("employees", body.employees);
    gallery = normalizeRecords("gallery", body.gallery);
  } catch (error) {
    return json({ error: error.message }, 400);
  }

  const document = current.document && typeof current.document === "object" ? current.document : {};
  document.version = 1;
  document.updatedAt = new Date().toISOString();
  document.updatedBy = user.username;
  document.content = document.content && typeof document.content === "object" ? document.content : {};
  document.content.employees = employees;
  document.content.gallery = gallery;

  let imageEntry = null;
  if (body.image) {
    try {
      imageEntry = prepareImage(body.image, document.content);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
  }

  try {
    validateRecords("employees", document.content.employees);
    validateRecords("gallery", document.content.gallery);
  } catch (error) {
    return json({ error: error.message }, 400);
  }

  const contentText = `${JSON.stringify(document, null, 2)}\n`;
  const contentBlobPromise = githubRequest(env, "/git/blobs", {
    method: "POST",
    body: { content: contentText, encoding: "utf-8" }
  });
  const imageBlobPromise = imageEntry
    ? githubRequest(env, "/git/blobs", { method: "POST", body: { content: imageEntry.base64, encoding: "base64" } })
    : Promise.resolve(null);
  const [contentBlob, imageBlob] = await Promise.all([contentBlobPromise, imageBlobPromise]);

  const tree = [{ path: CONTENT_PATH, mode: "100644", type: "blob", sha: contentBlob.sha }];
  if (imageEntry && imageBlob) tree.push({ path: imageEntry.path, mode: "100644", type: "blob", sha: imageBlob.sha });

  const newTree = await githubRequest(env, "/git/trees", {
    method: "POST",
    body: { base_tree: current.baseTreeSha, tree }
  });
  const summary = cleanCommitSummary(body.summary);
  const commit = await githubRequest(env, "/git/commits", {
    method: "POST",
    body: {
      message: `Admin: ${summary}`,
      tree: newTree.sha,
      parents: [current.headSha]
    }
  });

  const config = githubConfig(env);
  try {
    await githubRequest(env, `/git/refs/heads/${encodeRef(config.branch)}`, {
      method: "PATCH",
      body: { sha: commit.sha, force: false }
    });
  } catch (error) {
    if (error instanceof GitHubError && error.status === 422) {
      return json({ error: "GitHub changed while the update was being saved. Refresh and try again." }, 409);
    }
    throw error;
  }

  return json({
    ok: true,
    content: document.content,
    headSha: commit.sha,
    updatedAt: document.updatedAt,
    commitUrl: commit.html_url || `https://github.com/${config.owner}/${config.repo}/commit/${commit.sha}`,
    message: "Saved to GitHub. Cloudflare will publish the update automatically."
  });
}

async function readRepositoryContent(env) {
  const config = githubConfig(env);
  const refPath = `/git/ref/heads/${encodeRef(config.branch)}`;
  const ref = await githubRequest(env, refPath);
  const headSha = ref.object?.sha;
  if (!headSha) throw new GitHubError("GitHub did not return the current branch version.", 502);

  const [commit, file] = await Promise.all([
    githubRequest(env, `/git/commits/${encodeURIComponent(headSha)}`),
    githubRequest(env, `/contents/${CONTENT_PATH}?ref=${encodeURIComponent(config.branch)}`)
  ]);

  if (!file.content || file.encoding !== "base64") throw new GitHubError("The website content file could not be read from GitHub.", 502);
  let document;
  try {
    const cleanBase64 = file.content.replace(/\s/g, "");
    document = JSON.parse(new TextDecoder().decode(base64ToBytes(cleanBase64)));
  } catch {
    throw new GitHubError("The website content file in GitHub is not valid JSON.", 502);
  }

  if (!document.content || !Array.isArray(document.content.employees) || !Array.isArray(document.content.gallery)) {
    throw new GitHubError("The website content file is missing the team or gallery section.", 502);
  }

  return {
    document,
    headSha,
    baseTreeSha: commit.tree?.sha,
    lastCommitUrl: commit.html_url || `https://github.com/${config.owner}/${config.repo}/commit/${headSha}`
  };
}

function normalizeRecords(type, records) {
  const limit = type === "employees" ? 50 : 100;
  if (records.length > limit) throw new Error(`Too many ${type === "employees" ? "team members" : "pictures"}.`);
  const ids = new Set();
  return records.map((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("A content record is invalid.");
    const id = cleanId(record.id) || `${type === "employees" ? "employee" : "picture"}-${crypto.randomUUID()}`;
    if (ids.has(id)) throw new Error("Two content records have the same identifier.");
    ids.add(id);
    const data = type === "employees" ? normalizeEmployee(record.data) : normalizeGalleryPicture(record.data);
    const label = type === "employees" ? data.name : data.title;
    return {
      id,
      slug: cleanSlug(record.slug || label) || id,
      sortOrder: index,
      data
    };
  });
}

function normalizeEmployee(value) {
  const data = value && typeof value === "object" ? value : {};
  return {
    name: cleanText(data.name, 80),
    role: cleanText(data.role, 80),
    initial: cleanText(data.initial, 2),
    bio: cleanText(data.bio, 600),
    bookingUrl: cleanUrl(data.bookingUrl),
    imageUrl: cleanImageUrl(data.imageUrl),
    featured: Boolean(data.featured),
    status: ["active", "unavailable", "inactive"].includes(data.status) ? data.status : "active"
  };
}

function normalizeGalleryPicture(value) {
  const data = value && typeof value === "object" ? value : {};
  return {
    title: cleanText(data.title, 100),
    imageUrl: cleanImageUrl(data.imageUrl),
    altText: cleanText(data.altText, 240),
    caption: cleanText(data.caption, 400),
    layout: ["", "wide", "tall", "wide tall"].includes(data.layout) ? data.layout : "",
    featured: Boolean(data.featured),
    status: ["active", "inactive"].includes(data.status) ? data.status : "active"
  };
}

function validateRecords(type, records) {
  for (const record of records) {
    if (type === "employees") {
      if (!record.data.name) throw new Error("Every team member needs a name.");
      if (!record.data.role) throw new Error(`Add a role for ${record.data.name}.`);
    } else {
      if (!record.data.title) throw new Error("Every gallery picture needs a title.");
      if (!record.data.altText) throw new Error(`Add alternative text for ${record.data.title}.`);
      if (!record.data.imageUrl) throw new Error(`Choose an image for ${record.data.title}.`);
    }
  }
}

function prepareImage(image, content) {
  if (!image || typeof image !== "object") throw new Error("The uploaded picture is invalid.");
  const targetType = image.targetType;
  if (!new Set(["employees", "gallery"]).has(targetType)) throw new Error("The image destination is invalid.");
  const targetId = cleanId(image.targetId);
  const record = content[targetType].find((item) => item.id === targetId);
  if (!record) throw new Error("The item receiving this picture could not be found.");

  const mimeType = String(image.mimeType || "").toLowerCase();
  const extension = IMAGE_TYPES[mimeType];
  if (!extension) throw new Error("Use a JPEG, PNG, WebP or AVIF picture.");
  const base64 = String(image.base64 || "").replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error("The uploaded picture data is invalid.");
  const bytes = base64ByteLength(base64);
  if (!bytes || bytes > MAX_IMAGE_BYTES) throw new Error("Pictures must be 5 MB or smaller.");
  if (!hasValidImageSignature(base64, mimeType)) throw new Error("The file contents do not match the selected picture type.");

  const category = targetType === "employees" ? "team" : "gallery";
  const stem = cleanSlug(record.data.name || record.data.title || targetId).slice(0, 48) || "picture";
  const unique = crypto.randomUUID().slice(0, 8);
  const path = `assets/uploads/${category}/${Date.now()}-${stem}-${unique}.${extension}`;
  record.data.imageUrl = `/${path}`;
  return { path, base64 };
}

function hasValidImageSignature(base64, mimeType) {
  let bytes;
  try {
    bytes = base64ToBytes(base64.slice(0, 64));
  } catch {
    return false;
  }
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (mimeType === "image/webp") return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP";
  if (mimeType === "image/avif") return ascii(bytes, 4, 8) === "ftyp" && ["avif", "avis"].some((brand) => ascii(bytes, 8, 32).includes(brand));
  return false;
}

async function githubRequest(env, endpoint, options = {}) {
  const config = githubConfig(env);
  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "tiger-gents-salon-admin",
      "X-GitHub-Api-Version": API_VERSION
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? "GitHub rejected the configured token. Check that it has Contents read/write access to this repository."
      : response.status === 404
        ? "The configured GitHub repository, branch or website content file was not found."
        : cleanText(payload.message, 240) || "GitHub could not complete the update.";
    throw new GitHubError(message, response.status >= 500 ? 502 : response.status);
  }
  return payload;
}

function githubConfig(env) {
  return {
    owner: String(env.GITHUB_OWNER || "fadifamous"),
    repo: String(env.GITHUB_REPO || "tigergentssaloon"),
    branch: String(env.GITHUB_BRANCH || "main")
  };
}

function assertGitHubConfigured(env) {
  if (!env.GITHUB_TOKEN) throw new GitHubError("The GitHub token has not been configured in Cloudflare yet.", 503);
}

function repositoryLabel(env) {
  const config = githubConfig(env);
  return `${config.owner}/${config.repo}`;
}

class GitHubError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

async function serveAdminShell(request, env) {
  if (!env.ASSETS) return new Response("Admin assets are unavailable.", { status: 503 });
  const assetUrl = new URL(request.url);
  assetUrl.pathname = "/admin.html";
  assetUrl.search = "";
  const response = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET", headers: request.headers }));
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
  );
  return new Response(response.body, { status: response.status, headers });
}

async function readJson(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_JSON_BYTES) return null;
  if (!(request.headers.get("Content-Type") || "").toLowerCase().includes("application/json")) return null;
  try {
    const text = await request.text();
    if (text.length > MAX_JSON_BYTES) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders
    }
  });
}

async function createSessionToken(username, expiresAt, secret) {
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ username, expiresAt })));
  return `${payload}.${await hmac(payload, secret)}`;
}

async function verifySessionToken(token, secret) {
  const [payload, signature, extra] = String(token).split(".");
  if (!payload || !signature || extra) return null;
  const expected = await hmac(payload, secret);
  if (!secureStringEqual(signature, expected)) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
  } catch {
    return null;
  }
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function secureTextEqual(left, right) {
  const [leftHash, rightHash] = await Promise.all([sha256(left), sha256(right)]);
  return secureStringEqual(leftHash, rightHash);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
  return bytesToBase64Url(new Uint8Array(digest));
}

function secureStringEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

function sessionCookie(request, token, maxAge) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=${maxAge}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function readCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return "";
}

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().replace(/[<>]/g, "").slice(0, maxLength);
}

function cleanId(value) {
  const text = String(value || "").trim();
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(text) ? text : "";
}

function cleanSlug(value) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function cleanUrl(value) {
  const text = cleanText(value, 500);
  if (!text) return "";
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function cleanImageUrl(value) {
  const text = cleanText(value, 500);
  return /^\/assets\/[a-zA-Z0-9_./-]+$/.test(text) && !text.includes("..") ? text : "";
}

function cleanCommitSummary(value) {
  return cleanText(value, 80).replace(/[\r\n]+/g, " ") || "update website content";
}

function encodeRef(value) {
  return String(value).split("/").map(encodeURIComponent).join("/");
}

function base64ByteLength(value) {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.floor(value.length * 3 / 4) - padding;
}

function ascii(bytes, start, end) {
  return String.fromCharCode(...bytes.slice(start, Math.min(end, bytes.length)));
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function base64UrlToBytes(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return base64ToBytes(base64);
}

function clamp(value, min, max) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}
