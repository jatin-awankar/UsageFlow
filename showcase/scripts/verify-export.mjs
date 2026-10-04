import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = new URL('../out/', import.meta.url);
async function walk(dir) {
  return (await Promise.all((await readdir(dir, { withFileTypes: true })).map(async entry => {
    const file = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    return entry.isDirectory() ? walk(file) : [file];
  }))).flat();
}
assert.notEqual(process.env.SHOWCASE_TEST_BUILD, '1', 'Never approve an isolated test build for publication');
const files = await walk(root);
const markers = ['test-init', 'test-pricing', 'test-monthly', 'test-finalization', 'test-delivery', 'pilot@example.invalid', 'pv_api_oct_test', 'Signal Desk', 'Switch direction', 'Test-only contact destination'];
for (const file of files) {
  if (!/\.(js|html|css|txt)$/.test(file.pathname)) continue;
  const content = await readFile(file, 'utf8');
  for (const marker of markers) assert(!content.includes(marker), `Forbidden test/prototype marker ${marker} in ${file.pathname}`);
}
const required = ['index.html', 'demo/index.html', 'evidence/index.html', '404.html', 'THIRD-PARTY-NOTICES.txt', 'fonts/Fraunces-OFL.txt', 'fonts/Inter-OFL.txt', 'fonts/README.txt', 'fonts/fraunces-500.woff2', 'fonts/inter-400.woff2', 'fonts/inter-600.woff2'];
for (const file of required) assert((await stat(new URL(file, root))).size > 0, file);
const fonts = files.filter(file => /\.(ttf|otf|woff2?)$/.test(file.pathname));
assert.equal(fonts.length, 3);
const fontBytes = (await Promise.all(fonts.map(async file => (await stat(file)).size))).reduce((a,b) => a+b, 0);
assert(fontBytes <= 252000, 'Three full-glyph WOFF2 font budget');
const manifest = [];
for (const file of files.sort((a,b) => a.pathname.localeCompare(b.pathname))) {
  const bytes = await readFile(file);
  manifest.push({ file: path.relative(root.pathname, file.pathname), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
console.log(JSON.stringify({ date: new Date().toISOString(), result: 'PASS', required, absentMarkers: markers, fontBytes, totalBytes: manifest.reduce((sum, file) => sum + file.bytes, 0), manifest }, null, 2));
