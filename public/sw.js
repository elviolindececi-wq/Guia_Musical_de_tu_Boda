// Service Worker — Mi Boda Organizada · Sistema Ceci
// Estrategia: network-first con caché de respaldo real.
// Garantiza SIEMPRE devolver un Response (el sw anterior devolvía
// undefined cuando fallaba el fetch sin nada cacheado).
const CACHE = 'ceci-cache-v2';

self.addEventListener('install', e => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // No interceptar otros orígenes (Supabase, fuentes, CDNs):
  // que el navegador los maneje directo.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      // Cachear solo respuestas correctas del propio origen
      if (res && res.ok && res.type === 'basic') {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch (err) {
      // Sin red: intentar caché
      const cached = await caches.match(req);
      if (cached) return cached;
      // Navegación sin red ni caché: intentar la home cacheada
      if (req.mode === 'navigate') {
        const home = await caches.match('/');
        if (home) return home;
      }
      // Último recurso: SIEMPRE un Response válido
      return new Response('Sin conexión — abrí la app con internet al menos una vez.', {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});