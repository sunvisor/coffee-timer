import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

const dist = new URL('../dist/', import.meta.url)
const read = (path) => readFile(new URL(path.replace(/^\//, ''), dist))
const manifest = JSON.parse(await read('manifest.webmanifest'))
const html = String(await read('index.html'))
const worker = String(await read('sw.js'))

assert.equal(manifest.display, 'standalone')
assert.equal(manifest.start_url, '/')
assert.equal(manifest.scope, '/')
assert.match(html, /rel="manifest"[^>]+manifest\.webmanifest/)
assert.doesNotMatch(html, /src="\/registerSW\.js"/)
assert.match(html, /rel="apple-touch-icon"/)

for (const icon of [...manifest.icons, { src: '/apple-touch-icon.png', sizes: '180x180' }]) {
  const png = await read(icon.src)
  assert.equal(png.subarray(1, 4).toString(), 'PNG')
  assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes)
}
assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'))
assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable'))

// Read the generated precache through Workbox's public API without running a browser.
let precache = []
let claimsClients = false
let fallbackOptions
runInNewContext(worker, {
  self: { define() {}, addEventListener() {} },
  define: (_dependencies, factory) =>
    factory({
      precacheAndRoute: (entries) => {
        precache = entries
      },
      cleanupOutdatedCaches() {},
      clientsClaim() {
        claimsClients = true
      },
      registerRoute() {},
      NavigationRoute: class {
        constructor(_handler, options) {
          fallbackOptions = options
        }
      },
      createHandlerBoundToURL: (url) => url,
    }),
})
assert.ok(claimsClients, 'An activated update must control open pages so they can finish updating')
assert.ok(
  fallbackOptions.denylist.some((pattern) => pattern.test('/about/')),
  'The promotional pages must not be replaced by the app shell',
)
assert.ok(fallbackOptions.denylist.some((pattern) => pattern.test('/about/en/')))
assert.ok(!fallbackOptions.denylist.some((pattern) => pattern.test('/')))
const cached = new Set(precache.map((entry) => entry.url))
assert.ok(cached.has('index.html'), 'The app shell must be available offline')
for (const [, path] of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) {
  assert.ok(cached.has(path.slice(1)), `Missing offline asset: ${path}`)
  await read(path)
}
for (const icon of manifest.icons) assert.ok(cached.has(icon.src.slice(1)))
for (const path of [
  'about/index.html',
  'about/en/index.html',
  'about/style.css',
  'about/open-app.js',
  'icons.svg',
]) {
  assert.ok(cached.has(path), `Missing promotional page asset: ${path}`)
  await read(path)
}
const scripts = await Promise.all(
  [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map(async ([, path]) =>
    String(await read(path)),
  ),
)
assert.ok(
  scripts.some((script) => script.includes('serviceWorker') && script.includes('/sw.js')),
  'The app must register its service worker to handle update prompts',
)
assert.match(worker, /SKIP_WAITING/)
console.log('PWA manifest, icons, registration, and offline assets verified.')
