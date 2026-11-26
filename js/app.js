/* ============================================================
   نینا شاپ — js/app.js  (منطقِ صفحهٔ اصلی)
   ============================================================ */
(function () {
  'use strict';
  var R = window.Nina;

  /* ---------- داده‌ها ---------- */
  var site = null, products = [], testimonials = [];

  /* ترتیبِ سایزها: از کوچک به بزرگ */
  var SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'XXXL', '4XL', '5XL', '6XL'];
  function sizeKey(s) {
    var up = String(s).trim().toUpperCase().replace('XXXL', '3XL').replace('XXL', '2XL');
    var i = SIZE_ORDER.indexOf(up.replace('2XL', 'XXL'));
    if (i === -1) {
      var m = String(s).match(/\d+/);
      return m ? 1000 + Number(m[0]) : 2000; /* سایزِ عددی یا نامعلوم: بعد از حروفی‌ها */
    }
    return i;
  }
  function sortedSizes(p) {
    return (p.sizes || []).slice().sort(function (a, b) { return sizeKey(a) - sizeKey(b); });
  }

  function coverInner(p, big) {
    if (p.image) {
      return '<div class="cover with-img' + (p.bare ? ' bare' : '') + '" style="' + (p.bare ? '' : coverStyle(p)) + '">' +
        '<img src="' + R.esc(R.imgSrc(p)) + '" alt="' + R.esc(p.name) + '" loading="lazy">' +
        '</div>';
    }
    if (p.art && R.ART && R.ART[p.art]) {
      return '<div class="cover with-art" style="' + coverStyle(p) + '">' + R.art(p.art) + '</div>';
    }
    if (p.art === 'none') return '<div class="cover" style="' + coverStyle(p) + '"></div>';
    return '<div class="cover" style="' + coverStyle(p) + '">' + R.icon(p.icon || 'heart') + '</div>';
  }

  /* نشانِ درصدِ تخفیف: وقتی قیمتِ پیش از تخفیف بالاتر از قیمتِ فعلی باشد */
  function discountBadge(p) {
    var o = Number(p.oldPrice), n = Number(p.price);
    if (!(o > n && n > 0)) return '';
    return '<span class="badge off">٪' + R.fa(Math.round((o - n) / o * 100)) + ' تخفیف</span>';
  }

  function colorChip(c) {
    if (typeof c === 'string') c = { name: c, hex: '' };
    var dot = c.hex ? '<span class="color-dot" style="background:' + R.esc(c.hex) + '"></span>' : '';
    return '<span class="chip color-chip">' + dot + R.esc(c.name) + '</span>';
  }

  function coverStyle(p) {
    var a = (p.cover && p.cover[0]) || '#f8c8d8';
    var b = (p.cover && p.cover[1]) || '#fde8ef';
    return 'background:linear-gradient(135deg,' + a + ',' + b + ')';
  }

  function priceHTML(p) {
    var h = R.faPrice(p.price) + ' <small>تومان</small>';
    if (p.oldPrice && Number(p.oldPrice) > Number(p.price)) {
      h += '<span class="old-price">' + R.faG(p.oldPrice) + '</span>';
    }
    return h;
  }

  function orderLink(p) {
    var msg = R.rtlFix('سلام! می‌خواستم «' + p.name + '» را سفارش بدهم.');
    var wa = (site.channels && site.channels.whatsapp) || '';
    if (wa) return wa + '?text=' + encodeURIComponent(msg);
    var tg = (site.channels && site.channels.telegram) || '';
    if (tg) return tg;
    return (site.channels && site.channels.instagram) || '#';
  }

  function stockBadge(p) {
    var n = Number(p.stock);
    if (!(n > 0 && n <= 5)) return '';
    return '<span class="stock-badge"><i data-ic="sparkles"></i> فقط ' + R.fa(n) + ' عدد مانده</span>';
  }

  function productCard(p) {
    var soon = p.status === 'soon';
    var order = soon
      ? '<span class="card-order soon">به‌زودی</span>'
      : '<a class="card-order" href="' + orderLink(p) + '" target="_blank" rel="noopener" data-act="order">' +
          R.icon('message') + ' سفارش</a>';
    return '' +
      '<article class="card reveal">' +
        '<button type="button" class="wish-btn' + (R.wishHas(p.id) ? ' active' : '') + '" data-wish="' + R.esc(p.id) + '" aria-label="افزودن به علاقه‌مندی‌ها">' + R.icon('heart') + '</button>' +
        '<a href="product.html?id=' + encodeURIComponent(p.id) + '" aria-label="' + R.esc(p.name) + '">' +
          (soon ? '<span class="badge soon">به‌زودی</span>' : (p.badge ? '<span class="badge">' + R.esc(p.badge) + '</span>' : '')) +
          discountBadge(p) +
          coverInner(p) +
        '</a>' +
        '<div class="card-body">' +
          '<span class="card-cat">' + R.esc(p.category || '') + '</span>' +
          '<a href="product.html?id=' + encodeURIComponent(p.id) + '"><h3 class="card-name">' + R.esc(p.name) + '</h3></a>' +
          stockBadge(p) +
          '<div class="card-foot">' +
            '<div class="price">' + priceHTML(p) + '</div>' +
            order +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function renderProducts() {
    var grid = document.getElementById('productGrid');
    if (!grid) return;
    renderCatFilter();
    applyCatFilter('');
  }

  /* ---------- فیلترِ دسته روی صفحهٔ اصلی ---------- */
  function renderCatFilter() {
    var box = document.getElementById('catFilter');
    if (!box) return;
    var cats = [];
    products.forEach(function (p) {
      if (p.status !== 'hidden' && p.category && cats.indexOf(p.category) === -1) cats.push(p.category);
    });
    if (cats.length < 2) { box.style.display = 'none'; return; }
    box.style.display = '';
    box.innerHTML = '<button class="cat-chip active" data-cat="">همه</button>' +
      cats.map(function (c) {
        return '<button class="cat-chip" data-cat="' + R.esc(c) + '">' + R.esc(c) + '</button>';
      }).join('');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]');
      if (!b) return;
      box.querySelectorAll('.cat-chip').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      applyCatFilter(b.getAttribute('data-cat'));
    });
  }

  function applyCatFilter(cat) {
    var grid = document.getElementById('productGrid');
    if (!grid) return;
    var active = products.filter(function (p) {
      return p.status !== 'hidden' && (!cat || p.category === cat);
    });
    active.sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });
    grid.innerHTML = active.map(productCard).join('') ||
      '<p class="hint">محصولی در این دسته نیست.</p>';
    /* کارت‌هایِ تازه‌رندرشده باید دوباره واردِ انیمیشنِ reveal شوند */
    R.bindReveal();
  }

  /* ---------- لینکِ دسته‌ها در فوتر (سئوی داخلی) ---------- */
  function renderFootCats() {
    var box = document.getElementById('footCats');
    if (!box) return;
    var cats = [];
    products.forEach(function (p) {
      if (p.status !== 'hidden' && p.category && cats.indexOf(p.category) === -1) cats.push(p.category);
    });
    box.innerHTML = cats.map(function (c) {
      return '<a href="category.html?id=' + encodeURIComponent(c) + '"><i data-ic="chevron-left"></i> ' + R.esc(c) + '</a>';
    }).join('');
  }

  /* ---------- صفحهٔ دسته (category.html) ---------- */
  function renderCategoryPage() {
    var grid = document.getElementById('catGrid');
    if (!grid) return;
    var slug = new URLSearchParams(location.search).get('id') || '';
    R.fetchJSON('data/categories.json').then(function (cats) {
      var c = (cats || []).filter(function (x) { return x.name === slug; })[0] || null;
      var list = products.filter(function (p) {
        return p.status !== 'hidden' && p.category === slug;
      });
      document.title = (c ? c.name : slug || 'دسته‌بندی') + ' | ' + (site && site.name ? site.name : 'نینا شاپ');
      var m = document.querySelector('meta[name="description"]');
      if (m) m.setAttribute('content', c && c.intro ? c.intro.slice(0, 155) : 'محصولاتِ ' + slug + ' از بوتیکِ نینا شاپ');
      var t = document.getElementById('catTitle');
      if (t) t.textContent = c ? c.name : (slug || 'دسته‌بندی');
      var intro = document.getElementById('catIntro');
      if (intro) intro.textContent = c && c.intro ? c.intro : '';
      var crumbs = document.getElementById('crumbs');
      if (crumbs) {
        crumbs.innerHTML = '<a href="./">خانه</a>' + R.icon('chevron-left') +
          '<span>' + R.esc(c ? c.name : slug) + '</span>';
      }
      list.sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });
      grid.innerHTML = list.map(productCard).join('') ||
        '<p class="hint">هنوز محصولی در این دسته نیست.</p>';

      /* اسکیمای ItemList + BreadcrumbList */
      var domain = ((site && site.domain) || '').replace(/\/$/, '');
      var ld = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ItemList',
            'name': c ? c.name : slug,
            'itemListElement': list.map(function (p, i) {
              return { '@type': 'ListItem', 'position': i + 1,
                'url': domain + '/product.html?id=' + encodeURIComponent(p.id),
                'name': p.name };
            })
          },
          {
            '@type': 'BreadcrumbList',
            'itemListElement': [
              { '@type': 'ListItem', 'position': 1, 'name': 'خانه', 'item': domain || '' },
              { '@type': 'ListItem', 'position': 2, 'name': c ? c.name : slug }
            ]
          }
        ]
      };
      var s = document.createElement('script');
      s.type = 'application/ld+json';
      s.textContent = JSON.stringify(ld);
      document.head.appendChild(s);
      R.paintIcons();
      R.bindReveal();
    });
  }

  /* ---------- صفحهٔ علاقه‌مندی‌ها ---------- */
  function renderWishlist() {
    var grid = document.getElementById('wishGrid');
    if (!grid) return;
    var ids = R.wishGet();
    var list = products.filter(function (p) {
      return ids.indexOf(p.id) !== -1 && p.status !== 'hidden';
    });
    grid.innerHTML = list.map(productCard).join('') ||
      '<p class="hint">هنوز چیزی به علاقه‌مندی‌ها اضافه نکرده‌ای؛ روی ♥ هر محصول بزن.</p>';
  }

  /* قلبِ علاقه‌مندی: یک‌جا برایِ همهٔ صفحه‌ها (کارت‌ها و صفحهٔ محصول) */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-wish]');
    if (!b) return;
    e.preventDefault();
    var on = R.wishToggle(b.getAttribute('data-wish'));
    b.classList.toggle('active', on);
    /* در صفحهٔ علاقه‌مندی‌ها، حذف یعنی کارت برود */
    var grid = b.closest('.grid');
    if (grid && grid.id === 'wishGrid' && !on) {
      var card = b.closest('.card');
      if (card) card.remove();
      var box = document.getElementById('wishGrid');
      if (box && !box.children.length) {
        box.innerHTML = '<p class="hint">هنوز چیزی به علاقه‌مندی‌ها اضافه نکرده‌ای؛ روی ♥ هر محصول بزن.</p>';
      }
    }
  });

  /* ---------- بخشِ ویژهٔ صفحهٔ اصلی: اسلایدرِ کارتیِ محصولاتِ ویژه ----------
     هر محصولِ «ویژه» یک کارت با دکمهٔ «دیدن» دارد که به صفحهٔ اختصاصی‌اش می‌رود.
     اسلایدر هم خودکار می‌چرخد، هم با کشیدنِ دست جابجا می‌شود؛ نقطه‌ها هم قابلِ کلیک‌اند. */
  function renderFeaturedSlider() {
    var el = document.getElementById('heroCard');
    if (!el) return;
    var feat = products.filter(function (p) { return p.status !== 'hidden' && p.featured; });
    if (!feat.length) feat = products.filter(function (p) { return p.status !== 'hidden'; }).slice(0, 3);
    if (!feat.length) { el.style.display = 'none'; return; }
    el.removeAttribute('aria-hidden');
    el.style.animation = 'none';   /* اسلایدر نباید شناور باشد؛ نقطه‌ها زیرِ دست جابجا نشوند */
    el.innerHTML =
      '<div class="fslider" id="fslider">' +
        '<div class="ftrack" id="ftrack">' +
          feat.map(function (p) {
            return '<div class="fslide"><div class="fcard">' +
              '<a href="product.html?id=' + encodeURIComponent(p.id) + '" aria-label="' + R.esc(p.name) + '">' +
                coverInner(p) +
              '</a>' +
              '<div class="frow"><span class="fname">' + R.esc(p.name) + '</span>' +
                '<span class="fprice">' + R.faPrice(p.price) + ' <small>تومان</small></span></div>' +
              '<a class="fview" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
                R.icon('eye') + ' دیدنِ محصول</a>' +
            '</div></div>';
          }).join('') +
        '</div>' +
        '<div class="fdots">' + feat.map(function (_, i) {
          return '<button type="button" data-dot="' + i + '" aria-label="اسلایدِ ' + R.fa(i + 1) + '"></button>';
        }).join('') + '</div>' +
      '</div>';

    var track = el.querySelector('#ftrack');
    var zone = el.querySelector('#fslider');
    var dots = Array.prototype.slice.call(el.querySelectorAll('.fdots button'));
    var fi = 0, ftimer = null;

    function paint() {
      track.style.transform = 'translateX(' + (fi * 100) + '%)';
      dots.forEach(function (d, i) { d.classList.toggle('active', i === fi); });
    }
    function stopAuto() { if (ftimer) { clearInterval(ftimer); ftimer = null; } }
    function startAuto() { stopAuto(); ftimer = setInterval(function () { fgo(fi + 1); }, 5000); }
    function fgo(i) { fi = (i + feat.length) % feat.length; paint(); }

    dots.forEach(function (d) {
      d.addEventListener('click', function () { fgo(Number(d.dataset.dot)); startAuto(); });
    });
    /* کشیدنِ با دست: در راست‌به‌چپ، اسلایدِ بعدی سمتِ چپ است */
    var sx = null, dx = 0;
    zone.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; dx = 0; stopAuto(); }, { passive: true });
    zone.addEventListener('touchmove', function (e) {
      if (sx === null) return;
      dx = e.touches[0].clientX - sx;
      track.style.transition = 'none';
      track.style.transform = 'translateX(' + (fi * 100 + (-dx / zone.offsetWidth * 100)) + '%)';
    }, { passive: true });
    zone.addEventListener('touchend', function () {
      track.style.transition = '';
      if (Math.abs(dx) > 40) fgo(fi + (dx < 0 ? 1 : -1));
      else paint();
      startAuto();
      sx = null;
    });
    zone.addEventListener('mouseenter', stopAuto);
    zone.addEventListener('mouseleave', startAuto);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopAuto(); else startAuto();
    });

    paint();
    startAuto();
  }

  /* ---------- اسلایدرِ نظرات: فقط کارتِ جلو لغزش می‌کند؛ کارت‌هایِ پشت ثابت‌اند.
     موتورِ حرکت: رندرِ هر فریم با requestAnimationFrame، قفلِ جهت،
     پرتابِ نرم بر پایهٔ سرعتِ دست، و توقفِ فنری. ---------- */
  var slideIdx = 0, autoTimer = null;
  var anim = { raf: 0, from: 0, to: 0, t0: 0, dur: 0, onDone: null };
  var hoverPause = false, offscreen = false;

  function tCard(t) {
    var stars = '';
    for (var i = 0; i < 5; i++) stars += (i < (t.stars || 5) ? '★' : '☆');
    return '<div class="slide"><div class="t-card">' +
      '<span class="t-quote">”</span>' +
      '<p class="t-text">' + R.esc(t.text) + '</p>' +
      '<div class="t-foot"><span class="t-name">' + R.esc(t.name) + '</span>' +
      '<span class="t-stars" aria-label="' + (t.stars || 5) + ' از ۵ ستاره">' + stars + '</span></div>' +
      '</div></div>';
  }

  function renderTestimonials() {
    var track = document.getElementById('tTrack');
    var dots = document.getElementById('tDots');
    if (!track) return;
    if (!testimonials.length) {
      track.innerHTML = '';
      var box = track.closest('.slider');
      if (box) box.style.display = 'none';
      if (dots) dots.style.display = 'none';
      return;
    }
    track.innerHTML = testimonials.map(tCard).join('');
    dots.innerHTML = testimonials.map(function (t, i) {
      return '<button aria-label="نظر ' + R.fa(i + 1) + '"' + (i === 0 ? ' class="active"' : '') + '></button>';
    }).join('');
    Array.prototype.forEach.call(dots.children, function (b, i) {
      b.addEventListener('click', function () { goSlide(i, { manual: true }); });
    });
    bindSwipe();
    goSlide(0, { instant: true });
    startAuto();
  }

  /* موقعیتِ ترک بر حسبِ اسلاید (عددِ اعشاری: ۱٫۳ یعنی یک‌سوم راهِ اسلایدِ بعد) */
  function trackPos() {
    var track = document.getElementById('tTrack');
    var m = /translateX\((-?[\d.]+)%\)/.exec((track && track.style.transform) || '');
    return m ? parseFloat(m[1]) / 100 : slideIdx;
  }
  function setPos(p) {
    var track = document.getElementById('tTrack');
    if (track) track.style.transform = 'translateX(' + (p * 100) + '%)';
  }
  function setDots(i) {
    var dots = document.getElementById('tDots');
    if (dots) Array.prototype.forEach.call(dots.children, function (b, k) {
      b.classList.toggle('active', k === i);
    });
  }
  function cancelAnim() {
    if (anim.raf) { cancelAnimationFrame(anim.raf); anim.raf = 0; }
  }

  /* انیمیشنِ هموار تا هدف؛ easeOutQuart = شتابِ آرام و توقفِ فنریِ بی‌پرش */
  function animTo(target, dur, onDone) {
    cancelAnim();
    var from = trackPos();
    if (Math.abs(target - from) < 0.002) { setPos(target); if (onDone) onDone(); return; }
    anim = { from: from, to: target, t0: performance.now(), dur: dur || 550, onDone: onDone || null, raf: 0 };
    var step = function (now) {
      var t = Math.min((now - anim.t0) / anim.dur, 1);
      var e = 1 - Math.pow(1 - t, 4);
      setPos(anim.from + (anim.to - anim.from) * e);
      if (t < 1) { anim.raf = requestAnimationFrame(step); }
      else { anim.raf = 0; if (anim.onDone) anim.onDone(); }
    };
    anim.raf = requestAnimationFrame(step);
  }

  function norm(i) {
    var n = testimonials.length;
    return n ? ((i % n) + n) % n : 0;
  }

  function goSlide(i, opts) {
    if (!testimonials.length) return;
    opts = opts || {};
    slideIdx = norm(i);
    setDots(slideIdx);
    if (opts.instant) { cancelAnim(); setPos(slideIdx); }
    else animTo(slideIdx, opts.dur || 500);
    if (opts.manual) restartAuto();
  }

  /* گامِ خودکار: فقط وقتی صفحه دیده می‌شود و کاربر با آن کار نمی‌کند */
  function startAuto() {
    stopAuto();
    autoTimer = setInterval(function () {
      if (!hoverPause && !offscreen && !document.hidden) goSlide(slideIdx + 1, { dur: 750 });
    }, 6000);
  }
  function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }
  function restartAuto() { startAuto(); }

  /* کشیدن با انگشت: کارت همراهِ دست می‌آید؛ قفلِ جهت، اسکرولِ عمودی را حفظ می‌کند.
     در چیدمانِ راست‌به‌چپ، اسلایدِ بعدی سمتِ چپِ اسلایدِ فعلی است،
     پس کشیدنِ دست به راست، اسلایدِ بعدی را می‌آورد. */
  function bindSwipe() {
    var slider = document.getElementById('tSlider');
    if (!slider) return;
    slider.style.touchAction = 'pan-y';
    var drag = null; /* {id, x0, y0, dx, dy, locked, vx, lastX, lastT} */

    function width() { return slider.getBoundingClientRect().width || 1; }

    function begin(e) {
      if (drag) return; /* انگشتِ دوم نادیده */
      cancelAnim();
      stopAuto();
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, locked: '', vx: 0, lastX: e.clientX, lastT: Date.now() };
      try { slider.setPointerCapture(e.pointerId); } catch (err) {}
    }

    function move(e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.x0;
      drag.dy = e.clientY - drag.y0;
      if (!drag.locked) {
        if (Math.abs(drag.dx) < 6 && Math.abs(drag.dy) < 6) return;
        drag.locked = Math.abs(drag.dy) > Math.abs(drag.dx) ? 'y' : 'x';
        if (drag.locked === 'y') { drag = null; startAuto(); return; } /* اسکرولِ عمودی، دستِ ما نیست */
      }
      var now = Date.now(), dt = now - drag.lastT;
      if (dt > 0) { /* سرعتِ میان‌یافته برایِ پرتابِ نرم */
        drag.vx = 0.75 * drag.vx + 0.25 * ((e.clientX - drag.lastX) / dt);
        drag.lastX = e.clientX; drag.lastT = now;
      }
      var pos = slideIdx + drag.dx / width();
      setPos(pos);
      var n = testimonials.length;
      if (n) setDots(norm(Math.round(pos))); /* نقطه‌ها همراهِ دست عوض می‌شوند */
    }

    function end(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null;
      if (d.locked !== 'x') { startAuto(); return; }
      /* پیش‌بینیِ پرتاب: موقعیت + سرعتِ دست × ۱۶۰ میلی‌ثانیه */
      var proj = slideIdx + d.dx / width() + d.vx * 0.16;
      var target = proj > slideIdx + 0.3 ? slideIdx + 1
                 : proj < slideIdx - 0.3 ? slideIdx - 1
                 : slideIdx;
      if (target === slideIdx && Math.abs(d.vx) > 0.55) target = slideIdx + (d.vx > 0 ? 1 : -1);
      slideIdx = target;
      setDots(norm(target));
      animTo(target, 480, function () { /* بعد از توقف، به بازهٔ ۰ تا n-1 برمی‌گردیم */
        var n = testimonials.length;
        if (norm(target) !== target) { cancelAnim(); setPos(norm(target)); }
        slideIdx = norm(target);
      });
      startAuto();
    }

    slider.addEventListener('pointerdown', begin);
    slider.addEventListener('pointermove', move);
    slider.addEventListener('pointerup', end);
    slider.addEventListener('pointercancel', end);
    /* فقط مانعِ اسکرولِ صفحه در کشیدنِ افقی — رانندگیِ دوگانه نداریم */
    slider.addEventListener('touchmove', function (e) {
      if (drag && drag.locked === 'x') e.preventDefault();
    }, { passive: false });

    /* توقفِ خودکار وقتی کاربر روی کارت است یا اسلایدر دیده نمی‌شود */
    slider.addEventListener('mouseenter', function () { hoverPause = true; });
    slider.addEventListener('mouseleave', function () { hoverPause = false; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { offscreen = !entries[0].isIntersecting; },
        { threshold: 0.15 }).observe(slider);
    }
  }

  /* ---------- محتوای سایت از site.json ---------- */
  function renderSite() {
    document.querySelectorAll('[data-site="name"]').forEach(function (el) { el.textContent = site.name || 'نینا شاپ'; });
    document.querySelectorAll('[data-site="tagline"]').forEach(function (el) { el.textContent = site.tagline || ''; });
    document.querySelectorAll('[data-site="about"]').forEach(function (el) { el.textContent = site.about || ''; });
    document.querySelectorAll('[data-site="shipping"]').forEach(function (el) { el.textContent = site.shipping || ''; });
    document.querySelectorAll('[data-site="guarantee"]').forEach(function (el) { el.textContent = site.guarantee || ''; });
    var ch = site.channels || {};
    ['instagram', 'telegram', 'whatsapp'].forEach(function (k) {
      document.querySelectorAll('[data-channel="' + k + '"]').forEach(function (a) {
        if (ch[k]) a.href = ch[k]; else a.style.display = 'none';
      });
    });
    document.querySelectorAll('[data-channel-text="phone"]').forEach(function (el) {
      el.textContent = ch.phone || '';
    });
    var tel = document.querySelector('[data-channel="phone"]');
    if (tel && ch.phone) {
      tel.href = 'tel:+' + R.normDigits(ch.phone).replace(/\D/g, '');
    }
    var y = document.getElementById('year');
    if (y) y.textContent = R.fa(new Date().getFullYear());
  }

  /* ---------- منویِ موبایل ---------- */
  function bindMenu() {
    var btn = document.getElementById('menuBtn');
    var nav = document.getElementById('mobileNav');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.innerHTML = R.icon(open ? 'xmark' : 'bars');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        btn.innerHTML = R.icon('bars');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- خطاها را قورت نده؛ جدا از رندر ---------- */
  function boot() {
    R.initTheme();
    R.bindThemeToggle();
    R.paintIcons();
    bindMenu();
    R.bindBottomNav();
    R.registerSW();
    var y = document.getElementById('year');
    if (y) y.textContent = R.fa(new Date().getFullYear());

    var siteP = R.fetchJSON('data/site.json').then(function (s) { site = s; })
      .catch(function () { site = { name: 'نینا شاپ', channels: {} }; });
    var prodP = R.fetchJSON('data/products.json').then(function (p) { products = p || []; })
      .catch(function () { products = []; });
    var testP = R.fetchJSON('data/testimonials.json').then(function (t) { testimonials = t || []; })
      .catch(function () { testimonials = []; });

    Promise.all([siteP, prodP, testP]).then(function () {
      renderSite();
      renderFootCats();
      if (document.getElementById('catGrid')) {
        renderCategoryPage();
      } else if (document.getElementById('wishGrid')) {
        renderWishlist();
      } else {
        renderProducts();
        renderFeaturedSlider();
        renderTestimonials();
      }
      R.paintIcons();
      R.bindReveal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
