/* ============================================================
   نینا شاپ — js/product.js  (صفحهٔ محصول + اسکیمای Product)
   ============================================================ */
(function () {
  'use strict';
  var R = window.Nina;

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ترتیبِ سایزها: از کوچک به بزرگ (مشترک با app.js — همین نسخه اینجا هم هست) */
  var SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'XXXL', '4XL', '5XL', '6XL'];
  function sizeKey(s) {
    var up = String(s).trim().toUpperCase().replace('XXXL', '3XL').replace('XXL', '2XL');
    var i = SIZE_ORDER.indexOf(up.replace('2XL', 'XXL'));
    if (i === -1) {
      var m = String(s).match(/\d+/);
      return m ? 1000 + Number(m[0]) : 2000;
    }
    return i;
  }
  function sortedSizes(p) {
    return (p.sizes || []).slice().sort(function (a, b) { return sizeKey(a) - sizeKey(b); });
  }

  function colorChip(c) {
    if (typeof c === 'string') c = { name: c, hex: '' };
    var dot = c.hex ? '<span class="color-dot" style="background:' + R.esc(c.hex) + '"></span>' : '';
    return '<button type="button" class="chip color-chip" data-color="' + R.esc(c.name) + '">' + dot + R.esc(c.name) + '</button>';
  }

  function coverStyle(p) {
    var a = (p.cover && p.cover[0]) || '#f8c8d8';
    var b = (p.cover && p.cover[1]) || '#fde8ef';
    return 'background:linear-gradient(135deg,' + a + ',' + b + ')';
  }

  /* پیامِ سفارشِ آماده: با انتخابِ سایز و رنگ، خودکار کامل می‌شود */
  function orderMsg(p, size, color) {
    var msg = 'سلام! «' + p.name + '»';
    if (size) msg += ' سایزِ ' + size;
    if (color) msg += ' رنگِ ' + color;
    msg += ' را می‌خواهم.';
    return R.rtlFix(msg);
  }
  function orderLink(p, site, size, color) {
    var wa = (site.channels && site.channels.whatsapp) || '';
    if (wa) return wa + '?text=' + encodeURIComponent(orderMsg(p, size, color));
    var tg = (site.channels && site.channels.telegram) || '';
    if (tg) return tg;
    return (site.channels && site.channels.instagram) || '#';
  }

  function render(p, site, all) {
    document.title = p.name + ' | ' + (site.name || 'نینا شاپ');
    var desc = (p.desc || '').slice(0, 155);
    var m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute('content', desc);
    var og = document.querySelector('meta[property="og:title"]');
    if (og) og.setAttribute('content', p.name + ' | ' + site.name);
    var ogd = document.querySelector('meta[property="og:description"]');
    if (ogd) ogd.setAttribute('content', desc);
    var ogu = document.querySelector('meta[property="og:url"]');
    if (ogu) ogu.setAttribute('content', (site.domain || '') .replace(/\/$/, '') + '/product.html?id=' + encodeURIComponent(p.id));
    var ogimg = document.querySelector('meta[property="og:image"]');
    if (ogimg) ogimg.setAttribute('content', (site.domain || '').replace(/\/$/, '') +
      (p.image ? '/assets/og/' + encodeURIComponent(p.id) + '.jpg' + (p.imgVer ? '?v=' + p.imgVer : '') : '/assets/og.jpg'));

    /* برداشتِ نان */
    var crumbs = document.getElementById('crumbs');
    if (crumbs) {
      crumbs.innerHTML =
        '<a href="./">خانه</a>' + R.icon('chevron-left') +
        '<a href="./#products">محصولات</a>' + R.icon('chevron-left') +
        '<span>' + R.esc(p.name) + '</span>';
    }

    var sizeChips = sortedSizes(p).map(function (s) {
      return '<button type="button" class="chip size-chip" data-size="' + R.esc(s) + '">' + R.esc(s) + '</button>';
    }).join('');
    var colorChips = (p.colors || []).map(colorChip).join('');
    var old = (p.oldPrice && Number(p.oldPrice) > Number(p.price))
      ? '<span class="old-price">' + R.faG(p.oldPrice) + ' تومان</span>' : '';

    var page = document.getElementById('productPage');
    var hasArt = p.art && R.ART && R.ART[p.art];
    var cover = p.image
      ? '<div class="cover with-img" style="' + coverStyle(p) + '"><img src="' + R.esc(R.imgSrc(p)) + '" alt="' + R.esc(p.name) + '"></div>'
      : '<div class="cover' + (hasArt ? ' with-art' : '') + '" style="' + coverStyle(p) + '">' +
        (hasArt ? R.art(p.art) : R.icon(p.icon || 'heart')) + '</div>';
    var soon = p.status === 'soon';
    var stockN = Number(p.stock);
    var stockHTML = (!soon && stockN > 0 && stockN <= 5)
      ? '<span class="stock-badge big"><i data-ic="sparkles"></i> فقط ' + R.fa(stockN) + ' عدد مانده — سریع تصمیم بگیر</span>'
      : '';
    var orderBox = soon
      ? '<div class="order-box soon-box">' +
          '<span class="chip soon-chip">به‌زودی</span>' +
          '<span class="order-note">' + R.icon('bell' in R.ICONS ? 'bell' : 'sparkles') + ' این محصول به‌زودی می‌رسد؛ برایِ باخبر شدن، در اینستاگرام یا واتساپ دنبالمان کن.</span>' +
        '</div>'
      : '<div class="order-box">' +
          '<a class="btn btn-primary" id="orderWa" href="' + orderLink(p, site) + '" target="_blank" rel="noopener">' + R.icon('whatsapp') + ' سفارشِ سریع در واتساپ</a>' +
          '<a class="btn btn-ghost" data-channel="instagram" href="' + ((site.channels && site.channels.instagram) || '#') + '" target="_blank" rel="noopener">' + R.icon('instagram') + ' پیام در اینستاگرام</a>' +
          '<span class="order-note">' + R.icon('shield') + ' بسته‌بندیِ محرمانه — ' + R.esc(site.shipping || 'ارسال به سراسر ایران') + '</span>' +
        '</div>';
    page.innerHTML =
      '<div class="product-cover">' + cover + '</div>' +
      '<div class="product-info">' +
        '<span class="cat">' + R.esc(p.category || '') + '</span>' +
        '<div class="title-row"><h1>' + R.esc(p.name) + '</h1>' +
        '<button type="button" class="wish-btn big' + (R.wishHas(p.id) ? ' active' : '') + '" data-wish="' + R.esc(p.id) + '" aria-label="افزودن به علاقه‌مندی‌ها">' + R.icon('heart') + '</button></div>' +
        (soon ? '<span class="chip soon-chip">به‌زودی</span>' :
          (p.badge ? '<span class="chip" style="background:var(--accent);color:var(--accent-ink);border-color:var(--accent)">' + R.esc(p.badge) + '</span>' : '')) +
        '<div class="product-price-row"><span class="price">' + R.faPrice(p.price) + ' <small>تومان</small></span>' + old + '</div>' +
        stockHTML +
        '<p class="product-desc">' + R.esc(p.desc || '') + '</p>' +
        '<div class="spec">' +
          (p.fabric ? '<div class="spec-row">' + R.icon('leaf') + '<span><b>جنس:</b> ' + R.esc(p.fabric) + '</span></div>' : '') +
          (p.sizes && p.sizes.length ? '<div class="spec-row">' + R.icon('shirt') + '<span><b>سایز:</b></span><span class="chips">' + sizeChips + '</span></div>' : '') +
          (p.colors && p.colors.length ? '<div class="spec-row">' + R.icon('palette') + '<span><b>رنگ:</b></span><span class="chips">' + colorChips + '</span></div>' : '') +
          (site.guarantee ? '<div class="spec-row">' + R.icon('rotate') + '<span>' + R.esc(site.guarantee) + '</span></div>' : '') +
        '</div>' +
        orderBox +
      '</div>';

    /* انتخابِ سایز و رنگ: پیامِ سفارشِ واتساپ زنده کامل می‌شود */
    var sel = { size: '', color: '' };
    function updateOrder() {
      var a = document.getElementById('orderWa');
      var wa = (site.channels && site.channels.whatsapp) || '';
      if (a && wa) a.href = wa + '?text=' + encodeURIComponent(orderMsg(p, sel.size, sel.color));
    }
    page.querySelectorAll('.size-chip').forEach(function (b) {
      b.addEventListener('click', function () {
        page.querySelectorAll('.size-chip').forEach(function (x) { x.classList.remove('selected'); });
        b.classList.add('selected');
        sel.size = b.getAttribute('data-size') || '';
        updateOrder();
      });
    });
    page.querySelectorAll('.color-chip').forEach(function (b) {
      b.addEventListener('click', function () {
        var wasOn = b.classList.contains('selected');
        page.querySelectorAll('.color-chip').forEach(function (x) { x.classList.remove('selected'); });
        if (wasOn) { sel.color = ''; }
        else { b.classList.add('selected'); sel.color = b.getAttribute('data-color') || ''; }
        updateOrder();
      });
    });
    updateOrder();

    /* محصولاتِ مرتبط (همان دسته، بعد بقیه) */
    var rel = all.filter(function (x) {
      return x.id !== p.id && x.status !== 'hidden' &&
        (x.category === p.category || !p.category);
    });
    if (rel.length < 3) {
      all.forEach(function (x) {
        if (rel.length < 3 && x.id !== p.id && x.status !== 'hidden' && rel.indexOf(x) === -1) rel.push(x);
      });
    }
    var grid = document.getElementById('relatedGrid');
    if (grid) {
      grid.innerHTML = rel.slice(0, 3).map(function (x) {
        return '<article class="card">' +
          '<a href="product.html?id=' + encodeURIComponent(x.id) + '" aria-label="' + R.esc(x.name) + '">' +
            (x.image
              ? '<div class="cover with-img" style="' + coverStyle(x) + '"><img src="' + R.esc(R.imgSrc(x)) + '" alt="' + R.esc(x.name) + '" loading="lazy"></div>'
              : '<div class="cover' + ((x.art && R.ART && R.ART[x.art]) ? ' with-art' : '') + '" style="' + coverStyle(x) + '">' +
                ((x.art && R.ART && R.ART[x.art]) ? R.art(x.art) : R.icon(x.icon || 'heart')) + '</div>') +
          '</a>' +
          '<div class="card-body">' +
            '<span class="card-cat">' + R.esc(x.category || '') + '</span>' +
            '<a href="product.html?id=' + encodeURIComponent(x.id) + '"><h3 class="card-name">' + R.esc(x.name) + '</h3></a>' +
            '<div class="card-foot"><div class="price">' + R.faPrice(x.price) + ' <small>تومان</small></div></div>' +
          '</div>' +
        '</article>';
      }).join('');
      var sec = document.getElementById('related');
      if (sec) sec.style.display = rel.length ? '' : 'none';
    }

    /* اسکیمای Product + BreadcrumbList */
    var ld = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Product',
          'name': p.name,
          'description': p.desc || '',
          'category': p.category || '',
          'brand': { '@type': 'Brand', 'name': site.name || 'نینا شاپ' },
          'offers': {
            '@type': 'Offer',
            'price': String(p.price),
            'priceCurrency': 'IRR',
            'availability': p.status === 'soon' ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock',
            'url': (site.domain || '').replace(/\/$/, '') + '/product.html?id=' + encodeURIComponent(p.id)
          }
        },
        {
          '@type': 'BreadcrumbList',
          'itemListElement': [
            { '@type': 'ListItem', 'position': 1, 'name': 'خانه', 'item': site.domain || '' },
            { '@type': 'ListItem', 'position': 2, 'name': 'محصولات', 'item': (site.domain || '') + '/#products' },
            { '@type': 'ListItem', 'position': 3, 'name': p.name }
          ]
        }
      ]
    };
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  }

  function boot() {
    R.initTheme();
    R.bindBottomNav();
    R.registerSW();
    R.bindThemeToggle();
    R.paintIcons();
    var y = document.getElementById('year');
    if (y) y.textContent = R.fa(new Date().getFullYear());

    var id = new URLSearchParams(location.search).get('id');
    Promise.all([
      R.fetchJSON('data/site.json').catch(function () { return { name: 'نینا شاپ', channels: {} }; }),
      R.fetchJSON('data/products.json').catch(function () { return []; })
    ]).then(function (res) {
      var site = res[0], all = res[1] || [];
      document.querySelectorAll('[data-site="name"]').forEach(function (el) { el.textContent = site.name || 'نینا شاپ'; });
      var ch = site.channels || {};
      var ig = document.querySelector('[data-channel="instagram"]');
      if (ig && ch.instagram) ig.href = ch.instagram;

      var p = byId(all, id) || all.filter(function (x) { return x.status !== 'hidden'; })[0];
      var page = document.getElementById('productPage');
      if (!p) {
        page.innerHTML = '<div class="panel-card"><h3>' + R.icon('info') + ' محصول پیدا نشد</h3>' +
          '<p class="hint">ممکن است حذف شده باشد. <a href="./" style="color:var(--accent)">بازگشت به خانه</a></p></div>';
        return;
      }
      render(p, site, all);
      R.paintIcons();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
