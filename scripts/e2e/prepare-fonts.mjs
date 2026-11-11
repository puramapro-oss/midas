import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, rmSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fixtures from './fixtures.cjs';

const { ORIGIN, validateFonts } = fixtures;
const lockBytes = readFileSync(new URL('./fonts.lock.json', import.meta.url));
const lock = JSON.parse(lockBytes);
const lockSha256 = createHash('sha256').update(lockBytes).digest('hex');
const files = lock.fonts.map(item => ({ ...item, file: item.sha256 + '.woff2' }));
const cssDirectory = fileURLToPath(new URL('./fonts/', import.meta.url));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function verifiedFile(directory, item, extension) {
  assert.match(item.sha256, /^[a-f0-9]{64}$/);
  if (item.file) assert.match(item.file, /^[a-z-]+\.css$/);
  const filename = path.join(directory, item.file ?? item.sha256 + extension);
  assert(lstatSync(filename).isFile(), 'Prepared assets must be regular files');
  const bytes = readFileSync(filename);
  assert.equal(bytes.length, item.bytes, 'Pinned asset length changed');
  assert.equal(sha256(bytes), item.sha256, 'Pinned asset hash changed');
  return bytes;
}
function responseSource() {
  const responses = {};
  const observed = new Set();
  for (const stylesheet of lock.css) {
    let css = verifiedFile(cssDirectory, stylesheet, '.css').toString('utf8');
    assert.equal((css.match(/@font-face/g) ?? []).length, stylesheet.fontFaceRules);
    const urls = [...css.matchAll(/url\((https:\/\/[^)]+)\)/g)].map(match => match[1]);
    assert(urls.length > 0, 'No font URL in pinned stylesheet');
    for (const url of new Set(urls)) {
      const font = files.find(item => item.url === url && item.family === stylesheet.family);
      assert(font, 'Unlisted font URL in stylesheet');
      observed.add(url);
      css = css.split(url).join(ORIGIN + '/__e2e/fonts/' + font.file);
    }
    for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
      const url = new URL(match[1]);
      assert.equal(url.origin, ORIGIN, 'External font origin remains');
      assert(!url.search && !url.hash && !url.username && !url.password);
      assert(files.some(font => url.pathname === '/__e2e/fonts/' + font.file), 'Unlisted local font path');
    }
    responses[stylesheet.url] = css;
  }
  assert.equal(observed.size, files.length, 'Every pinned font must be referenced');
  return 'module.exports = ' + JSON.stringify(responses, null, 2) + ';\n';
}
export function loadPreparedFonts(directory) {
  const prepared = JSON.parse(readFileSync(path.join(directory, 'prepared.json'), 'utf8'));
  assert.equal(prepared.status, 'PASS');
  assert.equal(prepared.lockSha256, lockSha256);
  assert.deepEqual(prepared.files, files);
  const fonts = validateFonts(directory, prepared);
  const responseFile = path.join(directory, 'responses.cjs');
  assert(lstatSync(responseFile).isFile(), 'Font mapping must be a regular file');
  assert.equal(readFileSync(responseFile, 'utf8'), responseSource(), 'Font CSS mapping changed');
  return { manifest: prepared, fonts };
}
async function download(item, userAgent) {
  const url = new URL(item.url);
  assert.equal(url.protocol, 'https:');
  assert(['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname));
  assert(!url.username && !url.password && !url.hash);
  const response = await fetch(url, { redirect: 'error', headers: { 'user-agent': userAgent },
    signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, 'Pinned Google font resource unavailable');
  let size = 0;
  const parts = [];
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    assert(size <= item.bytes, 'Pinned asset exceeded expected byte count');
    parts.push(Buffer.from(chunk));
  }
  const bytes = Buffer.concat(parts);
  assert.equal(size, item.bytes);
  assert.equal(sha256(bytes), item.sha256, 'Pinned Google font bytes changed; require review, never silently refresh');
  return bytes;
}
async function prepare(directory) {
  assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED, '0', 'TLS verification must be enabled');
  mkdirSync(directory, { mode: 0o700 }); // Never replace a pre-existing directory.
  try {
    const responses = responseSource(); // Fixed, reviewed CSS is verified before any download.
    const acquisitions = await Promise.allSettled(
      files.map(async item => {
        const bytes = await download(item, lock.userAgent);
        assert.equal(bytes.subarray(0, 4).toString(), 'wOF2');
        assert.equal(bytes.readUInt32BE(8), bytes.length);
        writeFileSync(path.join(directory, item.file), bytes, { mode: 0o600 });
      })
    );
    const failure = acquisitions.find(item => item.status === 'rejected');
    if (failure) throw failure.reason;
    writeFileSync(path.join(directory, 'responses.cjs'), responses, { mode: 0o600 });
    const prepared = { status: 'PASS', at: new Date().toISOString(), nextVersion: lock.nextVersion,
      lockSha256, files, css: lock.css, fontBytes: files.reduce((sum, item) => sum + item.bytes, 0),
      tlsVerification: true, expectedHashesRefreshed: false };
    writeFileSync(path.join(directory, 'prepared.json'), JSON.stringify(prepared, null, 2) + '\n', { mode: 0o600 });
    loadPreparedFonts(directory);
    console.log(JSON.stringify({ preparedFonts: files.length, css: lock.css.length,
      fontBytes: prepared.fontBytes, lockSha256, tlsVerification: true }));
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await prepare(path.resolve(process.argv[2])); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
