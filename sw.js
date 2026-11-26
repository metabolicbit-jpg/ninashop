/* ============================================================
   نینا شاپ — سرویس‌ورکر: نصب‌پذیریِ PWA و کارکردِ آفلاین
   استراتژی (سریع‌ترین حالت):
   - همهٔ درخواست‌ها: اول حافظه (پاسخِ آنی)، به‌روزرسانی در پس‌زمینه
     (stale-while-revalidate) — بارگیریِ دوبارهٔ صفحه‌ها آنی است
   ============================================================ */
var CACHE = 'nina_v2';
var CORE = [
  './',
  'index.html',
  'category.html',
  'product.html',
  'wishlist.html',
  'blog.html',
  'post.html',
  'faq.html',
  'css/style.css',
  'js/icons.js',
  'js/app.js',
  'js/product.js',
  'js/blog.js',
  'js/faq.js',
  'data/site.json',
  'data/products.json',
  'data/testimonials.json',
  'data/categories.json',
  'data/posts.json',
  'data/faq.json',
  'manifest.webmanifest',
  'favicon.svg',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/fonts/Vazirmatn-var.woff2'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(CORE.map(function (u) {
        return c.add(u).catch(function () {});  /* یکی نبود، بقیه نصب شوند */
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;   /* واتساپ و اینستاگرام دستِ خودِ مرورگر */

  /* stale-while-revalidate: پاسخِ ذخیره‌شده همان لحظه، نسخهٔ تازه در پس‌زمینه */
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit || Response.error(); });
      return hit || net;
    })
  );
});
