const CACHE_NAME = "collie-monitor-v1";

const CRITICAL_ASSETS = [
  "/",
  "/index.html",
  "/src/main.tsx",
  "/assets/generated/icon-192.dim_192x192.png",
  "/assets/generated/icon-512.dim_512x512.png",
];

// Install event: precache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Precaching critical assets");
      return cache.addAll(CRITICAL_ASSETS).catch((err) => {
        console.warn("[Service Worker] Failed to precache some assets:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event: cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: implement cache strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests and API calls to Binance
  if (url.origin !== location.origin) {
    if (url.hostname.includes("binance.com")) {
      // Network-first for Binance API calls
      event.respondWith(
        fetch(request)
          .then((response) => {
            return response;
          })
          .catch(() => {
            return new Response(
              JSON.stringify({ error: "Network unavailable" }),
              {
                status: 503,
                headers: { "Content-Type": "application/json" },
              }
            );
          })
      );
    }
    return;
  }

  // Cache-first strategy for static assets (JS, CSS, fonts, images)
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    request.destination === "image"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for HTML and other requests
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline page for navigation requests
          if (request.destination === "document") {
            return caches.match("/");
          }
        });
      })
  );
});
