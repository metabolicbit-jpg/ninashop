/* ============================================================
   نینا شاپ — سرویس‌ورکر: نصب‌پذیریِ PWA و کارکردِ آفلاین
   استراتژی:
   - صفحه‌ها (HTML): اول حافظه، به‌روزرسانی در پس‌زمینه — بازشدنِ آنی
   - داده‌هایِ JSON: اول شبکه (تازگیِ محتوا بعد از انتشار)، در نبودِ
     اینترنت حافظه — فایل‌ها کوچک‌اند و هزینه‌ای ندارند
   - فایل‌هایِ ثابت (css/js/فونت/آیکون): اول حافظه، سریع مثل اپ
   ============================================================ */
var CACHE = 'nina_v3';
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

  var isNav = req.mode === 'navigate';
  var isData = /\.json$/.test(url.pathname);

  if (isData) {
    /* داده: اول شبکه (تازه)، در نبودِ اینترنت آخرین نسخهٔ ذخیره‌شده */
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || Response.error(); });
      })
    );
    return;
  }

  if (isNav) {
    /* صفحه: پاسخِ ذخیره‌شده همان لحظه، نسخهٔ تازه در پس‌زمینه */
    e.respondWith(
      caches.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
          }
          return res;
        }).catch(function () { return hit || caches.match('./') || Response.error(); });
        return hit || net;
      })
    );
    return;
  }

  /* فایلِ ثابت: اول حافظه */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
