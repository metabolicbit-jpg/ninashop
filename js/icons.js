/* ============================================================
   نینا شاپ — js/icons.js  (کدِ مشترکِ سایت و پنل)
   آیکون‌ها: اسپرایتِ SVG داخلی — هیچ CDN، هیچ فونتِ بیرونی
   قواعد: esc() برای هر محتوای پویا، fa() برای هر عددِ نمایشی
   ============================================================ */
(function () {
  'use strict';

  /* ---------- آیکون‌ها (24×24، خطیِ یکدست) ---------- */
  var ICONS = {
    'search': '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    'heart': '<path d="M12 20.5C7 16.5 3.5 13.2 3.5 9.4 3.5 6.6 5.7 4.5 8.4 4.5c1.5 0 2.9.7 3.6 1.9.7-1.2 2.1-1.9 3.6-1.9 2.7 0 4.9 2.1 4.9 4.9 0 3.8-3.5 7.1-8.5 11.1z"/>',
    'bag': '<path d="M6 8h12l1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2l1-12z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
    'star': '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8L12 3z"/>',
    'moon': '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
    'sun': '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
    'palette': '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.8 2-1.8 0-1.4-1.2-1.7-1.2-2.9 0-1 .8-1.8 2-1.8H17a4 4 0 0 0 4-4c0-4.2-4-7.5-9-7.5z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7.5" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
    'chevron-down': '<path d="M6 9.5l6 6 6-6"/>',
    'chevron-left': '<path d="M14.5 6l-6 6 6 6"/>',
    'chevron-right': '<path d="M9.5 6l6 6-6 6"/>',
    'xmark': '<path d="M6 6l12 12M18 6L6 18"/>',
    'bars': '<path d="M4 7h16M4 12h16M4 17h16"/>',
    'phone': '<path d="M5 4h4l1.5 4.5-2.2 1.6a12 12 0 0 0 5.6 5.6l1.6-2.2L20 15v4a1.5 1.5 0 0 1-1.6 1.5C10.5 20 4 13.5 3.5 5.6A1.5 1.5 0 0 1 5 4z"/>',
    'truck': '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',
    'rotate': '<path d="M4 10a8 8 0 1 1 2 6"/><path d="M4 5v5h5"/>',
    'check': '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    'pen': '<path d="M14.5 4.5l5 5L8 21H3v-5L14.5 4.5z"/>',
    'trash': '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>',
    'plus': '<path d="M12 5v14M5 12h14"/>',
    'save': '<path d="M5 3h13l3 3v15H5V3z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    'upload': '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>',
    'download': '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
    'sparkles': '<path d="M12 4l1.7 4.6L18 10l-4.3 1.4L12 16l-1.7-4.6L6 10l4.3-1.4L12 4z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/>',
    'gem': '<path d="M7 4h10l4 5-9 11L3 9l4-5z"/><path d="M3 9h18M9.5 4L8 9l4 11M14.5 4L16 9l-4 11"/>',
    'leaf': '<path d="M5 19C5 9 12 5 20 5c0 8-4 15-14 15z"/><path d="M5 19c3-6 7-9 11-11"/>',
    'shirt': '<path d="M8 4l4 2 4-2 5 3-2.5 4L16 9.5V20H8V9.5L5.5 11 3 7l5-3z"/>',
    'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    'box': '<path d="M3 8l9-5 9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    'shield': '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    'location': '<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    'instagram': '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/>',
    'telegram': '<path d="M21 4L2.7 11.1c-.9.35-.85 1.6.1 1.85l4.6 1.2 1.7 5.2c.3.9 1.4 1 1.9.3l2.4-3.1 4.5 3.3c.8.6 1.9.15 2.1-.8L22.5 5.4c.2-1-.7-1.8-1.5-1.4z"/>',
    'whatsapp': '<path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3z"/><path d="M9 8.5c-.5.5-1 1.6 0 3.2s2.4 3 4.2 3.6c1.3.4 2-.1 2.4-.7.2-.4.1-.8-.2-1l-1.5-.9c-.3-.2-.6-.1-.9.1l-.5.4c-1-.5-2-1.5-2.5-2.5l.4-.5c.2-.3.3-.6.1-.9L9.9 8.6c-.2-.3-.6-.4-.9-.1z" fill="currentColor" stroke="none"/>',
    'message': '<path d="M4 5h16v11H8l-4 4V5z"/>',
    'info': '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v5"/>',
    'eye': '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'
  };

  /* ---------- ابزارهای سراسری ---------- */
  var FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  function fa(n) {
    if (n === null || n === undefined || n === '') return '';
    var s = String(n);
    var out = '', i;
    for (i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      out += (c >= 48 && c <= 57) ? FA_DIGITS[c - 48] : s[i];
    }
    return out;
  }

  /* گروه‌بندیِ سه‌رقمی با «٬» (U+066C) و ارقامِ فارسی */
  function faG(n) {
    var s = String(n == null ? '' : n).replace(/[۰-۹]/g, function (d) {
      return String(FA_DIGITS.indexOf(d));
    }).replace(/[٠-٩]/g, function (d) {
      return String(d.charCodeAt(0) - 1632);
    });
    if (!/^-?\d+$/.test(s)) return fa(s);
    var neg = s[0] === '-';
    if (neg) s = s.slice(1);
    s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '\u066C');
    return (neg ? '-' : '') + fa(s);
  }

  function faPrice(n) {
    if (!n || n === '0' || n === 0) return 'رایگان';
    return faG(n);
  }

  /* نرمال‌سازیِ ارقامِ ورودی: فارسی/عربی ← لاتین */
  function normDigits(s) {
    return String(s == null ? '' : s)
      .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 1776); })
      .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 1632); })
      .replace(/\u066C/g, '');
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* محافظتِ RTL: جمله‌ای که ممکن است با لاتین شروع شود */
  function rtlFix(s) { return '\u200F' + String(s == null ? '' : s); }

  /* ---------- آیکون: <i data-ic="name"></i> ← svg ---------- */
  function icon(name, cls) {
    var body = ICONS[name] || ICONS['sparkles'];
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + body + '</svg>';
  }

  function paintIcons(root) {
    (root || document).querySelectorAll('i[data-ic]').forEach(function (el) {
      if (el.dataset.icDone) return;
      el.innerHTML = icon(el.dataset.ic, el.dataset.cls || '');
      el.dataset.icDone = '1';
    });
  }

  /* ---------- پوسته: شب/روز + رنگِ تأکید (کلیدهای نسخه‌دار) ---------- */
  var THEME_KEY = 'nina_v1_theme';
  var ACCENT_KEY = 'nina_v1_accent';

  function getTheme() {
    try { return localStorage.getItem(THEME_KEY) || 'day'; } catch (e) { return 'day'; }
  }
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  }
  function getAccent() {
    try { return localStorage.getItem(ACCENT_KEY) || 'rose'; } catch (e) { return 'rose'; }
  }
  function setAccent(a) {
    document.documentElement.setAttribute('data-accent', a);
    try { localStorage.setItem(ACCENT_KEY, a); } catch (e) {}
  }
  function initTheme() {
    setTheme(getTheme());
    setAccent(getAccent());
  }

  /* دکمهٔ تغییرِ پوسته (هر صفحه‌ای که .theme-btn داشته باشد) */
  function bindThemeToggle() {
    var btn = document.querySelector('.theme-btn');
    if (!btn) return;
    var syncIcon = function () {
      btn.innerHTML = icon(getTheme() === 'day' ? 'moon' : 'sun');
    };
    syncIcon();
    btn.addEventListener('click', function () {
      setTheme(getTheme() === 'day' ? 'night' : 'day');
      syncIcon();
    });
  }

  /* ---------- تصویرسازی‌هایِ پارچه‌ایِ نرم (گرافیکِ محصول) ---------- */
  var ART = {
    'panty': {
      vb: '0 0 200 170',
      body:
        '<path d="M32 58 C 34 92, 38 112, 44 122 Q 50 130, 62 128 Q 76 126, 84 116 L 96 100 Q 100 94 104 100 L 116 116 Q 124 126, 138 128 Q 150 130, 156 122 C 162 112, 166 92, 168 58 Q 100 46 32 58 Z" fill="rgba(255,255,255,.30)" stroke="rgba(255,255,255,.95)"/>' +
        '<path d="M32 40 Q100 28 168 40 L168 58 Q100 46 32 58 Z" fill="rgba(255,255,255,.55)" stroke="#fff"/>' +
        '<path d="M44 122 Q 62 128, 84 116 M156 122 Q 138 128, 116 116" stroke="rgba(255,255,255,.75)" stroke-width="3.5"/>' +
        '<path d="M100 26 c -2.5 -4.5, -9 -3, -9 1.5 c 0 3.5, 5.5 6, 9 8.5 c 3.5 -2.5, 9 -5, 9 -8.5 c 0 -4.5, -6.5 -6, -9 -1.5" fill="#fff" stroke="none"/>'
    },
    'bra': {
      vb: '0 0 200 170',
      body:
        '<path d="M38 106 C 36 70, 62 52, 88 62 C 100 67, 102 90, 98 106 Z" fill="rgba(255,255,255,.30)" stroke="rgba(255,255,255,.95)"/>' +
        '<path d="M162 106 C 164 70, 138 52, 112 62 C 100 67, 98 90, 102 106 Z" fill="rgba(255,255,255,.30)" stroke="rgba(255,255,255,.95)"/>' +
        '<path d="M30 106 L170 106 L170 124 Q100 138 30 124 Z" fill="rgba(255,255,255,.55)" stroke="#fff"/>' +
        '<path d="M52 60 L42 30 M148 60 L158 30" stroke="rgba(255,255,255,.9)"/>'
    },
    'pajama': {
      vb: '0 0 200 170',
      body:
        '<path d="M60 34 L140 34 L152 66 L128 74 L128 118 L72 118 L72 74 L48 66 Z" fill="rgba(255,255,255,.35)" stroke="#fff"/>' +
        '<path d="M86 34 Q100 46 114 34" stroke="rgba(255,255,255,.9)"/>' +
        '<path d="M76 128 L124 128 L128 162 L106 162 L100 142 L94 162 L72 162 Z" fill="rgba(255,255,255,.5)" stroke="#fff"/>'
    },
    'sock': {
      vb: '0 0 200 170',
      body:
        '<path d="M75 24 L125 24 L125 92 Q125 102 117 109 L86 133 Q71 144 60 131 Q51 119 63 107 L75 94 Z" fill="rgba(255,255,255,.35)" stroke="#fff"/>' +
        '<path d="M75 24 L125 24 L125 42 L75 42 Z" fill="rgba(255,255,255,.55)" stroke="#fff"/>'
    },
    'lipstick': {
      vb: '0 0 200 170',
      body:
        '<path d="M84 62 Q84 40 100 34 Q116 40 116 62 L116 78 L84 78 Z" fill="rgba(255,255,255,.55)" stroke="#fff"/>' +
        '<path d="M80 78 L120 78 L120 96 L80 96 Z" fill="rgba(255,255,255,.35)" stroke="rgba(255,255,255,.95)"/>' +
        '<path d="M76 96 L124 96 L124 148 Q100 156 76 148 Z" fill="rgba(255,255,255,.30)" stroke="rgba(255,255,255,.95)"/>' +
        '<path d="M100 34 L100 78" stroke="rgba(255,255,255,.6)"/>' +
        '<path d="M100 14 c -2 -3.5, -7 -2.5, -7 1 c 0 2.8, 4.2 4.6, 7 6.5 c 2.8 -1.9, 7 -3.7, 7 -6.5 c 0 -3.5, -5 -4.5, -7 -1" fill="#fff" stroke="none"/>'
    },
    'cream': {
      vb: '0 0 200 170',
      body:
        '<path d="M60 78 Q60 62 76 60 L124 60 Q140 62 140 78 L140 84 L60 84 Z" fill="rgba(255,255,255,.55)" stroke="#fff"/>' +
        '<path d="M64 84 L136 84 L132 142 Q100 152 68 142 Z" fill="rgba(255,255,255,.30)" stroke="rgba(255,255,255,.95)"/>' +
        '<path d="M78 104 Q100 98 122 104" stroke="rgba(255,255,255,.8)" stroke-width="3"/>' +
        '<path d="M100 44 c -3 -5, -10.5 -3.5, -10.5 1.8 c 0 4, 6.3 6.6, 10.5 9.4 c 4.2 -2.8, 10.5 -5.4, 10.5 -9.4 c 0 -5.3, -7.5 -6.8, -10.5 -1.8" fill="#fff" stroke="none"/>'
    },
    'polish': {
      vb: '0 0 200 170',
      body:
        '<path d="M92 22 L108 22 L108 44 L92 44 Z" fill="rgba(255,255,255,.55)" stroke="#fff"/>' +
        '<path d="M88 22 L112 22 L112 34 L88 34 Z" fill="rgba(255,255,255,.4)" stroke="rgba(255,255,255,.95)"/>' +
        '<path d="M78 44 L122 44 Q126 50 126 66 L126 140 Q126 152 112 152 L88 152 Q74 152 74 140 L74 66 Q74 50 78 44 Z" fill="rgba(255,255,255,.30)" stroke="rgba(255,255,255,.95)"/>' +
        '<path d="M80 96 Q100 88 120 96 L120 138 Q100 146 80 138 Z" fill="rgba(255,255,255,.5)" stroke="none"/>'
    },
    'palette': {
      vb: '0 0 200 170',
      body:
        '<path d="M34 92 Q34 56 70 52 L130 52 Q166 56 166 92 Q166 128 130 132 L70 132 Q34 128 34 92 Z" fill="rgba(255,255,255,.30)" stroke="#fff"/>' +
        '<circle cx="72" cy="80" r="13" fill="rgba(255,255,255,.55)" stroke="rgba(255,255,255,.9)"/>' +
        '<circle cx="104" cy="74" r="13" fill="rgba(255,255,255,.4)" stroke="rgba(255,255,255,.9)"/>' +
        '<circle cx="134" cy="86" r="13" fill="rgba(255,255,255,.55)" stroke="rgba(255,255,255,.9)"/>' +
        '<circle cx="88" cy="110" r="13" fill="rgba(255,255,255,.4)" stroke="rgba(255,255,255,.9)"/>' +
        '<circle cx="120" cy="112" r="13" fill="rgba(255,255,255,.55)" stroke="rgba(255,255,255,.9)"/>'
    }
  };

  function art(name, cls) {
    var a = ART[name];
    if (!a) return '';
    return '<svg class="art' + (cls ? ' ' + cls : '') + '" viewBox="' + a.vb + '" fill="none" stroke="currentColor" ' +
      'stroke-width="5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + a.body + '</svg>';
  }

  /* آدرسِ عکس با نسخه: بعد از آپلودِ عکسِ تازه، کشِ قدیمی دور زده می‌شود */
  function imgSrc(p) {
    if (!p || !p.image) return '';
    return p.image + (p.imgVer ? '?v=' + p.imgVer : '');
  }

  /* خواندنِ امنِ JSON از url؛ خطا را برمی‌گرداند نه اینکه قورت بدهد */
  function fetchJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  /* ---------- ظاهرِ نرم: reveal با IntersectionObserver (مشترک بینِ همهٔ صفحه‌ها) ---------- */
  /* هر بار که کارت‌هایِ تازه رندر می‌شوند دوباره صدا زده می‌شود؛ فقط عنصرهایِ دیده‌نشده را نگاه می‌کند */
  var revealIO = null;
  function bindReveal() {
    var els = document.querySelectorAll('.reveal:not(.seen)');
    if (!els.length) return;
    if (revealIO) revealIO.disconnect();
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('seen'); });
      return;
    }
    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('seen'); revealIO.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { revealIO.observe(el); });
  }

  /* ---------- علاقه‌مندی‌ها (در گوشیِ خودت، localStorage) ---------- */
  var K_WISH = 'nina_v1_wishlist';
  function wishGet() {
    try { return JSON.parse(localStorage.getItem(K_WISH)) || []; } catch (e) { return []; }
  }
  function wishHas(id) { return wishGet().indexOf(id) !== -1; }
  function wishToggle(id) {
    var l = wishGet();
    var i = l.indexOf(id);
    if (i === -1) l.push(id); else l.splice(i, 1);
    try { localStorage.setItem(K_WISH, JSON.stringify(l)); } catch (e) {}
    return i === -1; /* true = اضافه شد */
  }

  /* ---------- ناوبریِ پایینِ موبایل: نشانِ تبِ فعلی (مشترک بینِ همهٔ صفحه‌ها) ---------- */
  function bindBottomNav() {
    var nav = document.querySelector('.bottom-nav');
    if (!nav) return;
    var page = location.pathname.split('/').pop();
    var key =
      (page === '' || page === 'index.html') ? (location.hash === '#products' ? 'products' : 'home') :
      page === 'wishlist.html' ? 'wish' :
      (page === 'blog.html' || page === 'post.html') ? 'blog' :
      page === 'faq.html' ? 'faq' :
      (page === 'product.html' || page === 'category.html') ? 'products' : '';
    if (!key) return;
    var a = nav.querySelector('a[data-bn="' + key + '"]');
    if (a) a.classList.add('active');

    /* بازخوردِ آنیِ لمس: کاورِ تب، همان لحظهٔ لمس روشن می‌شود، پیش از بارگیریِ صفحهٔ بعد */
    nav.addEventListener('pointerdown', function (e) {
      var t = e.target.closest('a');
      if (!t) return;
      var cur = nav.querySelector('a.active');
      if (cur) cur.classList.remove('active');
      t.classList.add('active');
    });
  }

  /* ---------- PWA: ثبتِ سرویس‌ورکر (مشترک بینِ همهٔ صفحه‌ها) ---------- */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  window.Nina = {
    ICONS: ICONS, icon: icon, paintIcons: paintIcons,
    ART: ART, art: art,
    fa: fa, faG: faG, faPrice: faPrice, normDigits: normDigits,
    esc: esc, rtlFix: rtlFix, imgSrc: imgSrc,
    getTheme: getTheme, setTheme: setTheme,
    getAccent: getAccent, setAccent: setAccent,
    initTheme: initTheme, bindThemeToggle: bindThemeToggle,
    fetchJSON: fetchJSON, bindReveal: bindReveal,
    bindBottomNav: bindBottomNav, registerSW: registerSW,
    wishGet: wishGet, wishHas: wishHas, wishToggle: wishToggle
  };
})();
