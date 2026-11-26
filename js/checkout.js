/* ============================================================
   نینا شاپ — js/checkout.js  (صفحهٔ سبدِ خرید و ثبتِ سفارش)
   ============================================================ */
(function () {
  'use strict';
  var R = window.Nina, Cart = R.Cart, Pay = R.Pay;
  var site = null, products = [];

  function esc(s) { return R.esc(s); }

  /* ---------- رندرِ سبد ---------- */
  function render() {
    var box = document.getElementById('checkoutBox');
    var lines = Cart.items();

    if (!lines.length) {
      box.innerHTML =
        '<div class="panel-card empty-cart">' +
          '<h3>' + R.icon('bag') + ' سبدِ تو خالی است</h3>' +
          '<p class="hint">از صفحهٔ محصولات، هرچه دوست داشتی با دکمهٔ «افزودن به سبد» این‌جا بیاور.</p>' +
          '<a class="btn btn-primary" href="./#products">' + R.icon('shirt') + ' رفتن به محصولات</a>' +
        '</div>';
      return;
    }

    var rows = lines.map(function (it, i) {
      var p = products.filter(function (x) { return x.id === it.id; })[0];
      if (!p) return '';
      var meta = [it.size ? 'سایزِ ' + esc(it.size) : '', it.color ? esc(it.color) : '']
        .filter(Boolean).join(' · ');
      return '<div class="cart-line" data-i="' + i + '">' +
        '<div class="cl-info"><b>' + esc(p.name) + '</b>' +
          (meta ? '<span class="cl-meta">' + meta + '</span>' : '') +
          '<span class="cl-price">' + R.faPrice(p.price) + ' <small>تومان</small></span></div>' +
        '<div class="cl-qty">' +
          '<button type="button" class="qbtn" data-act="minus" aria-label="کمتر">−</button>' +
          '<span class="qn">' + R.fa(it.qty) + '</span>' +
          '<button type="button" class="qbtn" data-act="plus" aria-label="بیشتر">+</button>' +
        '</div>' +
        '<button type="button" class="cl-del" data-act="del" aria-label="حذف">' + R.icon('trash') + '</button>' +
      '</div>';
    }).join('');

    var itemsTotal = lines.reduce(function (s, it) {
      var p = products.filter(function (x) { return x.id === it.id; })[0];
      return s + (p ? Number(p.price) * Number(it.qty) : 0);
    }, 0);
    var pay = site.payments && site.payments.cardToCard || {};
    var ship = Number(pay.shippingFee) || 0;

    box.innerHTML =
      '<div class="panel-card">' +
        '<h3>' + R.icon('bag') + ' سبدِ تو</h3>' +
        '<div class="cart-lines">' + (rows || '<p class="hint">محصولی در سبد نیست.</p>') + '</div>' +
        '<div class="sum-row"><span>جمعِ کالاها</span><b>' + R.faPrice(itemsTotal) + ' تومان</b></div>' +
        '<div class="sum-row"><span>هزینهٔ ارسال</span><b>' + (ship ? R.faPrice(ship) + ' تومان' : 'رایگان') + '</b></div>' +
        '<p class="hint">' + R.icon('info') + ' رقمِ نهاییِ پرداخت، پس از ثبتِ سفارش و برایِ سفارشِ تو یکتا می‌شود (طرحِ شناساییِ خودکارِ واریزی).</p>' +
      '</div>' +
      '<div class="panel-card">' +
        '<h3>' + R.icon('pen') + ' اطلاعاتِ ارسال</h3>' +
        '<div class="field"><label for="f-name">نام و نامِ خانوادگی *</label><input id="f-name" type="text" autocomplete="name"></div>' +
        '<div class="field-row">' +
          '<div class="field"><label for="f-phone">شمارهٔ موبایل *</label><input id="f-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="۰۹…"></div>' +
          '<div class="field"><label for="f-city">شهر *</label><input id="f-city" type="text" autocomplete="address-level2"></div>' +
        '</div>' +
        '<div class="field"><label for="f-address">نشانیِ پستیِ کامل *</label><textarea id="f-address" rows="2"></textarea></div>' +
        '<div class="field"><label for="f-note">یادداشت (اختیاری)</label><input id="f-note" type="text" placeholder="مثلاً: رنگِ … اگر بود"></div>' +
        '<button type="button" class="btn btn-primary btn-block" id="submitOrder">' + R.icon('sparkles') + ' ثبتِ سفارش و رفتن به پرداخت</button>' +
        '<p class="hint" id="coErr" style="color:#e8536f;display:none"></p>' +
        '<p class="hint">' + R.icon('shield') + ' اطلاعاتِ تو فقط در همین گوشی می‌ماند و همراهِ سفارش، مستقیم به دستِ فروشگاه می‌رسد.</p>' +
      '</div>';

    bindCartActions();
    document.getElementById('submitOrder').addEventListener('click', submit);
  }

  function bindCartActions() {
    document.querySelectorAll('.cart-line').forEach(function (row) {
      var i = Number(row.getAttribute('data-i'));
      var lines = Cart.items();
      var it = lines[i];
      if (!it) return;
      row.querySelectorAll('[data-act]').forEach(function (b) {
        b.addEventListener('click', function () {
          var act = b.getAttribute('data-act');
          if (act === 'plus') Cart.setQty(it.id, it.size, it.color, Number(it.qty) + 1);
          else if (act === 'minus') Cart.setQty(it.id, it.size, it.color, Number(it.qty) - 1);
          else Cart.remove(it.id, it.size, it.color);
          render();
        });
      });
    });
  }

  /* ---------- ثبتِ سفارش ---------- */
  function submit() {
    var err = document.getElementById('coErr');
    function fail(t) { err.textContent = t; err.style.display = ''; }
    err.style.display = 'none';

    var name = val('f-name'), phone = norm(val('f-phone')),
        city = val('f-city'), address = val('f-address'), note = val('f-note');
    if (!name) return fail('نام را بنویس.');
    if (!/^0\d{10}$/.test(phone)) return fail('شمارهٔ موبایل را درست بنویس (مثل ۰۹۱۲۳۴۵۶۷۸۹).');
    if (!city) return fail('شهر را بنویس.');
    if (address.length < 10) return fail('نشانیِ پستی را کامل بنویس.');

    var lines = Cart.items().map(function (it) {
      var p = products.filter(function (x) { return x.id === it.id; })[0];
      return p ? {
        id: p.id, name: p.name, price: Number(p.price),
        qty: Number(it.qty), size: it.size || '', color: it.color || ''
      } : null;
    }).filter(Boolean);
    if (!lines.length) return fail('سبد خالی است.');

    var pay = (site.payments && site.payments.cardToCard) || {};
    var code = Pay.newCode();
    var pr = Pay.pricing(lines.reduce(function (s, l) { return s + l.price * l.qty; }, 0),
                        pay.shippingFee, code);
    var hours = Number(pay.expireHours) || 6;

    var order = {
      v: 1,
      code: code,
      created: Date.now(),
      expiresAt: Date.now() + hours * 3600 * 1000,
      items: lines,
      buyer: { name: name, phone: phone, city: city, address: address, note: note },
      pricing: pr,
      status: 'created'
    };
    Pay.putMyOrder(order);
    Cart.clear();
    location.href = 'payment.html?code=' + encodeURIComponent(code);
  }

  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function norm(s) {
    return R.normDigits(String(s || '')).replace(/[^\d]/g, '')
      .replace(/^(\d{11}).*$/, '$1');
  }

  /* ---------- راه‌اندازی ---------- */
  function boot() {
    R.initTheme();
    R.bindBottomNav();
    R.registerSW();
    R.bindThemeToggle();
    R.paintIcons();
    var y = document.getElementById('year');
    if (y) y.textContent = R.fa(new Date().getFullYear());

    Promise.all([
      R.fetchJSON('data/site.json').catch(function () { return { name: 'نینا شاپ', channels: {} }; }),
      R.fetchJSON('data/products.json').catch(function () { return []; })
    ]).then(function (res) {
      site = res[0] || {}; products = res[1] || [];
      document.querySelectorAll('[data-site="name"]').forEach(function (el) { el.textContent = site.name || 'نینا شاپ'; });
      var ig = document.querySelector('[data-channel="instagram"]');
      if (ig && site.channels && site.channels.instagram) ig.href = site.channels.instagram;
      render();
      R.paintIcons();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
