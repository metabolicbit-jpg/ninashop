/* ============================================================
   نینا شاپ — js/account.js  (پنلِ کاربریِ مشتری)
   سفارش‌هایِ من، خریدهایِ نیمه‌تمام، سبدِ نیمه‌تمام،
   علاقه‌مندی‌ها و کیفِ پول — همه از همین مرورگر (localStorage).
   پس از مهاجرت به کلودفلر، همین صفحه با ورودِ شمارهٔ موبایل
   به دیتابیس وصل می‌شود و رویِ همهٔ دستگاه‌ها یکی می‌شود.
   ============================================================ */
(function () {
  'use strict';
  var R = window.Nina, Pay = R.Pay, Cart = R.Cart;
  var products = [];

  function esc(s) { return R.esc(s); }
  function prod(id) {
    for (var i = 0; i < products.length; i++) if (products[i].id === id) return products[i];
    return null;
  }
  function chip(st) {
    return '<span class="status-chip ' + Pay.statusClass(st) + '">' + Pay.statusLabel(st) + '</span>';
  }

  /* ---------- ردیفِ سفارش ---------- */
  function orderRow(o, unfinished) {
    var n = o.items.reduce(function (s, it) { return s + Number(it.qty); }, 0);
    var d = new Date(o.created).toLocaleDateString('fa-IR');
    var tk = o.tracking
      ? '<span class="acc-track" title="کدِ رهگیریِ پست" dir="ltr">' + R.icon('box') + ' ' + esc(o.tracking) + '</span>'
      : '';
    var cta = unfinished
      ? '<span class="acc-cta">ادامهٔ پرداخت ' + R.icon('arrow-left') + '</span>'
      : '';
    return '<a class="acc-order' + (unfinished ? ' unfinished' : '') + '" href="payment.html?code=' + encodeURIComponent(o.code) + '">' +
        '<div class="ao-top"><b>' + esc(o.code) + '</b>' + chip(o.status) + '</div>' +
        '<div class="ao-mid">' + R.fa(n) + ' کالا · ' + R.faG(o.pricing.payAmount) + ' تومان · ' + R.fa(d) + tk + '</div>' +
        cta +
      '</a>';
  }

  /* ---------- بخش‌ها ---------- */
  function unfinishedHTML(list) {
    var act = list.filter(function (o) { return o.status === 'created' || o.status === 'sent'; });
    var dead = list.filter(function (o) { return o.status === 'expired' || o.status === 'rejected' || o.status === 'mismatch'; });
    if (!act.length && !dead.length) return '';
    var h = '<div class="panel-card"><h3>' + R.icon('clock') + ' خریدهایِ نیمه‌تمام</h3>';
    if (act.length) h += act.map(function (o) { return orderRow(o, true); }).join('');
    if (dead.length) {
      h += '<p class="hint">سفارش‌هایی که نهایی نشدند:</p>' + dead.map(function (o) { return orderRow(o, false); }).join('');
    }
    return h + '</div>';
  }

  function ordersHTML(list) {
    if (!list.length) {
      return '<div class="panel-card"><h3>' + R.icon('bag') + ' سفارش‌هایِ من</h3>' +
        '<p class="hint">هنوز سفارشی نداری. اولین خریدت را شروع کن 🌸</p>' +
        '<a class="btn btn-primary" href="category.html">' + R.icon('shirt') + ' دیدنِ محصولات</a></div>';
    }
    return '<div class="panel-card"><h3>' + R.icon('bag') + ' سفارش‌هایِ من</h3>' +
      list.map(function (o) { return orderRow(o, false); }).join('') + '</div>';
  }

  function cartHTML() {
    var items = Cart.items();
    if (!items.length) return '';
    var rows = items.map(function (l) {
      var p = prod(l.id);
      var name = p ? p.name : l.id;
      var price = p ? p.price : 0;
      return '<a class="acc-cart-line" href="product.html?id=' + encodeURIComponent(l.id) + '">' +
          '<b>' + esc(name) + '</b>' +
          '<span>' + R.fa(l.qty) + ' عدد' + (l.size ? ' · سایزِ ' + esc(l.size) : '') + (l.color ? ' · ' + esc(l.color) : '') + '</span>' +
          '<span class="acc-price">' + R.faG(price * l.qty) + ' تومان</span>' +
        '</a>';
    }).join('');
    return '<div class="panel-card"><h3>' + R.icon('cart') + ' سبدِ نیمه‌تمام</h3>' + rows +
      '<a class="btn btn-primary btn-block" href="checkout.html">' + R.icon('credit-card') + ' ادامهٔ خرید</a></div>';
  }

  function wishHTML() {
    var ids = R.wishGet();
    if (!ids.length) return '';
    var rows = ids.map(function (id) {
      var p = prod(id);
      return '<a class="acc-cart-line" href="product.html?id=' + encodeURIComponent(id) + '">' +
          '<b>' + esc(p ? p.name : id) + '</b>' +
          (p ? '<span class="acc-price">' + R.faG(p.price) + ' تومان</span>' : '') +
        '</a>';
    }).join('');
    return '<div class="panel-card"><h3>' + R.icon('heart') + ' علاقه‌مندی‌ها</h3>' + rows +
      '<a class="btn btn-ghost btn-block" href="wishlist.html">' + R.icon('heart') + ' صفحهٔ علاقه‌مندی‌ها</a></div>';
  }

  function walletHTML() {
    return '<div class="panel-card wallet-card"><h3>' + R.icon('wallet') + ' کیفِ پول</h3>' +
      '<div class="wallet-locked">' + R.icon('clock') +
        '<p>کیفِ پول با اتصالِ دامنه و راه‌اندازیِ کلودفلر فعال می‌شود؛ آن‌گاه موجودی، برگشتِ وجه و اعتبارِ هدیه واقعی می‌شود.</p>' +
      '</div></div>';
  }

  /* ---------- رندرِ کامل ---------- */
  function render() {
    var box = document.getElementById('accountBox');
    var list = Pay.myOrders();
    var name = list.length && list[0].buyer && list[0].buyer.name ? list[0].buyer.name : '';
    var greet = name ? 'سلام، ' + esc(name) + ' 🌸' : 'سلام 🌸';
    var sub = list.length
      ? 'همه‌چیزِ خریدهایت همین‌جاست — سفارش‌ها فقط در گوشیِ خودت ذخیره می‌شوند.'
      : 'سفارش‌ها فقط در گوشیِ خودت ذخیره می‌شوند؛ همین‌جا اولین خریدت را شروع کن.';

    box.innerHTML =
      '<div class="panel-card acc-greet"><h3>' + R.icon('user') + ' ' + greet + '</h3><p class="hint">' + sub + '</p></div>' +
      unfinishedHTML(list) +
      ordersHTML(list) +
      cartHTML() +
      wishHTML() +
      walletHTML() +
      '<p class="hint acc-privacy">' + R.icon('info') + ' این پنل بدونِ حسابِ کاربری کار می‌کند: داده‌هایت فقط در همین مرورگر است و به جایی فرستاده نمی‌شود. پس از اتصالِ دامنه، ورود با شمارهٔ موبایل همهٔ دستگاه‌هایت را یکی می‌کند.</p>';
    R.paintIcons();
  }

  function boot() {
    R.initTheme();
    R.bindBottomNav();
    R.registerSW();
    R.bindThemeToggle();
    R.paintIcons();
    var y = document.getElementById('year');
    if (y) y.textContent = R.fa(new Date().getFullYear());
    document.querySelectorAll('[data-site="name"]').forEach(function (el) { el.textContent = 'نینا شاپ'; });

    R.fetchJSON('data/products.json').catch(function () { return []; }).then(function (ps) {
      products = ps || [];
      render();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
