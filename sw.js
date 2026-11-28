/* ============================================================
   نینا شاپ — سرویس‌ورکر: نصب‌پذیریِ PWA و کارکردِ آفلاین
   استراتژی:
   - کد (HTML، JS، CSS) و داده (JSON): اول شبکه با مهلتِ کوتاه —
     بعد از هر به‌روزرسانی، نسخهٔ تازه همان بار می‌آید؛ کش فقط
     پشتیبانِ وقتی است که شبکه دیر یا قطع باشد
   - فونت و عکس: اول حافظه (نسخه‌دار و تغییرناپذیر)، سریع مثل اپ
   ============================================================ */
var CACHE = 'nina_v8';
var CORE = [
  './',
  'index.html',
  'category.html',
  'product.html',
  'wishlist.html',
  'checkout.html',
  'payment.html',
  'blog.html',
  'post.html',
  'faq.html',
  'css/style.css',
  'js/icons.js',
  'js/app.js',
  'js/cart.js',
  'js/payments.js',
  'js/geo.js',
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

  /* پنلِ مدیریت هرگز از سرویس‌ورکر رد نمی‌شود:
     اگر کش یا قطعیِ شبکه جواب می‌داد، به‌جایِ پنل صفحهٔ اصلیِ سایت باز می‌شد */
  if (url.pathname.indexOf('/admin') !== -1) return;

  var isNav = req.mode === 'navigate';
  var isData = /\.json$/.test(url.pathname);
  var isCode = isNav || isData || /\.(js|css)$/i.test(url.pathname) || /\.(html)$/i.test(url.pathname);

  if (isCode) {
    /* کد و داده: اول شبکه با مهلتِ ۲.۵ ثانیه؛ در شکست، آخرین نسخهٔ ذخیره‌شده */
    e.respondWith(
      new Promise(function (resolve) {
        var settled = false;
        /* داده (JSON) با no-cache می‌رود تا کشِ HTTPِ مرورگر (max-age ۶۰۰ ثانیه‌ایِ گیت‌هاب‌پیجز)
           نسخهٔ کهنه را به‌جای شبکه پس ندهد؛ وگرنه تا ده دقیقه بعد از انتشار، سایت قدیمی را نشان می‌دهد */
        var timer = setTimeout(function () { if (!settled) { settled = true; resolve(null); } }, isData ? 6000 : 2500);
        fetch(req, { cache: isData ? 'no-cache' : 'default' }).then(function (res) {
          if (!settled) { settled = true; clearTimeout(timer); resolve(res); }
        }).catch(function () {
          if (!settled) { settled = true; clearTimeout(timer); resolve(null); }
        });
      }).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return res;
        }
        if (res && !isNav && !isData) return res;   /* خطایِ واقعیِ سرور را پنهان نکن */
        return caches.match(req).then(function (hit) {
          if (hit) return hit;
          if (isNav) return caches.match('./');
          return res || Response.error();
        });
      })
    );
    return;
  }

  /* فونت و عکس: اول حافظه (نسخه‌دار و تغییرناپذیر) */
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
