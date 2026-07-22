import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
if (basename(dist).toLowerCase() !== "dist" || !dist.startsWith(resolve(root))) {
  throw new Error("Refusing to build outside the project dist directory.");
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const directory of ["assets", "admin", "data"]) {
  await cp(join(root, directory), join(dist, directory), { recursive: true });
}

const entries = await readdir(root, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isFile()) continue;
  if (extname(entry.name) === ".html" || ["robots.txt", "sitemap.xml", "site.webmanifest"].includes(entry.name)) {
    await cp(join(root, entry.name), join(dist, entry.name));
  }
}

console.log("Production assets built in dist/.");
