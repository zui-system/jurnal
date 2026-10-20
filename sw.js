// Zui Jurnal service worker
// Naikkan angka versi ini setiap kali kamu mengubah file aplikasi.
const VERSION = 'zui-jurnal-v26.03';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
// File dari luar yang aman disimpan untuk offline (pustaka Firebase dan font).
const CDN = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Halaman aplikasi: ambil versi terbaru dulu, pakai simpanan kalau offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const cp = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', cp)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // File di domain sendiri dan pustaka CDN: pakai simpanan, perbarui di belakang.
  if (url.origin === location.origin || CDN.includes(url.hostname)) {
    e.respondWith(
      caches.open(VERSION).then(c => c.match(req).then(hit => {
        const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
  }
  // Selain itu (login dan database Firebase) dibiarkan langsung ke internet.
});

// Klik notifikasi: buka atau fokuskan aplikasi, lalu tuju modul yang diminta (mis. Kewajiban).
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const go = (e.notification.data || {}).go || '';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if ('focus' in c) { if (go) c.postMessage({ go }); return c.focus(); }
      return self.clients.openWindow('./' + (go ? '#' + go : ''));
    })
  );
});
