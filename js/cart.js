/* ============================================================
   نینا شاپ — js/cart.js  (سبدِ خریدِ مشترک)
   سبد فقط در مرورگرِ خودِ مشتری می‌ماند (localStorage)؛
   هیچ سروری در کار نیست و هیچ داده‌ای جایی فرستاده نمی‌شود.
   ============================================================ */
(function () {
  'use strict';
  var R = window.Nina;
  var KEY = 'nina_v1_cart';

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }
  function save(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    announce();
  }
  /* همهٔ صفحه‌هایِ باز خبر می‌گیرند تا شمارندهٔ سبد تازه شود */
  function announce() {
    try { window.dispatchEvent(new CustomEvent('nina:cart')); } catch (e) {}
  }

  /* کلیدِ خطِ سبد: همان محصول با سایز/رنگِ متفاوت، دو خطِ جدا است */
  function lineKey(id, size, color) {
    return id + '|' + (size || '') + '|' + (color || '');
  }

  function items() { return load(); }

  function count() {
    return load().reduce(function (s, it) { return s + (Number(it.qty) || 0); }, 0);
  }

  function add(id, qty, size, color) {
    qty = Math.max(1, Number(qty) || 1);
    var list = load();
    var k = lineKey(id, size, color);
    var line = list.filter(function (it) { return lineKey(it.id, it.size, it.color) === k; })[0];
    if (line) line.qty = (Number(line.qty) || 0) + qty;
    else list.push({ id: id, qty: qty, size: size || '', color: color || '' });
    save(list);
  }

  function setQty(id, size, color, qty) {
    var list = load();
    var k = lineKey(id, size, color);
    if ((Number(qty) || 0) <= 0) {
      list = list.filter(function (it) { return lineKey(it.id, it.size, it.color) !== k; });
    } else {
      list.forEach(function (it) {
        if (lineKey(it.id, it.size, it.color) === k) it.qty = Number(qty);
      });
    }
    save(list);
  }

  function remove(id, size, color) { setQty(id, size, color, 0); }

  function clear() { save([]); }

  /* جمعِ سبد بر اساسِ قیمتِ لحظه‌ایِ محصولات */
  function total(products) {
    return load().reduce(function (s, it) {
      var p = (products || []).filter(function (x) { return x.id === it.id; })[0];
      return s + (p ? Number(p.price) * Number(it.qty) : 0);
    }, 0);
  }

  /* ---------- دکمهٔ سبد در سربرگِ همهٔ صفحه‌ها ---------- */
  function paintBadge() {
    var el = document.querySelector('.cart-btn .cart-count');
    if (!el) return;
    var n = count();
    el.textContent = R.fa(n);
    el.style.display = n ? '' : 'none';
  }

  function injectHeaderBtn() {
    var box = document.querySelector('.header-actions');
    if (!box || box.querySelector('.cart-btn')) return;
    var a = document.createElement('a');
    a.className = 'icon-btn cart-btn';
    a.href = 'checkout.html';
    a.setAttribute('aria-label', 'سبدِ خرید و پرداخت');
    a.innerHTML = R.icon('bag') + '<span class="cart-count"></span>';
    box.insertBefore(a, box.firstChild);
    paintBadge();
  }

  document.addEventListener('DOMContentLoaded', injectHeaderBtn);
  window.addEventListener('nina:cart', paintBadge);
  window.addEventListener('storage', function (e) { if (e.key === KEY) paintBadge(); });

  window.Nina.Cart = {
    items: items, count: count, add: add, setQty: setQty,
    remove: remove, clear: clear, total: total, lineKey: lineKey,
    paintBadge: paintBadge
  };
})();
