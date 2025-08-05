// Service Worker per CV PWA Editor - EduTechLab Italia
// Per forzare aggiornamenti PWA: incrementare i numeri di versione qui sotto

const CACHE_NAME = 'cv-pwa-editor-v2.5.0';
const STATIC_CACHE = 'cv-static-v2.5.0';
const DYNAMIC_CACHE = 'cv-dynamic-v2.5.0';

// File da cachare immediatamente (cache statica)
const STATIC_FILES = [
  '/cv-pwa-editor/',
  '/cv-pwa-editor/index.html',
  '/cv-pwa-editor/manifest.json',
  // CSS e JS inline nell'HTML non servono cache separata
];

// Strategia di cache per diversi tipi di richieste
const CACHE_STRATEGIES = {
  // File statici: Cache First (usa cache, fallback a rete)
  static: ['/cv-pwa-editor/', '/cv-pwa-editor/index.html', '/cv-pwa-editor/manifest.json'],
  
  // API e dati dinamici: Network First (usa rete, fallback a cache)
  dynamic: ['/api/'],
  
  // Immagini: Cache First con fallback
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
};

// === EVENTI SERVICE WORKER ===

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...', event);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] Static files cached successfully');
        // Forza l'attivazione immediata del nuovo SW
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error during install:', error);
      })
  );
});

// Attivazione del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...', event);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Elimina cache vecchie
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated successfully');
        // Prendi controllo di tutte le pagine aperte
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Error during activate:', error);
      })
  );
});

// Intercettazione delle richieste di rete
self.addEventListener('fetch', (event) => {
  // Skip richieste non HTTP/HTTPS
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  console.log('[SW] Fetching:', event.request.url);
  
  event.respondWith(
    handleFetchRequest(event.request)
  );
});

// === STRATEGIE DI CACHE ===

async function handleFetchRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Determina la strategia di cache
    if (isStaticFile(url.pathname)) {
      return await cacheFirstStrategy(request);
    } else if (isImageFile(url.pathname)) {
      return await cacheFirstStrategy(request);
    } else if (isDynamicContent(url.pathname)) {
      return await networkFirstStrategy(request);
    } else {
      // Default: Network First
      return await networkFirstStrategy(request);
    }
  } catch (error) {
    console.error('[SW] Error handling fetch:', error);
    return await fallbackResponse(request);
  }
}

// Cache First: controlla cache prima, poi rete
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Cache hit:', request.url);
      return cachedResponse;
    }
    
    console.log('[SW] Cache miss, fetching from network:', request.url);
    const networkResponse = await fetch(request);
    
    // Se la risposta è valida, salvala in cache
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache First error:', error);
    throw error;
  }
}

// Network First: prova rete prima, poi cache
async function networkFirstStrategy(request) {
  try {
    console.log('[SW] Network first for:', request.url);
    const networkResponse = await fetch(request);
    
    // Se la risposta è valida, aggiorna la cache
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// === UTILITY FUNCTIONS ===

function isStaticFile(pathname) {
  return CACHE_STRATEGIES.static.some(pattern => 
    pathname === pattern || pathname.startsWith(pattern)
  );
}

function isDynamicContent(pathname) {
  return CACHE_STRATEGIES.dynamic.some(pattern => 
    pathname.startsWith(pattern)
  );
}

function isImageFile(pathname) {
  return CACHE_STRATEGIES.images.some(ext => 
    pathname.toLowerCase().endsWith(ext)
  );
}

// Risposta di fallback quando tutto fallisce
async function fallbackResponse(request) {
  // Per pagine HTML, ritorna una pagina offline
  if (request.destination === 'document') {
    return new Response(`
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CV Editor - Offline</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background-color: #f3f4f6;
            text-align: center;
          }
          .offline-container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 400px;
          }
          .offline-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          h1 {
            color: #003d7a;
            margin-bottom: 0.5rem;
          }
          p {
            color: #6b7280;
            margin-bottom: 1.5rem;
          }
          button {
            background-color: #003d7a;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
          }
          button:hover {
            background-color: #002a5c;
          }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <div class="offline-icon">📄</div>
          <h1>CV Editor Offline</h1>
          <p>Sei attualmente offline, ma puoi continuare a lavorare sul tuo CV. I tuoi dati sono salvati localmente.</p>
          <button onclick="window.location.reload()">Riprova connessione</button>
        </div>
        <script>
          // Auto-reload quando torna online
          window.addEventListener('online', () => {
            window.location.reload();
          });
        </script>
      </body>
      </html>
    `, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
  
  // Per altre richieste, ritorna un errore standard
  return new Response('Offline - Risorsa non disponibile', {
    status: 503,
    statusText: 'Service Unavailable',
  });
}

// === GESTIONE MESSAGGI ===

// Ascolta messaggi dall'app per operazioni speciali
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'FORCE_UPDATE':
      self.registration.update();
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Funzione per pulire tutte le cache
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('[SW] All caches cleared');
    return true;
  } catch (error) {
    console.error('[SW] Error clearing caches:', error);
    return false;
  }
}

// === GESTIONE SINCRONIZZAZIONE BACKGROUND ===

// Per future funzionalità di sync quando l'app torna online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Qui puoi aggiungere logica per sincronizzare dati
      // quando l'app torna online
      console.log('[SW] Background sync completed')
    );
  }
});

// === NOTIFICHE PUSH (per future funzionalità) ===

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/cv-pwa-editor/icon-192x192.png',
      badge: '/cv-pwa-editor/badge-72x72.png',
      data: data.data
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Gestione click su notifiche
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  event.waitUntil(
    self.clients.openWindow('/cv-pwa-editor/')
  );
});
