/* ============================================================
   نینا شاپ — js/payments.js  (موتورِ سفارش و پرداختِ کارت به کارت)
   سایت استاتیک است؛ پس:
   - سفارش در مرورگرِ مشتری ساخته و نگه‌داری می‌شود
   - «کدِ سفارش» بارِ دادهٔ سفارش است و با واتساپ/تلگرام به فروشگاه می‌رسد
   - وضعیتِ نهایی توسطِ فروشگاه در ریپو منتشر می‌شود و همین‌جا خوانده می‌شود
   - مبلغِ پرداختِ هر سفارش یک رقمِ کوچکِ یکتا اضافه دارد تا تطبیقِ
     واریزی‌ها خودکار و بدونِ اشتباه شود (طرحِ «مبلغِ انگشت‌نگار»)
   ساختارِ آداپتوری است: بعداً درگاهِ شاپرک بدونِ بازنویسیِ این قرارداد
   به‌جایِ کارت به کارت می‌نشیند (همان createOrder/verify/status).
   ============================================================ */
(function () {
  'use strict';
  var R = window.Nina;
  var K_ORDERS = 'nina_v1_orders';      /* سفارش‌هایِ مشتری */
  var PREFIX = 'NINA1.';                /* نسخهٔ قالبِ کدِ سفارش */

  /* ---------- وضعیت‌ها ---------- */
  var STATUS = {
    created:   { fa: 'در انتظارِ پرداخت', cls: 'st-wait' },
    sent:      { fa: 'پرداخت شد — در انتظارِ بررسی', cls: 'st-wait' },
    paid:      { fa: 'تأیید شد ✓', cls: 'st-ok' },
    shipped:   { fa: 'ارسال شد', cls: 'st-ok' },
    mismatch:  { fa: 'مغایرت — تماسِ فروشگاه', cls: 'st-warn' },
    rejected:  { fa: 'رد شد', cls: 'st-bad' },
    expired:   { fa: 'منقضی شد', cls: 'st-bad' }
  };

  /* ---------- کدِ سفارش: کوتاه و خوانا، مثل N-7K3Q9D ---------- */
  var ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; /* بدونِ حروفِ گیج‌کننده */
  function newCode() {
    var t = Date.now().toString(36).toUpperCase().slice(-4);
    var r = '';
    for (var i = 0; i < 3; i++) r += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return 'N-' + r + t;
  }

  function hash(s) {
    var h = 5381;
    s = String(s);
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h;
  }

  /* ---------- مبلغِ انگشت‌نگار: ۱ تا ۹۷ تومانِ یکتا رویِ جمع ----------
     دو سفارشِ همزمان هرگز مبلغِ برابر ندارند؛ فروشگاه با دیدنِ رقمِ آخر،
     واریزی را بی‌درنگ به سفارشِ درست می‌شناسد. */
  function uniqueOffset(code) { return 1 + (hash(code) % 97); }

  function pricing(itemsTotal, shippingFee, code) {
    var off = uniqueOffset(code);
    return {
      itemsTotal: Number(itemsTotal) || 0,
      shipping: Number(shippingFee) || 0,
      offset: off,
      payAmount: (Number(itemsTotal) || 0) + (Number(shippingFee) || 0) + off
    };
  }

  /* ---------- کدِ حاملِ سفارش (payload) ----------
     کلِ سفارش در یک رشته فشرده می‌شود؛ مشتری آن را با پیامِ واتساپ
     می‌فرستد و پنلِ فروشگاه آن را می‌خواند. */
  function b64urlEncode(obj) {
    var json = JSON.stringify(obj);
    var utf8 = new TextEncoder().encode(json);
    var bin = '';
    utf8.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlDecode(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function encodePayload(order) {
    return PREFIX + b64urlEncode(order);
  }
  /* کد را از دلِ متنِ واتساپ هم بیرون می‌کشد */
  function extractPayload(text) {
    var m = String(text || '').match(/NINA1\.[A-Za-z0-9\-_]+/);
    return m ? m[0] : '';
  }
  function decodePayload(text) {
    var p = extractPayload(text);
    if (!p) throw new Error('کدِ سفارش در متن پیدا نشد.');
    var o = b64urlDecode(p.slice(PREFIX.length));
    if (!o || !o.code || !Array.isArray(o.items)) throw new Error('ساختارِ کدِ سفارش معتبر نیست.');
    return o;
  }

  /* ---------- ذخیرهٔ سفارش‌هایِ مشتری ---------- */
  function myOrders() {
    try {
      var raw = JSON.parse(localStorage.getItem(K_ORDERS) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }
  function saveMyOrders(list) {
    try { localStorage.setItem(K_ORDERS, JSON.stringify(list)); } catch (e) {}
  }
  function putMyOrder(o) {
    var list = myOrders();
    var i = list.findIndex(function (x) { return x.code === o.code; });
    if (i > -1) list[i] = o; else list.unshift(o);
    /* بیش از ۳۰ سفارشِ کهنه را نگه نمی‌داریم */
    saveMyOrders(list.slice(0, 30));
  }
  function myOrderByCode(code) {
    return myOrders().filter(function (x) { return x.code === code; })[0] || null;
  }

  /* ---------- انقضا ---------- */
  function isExpired(o) {
    return o && o.expiresAt && Date.now() > Number(o.expiresAt) &&
      o.status !== 'paid' && o.status !== 'shipped';
  }

  /* ---------- پیامِ واتساپِ «پرداخت کردم» ---------- */
  function paidMessage(o, site) {
    var msg = 'سلام! سفارشِ ' + o.code + ' را کارت به کارت پرداخت کردم.' +
      '\nمبلغ: ' + R.faG(o.pricing.payAmount) + ' تومان' +
      '\nکدِ سفارش برایِ ثبت در پنل:' +
      '\n' + encodePayload(o);
    return R.rtlFix(msg);
  }
  function shopWhatsApp(site) {
    return (site && site.channels && site.channels.whatsapp) ||
           (site && site.channels && site.channels.telegram) || '#';
  }

  /* ---------- وضعیتِ منتشرشده در ریپو ---------- */
  function fetchRemoteStatus(code) {
    return R.fetchJSON('data/order-status/' + encodeURIComponent(code) + '.json')
      .then(function (j) { return j && j.status ? j : null; })
      .catch(function () { return null; });
  }

  window.Nina.Pay = {
    STATUS: STATUS,
    statusLabel: function (s) { return (STATUS[s] || STATUS.created).fa; },
    statusClass: function (s) { return (STATUS[s] || STATUS.created).cls; },
    newCode: newCode,
    pricing: pricing,
    uniqueOffset: uniqueOffset,
    encodePayload: encodePayload,
    decodePayload: decodePayload,
    extractPayload: extractPayload,
    myOrders: myOrders,
    putMyOrder: putMyOrder,
    myOrderByCode: myOrderByCode,
    isExpired: isExpired,
    paidMessage: paidMessage,
    shopWhatsApp: shopWhatsApp,
    fetchRemoteStatus: fetchRemoteStatus
  };
})();
