// Nombre del caché
const CACHE_NAME = "libraryhub-cache-v1";

// Archivos a cachear
const ASSETS_TO_CACHE = [
  "/mylibraryapp/",
  "/mylibraryapp/index.html",
  "/mylibraryapp/style.css",
  "/mylibraryapp/script.js",
  "/mylibraryapp/manifest.json",
  "/mylibraryapp/icons/icon-192.png",
  "/mylibraryapp/icons/icon-512.png"
];

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// ACTIVATE
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// FETCH
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // No cachear supabase
  if (url.origin.includes("supabase.co")) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});