/* ============================================================
   نینا شاپ — js/blog.js  (وبلاگ: فهرست + مقاله، با اسکیمای Article)
   ============================================================ */
(function () {
  'use strict';
  var R = window.Nina;

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function faDate(iso) {
    /* ۲۰۲۶-۱۱-۱۸ → ۱۸ آذر ۱۴۰۵ (تقریبی؛ ماهِ شمسی از جدول) */
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return '';
    var months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
                  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    try {
      var d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
      var f = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn',
        { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(d);
      return R.faG(f.replace(/\d+/g, function (x) { return x; }));
    } catch (e) { return R.faG(String(iso)); }
  }

  /* ---------- صفحهٔ فهرستِ وبلاگ ---------- */
  function renderList(posts) {
    var box = document.getElementById('postList');
    if (!box) return;
    if (!posts.length) {
      box.innerHTML = '<p class="hint">هنوز مقاله‌ای منتشر نشده است.</p>';
      return;
    }
    box.innerHTML = posts.map(function (p) {
      return '<a class="post-card reveal" href="post.html?id=' + encodeURIComponent(p.id) + '">' +
        '<span class="post-date"><i data-ic="pen"></i> ' + faDate(p.date) + '</span>' +
        '<h2>' + R.esc(p.title) + '</h2>' +
        '<p>' + R.esc(p.excerpt || '') + '</p>' +
        '<span class="post-more">خواندنِ مقاله ' + R.icon('chevron-left') + '</span>' +
      '</a>';
    }).join('');
    R.paintIcons();
    if (R.bindReveal) R.bindReveal();
  }

  /* ---------- صفحهٔ مقاله ---------- */
  function renderPost(p, site, posts) {
    document.title = p.title + ' | وبلاگِ ' + (site.name || 'نینا شاپ');
    var desc = (p.excerpt || '').slice(0, 155);
    var m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute('content', desc);
    var og = document.querySelector('meta[property="og:title"]');
    if (og) og.setAttribute('content', p.title + ' | ' + (site.name || 'نینا شاپ'));
    var ogd = document.querySelector('meta[property="og:description"]');
    if (ogd) ogd.setAttribute('content', desc);
    var ogu = document.querySelector('meta[property="og:url"]');
    if (ogu) ogu.setAttribute('content', (site.domain || '').replace(/\/$/, '') + '/post.html?id=' + encodeURIComponent(p.id));

    var crumbs = document.getElementById('crumbs');
    if (crumbs) {
      crumbs.innerHTML =
        '<a href="./">خانه</a>' + R.icon('chevron-left') +
        '<a href="blog.html">وبلاگ</a>' + R.icon('chevron-left') +
        '<span>' + R.esc(p.title) + '</span>';
    }

    var paras = (p.body || []).map(function (t) { return '<p>' + R.esc(t) + '</p>'; }).join('');
    var prod = null;
    if (p.related) {
      var id = p.related;
      R.fetchJSON('data/products.json').then(function (all) {
        prod = byId(all || [], id);
        var box = document.getElementById('postProduct');
        if (!box) return;
        if (!prod) { box.style.display = 'none'; return; }
        box.innerHTML =
          '<a class="post-product" href="product.html?id=' + encodeURIComponent(prod.id) + '">' +
            '<span class="pp-label"><i data-ic="bag"></i> پیشنهادِ این مقاله</span>' +
            '<b>' + R.esc(prod.name) + '</b>' +
            '<span class="pp-price">' + R.faPrice(prod.price) + ' تومان</span>' +
            '<span class="pp-cta">دیدنِ محصول ' + R.icon('chevron-left') + '</span>' +
          '</a>';
        R.paintIcons();
      });
    }

    var page = document.getElementById('postPage');
    page.innerHTML =
      '<span class="post-date"><i data-ic="pen"></i> ' + faDate(p.date) + '</span>' +
      '<h1>' + R.esc(p.title) + '</h1>' +
      paras +
      '<div id="postProduct" style="' + (p.related ? '' : 'display:none') + '"></div>' +
      '<div class="post-back"><a class="btn btn-ghost" href="blog.html">' + R.icon('chevron-left') + ' همهٔ مقاله‌ها</a></div>';

    /* اسکیمای Article + BreadcrumbList */
    var domain = (site.domain || '').replace(/\/$/, '');
    var ld = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          'headline': p.title,
          'description': p.excerpt || '',
          'datePublished': p.date || '',
          'dateModified': p.date || '',
          'inLanguage': 'fa-IR',
          'author': { '@type': 'Organization', 'name': site.name || 'نینا شاپ' },
          'publisher': { '@type': 'Organization', 'name': site.name || 'نینا شاپ' },
          'mainEntityOfPage': domain + '/post.html?id=' + encodeURIComponent(p.id),
          'image': domain + '/assets/og.jpg'
        },
        {
          '@type': 'BreadcrumbList',
          'itemListElement': [
            { '@type': 'ListItem', 'position': 1, 'name': 'خانه', 'item': domain || '' },
            { '@type': 'ListItem', 'position': 2, 'name': 'وبلاگ', 'item': domain + '/blog.html' },
            { '@type': 'ListItem', 'position': 3, 'name': p.title }
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
      R.fetchJSON('data/site.json').catch(function () { return { name: 'نینا شاپ', domain: '' }; }),
      R.fetchJSON('data/posts.json').catch(function () { return []; })
    ]).then(function (res) {
      var site = res[0] || {}, posts = res[1] || [];
      document.querySelectorAll('[data-site="name"]').forEach(function (el) { el.textContent = site.name || 'نینا شاپ'; });
      if (id) {
        var p = byId(posts, id);
        if (!p) {
          document.getElementById('postPage').innerHTML =
            '<div class="panel-card"><h3>' + R.icon('info') + ' مقاله پیدا نشد</h3>' +
            '<p class="hint">ممکن است حذف شده باشد. <a href="blog.html" style="color:var(--accent)">همهٔ مقاله‌ها</a></p></div>';
          return;
        }
        renderPost(p, site, posts);
      } else {
        renderList(posts);
      }
      R.paintIcons();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
