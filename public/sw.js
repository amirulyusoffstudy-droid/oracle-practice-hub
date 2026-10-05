const CACHE_NAME = 'oracle-practice-hub-v1'
const CACHE_PREFIX = 'oracle-practice-hub-'
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './icons/app-icon.svg']

const inScopeUrl = (path) => new URL(path, self.registration.scope).toString()

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME)
  const scopeUrl = inScopeUrl('./')
  const response = await fetch(scopeUrl, { cache: 'reload' })

  if (!response.ok) throw new Error(`Unable to cache app shell: ${response.status}`)

  const html = await response.clone().text()
  await cache.put(scopeUrl, response)

  const documentAssets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], scopeUrl))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => url.toString())

  const shellUrls = SHELL_FILES.map(inScopeUrl)
  const urls = [...new Set([...shellUrls, ...documentAssets])].filter((url) => url !== scopeUrl)
  await Promise.all(urls.map(async (url) => {
    const asset = await fetch(url, { cache: 'reload' })
    if (asset.ok) await cache.put(url, asset)
  }))
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAppShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const requestUrl = new URL(request.url)
  if (requestUrl.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME)
            await cache.put(inScopeUrl('./'), response.clone())
          }
          return response
        })
        .catch(async () => (
          await caches.match(inScopeUrl('./'))
          ?? await caches.match(inScopeUrl('./index.html'))
          ?? Response.error()
        )),
    )
    return
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached

      const response = await fetch(request)
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(request, response.clone())
      }
      return response
    }),
  )
})
