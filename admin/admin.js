/* ============================================================
   نینا شاپ — admin/admin.js  (پنلِ مدیریت)
   ویرایش در مرورگر + انتشار با GitHub Contents API
   توکن فقط در localStorageِ همین گوشی می‌ماند.
   ============================================================ */
(function () {
  'use strict';
  var R = window.Nina;

  var K_TOKEN = 'nina_v1_gh_token', K_USER = 'nina_v1_gh_user', K_REPO = 'nina_v1_gh_repo';
  var K_DATA = 'nina_v1_admin_data';   /* دادهٔ ویرایش‌شدهٔ محلی */

  /* دادهٔ محلی: {site:…, products:[…], testimonials:[…], posts:[…], faq:[…]} */
  var data = { site: null, products: [], testimonials: [], posts: [], faq: [], categories: [] };
  var dirty = {};   /* مسیر → true */
  var pendingUploads = [];  /* [{path, base64}] عکس‌هایِ در انتظارِ انتشار */
  var editing = null, editingT = null, editingP = null, editingQ = null, editingC = null;
  var pendingImage = null;  /* {base64, name} عکسِ محصولِ در حالِ ویرایش */
  var imageRemoved = false;

  var FILES = {
    site: 'data/site.json',
    products: 'data/products.json',
    testimonials: 'data/testimonials.json',
    posts: 'data/posts.json',
    faq: 'data/faq.json',
    categories: 'data/categories.json',
    sitemap: 'sitemap.xml'
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
          return true;
        }
      }
    } catch (e) {}
    return false;
  }
  function markDirty(key) {
    dirty[FILES[key]] = true;
    renderDirty();
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
  /* sha فایل (404 = فایلِ نو) */
  function getSha(path) {
    return fetch(ghURL(path), {
      headers: { 'Authorization': 'Bearer ' + ghCfg().token, 'Accept': 'application/vnd.github+json' }
    }).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('خطایِ گیت‌هاب: ' + r.status);
      return r.json().then(function (j) { return j.sha; });
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
        if (!r.ok) return r.json().then(function (j) {
          throw new Error(j.message || ('HTTP ' + r.status));
        });
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
  function msg(id, text, ok) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'msg show ' + (ok ? 'ok' : 'err');
    setTimeout(function () { el.className = 'msg'; }, 6000);
  }

  /* ---------- رندرِ فهرست‌ها ---------- */
  function renderProducts() {
    var box = document.getElementById('productList');
    if (!box) return;
    box.innerHTML = data.products.map(function (p, i) {
      var swatchInner = p.image
        ? '<img src="' + R.esc(p.image) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">'
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
    }).join('') || '<p class="hint">هنوز محصولی نیست.</p>';
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
    set('f-sizes', (p.sizes || []).join(', '));
    set('f-status', p.status || 'active'); set('f-featured', p.featured ? '1' : '0');
    set('f-stock', p.stock ? R.faG(p.stock) : '');
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
      img.src = p.image;
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
    /* عکس */
    if (imageRemoved) { p.image = ''; }
    if (pendingImage) {
      var imgPath = 'assets/products/' + p.id + '.jpg';
      pendingUploads.push({ path: imgPath, base64: pendingImage });
      p.image = imgPath;
    }
    if (editing.idx === null) data.products.push(p);
    else data.products[editing.idx] = p;
    saveLocal(); markDirty('products');
    renderProducts();
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
    var dl = document.getElementById('catSuggestions');
    if (dl) dl.innerHTML = (data.categories || []).map(function (c) {
      return '<option value="' + R.esc(c.name) + '"></option>';
    }).join('');
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
  }
  function saveSite() {
    data.site.name = get('s-name') || 'نینا شاپ';
    data.site.tagline = get('s-tagline');
    data.site.about = get('s-about');
    data.site.domain = get('s-domain').replace(/\/+$/, '');
    data.site.shipping = get('s-shipping');
    data.site.guarantee = get('s-guarantee');
    saveLocal(); markDirty('site');
    msg('pubMsg', 'هویتِ سایت ذخیره شد.', true);
  }
  function saveChannels() {
    data.site.channels = {
      instagram: get('s-instagram'),
      telegram: get('s-telegram'),
      whatsapp: get('s-whatsapp'),
      phone: get('s-phone')
    };
    saveLocal(); markDirty('site');
    msg('pubMsg', 'کانال‌ها ذخیره شدند.', true);
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
        saveLocal(); fillSiteForm(); renderProducts(); renderTestimonials(); renderPosts(); renderFaq(); renderCategories(); renderDirty();
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
    var total = paths.length + uploads.length;
    var btn = document.getElementById('publishBtn');
    btn.disabled = true;
    var done = 0, fail = null;
    function step() {
      done++;
      if (done === total) {
        btn.disabled = false;
        saveLocal(); renderDirty();
        if (fail) msg('pubMsg', 'انتشار ناقص ماند: ' + fail, false);
        else msg('pubMsg', '✨ منتشر شد! یک دقیقه بعد سایتِ تازه را در تبِ سایت ببین.', true);
      }
    }
    paths.forEach(function (path) {
      var key = Object.keys(FILES).filter(function (k) { return FILES[k] === path; })[0];
      var text = key === 'site' ? data.site : data[key];
      var body = key === 'sitemap' ? String(text) : JSON.stringify(text, null, 2) + '\n';
      putFile(path, body)
        .then(function () { delete dirty[path]; })
        .catch(function (e) { fail = e.message; })
        .then(step);
    });
    uploads.forEach(function (u) {
      putFileB64(u.path, u.base64)
        .then(function () {
          var i = pendingUploads.indexOf(u);
          if (i > -1) pendingUploads.splice(i, 1);
        })
        .catch(function (e) { fail = 'آپلودِ عکس: ' + e.message; })
        .then(step);
    });
    });
  }

  /* ---------- ورود/خروج ---------- */
  function loggedIn() { return !!localStorage.getItem(K_TOKEN); }
  function showPanel() {
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('panelBox').style.display = '';
  }
  function showLogin() {
    document.getElementById('loginBox').style.display = '';
    document.getElementById('panelBox').style.display = 'none';
  }

  /* ---------- اتصالِ رویدادها ---------- */
  function bind() {
    document.getElementById('loginBtn').addEventListener('click', function () {
      var u = get('ghUser'), r = get('ghRepo'), t = get('ghToken');
      if (!u || !r || !t) { msg('loginMsg', 'هر سه فیلد را پر کن.', false); return; }
      localStorage.setItem(K_USER, u);
      localStorage.setItem(K_REPO, r);
      localStorage.setItem(K_TOKEN, t);
      showPanel();
    });
    document.getElementById('logoutBtn').addEventListener('click', function () {
      localStorage.removeItem(K_TOKEN);
      showLogin();
    });

    document.querySelectorAll('.admin-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.admin-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.admin-pane').forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        document.getElementById('pane-' + tab.dataset.pane).classList.add('active');
      });
    });

    document.getElementById('addProduct').addEventListener('click', function () { openEditor(null); });
    document.getElementById('saveProduct').addEventListener('click', saveProduct);
    /* عکس */
    document.getElementById('f-image').addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { msg('pubMsg', 'فقط فایلِ عکس.', false); return; }
      compressImage(f, 1200, 0.82).then(function (b64) {
        pendingImage = b64; imageRemoved = false;
        setImagePreview(b64);
      }).catch(function (err) { msg('pubMsg', err.message, false); });
    });
    document.getElementById('removeImg').addEventListener('click', function () {
      pendingImage = null; imageRemoved = true; setImagePreview(null);
    });
    /* رنگ‌ها */
    document.getElementById('addColor').addEventListener('click', function () { addColorRow('', '#f8c8d8'); });
    document.getElementById('cancelEdit').addEventListener('click', function () {
      document.getElementById('productEditor').style.display = 'none'; editing = null;
    });
    document.getElementById('productList').addEventListener('click', function (e) {
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

    document.getElementById('addTestimonial').addEventListener('click', function () { openTEditor(null); });
    document.getElementById('saveTestimonial').addEventListener('click', saveTestimonial);
    document.getElementById('cancelT').addEventListener('click', function () {
      document.getElementById('testimonialEditor').style.display = 'none'; editingT = null;
    });
    document.getElementById('testimonialList').addEventListener('click', function (e) {
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

    document.getElementById('saveSite').addEventListener('click', saveSite);
    document.getElementById('saveChannels').addEventListener('click', saveChannels);
    document.getElementById('addPost').addEventListener('click', function () { openPEditor(null); });
    document.getElementById('savePost').addEventListener('click', savePost);
    document.getElementById('cancelP').addEventListener('click', function () {
      document.getElementById('postEditor').style.display = 'none'; editingP = null;
    });
    document.getElementById('postList').addEventListener('click', function (e) {
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
    document.getElementById('addFaq').addEventListener('click', function () { openQEditor(null); });
    document.getElementById('saveFaq').addEventListener('click', saveFaq);
    document.getElementById('cancelQ').addEventListener('click', function () {
      document.getElementById('faqEditor').style.display = 'none'; editingQ = null;
    });
    document.getElementById('faqList').addEventListener('click', function (e) {
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
    document.getElementById('addCategory').addEventListener('click', function () { openCEditor(null); });
    document.getElementById('saveCategory').addEventListener('click', saveCategory);
    document.getElementById('cancelC').addEventListener('click', function () {
      document.getElementById('catEditor').style.display = 'none'; editingC = null;
    });
    document.getElementById('catList').addEventListener('click', function (e) {
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
    document.getElementById('publishBtn').addEventListener('click', publish);
    document.getElementById('exportBtn').addEventListener('click', exportJSON);
    document.getElementById('importFile').addEventListener('change', function (e) {
      if (e.target.files[0]) importJSON(e.target.files[0]);
    });
  }

  /* ---------- شروع ---------- */
  function boot() {
    R.initTheme();
    R.bindThemeToggle();
    R.paintIcons();

    /* دادهٔ محلی، وگرنه از فایل‌هایِ فعلیِ سایت */
    if (!loadLocal()) {
      Promise.all([
        R.fetchJSON('../data/site.json').catch(function () { return null; }),
        R.fetchJSON('../data/products.json').catch(function () { return null; }),
        R.fetchJSON('../data/testimonials.json').catch(function () { return null; }),
        R.fetchJSON('../data/posts.json').catch(function () { return null; }),
        R.fetchJSON('../data/faq.json').catch(function () { return null; }),
        R.fetchJSON('../data/categories.json').catch(function () { return null; })
      ]).then(function (res) {
        data.site = res[0] || { name: 'نینا شاپ', tagline: '', about: '', domain: '', channels: {} };
        data.products = res[1] || [];
        data.testimonials = res[2] || [];
        data.posts = res[3] || [];
        data.faq = res[4] || [];
        data.categories = res[5] || [];
        saveLocal();
        fillSiteForm(); renderProducts(); renderTestimonials(); renderPosts(); renderFaq(); renderCategories();
      });
    } else {
      fillSiteForm(); renderProducts(); renderTestimonials(); renderPosts(); renderFaq(); renderCategories();
    }
    renderDirty();
    bind();
    if (loggedIn()) showPanel(); else showLogin();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
