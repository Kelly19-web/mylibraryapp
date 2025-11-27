// Nombre del caché
const CACHE_NAME = "libraryhub-cache-v1";

// Archivos que se cachean para funcionar offline
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// INSTALACIÓN (guarda los archivos básicos)
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// ACTIVATE (limpia versiones viejas de caché)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// FETCH (primero red → si falla → usa caché)
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // ⚠️ No cachear requests a Supabase (muy importante)
  if (url.origin.includes("supabase.co")) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});