import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 4173);
const root = process.cwd();
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  let target = normalize(join(root, pathname === "/" ? "index.html" : pathname.slice(1)));
  if (!target.startsWith(root)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  if (existsSync(target) && statSync(target).isDirectory()) target = join(target, "index.html");
  if (!existsSync(target)) {
    target = join(root, "404.html");
    response.statusCode = 404;
  }
  response.setHeader("Content-Type", types[extname(target).toLowerCase()] || "application/octet-stream");
  response.setHeader("Cache-Control", extname(target) === ".html" ? "no-cache" : "public, max-age=3600");
  createReadStream(target).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Tiger Gents Salon website: http://127.0.0.1:${port}`);
});
