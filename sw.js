// Программа открывается даже при медленном интернете (VPN): страница и библиотеки хранятся в телефоне.
// Страницы: сначала сеть (свежая версия), если сеть думает дольше 3 с — сохранённая копия. Библиотеки и значки — из памяти.
var CACHE = 'dd-v2';
var SHELL = ['./', './index.html', './cabinet.html', './supabase.js', './icon-192.png', './manifest.webmanifest'];
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL).catch(function () {}); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function put(req, res) { if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); } return res; }
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  var page = req.mode === 'navigate' || /\.html$/.test(url.pathname) || /\/$/.test(url.pathname);
  if (url.origin === location.origin && page) {
    var key = new Request(url.origin + url.pathname); // ?t= и ?k= не важны для копии страницы
    e.respondWith(new Promise(function (resolve) {
      var done = false, finish = function (r) { if (!done && r) { done = true; resolve(r); } };
      var net = fetch(req).then(function (r) { put(key, r.clone()); return r; });
      var t = setTimeout(function () { caches.match(key).then(finish); }, 3000);
      net.then(function (r) { clearTimeout(t); finish(r); }, function () { clearTimeout(t); caches.match(key).then(function (c) { finish(c || Response.error()); }); });
    }));
    return;
  }
  if (url.origin === location.origin || url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    e.respondWith(caches.match(req).then(function (c) {
      var net = fetch(req).then(function (r) { return put(req, r); }).catch(function () { return c; });
      return c || net;
    }));
  }
});
