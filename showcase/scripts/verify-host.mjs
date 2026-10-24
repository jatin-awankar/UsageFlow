import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const [origin, manifestPath] = process.argv.slice(2);
assert(origin && manifestPath, "Usage: npm run verify:host -- https://site.pages.dev /path/to/export-manifest.json");
const target = new URL(origin);
assert(target.protocol === "https:" && !target.username && !target.password &&
  target.pathname === "/" && !target.search && !target.hash,
"Use an HTTPS origin without credentials, path, query, or fragment");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.equal(manifest.result, "PASS", "Use a passing verify:export manifest");
assert(Array.isArray(manifest.manifest) && manifest.manifest.length > 0);
const checked = [];
// Pages consumes _headers as configuration. The 404 document is checked via an unknown URL.
const assets = manifest.manifest.filter(entry => !["_headers", "404.html"].includes(entry.file));
for (let offset = 0; offset < assets.length; offset += 5) {
  await Promise.all(assets.slice(offset, offset + 5).map(async entry => {
    assert(!entry.file.startsWith("/") && !entry.file.split("/").includes(".."));
    const route = "/" + entry.file.replace(/(^|\/)index\.html$/, "$1");
    const response = await fetch(new URL(route, target), { signal: AbortSignal.timeout(15000) });
    assert.equal(new URL(response.url).origin, target.origin, `Unexpected redirect: ${route}`);
    assert.equal(response.status, 200, route);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(createHash("sha256").update(bytes).digest("hex"), entry.sha256, `Deployed bytes differ: ${route}`);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff", route);
    assert.equal(response.headers.get("x-frame-options"), "DENY", route);
    assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin", route);
    if (entry.file.endsWith(".woff2")) assert(response.headers.get("content-type")?.includes("font/woff2"), route);
    if (entry.file.endsWith(".txt")) assert(response.headers.get("content-type")?.includes("text/plain"), route);
    checked.push({ file: entry.file, route, status: response.status, sha256: entry.sha256 });
  }));
}
const missing = await fetch(new URL("/not-a-showcase-page/", target), { signal: AbortSignal.timeout(15000) });
assert.equal(new URL(missing.url).origin, target.origin);
assert.equal(missing.status, 404);
const notFound = manifest.manifest.find(entry => entry.file === "404.html");
assert(notFound, "Manifest must include 404.html");
assert.equal(createHash("sha256").update(Buffer.from(await missing.arrayBuffer())).digest("hex"), notFound.sha256, "Unexpected 404 document");
console.log(JSON.stringify({ date: new Date().toISOString(), origin: target.origin, result: "PASS", unknownPageStatus: 404, checked: checked.sort((a, b) => a.file.localeCompare(b.file)) }, null, 2));
