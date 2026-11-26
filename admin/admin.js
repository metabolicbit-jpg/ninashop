/* ============================================================
   نینا شاپ — admin/admin.js  (پنلِ مدیریت)
   ویرایش در مرورگر + انتشار با GitHub Contents API
   توکن فقط در localStorageِ همین گوشی می‌ماند.
   ============================================================ */
(function () {
  'use strict';
  var R = window.Nina;
  var Pay = window.Nina && window.Nina.Pay;

  var K_TOKEN = 'nina_v1_gh_token', K_USER = 'nina_v1_gh_user', K_REPO = 'nina_v1_gh_repo';
  var K_DATA = 'nina_v1_admin_data';   /* دادهٔ ویرایش‌شدهٔ محلی */
  var K_DIRTY = 'nina_v1_admin_dirty'; /* فهرستِ فایل‌هایِ تغییر‌کردهٔ منتشرنشده */
  var K_PII = 'nina_v1_orders_pii';    /* اطلاعاتِ خریدارِ هر سفارش — فقط در همین مرورگر، هرگز منتشر نمی‌شود */

  /* دادهٔ محلی: {site:…, products:[…], testimonials:[…], posts:[…], faq:[…], orders:[…]} */
  var data = { site: null, products: [], testimonials: [], posts: [], faq: [], categories: [], orders: [] };
  var dirty = {};   /* مسیر → true */
  var pendingUploads = [];  /* [{path, base64}] عکس‌هایِ در انتظارِ انتشار */
  var editing = null, editingT = null, editingP = null, editingQ = null, editingC = null;
  var pendingImage = null;  /* {base64, name} عکسِ محصولِ در حالِ ویرایش */
  var imageRemoved = false;
  var decodedOrder = null;  /* سفارشِ خوانده‌شده از کدِ مشتری، در انتظارِ ثبت */

  var FILES = {
    site: 'data/site.json',
    products: 'data/products.json',
    testimonials: 'data/testimonials.json',
    posts: 'data/posts.json',
    faq: 'data/faq.json',
    categories: 'data/categories.json',
    orders: 'data/orders.json',
    sitemap: 'sitemap.xml'
  };

  var ORDER_STATUS = {
    created:  'در انتظارِ پرداخت',
    sent:     'پرداخت شد — در انتظارِ بررسی',
    paid:     'تأیید شد',
    shipped:  'ارسال شد',
    mismatch: 'مغایرتِ مبلغ',
    rejected: 'رد شد',
    expired:  'منقضی شد'
  };

  /* ---------- sitemap خودکار: با هر تغییرِ محصول/مقاله/دامنه بازسازی می‌شود ---------- */
  function buildSitemap() {
    var d = ((data.site && data.site.domain) || '').replace(/\/+$/, '') || 'https://example.com';
    var urls = [
      { loc: d + '/', pri: '1.0', freq: 'weekly' },
      { loc: d + '/blog.html', pri: '0.8', freq: 'weekly' },
      { loc: d + '/faq.html', pri: '0.8', freq: 'monthly' }
    ];
    (data.products || []).forEach(function (p) {
      if (p.status === 'hidden') return;
      urls.push({ loc: d + '/product.html?id=' + encodeURIComponent(p.id), pri: p.featured ? '0.9' : '0.8', freq: 'weekly' });
    });
    /* صفحهٔ هر دسته (سئوی ساختاری) */
    var cats = [];
    (data.products || []).forEach(function (p) {
      if (p.status !== 'hidden' && p.category && cats.indexOf(p.category) === -1) cats.push(p.category);
    });
    cats.forEach(function (c) {
      urls.push({ loc: d + '/category.html?id=' + encodeURIComponent(c), pri: '0.8', freq: 'weekly' });
    });
    (data.posts || []).forEach(function (p) {
      urls.push({ loc: d + '/post.html?id=' + encodeURIComponent(p.id), pri: '0.7', freq: 'monthly' });
    });
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map(function (u) {
        return '  <url>\n    <loc>' + u.loc + '</loc>\n    <changefreq>' + u.freq + '</changefreq>\n    <priority>' + u.pri + '</priority>\n  </url>';
      }).join('\n') + '\n</urlset>\n';
  }

  /* ---------- ذخیره/خواندنِ محلی ---------- */
  function saveLocal() {
    try { localStorage.setItem(K_DATA, JSON.stringify(data)); } catch (e) {}
  }
  function loadLocal() {
    try {
      var raw = localStorage.getItem(K_DATA);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.site) {
          data = d;
          /* کلیدهایِ تازه‌تر را پیش‌فرض بگذار */
          if (!Array.isArray(data.posts)) data.posts = [];
          if (!Array.isArray(data.faq)) data.faq = [];
          if (!Array.isArray(data.categories)) data.categories = [];
          if (!Array.isArray(data.orders)) data.orders = [];
          loadDirty();   /* یادآوریِ اینکه چه چیزهایی هنوز منتشر نشده */
          return true;
        }
      }
    } catch (e) {}
    clearDirty();   /* دادهٔ محلیِ معتبری نیست؛ هر چه در سایت است، منتشر شده */
    return false;
  }
  function markDirty(key) {
    dirty[FILES[key]] = true;
    saveDirty();
    renderDirty();
  }
  /* وضعیتِ «تغییرِ منتشرنشده» هم باید ذخیره شود؛ وگرنه با یک رفرشِ ساده،
     پنل دادهٔ ویرایش‌شده را دارد ولی یادش می‌رود که هنوز منتشر نشده —
     و «انتشار» می‌گوید «تغییری نیست» در حالی که محصول به سایت نرفته است. */
  function saveDirty() {
    try { localStorage.setItem(K_DIRTY, JSON.stringify(Object.keys(dirty))); } catch (e) {}
  }
  function loadDirty() {
    try {
      var valid = Object.keys(FILES).map(function (k) { return FILES[k]; });
      (JSON.parse(localStorage.getItem(K_DIRTY) || '[]') || []).forEach(function (p) {
        if (valid.indexOf(p) > -1) dirty[p] = true;
      });
    } catch (e) {}
  }
  function clearDirty() {
    dirty = {};
    try { localStorage.removeItem(K_DIRTY); } catch (e) {}
  }
  function renderDirty() {
    var el = document.getElementById('dirtyList');
    if (!el) return;
    var keys = Object.keys(dirty);
    var parts = [];
    if (keys.length) parts.push('تغییرِ منتشرنشده: <b>' + keys.map(R.esc).join('، ') + '</b>');
    if (pendingUploads.length) parts.push('<b>' + R.fa(pendingUploads.length) + '</b> عکسِ در انتظارِ آپلود');
    el.innerHTML = parts.length ? parts.join(' — ') : 'همه‌چیز منتشر شده است. ✨';
  }

  /* ---------- GitHub API ---------- */
  function ghCfg() {
    return {
      token: localStorage.getItem(K_TOKEN) || '',
      user: localStorage.getItem(K_USER) || '',
      repo: localStorage.getItem(K_REPO) || ''
    };
  }
  function ghURL(path) {
    var c = ghCfg();
    return 'https://api.github.com/repos/' + c.user + '/' + c.repo + '/contents/' + path;
  }
  function b64(text) {
    return btoa(unescape(encodeURIComponent(text)));
  }
  /* تشخیصِ اینکه پاسخ واقعاً از گیت‌هاب آمده یا از وسطِ راه (فیلترشکن/اپراتور).
     گیت‌هاب همیشه سرصفحه‌هایی مثل x-ratelimit یا x-github-request-id می‌فرستد؛
     اگر هیچ‌کدام نبود، 404 که می‌بینیم کارِ گیت‌هاب نیست و دستِ شبکه است. */
  function fromGithub(r) {
    return !!(r.headers.get('x-ratelimit-limit') || r.headers.get('x-github-request-id') ||
              r.headers.get('x-github-mediatype') || r.headers.get('x-github-api-version'));
  }
  function ghFail(r) {
    var e = new Error('GH' + r.status + '|' + (fromGithub(r) ? 'gh' : 'mid'));
    e.ghStatus = r.status;
    e.fromGithub = fromGithub(r);
    return r.json().catch(function () { return {}; }).then(function (j) {
      e.bodyMsg = j && j.message ? j.message : '';
      throw e;
    });
  }
  /* sha فایل (404ِ گیت‌هاب = فایلِ نو؛ 404ِ غیرِگیت‌هاب = خرابیِ مسیرِ شبکه) */
  function getSha(path) {
    return fetch(ghURL(path), {
      headers: { 'Authorization': 'Bearer ' + ghCfg().token, 'Accept': 'application/vnd.github+json' }
    }).then(function (r) {
      if (r.ok) return r.json().then(function (j) { return j.sha; });
      if (r.status === 404 && fromGithub(r)) return null;
      return ghFail(r);
    });
  }
  function putFile(path, text) {
    return putFileB64(path, b64(text));
  }
  function putFileB64(path, contentB64) {
    return getSha(path).then(function (sha) {
      return fetch(ghURL(path), {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + ghCfg().token,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'پنلِ نینا شاپ: به‌روزرسانیِ ' + path,
          content: contentB64,
          sha: sha || undefined
        })
      }).then(function (r) {
        if (!r.ok) return ghFail(r);
      });
    });
  }

  /* ---------- عکس: فشرده‌سازیِ در مرورگر ---------- */
  function compressImage(file, maxSide, quality) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () {
        var img = new Image();
        img.onload = function () {
          var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          var cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(cv.toDataURL('image/jpeg', quality).split(',')[1]);
        };
        img.onerror = function () { reject(new Error('عکس خوانده نشد')); };
        img.src = fr.result;
      };
      fr.onerror = function () { reject(new Error('فایل خوانده نشد')); };
      fr.readAsDataURL(file);
    });
  }

  function setImagePreview(b64) {
    var img = document.getElementById('f-imgPreview');
    var ph = document.getElementById('imgPlaceholder');
    var rm = document.getElementById('removeImg');
    if (b64) {
      img.src = 'data:image/jpeg;base64,' + b64;
      img.style.display = ''; ph.style.display = 'none'; rm.style.display = '';
    } else {
      img.style.display = 'none'; ph.style.display = ''; rm.style.display = 'none';
    }
  }

  /* ---------- ردیف‌هایِ رنگ ---------- */
  function addColorRow(name, hex) {
    var box = document.getElementById('colorRows');
    var row = document.createElement('div');
    row.className = 'color-row';
    row.innerHTML =
      '<input type="color" value="' + R.esc(hex || '#f8c8d8') + '" aria-label="رنگ">' +
      '<input type="text" placeholder="نامِ رنگ (مثلاً صورتی)" value="' + R.esc(name || '') + '">' +
      '<button class="mini-btn danger" type="button" aria-label="حذفِ رنگ">' + R.icon('trash') + '</button>';
    row.querySelector('.mini-btn').addEventListener('click', function () { row.remove(); });
    box.appendChild(row);
  }
  function collectColors() {
    var out = [];
    document.querySelectorAll('#colorRows .color-row').forEach(function (row) {
      var name = row.querySelector('input[type="text"]').value.trim();
      var hex = row.querySelector('input[type="color"]').value;
      if (name) out.push({ name: name, hex: hex });
    });
    return out;
  }

  /* ---------- پیام‌ها ---------- */
  var toastTimer = null;
  function toast(text, ok) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = text;
    el.className = 'toast show ' + (ok ? 'ok' : 'err');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast'; }, 3500);
  }
  function msg(id, text, ok) {
    toast(text, ok);   /* بازخورد در هر تب دیده می‌شود */
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'msg show ' + (ok ? 'ok' : 'err');
    setTimeout(function () { el.className = 'msg'; }, 6000);
  }

  /* ---------- رندرِ فهرست‌ها ---------- */
  var adminCat = '';   /* فیلترِ دسته در تبِ محصولاتِ پنل */

  function allCatNames() {
    var names = (data.categories || []).map(function (c) { return c.name; });
    (data.products || []).forEach(function (p) {
      if (p.category && names.indexOf(p.category) === -1) names.push(p.category);
    });
    return names;
  }
  function renderAdminCatFilter() {
    var box = document.getElementById('adminCatFilter');
    if (!box) return;
    var names = allCatNames();
    box.innerHTML = '<button class="cat-chip' + (adminCat === '' ? ' on' : '') + '" data-cat="">همه</button>' +
      names.map(function (n) {
        return '<button class="cat-chip' + (adminCat === n ? ' on' : '') + '" data-cat="' + R.esc(n) + '">' + R.esc(n) + '</button>';
      }).join('');
  }

  function renderProducts() {
    var box = document.getElementById('productList');
    if (!box) return;
    var list = data.products;
    if (adminCat) list = list.filter(function (p) { return p.category === adminCat; });
    box.innerHTML = list.map(function (p) {
      var i = data.products.indexOf(p);
      var swatchInner = p.image
        ? '<img src="' + R.esc(R.imgSrc(p)) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">'
        : R.icon(p.icon || 'heart');
      return '<div class="admin-item">' +
        '<span class="swatch" style="background:linear-gradient(135deg,' +
          R.esc((p.cover && p.cover[0]) || '#f8c8d8') + ',' + R.esc((p.cover && p.cover[1]) || '#fde8ef') + ');overflow:hidden">' +
          swatchInner + '</span>' +
        '<div class="meta"><b>' + R.esc(p.name) + '</b>' +
          '<span>' + R.esc(p.category || '') + ' — ' + R.faG(p.price) + ' تومان</span></div>' +
        '<span class="status-pill ' + (p.status !== 'hidden' ? 'on' : 'off') + '">' +
          (p.status !== 'hidden' ? 'نمایش' : 'مخفی') + '</span>' +
        '<div class="acts">' +
          '<button class="mini-btn" data-edit="' + i + '" aria-label="ویرایش">' + R.icon('pen') + '</button>' +
          '<button class="mini-btn danger" data-del="' + i + '" aria-label="حذف">' + R.icon('trash') + '</button>' +
        '</div>' +
      '</div>';
    }).join('') || '<p class="hint">در این دسته محصولی نیست.</p>';
  }

  function renderTestimonials() {
    var box = document.getElementById('testimonialList');
    if (!box) return;
    box.innerHTML = data.testimonials.map(function (t, i) {
      return '<div class="admin-item">' +
        '<span class="swatch" style="background:var(--tint);color:var(--accent)">' + R.icon('star') + '</span>' +
        '<div class="meta"><b>' + R.esc(t.name) + '</b><span>' + R.esc((t.text || '').slice(0, 60)) + '…</span></div>' +
        '<div class="acts">' +
          '<button class="mini-btn" data-tedit="' + i + '" aria-label="ویرایش">' + R.icon('pen') + '</button>' +
          '<button class="mini-btn danger" data-tdel="' + i + '" aria-label="حذف">' + R.icon('trash') + '</button>' +
        '</div>' +
      '</div>';
    }).join('') || '<p class="hint">هنوز نظری نیست.</p>';
  }

  /* ---------- ویرایشِ محصول ---------- */
  function openEditor(idx) {
    editing = idx;
    var p = idx === null
      ? { id: 'p' + Date.now(), cover: ['#f8c8d8', '#fde8ef'], icon: 'heart', status: 'active', featured: 0, oldPrice: 0, colors: [], image: '' }
      : JSON.parse(JSON.stringify(data.products[idx]));
    editing = { idx: idx, p: p };
    pendingImage = null; imageRemoved = false;
    document.getElementById('editorTitle').textContent = idx === null ? 'محصولِ جدید' : 'ویرایشِ «' + p.name + '»';
    set('f-name', p.name); set('f-category', p.category); set('f-badge', p.badge);
    set('f-price', p.price ? R.faG(p.price) : ''); set('f-oldPrice', p.oldPrice ? R.faG(p.oldPrice) : '۰');
    set('f-desc', p.desc); set('f-fabric', p.fabric); set('f-art', p.art || '');
    set('f-cover1', (p.cover && p.cover[0]) || ''); set('f-cover2', (p.cover && p.cover[1]) || '');
    var c1 = document.getElementById('f-cover1c'), c2 = document.getElementById('f-cover2c');
    if (c1) c1.value = (p.cover && p.cover[0]) || '#f8c8d8';
    if (c2) c2.value = (p.cover && p.cover[1]) || '#fde8ef';
    set('f-sizes', (p.sizes || []).join(', '));
    set('f-status', p.status || 'active'); set('f-featured', p.featured ? '1' : '0');
    set('f-stock', p.stock ? R.faG(p.stock) : '');
    var fBare = document.getElementById('f-bare');
    if (fBare) fBare.checked = !!p.bare;
    /* رنگ‌ها */
    document.getElementById('colorRows').innerHTML = '';
    (p.colors || []).forEach(function (c) {
      if (typeof c === 'string') c = { name: c, hex: '' };
      addColorRow(c.name, c.hex);
    });
    /* عکسِ فعلی */
    setImagePreview(null);
    if (p.image && !p.image.startsWith('data:')) {
      /* عکسِ منتشرشده: پیش‌نمایش از مسیرِ سایت */
      var img = document.getElementById('f-imgPreview');
      img.src = R.imgSrc(p);
      img.style.display = ''; document.getElementById('imgPlaceholder').style.display = 'none';
      document.getElementById('removeImg').style.display = '';
    }
    document.getElementById('productEditor').style.display = '';
    document.getElementById('productEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function set(id, v) { var el = document.getElementById(id); if (el) el.value = v == null ? '' : String(v); }
  function get(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

  function saveProduct() {
    if (!editing) return;
    var p = editing.p;
    p.name = get('f-name');
    if (!p.name) { msg('pubMsg', 'نامِ محصول خالی است.', false); return; }
    p.category = get('f-category');
    p.badge = get('f-badge');
    p.price = Number(R.normDigits(get('f-price')).replace(/[^\d]/g, '')) || 0;
    p.oldPrice = Number(R.normDigits(get('f-oldPrice')).replace(/[^\d]/g, '')) || 0;
    p.desc = get('f-desc');
    p.fabric = get('f-fabric');
    p.art = get('f-art');
    p.cover = [get('f-cover1') || '#f8c8d8', get('f-cover2') || '#fde8ef'];
    p.sizes = get('f-sizes') ? get('f-sizes').split(/[,،]/).map(function (s) { return s.trim(); }).filter(Boolean) : [];
    p.colors = collectColors();
    p.status = get('f-status') || 'active';
    p.featured = get('f-featured') === '1' ? 1 : 0;
    p.stock = Number(R.normDigits(get('f-stock')).replace(/[^\d]/g, '')) || '';
    var fBare = document.getElementById('f-bare');
    p.bare = (fBare && fBare.checked) ? 1 : 0;
    /* عکس */
    if (imageRemoved) { p.image = ''; }
    if (pendingImage) {
      var imgPath = 'assets/products/' + p.id + '.jpg';
      pendingUploads.push({ path: imgPath, base64: pendingImage });
      p.image = imgPath;
      p.imgVer = Date.now();   /* کشِ عکسِ قدیمی در سایت دور زده می‌شود */
    }
    if (editing.idx === null) data.products.push(p);
    else data.products[editing.idx] = p;
    saveLocal(); markDirty('products');
    renderProducts(); renderAdminCatFilter();
    document.getElementById('productEditor').style.display = 'none';
    editing = null;
    msg('pubMsg', 'محصول ذخیره شد. برای دیدن در سایت، دکمهٔ «انتشار» را بزن.', true);
  }

  /* ---------- ویرایشِ نظر ---------- */
  function openTEditor(idx) {
    var t = idx === null
      ? { id: 't' + Date.now(), name: '', text: '', stars: 5 }
      : JSON.parse(JSON.stringify(data.testimonials[idx]));
    editingT = { idx: idx, t: t };
    set('t-name', t.name); set('t-text', t.text); set('t-stars', R.fa(t.stars || 5));
    document.getElementById('testimonialEditor').style.display = '';
  }
  function saveTestimonial() {
    if (!editingT) return;
    var t = editingT.t;
    t.name = get('t-name');
    t.text = get('t-text');
    t.stars = Math.min(5, Math.max(1, Number(R.normDigits(get('t-stars'))) || 5));
    if (!t.name || !t.text) { msg('pubMsg', 'نام و متنِ نظر لازم است.', false); return; }
    if (editingT.idx === null) data.testimonials.push(t);
    else data.testimonials[editingT.idx] = t;
    saveLocal(); markDirty('testimonials');
    renderTestimonials();
    document.getElementById('testimonialEditor').style.display = 'none';
    editingT = null;
    msg('pubMsg', 'نظر ذخیره شد.', true);
  }

  /* ---------- وبلاگ ---------- */
  function renderPosts() {
    var box = document.getElementById('postList');
    if (!box) return;
    box.innerHTML = data.posts.map(function (p, i) {
      return '<div class="admin-item">' +
        '<span class="swatch" style="background:var(--tint);color:var(--accent)">' + R.icon('pen') + '</span>' +
        '<div class="meta"><b>' + R.esc(p.title) + '</b><span>' + R.esc((p.excerpt || '').slice(0, 60)) + '…</span></div>' +
        '<div class="acts">' +
          '<button class="mini-btn" data-pedit="' + i + '" aria-label="ویرایش">' + R.icon('pen') + '</button>' +
          '<button class="mini-btn danger" data-pdel="' + i + '" aria-label="حذف">' + R.icon('trash') + '</button>' +
        '</div>' +
      '</div>';
    }).join('') || '<p class="hint">هنوز مقاله‌ای نیست.</p>';
  }

  function fillRelatedSelect(selected) {
    var sel = document.getElementById('p-related');
    sel.innerHTML = '<option value="">— هیچ —</option>' + data.products.map(function (p) {
      return '<option value="' + R.esc(p.id) + '"' + (p.id === selected ? ' selected' : '') + '>' + R.esc(p.name) + '</option>';
    }).join('');
  }

  function openPEditor(idx) {
    var p = idx === null
      ? { id: 'post' + Date.now(), title: '', excerpt: '', date: new Date().toISOString().slice(0, 10), related: '', body: [] }
      : JSON.parse(JSON.stringify(data.posts[idx]));
    editingP = { idx: idx, p: p };
    set('p-title', p.title); set('p-excerpt', p.excerpt); set('p-date', p.date);
    set('p-body', (p.body || []).join('\n\n'));
    fillRelatedSelect(p.related);
    document.getElementById('postEditor').style.display = '';
  }

  function savePost() {
    if (!editingP) return;
    var p = editingP.p;
    p.title = get('p-title');
    p.excerpt = get('p-excerpt');
    p.date = get('p-date') || new Date().toISOString().slice(0, 10);
    p.related = get('p-related');
    p.body = get('p-body').split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!p.title || !p.body.length) { msg('pubMsg', 'عنوان و متنِ مقاله لازم است.', false); return; }
    if (editingP.idx === null) data.posts.push(p);
    else data.posts[editingP.idx] = p;
    saveLocal(); markDirty('posts');
    renderPosts();
    document.getElementById('postEditor').style.display = 'none';
    editingP = null;
    msg('pubMsg', 'مقاله ذخیره شد.', true);
  }

  /* ---------- پرسش‌هایِ پرتکرار ---------- */
  function renderFaq() {
    var box = document.getElementById('faqList');
    if (!box) return;
    box.innerHTML = data.faq.map(function (f, i) {
      return '<div class="admin-item">' +
        '<span class="swatch" style="background:var(--tint);color:var(--accent)">' + R.icon('message') + '</span>' +
        '<div class="meta"><b>' + R.esc(f.q) + '</b><span>' + R.esc((f.a || '').slice(0, 60)) + '…</span></div>' +
        '<div class="acts">' +
          '<button class="mini-btn" data-qedit="' + i + '" aria-label="ویرایش">' + R.icon('pen') + '</button>' +
          '<button class="mini-btn danger" data-qdel="' + i + '" aria-label="حذف">' + R.icon('trash') + '</button>' +
        '</div>' +
      '</div>';
    }).join('') || '<p class="hint">هنوز پرسشی نیست.</p>';
  }

  function openQEditor(idx) {
    var f = idx === null
      ? { q: '', a: '' }
      : JSON.parse(JSON.stringify(data.faq[idx]));
    editingQ = { idx: idx, f: f };
    set('q-q', f.q); set('q-a', f.a);
    document.getElementById('faqEditor').style.display = '';
  }

  function saveFaq() {
    if (!editingQ) return;
    var f = editingQ.f;
    f.q = get('q-q');
    f.a = get('q-a');
    if (!f.q || !f.a) { msg('pubMsg', 'پرسش و پاسخ لازم است.', false); return; }
    if (editingQ.idx === null) data.faq.push(f);
    else data.faq[editingQ.idx] = f;
    saveLocal(); markDirty('faq');
    renderFaq();
    document.getElementById('faqEditor').style.display = 'none';
    editingQ = null;
    msg('pubMsg', 'پرسش ذخیره شد.', true);
  }

  /* ---------- دسته‌ها ---------- */
  function renderCategories() {
    var box = document.getElementById('catList');
    if (!box) return;
    box.innerHTML = (data.categories || []).map(function (c, i) {
      var n = (data.products || []).filter(function (p) { return p.category === c.name; }).length;
      return '<div class="admin-item">' +
        '<span class="swatch" style="background:var(--tint);color:var(--accent)">' + R.icon('gem') + '</span>' +
        '<div class="meta"><b>' + R.esc(c.name) + '</b><span>' + R.esc((c.intro || '').slice(0, 60)) + '…</span></div>' +
        '<div class="acts">' +
          '<span class="hint">' + R.fa(n) + ' محصول</span>' +
          '<button class="mini-btn" data-cedit="' + i + '" aria-label="ویرایش">' + R.icon('pen') + '</button>' +
          '<button class="mini-btn danger" data-cdel="' + i + '" aria-label="حذف">' + R.icon('trash') + '</button>' +
        '</div>' +
      '</div>';
    }).join('') || '<p class="hint">هنوز دسته‌ای نیست.</p>';
    /* پیشنهادِ نامِ دسته در فرمِ محصول */
    renderAdminCatFilter();
  }

  function openCEditor(idx) {
    var c = idx === null ? { name: '', intro: '' } : JSON.parse(JSON.stringify(data.categories[idx]));
    editingC = { idx: idx, c: c };
    set('c-name', c.name); set('c-intro', c.intro);
    document.getElementById('catEditor').style.display = '';
  }

  function saveCategory() {
    if (!editingC) return;
    var c = editingC.c;
    c.name = get('c-name').trim();
    c.intro = get('c-intro').trim();
    if (!c.name) { msg('pubMsg', 'نامِ دسته لازم است.', false); return; }
    var dup = (data.categories || []).filter(function (x) { return x.name === c.name; })[0];
    if (dup && data.categories[editingC.idx] !== dup) { msg('pubMsg', 'دسته‌ای با این نام هست.', false); return; }
    if (editingC.idx === null) data.categories.push(c);
    else data.categories[editingC.idx] = c;
    saveLocal(); markDirty('categories');
    renderCategories();
    document.getElementById('catEditor').style.display = 'none';
    editingC = null;
    msg('pubMsg', 'دسته ذخیره شد.', true);
  }

  /* ---------- سایت و کانال‌ها ---------- */
  function fillSiteForm() {
    var s = data.site;
    set('s-name', s.name); set('s-tagline', s.tagline); set('s-about', s.about);
    set('s-domain', s.domain); set('s-shipping', s.shipping); set('s-guarantee', s.guarantee);
    var c = s.channels || {};
    set('s-instagram', c.instagram); set('s-telegram', c.telegram);
    set('s-whatsapp', c.whatsapp); set('s-phone', c.phone);
    fillPaymentsForm();
  }
  function saveSite() {
    data.site.name = get('s-name') || 'نینا شاپ';
    data.site.tagline = get('s-tagline');
    data.site.about = get('s-about');
    data.site.domain = get('s-domain').replace(/\/+$/, '');
    data.site.shipping = get('s-shipping');
    data.site.guarantee = get('s-guarantee');
    saveLocal(); markDirty('site');
    msg('pubMsg', 'هویتِ سایت ذخیره شد. برای اعمال در سایت، «انتشار» را بزن.', true);
  }
  function saveChannels() {
    data.site.channels = {
      instagram: get('s-instagram'),
      telegram: get('s-telegram'),
      whatsapp: get('s-whatsapp'),
      phone: get('s-phone')
    };
    saveLocal(); markDirty('site');
    msg('pubMsg', 'کانال‌ها ذخیره شدند. برای اعمال در سایت، «انتشار» را بزن.', true);
  }

  /* ---------- پرداختِ کارت به کارت (تنظیمات) ---------- */
  function fillPaymentsForm() {
    var c = (data.site.payments && data.site.payments.cardToCard) || {};
    set('p-card', c.cardNumber); set('p-holder', c.cardHolder);
    set('p-bank', c.bank); set('p-expire', c.expireHours);
    set('p-ship', c.shippingFee); set('p-note', c.note);
    set('p-enabled', c.enabled === false ? '0' : '1');
  }
  function savePayments() {
    data.site.payments = data.site.payments || {};
    data.site.payments.cardToCard = {
      enabled: get('p-enabled') !== '0',
      cardNumber: get('p-card').replace(/[\s٬-]/g, ''),
      cardHolder: get('p-holder'),
      bank: get('p-bank'),
      expireHours: Math.max(1, Number(R.normDigits(get('p-expire'))) || 6),
      shippingFee: Math.max(0, Number(R.normDigits(get('p-ship'))) || 0),
      note: get('p-note')
    };
    saveLocal(); markDirty('site');
    msg('pubMsg', 'تنظیماتِ پرداخت ذخیره شد. برای اعمال در سایت، «انتشار» را بزن.', true);
  }

  /* ---------- سفارش‌ها (کارت به کارت) ----------
     حریمِ خصوصی: اطلاعاتِ خریدار (نام، تلفن، نشانی) هرگز در orders.json
     عمومی نمی‌رود؛ فقط در همین مرورگر (K_PII) می‌ماند و از دلِ پیامِ
     واتساپِ مشتری خوانده می‌شود. در ریپو فقط کد، اقلام، مبلغ و وضعیت. */
  function piiLoad() {
    try { return JSON.parse(localStorage.getItem(K_PII) || '{}'); } catch (e) { return {}; }
  }
  function piiSave(p) {
    try { localStorage.setItem(K_PII, JSON.stringify(p)); } catch (e) {}
  }

  function statusFilePath(code) { return 'data/order-status/' + encodeURIComponent(code) + '.json'; }

  function findOrder(code) {
    return (data.orders || []).filter(function (o) { return o.code === code; })[0] || null;
  }

  /* خواندنِ کدِ سفارشِ مشتری و پیش‌نمایش */
  function decodeOrder() {
    var m = document.getElementById('o-decode-msg');
    var box = document.getElementById('o-preview');
    decodedOrder = null;
    box.style.display = 'none';
    function say(t, ok) { m.textContent = t; m.style.display = ''; m.style.color = ok ? 'var(--ok, #2e9e6b)' : '#e8536f'; }
    try {
      var o = Pay.decodePayload(get('o-payload'));
      if (findOrder(o.code)) { say('این سفارش (' + R.fa(o.code) + ') قبلاً ثبت شده — در فهرستِ پایین است.', false); return; }
      decodedOrder = o;
      var lines = (o.items || []).map(function (it) {
        return '<div class="opv-line"><b>' + R.esc(it.name) + '</b>' +
          (it.size ? ' · سایزِ ' + R.esc(it.size) : '') + (it.color ? ' · ' + R.esc(it.color) : '') +
          ' — ' + R.fa(it.qty) + ' عدد</div>';
      }).join('');
      var b = o.buyer || {};
      box.innerHTML =
        '<div class="opv">' +
          '<div class="opv-head">سفارشِ <b>' + R.esc(o.code) + '</b> — مبلغِ انتظارِداشته: <b>' + R.faG(o.pricing && o.pricing.payAmount) + ' تومان</b></div>' +
          lines +
          '<div class="opv-pii"><b>خریدار:</b> ' + R.esc(b.name || '—') + ' · ' + R.esc(b.phone || '—') + '<br>' +
          '<b>نشانی:</b> ' + R.esc((b.city || '') + '، ' + (b.address || '—')) +
          (b.note ? '<br><b>یادداشت:</b> ' + R.esc(b.note) : '') + '</div>' +
          '<p class="hint">اطلاعاتِ خریدار فقط همین‌جا می‌ماند؛ در ریپو منتشر نمی‌شود.</p>' +
          '<button class="btn btn-primary btn-sm" id="registerOrder"><i data-ic="save"></i> ثبتِ سفارش</button>' +
        '</div>';
      box.style.display = '';
      say('سفارش خوانده شد — بررسی کن و ثبت کن.', true);
      R.paintIcons();
      document.getElementById('registerOrder').addEventListener('click', registerDecoded);
    } catch (e) {
      say('خواندن نشد: ' + e.message, false);
    }
  }

  function registerDecoded() {
    if (!decodedOrder) return;
    var o = decodedOrder;
    var p = piiLoad();
    p[o.code] = { buyer: o.buyer || {}, payload: Pay.encodePayload(o), registered: Date.now() };
    piiSave(p);
    /* نسخهٔ عمومی: بدونِ هیچ اطلاعاتِ خریدار */
    data.orders.push({
      code: o.code,
      created: o.created,
      expiresAt: o.expiresAt,
      items: o.items,
      pricing: o.pricing,
      status: 'sent',
      note: '',
      stockDone: false,
      updated: Date.now()
    });
    decodedOrder = null;
    document.getElementById('o-preview').style.display = 'none';
    set('o-payload', '');
    document.getElementById('o-decode-msg').style.display = 'none';
    saveLocal(); markDirty('orders');
    renderOrders();
    msg('pubMsg', 'سفارشِ ' + R.fa(o.code) + ' ثبت شد. برای رسیدنِ وضعیت به مشتری، «انتشار» را بزن.', true);
  }

  /* اعمالِ وضعیت/یادداشت: تأییدِ پرداخت موجودی را کم می‌کند و فایلِ وضعیت را می‌سازد */
  function applyOrder(code) {
    var o = findOrder(code);
    if (!o) return;
    var sel = document.getElementById('st-' + code);
    var note = document.getElementById('nt-' + code);
    var st = sel ? sel.value : o.status;
    o.status = st;
    o.note = note ? note.value.trim() : o.note;
    o.updated = Date.now();

    /* کسرِ موجودی: فقط یک‌بار، در گذرِ سفارش به «تأیید شد» یا «ارسال شد» */
    if ((st === 'paid' || st === 'shipped') && !o.stockDone) {
      var changed = false;
      (o.items || []).forEach(function (it) {
        var prod = (data.products || []).filter(function (x) { return x.id === it.id; })[0];
        if (prod && prod.stock !== undefined && prod.stock !== '') {
          prod.stock = Math.max(0, Number(prod.stock) - Number(it.qty));
          changed = true;
        }
      });
      o.stockDone = true;
      if (changed) markDirty('products');
    }

    saveLocal(); markDirty('orders');
    renderOrders();
    msg('pubMsg', 'وضعیتِ ' + R.fa(code) + ' شد: «' + ORDER_STATUS[st] + '». برای رسیدنِ به مشتری، «انتشار» را بزن.', true);
  }

  function renderOrders() {
    var box = document.getElementById('ordersList');
    if (!box) return;
    if (!(data.orders || []).length) {
      box.innerHTML = '<p class="hint">هنوز سفارشی ثبت نشده. کدِ پیامِ مشتری را در کادرِ بالا بچسبان.</p>';
      return;
    }
    var pii = piiLoad();
    var opts = Object.keys(ORDER_STATUS).map(function (k) {
      return '<option value="' + k + '">' + ORDER_STATUS[k] + '</option>';
    }).join('');
    box.innerHTML = data.orders.slice().reverse().map(function (o) {
      var p = (pii[o.code] && pii[o.code].buyer) || {};
      var lines = (o.items || []).map(function (it) {
        return R.esc(it.name) + (it.size ? ' (' + R.esc(it.size) + ')' : '') + ' ×' + R.fa(it.qty);
      }).join('، ');
      return '<div class="order-item' + (o.status === 'sent' ? ' needs-review' : '') + '">' +
        '<div class="oi-head"><b>' + R.esc(o.code) + '</b>' +
          '<span class="oi-amount">' + R.faG(o.pricing && o.pricing.payAmount) + ' تومان</span>' +
          '<span class="oi-date">' + R.fa(new Date(o.created).toLocaleDateString('fa-IR')) + '</span></div>' +
        '<div class="oi-items">' + lines + '</div>' +
        (p.name ? '<div class="oi-pii"><b>خریدار:</b> ' + R.esc(p.name) + ' · ' + R.esc(p.phone || '') +
          '<br><b>نشانی:</b> ' + R.esc(((p.city || '') + '، ' + (p.address || '')).replace(/^، /, '')) + '</div>' : '') +
        '<div class="oi-actions">' +
          '<select id="st-' + R.esc(o.code) + '">' + opts + '</select>' +
          '<input id="nt-' + R.esc(o.code) + '" placeholder="یادداشت (مثل کدِ رهگیریِ پست)">' +
          '<button class="btn btn-primary btn-sm" data-apply="' + R.esc(o.code) + '">اعمال</button>' +
        '</div>' +
        (o.note ? '<p class="hint">یادداشتِ فعلی: ' + R.esc(o.note) + '</p>' : '') +
      '</div>';
    }).join('');
    box.querySelectorAll('[data-apply]').forEach(function (b) {
      b.addEventListener('click', function () { applyOrder(b.getAttribute('data-apply')); });
    });
    /* انتخابگرِ وضعیت رویِ وضعیتِ فعلی بنشیند */
    data.orders.forEach(function (o) {
      var sel = document.getElementById('st-' + o.code);
      if (sel) sel.value = o.status;
    });
    R.paintIcons();
  }

  /* فایل‌هایِ وضعیتِ عمومی: با هر انتشارِ سفارش‌ها، هم‌گامِ orders.json می‌شوند */
  function buildStatusFiles() {
    return (data.orders || []).map(function (o) {
      return {
        path: statusFilePath(o.code),
        text: JSON.stringify({ code: o.code, status: o.status, note: o.note || '', updated: o.updated || o.created }, null, 2) + '\n'
      };
    });
  }

  /* ---------- پشتیبان ---------- */
  function exportJSON() {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'roya-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function importJSON(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var d = JSON.parse(fr.result);
        if (!d || !d.site || !d.products) throw new Error('ساختارِ فایل درست نیست');
        data = d;
        if (!Array.isArray(data.categories)) data.categories = [];
        if (!Array.isArray(data.orders)) data.orders = [];
        saveLocal(); fillSiteForm(); renderProducts(); renderTestimonials(); renderPosts(); renderFaq(); renderCategories();
        /* دادهٔ درون‌ریزی‌شده جای دادهٔ فعلی را می‌گیرد؛ تا منتشر نشود، باید «کثیف» شمرده شود */
        Object.keys(FILES).forEach(function (k) { if (k !== 'sitemap') markDirty(k); });
        msg('backupMsg', 'درون‌ریزی شد. برای اعمال در سایت، منتشر کن.', true);
      } catch (e) {
        msg('backupMsg', 'خطا: ' + e.message, false);
      }
    };
    fr.readAsText(file);
  }

  /* ---------- تصویرِ اشتراکِ اختصاصیِ هر محصول (og) ----------
     با هر انتشار، برایِ هر محصولی که عکس دارد یک og ۱۲۰۰×۶۳۰ ساخته می‌شود:
     عکسِ محصول + نامِ برند + نامِ محصول + قیمت، تا پیش‌نمایشِ واتساپ و تلگرام زیبا باشد. */
  function productImageB64(p) {
    var up = pendingUploads.filter(function (u) { return u.path === p.image; })[0];
    if (up) return Promise.resolve(up.base64);
    return fetch('../' + p.image).then(function (r) { return r.blob(); }).then(function (b) {
      return new Promise(function (resolve) {
        var fr = new FileReader();
        fr.onload = function () { resolve(String(fr.result).split(',')[1]); };
        fr.onerror = function () { resolve(''); };
        fr.readAsDataURL(b);
      });
    }).catch(function () { return ''; });
  }

  function makeOg(p) {
    return productImageB64(p).then(function (b64) {
      var W = 1200, H = 630;
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d');
      var c1 = (p.cover && p.cover[0]) || '#f8c8d8', c2 = (p.cover && p.cover[1]) || '#fde8ef';
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      function overlay() {
        var fade = ctx.createLinearGradient(0, H * 0.42, 0, H);
        fade.addColorStop(0, 'rgba(255,255,255,0)');
        fade.addColorStop(1, 'rgba(255,255,255,0.94)');
        ctx.fillStyle = fade;
        ctx.fillRect(0, H * 0.42, W, H * 0.58);
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(120,60,90,.8)';
        ctx.font = '500 30px Vazirmatn, sans-serif';
        ctx.fillText((data.site && data.site.name) || 'نینا شاپ', W - 48, 64);
        ctx.fillStyle = '#3d2430';
        ctx.font = '700 56px Vazirmatn, sans-serif';
        ctx.fillText(p.name || '', W - 48, H - 116);
        ctx.fillStyle = '#a14868';
        ctx.font = '600 40px Vazirmatn, sans-serif';
        ctx.fillText(R.faPrice(p.price) + ' تومان', W - 48, H - 50);
        return cv.toDataURL('image/jpeg', 0.85).split(',')[1];
      }
      if (!b64) return overlay();
      return new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () {
          var s = Math.max(W / img.width, H / img.height);
          ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
          resolve(overlay());
        };
        img.onerror = function () { resolve(overlay()); };
        img.src = 'data:image/jpeg;base64,' + b64;
      });
    });
  }

  function generateOgs() {
    var list = (data.products || []).filter(function (p) { return p.image && p.status !== 'hidden'; });
    if (!list.length || !document.fonts) return Promise.resolve();
    return Promise.all([
      document.fonts.load('700 56px Vazirmatn'),
      document.fonts.load('600 40px Vazirmatn'),
      document.fonts.load('500 30px Vazirmatn')
    ]).catch(function () {}).then(function () {
      return list.reduce(function (chain, p) {
        return chain.then(function () {
          return makeOg(p).then(function (b64) {
            var path = 'assets/og/' + p.id + '.jpg';
            var ex = pendingUploads.filter(function (u) { return u.path === path; })[0];
            if (ex) ex.base64 = b64;
            else pendingUploads.push({ path: path, base64: b64 });
          });
        });
      }, Promise.resolve());
    });
  }

  /* ---------- انتشار ---------- */
  var K_LOG = 'nina_v1_publog';

  /* تاریخِ شمسی + ساعت، برایِ گزارشِ ارسال */
  function jalaliStr(ts) {
    var d = new Date(ts);
    var gy = d.getFullYear(), gm = d.getMonth() + 1, gd = d.getDate();
    var g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    var gy2 = (gm > 2) ? (gy + 1) : gy;
    var days = (365 * gy) + parseInt((gy2 + 3) / 4, 10) - parseInt((gy2 + 99) / 100, 10) +
      parseInt((gy2 + 399) / 400, 10) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * parseInt(days / 12053, 10);
    days %= 12053;
    jy += 4 * parseInt(days / 1461, 10);
    days %= 1461;
    if (days > 365) { jy += parseInt((days - 1) / 365, 10); days = (days - 1) % 365; }
    var jm = (days < 186) ? 1 + parseInt(days / 31, 10) : 7 + parseInt((days - 186) / 30, 10);
    var jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return R.fa(jy + '/' + p(jm) + '/' + p(jd)) + ' — ' + R.fa(p(d.getHours()) + ':' + p(d.getMinutes()));
  }

  /* خطایِ گیت‌هاب به زبانِ آدمیزاد */
  function ghErrText(e) {
    var m = (e && e.message) || String(e);
    var st = e && e.ghStatus;
    var extra = (e && e.bodyMsg) ? ' (پیامِ گیت‌هاب: ' + e.bodyMsg + ')' : '';
    /* پاسخِ HTTP آمد ولی از گیت‌هاب نبود: وسطِ راه دستکاری/جواب شده */
    if (st && e.fromGithub === false)
      return 'پاسخِ ' + st + ' از گیت‌هاب نیامده — چیزی در مسیرِ شبکهٔ شما (فیلترشکن، اپراتور یا قطعیِ موقت) به‌جای گیت‌هاب جواب می‌دهد. یک‌بار با فیلترشکن و یک‌بار بدونِ آن امتحان کن، بعد دوباره «انتشار» را بزن. توکن و اطلاعاتِ ورود درست‌اند؛ مشکل از مسیرِ شبکه است.';
    if (st === 401 || /401/.test(m)) return 'توکنِ گیت‌هاب نامعتبر یا باطل شده (401). توکنِ تازه بساز و در تبِ ورود وارد کن.' + extra;
    if (st === 403 || /403/.test(m)) {
      if (/rate/i.test(m)) return 'محدودیتِ موقتِ گیت‌هاب (403 rate limit). چند دقیقه صبر کن و دوباره «انتشار» را بزن.';
      return 'دسترسی رد شد (403). توکن باید مجوزِ «Contents: Read and write» روی همین مخزن داشته باشد.' + extra;
    }
    if (st === 404 || /404|not found/i.test(m)) return 'گیت‌هاب گفت پیدا نشد (404). دو علتِ رایج: ۱) نامِ کاربری یا نامِ مخزن در تبِ ورود اشتباه است. ۲) توکنِ Fine-grained به این مخزن دسترسی ندارد — در بخشِ Repository access باید مخزنِ ninashop انتخاب شده باشد و در Permissions گزینهٔ «Contents: Read and write» فعال باشد. بعد از اصلاح، توکن را در تبِ ورود دوباره وارد کن.' + extra;
    if (st === 409 || st === 422 || /409|422/.test(m)) return 'تداخلِ نسخهٔ فایل (409/422). دوباره «انتشار» را بزن؛ معمولاً خودکار حل می‌شود.' + extra;
    if (/fetch|network|Network/i.test(m)) return 'شبکه قطع بود یا گیت‌هاب پاسخ نداد. اینترنت را چک کن و دوباره «انتشار» را بزن.';
    return m;
  }

  /* تلاشِ مجددِ خودکار: ۳ بار، با فاصله — دیگر لازم نیست چند بار دستی بزنی */
  function withRetry(fn, tries) {
    tries = tries || 3;
    return fn().catch(function (e) {
      if (tries <= 1) throw e;
      return new Promise(function (res) { setTimeout(res, 1800); })
        .then(function () { return withRetry(fn, tries - 1); });
    });
  }

  /* اجرایِ پشت‌سرِ هم (نه موازی) — گیت‌هاب با درخواستِ همزمانِ زیاد اذیت می‌کند */
  function runSeq(items, fn) {
    return items.reduce(function (chain, it) {
      return chain.then(function () { return fn(it); });
    }, Promise.resolve());
  }

  /* جعبهٔ نتیجه: تا وقتی خودت نبندی، باز می‌ماند؛ متنش قابلِ کپی است */
  function showResult(ok, title, lines) {
    var box = document.getElementById('pubResult');
    if (!box) return;
    document.getElementById('pubResultTitle').textContent = title;
    document.getElementById('pubResultBody').textContent = lines.join('\n');
    box.className = 'pub-result ' + (ok ? 'ok' : 'err');
    box.style.display = '';
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function addLog(ok, summary, errors) {
    var log = [];
    try { log = JSON.parse(localStorage.getItem(K_LOG)) || []; } catch (e) {}
    log.unshift({ t: Date.now(), ok: ok, s: summary, e: errors || [] });
    if (log.length > 30) log.length = 30;
    try { localStorage.setItem(K_LOG, JSON.stringify(log)); } catch (e) {}
    renderLog();
  }
  function renderLog() {
    var box = document.getElementById('pubLog');
    if (!box) return;
    var log = [];
    try { log = JSON.parse(localStorage.getItem(K_LOG)) || []; } catch (e) {}
    box.innerHTML = log.map(function (l, i) {
      return '<div class="log-item ' + (l.ok ? 'ok' : 'err') + '">' +
        '<div class="log-body">' +
          '<div class="log-date">' + (l.ok ? '✅ ' : '❌ ') + jalaliStr(l.t) + '</div>' +
          '<div>' + R.esc(l.s) + '</div>' +
          (l.e && l.e.length ? '<div style="color:#c74e4e">' + l.e.map(R.esc).join('<br>') + '</div>' : '') +
        '</div>' +
        '<button class="mini-btn danger" data-logdel="' + i + '" aria-label="حذفِ این گزارش">' + R.icon('trash') + '</button>' +
      '</div>';
    }).join('') || '<p class="hint">هنوز ارسالی ثبت نشده.</p>';
  }

  /* پیش‌پرواز: قبل از فرستادنِ فایل‌ها، یک درخواستِ سبک به خودِ مخزن.
     اگر اتصال/دسترسی مشکل داشت، همین‌جا با یک گزارشِ روشن می‌ایستد
     و پنج فایل، سه‌بارِ تکراری، خطایِ گیج‌کننده نمی‌گیرند. */
  function preflight() {
    var c = ghCfg();
    return fetch('https://api.github.com/repos/' + c.user + '/' + c.repo, {
      headers: { 'Authorization': 'Bearer ' + c.token, 'Accept': 'application/vnd.github+json' }
    }).then(function (r) {
      if (r.ok) return null;
      return ghFail(r);
    });
  }

  function publish() {
    /* sitemap خودکار: هرگاه محصول، مقاله یا دامنه عوض شد، با انتشار تازه می‌شود */
    if (dirty[FILES.products] || dirty[FILES.posts] || dirty[FILES.site]) {
      data.sitemap = buildSitemap();
      markDirty('sitemap');
    }
    var begin = dirty[FILES.products] ? generateOgs() : Promise.resolve();
    begin.then(function () {
      var paths = Object.keys(dirty);
      var uploads = pendingUploads.slice();
      if (!paths.length && !uploads.length) { msg('pubMsg', 'تغییری برای انتشار نیست.', true); return; }
      var btn = document.getElementById('publishBtn');
      btn.disabled = true;
      msg('pubMsg', 'در حالِ بررسیِ اتصال به گیت‌هاب…', true);
      var okItems = [], errItems = [];

      function sendFile(path) {
        var key = Object.keys(FILES).filter(function (k) { return FILES[k] === path; })[0];
        var text = key === 'site' ? data.site : data[key];
        var body = key === 'sitemap' ? String(text) : JSON.stringify(text, null, 2) + '\n';
        return withRetry(function () { return putFile(path, body); })
          .then(function () { okItems.push(path); delete dirty[path]; })
          .catch(function (e) { errItems.push(path + ' ← ' + ghErrText(e)); });
      }
      function sendUpload(u) {
        return withRetry(function () { return putFileB64(u.path, u.base64); })
          .then(function () {
            okItems.push(u.path);
            var i = pendingUploads.indexOf(u);
            if (i > -1) pendingUploads.splice(i, 1);
          })
          .catch(function (e) { errItems.push(u.path + ' ← ' + ghErrText(e)); });
      }
      /* فایل‌هایِ وضعیتِ سفارش‌ها: هرگاه سفارش‌ها منتشر می‌شوند، هم‌گام می‌روند */
      var statusFiles = dirty[FILES.orders] ? buildStatusFiles() : [];

      preflight().then(function () {
        msg('pubMsg', 'در حالِ انتشار… (' + R.fa(paths.length + uploads.length + statusFiles.length) + ' فایل)', true);
        return runSeq(paths, sendFile)
          .then(function () { return runSeq(uploads, sendUpload); })
          .then(function () {
            return runSeq(statusFiles, function (sf) {
              return withRetry(function () { return putFile(sf.path, sf.text); })
                .then(function () { okItems.push(sf.path); })
                .catch(function (e) { errItems.push(sf.path + ' ← ' + ghErrText(e)); });
            });
          })
          .then(function () {
            btn.disabled = false;
            saveLocal(); saveDirty(); renderDirty();
            var okMsg = okItems.length
              ? R.fa(okItems.length) + ' فایل منتشر شد: ' + okItems.join('، ')
              : 'هیچ فایلی منتشر نشد.';
            if (!errItems.length) {
              addLog(true, okMsg, []);
              showResult(true, '✨ انتشار کامل شد', [okMsg, 'سایتِ تازه را با یک رفرش ببین.']);
              msg('pubMsg', '✨ منتشر شد!', true);
            } else {
              addLog(false,
                R.fa(okItems.length) + ' فایل منتشر شد، ' + R.fa(errItems.length) + ' مورد خطا خورد.',
                errItems);
              showResult(false, '⚠️ انتشار ناقص ماند', errItems.concat(['', 'متنِ بالا با دکمهٔ کپی برداشته می‌شود. بعد از رفعِ مشکل، دوباره «انتشار» را بزن؛ فقط فایل‌هایِ ناتمام دوباره فرستاده می‌شوند.']));
              msg('pubMsg', 'انتشار ناقص ماند — جزئیات در جعبهٔ زیر.', false);
            }
          });
      }).catch(function (e) {
        /* اتصال یا دسترسی مشکل داشت: قبل از فرستادنِ فایل‌ها، با یک گزارشِ روشن بایست */
        btn.disabled = false;
        addLog(false, 'اتصال به گیت‌هاب برقرار نشد — هیچ فایلی فرستاده نشد', [ghErrText(e)]);
        showResult(false, '⚠️ انتشار متوقف شد: اتصال به گیت‌هاب', [ghErrText(e), '', 'متنِ بالا با دکمهٔ کپی برداشته می‌شود.']);
        msg('pubMsg', 'انتشار متوقف شد — جزئیات در جعبهٔ زیر.', false);
      });
    }).catch(function (e) {
      /* هر خطایِ پیش‌بینی‌نشده هم به‌جای سکوت، در جعبهٔ گزارش نمایش داده می‌شود */
      var btn = document.getElementById('publishBtn');
      if (btn) btn.disabled = false;
      showResult(false, '⚠️ انتشار متوقف شد', [ghErrText(e), '', 'متنِ بالا با دکمهٔ کپی برداشته می‌شود.']);
      msg('pubMsg', 'انتشار متوقف شد — جزئیات در جعبهٔ زیر.', false);
    });
  }

  /* ---------- ورود/خروج ---------- */
  function loggedIn() { return !!localStorage.getItem(K_TOKEN); }
  function showPanel() {
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('panelBox').style.display = '';
    var bn = document.querySelector('.bottom-nav');
    if (bn) bn.style.display = '';
  }
  function showLogin() {
    document.getElementById('loginBox').style.display = '';
    document.getElementById('panelBox').style.display = 'none';
    var bn = document.querySelector('.bottom-nav');
    if (bn) bn.style.display = 'none';
  }

  /* ---------- اتصالِ رویدادها ---------- */
  /* اتصالِ امنِ رویداد: نبودنِ یک عنصر هرگز بقیهٔ اتصال‌ها را نمی‌شکند */
  function on(id, evt, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(evt, fn);
  }
  function q(sel, evt, fn) {
    var el = document.querySelector(sel);
    if (el) el.addEventListener(evt, fn);
  }

  function bind() {
    on('loginBtn', 'click', function () {
      var u = get('ghUser'), r = get('ghRepo'), t = get('ghToken');
      if (!u || !r || !t) { msg('loginMsg', 'هر سه فیلد را پر کن.', false); return; }
      localStorage.setItem(K_USER, u);
      localStorage.setItem(K_REPO, r);
      localStorage.setItem(K_TOKEN, t);
      showPanel();
    });
    on('logoutBtn', 'click', function () {
      localStorage.removeItem(K_TOKEN);
      showLogin();
    });

    function activatePane(name) {
      if (!name || !document.getElementById('pane-' + name)) return;
      document.querySelectorAll('.admin-tab').forEach(function (t) {
        t.classList.toggle('active', t.dataset.pane === name);
      });
      document.querySelectorAll('.admin-pane').forEach(function (p) {
        p.classList.toggle('active', p.id === 'pane-' + name);
      });
      var bn = document.querySelectorAll('.bottom-nav a');
      bn.forEach(function (a) { a.classList.toggle('active', a.dataset.pane === name); });
      if (name === 'orders') renderOrders();
      document.getElementById('pane-' + name).scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    document.querySelectorAll('.admin-tab').forEach(function (tab) {
      tab.addEventListener('click', function () { activatePane(tab.dataset.pane); });
    });
    var bnav = document.querySelector('.bottom-nav');
    if (bnav) bnav.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (a) { e.preventDefault(); activatePane(a.dataset.pane); }
    });

    on('addProduct', 'click', function () { openEditor(null); });
    on('saveProduct', 'click', saveProduct);
    /* فیلترِ دسته در تبِ محصولات */
    on('adminCatFilter', 'click', function (e) {
      var b = e.target.closest('[data-cat]');
      if (!b) return;
      adminCat = b.dataset.cat;
      renderAdminCatFilter(); renderProducts();
    });
    /* منویِ بازشویِ دسته در فرمِ محصول: لمس یا تمرکز = پنجرهٔ انتخابِ تمیز */
    var catInp = document.getElementById('f-category'), catMenu = document.getElementById('catMenu');
    function openCatMenu() {
      if (!catMenu) return;
      var names = allCatNames();
      catMenu.innerHTML = names.map(function (n) {
        return '<button type="button" data-pick="' + R.esc(n) + '">' + R.esc(n) + '</button>';
      }).join('') || '<div class="hint" style="padding:8px 12px">هنوز دسته‌ای نساخته‌ای؛ اسمش را بنویس.</div>';
      catMenu.hidden = false;
    }
    function closeCatMenu() { if (catMenu) catMenu.hidden = true; }
    if (catInp && catMenu) {
      catInp.addEventListener('focus', openCatMenu);
      catInp.addEventListener('click', openCatMenu);
      catMenu.addEventListener('pointerdown', function (e) {
        var b = e.target.closest('[data-pick]');
        if (!b) return;
        e.preventDefault();   /* تا blur قبل از انتخاب، منو نبندد */
        catInp.value = b.dataset.pick;
        closeCatMenu();
        catInp.blur();
      });
      catInp.addEventListener('blur', function () { setTimeout(closeCatMenu, 160); });
    }
    /* پالتِ رنگِ کاور: هم‌گامِ دوسویه با فیلدِ متنی */
    function bindColorPair(cId, tId) {
      var c = document.getElementById(cId), t = document.getElementById(tId);
      if (!c || !t) return;
      c.addEventListener('input', function () { t.value = c.value; });
      t.addEventListener('input', function () {
        var v = t.value.trim();
        if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) c.value = v;
      });
    }
    bindColorPair('f-cover1c', 'f-cover1');
    bindColorPair('f-cover2c', 'f-cover2');
    /* عکس */
    on('f-image', 'change', function (e) {
      var f = e.target.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { msg('pubMsg', 'فقط فایلِ عکس.', false); return; }
      compressImage(f, 1200, 0.82).then(function (b64) {
        pendingImage = b64; imageRemoved = false;
        setImagePreview(b64);
      }).catch(function (err) { msg('pubMsg', err.message, false); });
    });
    on('removeImg', 'click', function () {
      pendingImage = null; imageRemoved = true; setImagePreview(null);
    });
    /* رنگ‌ها */
    on('addColor', 'click', function () { addColorRow('', '#f8c8d8'); });
    on('cancelEdit', 'click', function () {
      document.getElementById('productEditor').style.display = 'none'; editing = null;
    });
    on('productList', 'click', function (e) {
      var b = e.target.closest('[data-edit]');
      if (b) { openEditor(Number(b.dataset.edit)); return; }
      var d = e.target.closest('[data-del]');
      if (d) {
        var i = Number(d.dataset.del);
        if (confirm('«' + data.products[i].name + '» حذف شود؟')) {
          data.products.splice(i, 1);
          saveLocal(); markDirty('products'); renderProducts();
        }
      }
    });

    on('addTestimonial', 'click', function () { openTEditor(null); });
    on('saveTestimonial', 'click', saveTestimonial);
    on('cancelT', 'click', function () {
      document.getElementById('testimonialEditor').style.display = 'none'; editingT = null;
    });
    on('testimonialList', 'click', function (e) {
      var b = e.target.closest('[data-tedit]');
      if (b) { openTEditor(Number(b.dataset.tedit)); return; }
      var d = e.target.closest('[data-tdel]');
      if (d) {
        var i = Number(d.dataset.tdel);
        if (confirm('این نظر حذف شود؟')) {
          data.testimonials.splice(i, 1);
          saveLocal(); markDirty('testimonials'); renderTestimonials();
        }
      }
    });

    on('saveSite', 'click', saveSite);
    on('saveChannels', 'click', saveChannels);
    on('savePayments', 'click', savePayments);
    on('decodeOrder', 'click', decodeOrder);
    on('addPost', 'click', function () { openPEditor(null); });
    on('savePost', 'click', savePost);
    on('cancelP', 'click', function () {
      document.getElementById('postEditor').style.display = 'none'; editingP = null;
    });
    on('postList', 'click', function (e) {
      var b = e.target.closest('[data-pedit]');
      if (b) { openPEditor(Number(b.dataset.pedit)); return; }
      var d = e.target.closest('[data-pdel]');
      if (d) {
        var i = Number(d.dataset.pdel);
        if (confirm('این مقاله حذف شود؟')) {
          data.posts.splice(i, 1);
          saveLocal(); markDirty('posts'); renderPosts();
        }
      }
    });
    on('addFaq', 'click', function () { openQEditor(null); });
    on('saveFaq', 'click', saveFaq);
    on('cancelQ', 'click', function () {
      document.getElementById('faqEditor').style.display = 'none'; editingQ = null;
    });
    on('faqList', 'click', function (e) {
      var b = e.target.closest('[data-qedit]');
      if (b) { openQEditor(Number(b.dataset.qedit)); return; }
      var d = e.target.closest('[data-qdel]');
      if (d) {
        var i = Number(d.dataset.qdel);
        if (confirm('این پرسش حذف شود؟')) {
          data.faq.splice(i, 1);
          saveLocal(); markDirty('faq'); renderFaq();
        }
      }
    });
    on('addCategory', 'click', function () { openCEditor(null); });
    on('saveCategory', 'click', saveCategory);
    on('cancelC', 'click', function () {
      document.getElementById('catEditor').style.display = 'none'; editingC = null;
    });
    on('catList', 'click', function (e) {
      var b = e.target.closest('[data-cedit]');
      if (b) { openCEditor(Number(b.dataset.cedit)); return; }
      var d = e.target.closest('[data-cdel]');
      if (d) {
        var i = Number(d.dataset.cdel);
        if (confirm('دستهٔ «' + data.categories[i].name + '» حذف شود؟ (محصولات حذف نمی‌شوند)')) {
          data.categories.splice(i, 1);
          saveLocal(); markDirty('categories'); renderCategories();
        }
      }
    });
    on('publishBtn', 'click', publish);
    on('pubClose', 'click', function () {
      document.getElementById('pubResult').style.display = 'none';
    });
    on('pubCopy', 'click', function () {
      var text = document.getElementById('pubResultBody').textContent;
      var done = function () { toast('گزارش کپی شد.', true); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () { fallback(); });
      } else fallback();
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); ta.remove(); done();
      }
    });
    on('clearLog', 'click', function () {
      if (confirm('همهٔ گزارشِ ارسال پاک شود؟')) {
        try { localStorage.removeItem(K_LOG); } catch (e) {}
        renderLog();
      }
    });
    on('pubLog', 'click', function (e) {
      var b = e.target.closest('[data-logdel]');
      if (!b) return;
      var log = [];
      try { log = JSON.parse(localStorage.getItem(K_LOG)) || []; } catch (err) {}
      log.splice(Number(b.dataset.logdel), 1);
      try { localStorage.setItem(K_LOG, JSON.stringify(log)); } catch (err) {}
      renderLog();
    });
    on('exportBtn', 'click', exportJSON);
    on('importFile', 'change', function (e) {
      if (e.target.files[0]) importJSON(e.target.files[0]);
    });
  }

  /* ---------- شروع ---------- */
  function boot() {
    R.initTheme();
    R.bindThemeToggle();
    R.paintIcons();

    /* اول از همه: پنل یا ورود؟ — هر خطایِ بعدی نباید کاربر را بیرون بیندازد */
    if (loggedIn()) showPanel(); else showLogin();
    /* نامِ کاربری و مخزنِ قبلی در فرمِ ورود پیش‌پر می‌شود تا تایپِ مجدد و خطا نداشته باشد */
    try {
      var lu = localStorage.getItem(K_USER), lr = localStorage.getItem(K_REPO);
      if (lu) document.getElementById('ghUser').value = lu;
      if (lr) document.getElementById('ghRepo').value = lr;
    } catch (e) {}

    /* دادهٔ محلی، وگرنه از فایل‌هایِ فعلیِ سایت */
    if (!loadLocal()) {
      Promise.all([
        R.fetchJSON('../data/site.json').catch(function () { return null; }),
        R.fetchJSON('../data/products.json').catch(function () { return null; }),
        R.fetchJSON('../data/testimonials.json').catch(function () { return null; }),
        R.fetchJSON('../data/posts.json').catch(function () { return null; }),
        R.fetchJSON('../data/faq.json').catch(function () { return null; }),
        R.fetchJSON('../data/categories.json').catch(function () { return null; }),
        R.fetchJSON('../data/orders.json').catch(function () { return null; })
      ]).then(function (res) {
        data.site = res[0] || { name: 'نینا شاپ', tagline: '', about: '', domain: '', channels: {} };
        data.products = res[1] || [];
        data.testimonials = res[2] || [];
        data.posts = res[3] || [];
        data.faq = res[4] || [];
        data.categories = res[5] || [];
        data.orders = res[6] || [];
        saveLocal();
        fillSiteForm(); renderProducts(); renderTestimonials(); renderPosts(); renderFaq(); renderCategories(); renderOrders();
      });
    } else {
      fillSiteForm(); renderProducts(); renderTestimonials(); renderPosts(); renderFaq(); renderCategories(); renderOrders();
    }
    renderDirty();
    renderLog();
    bind();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
