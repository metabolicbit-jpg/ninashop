/* ============================================================
   نینا شاپ — js/payment.js  (صفحهٔ پرداختِ کارت به کارت + پیگیری)
   دو کار: راهنمایِ پرداختِ سفارشِ فعال، و فهرستِ «سفارش‌هایِ من».
   وضعیتِ نهایی از فایلِ منتشرشدهٔ ریپو خوانده می‌شود (هر ۳۰ ثانیه).
   ============================================================ */
(function () {
  'use strict';
  var R = window.Nina, Pay = R.Pay;
  var site = null;
  var timer = null, poll = null;
  var leavingForWa = null;

  /* ترکِ واقعیِ صفحه (رفتن به واتساپ) → وضعیتِ «پرداخت شد» */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden || !leavingForWa) return;    var o = Pay.myOrderByCode(leavingForWa);
    if (o && o.status === 'created') { o.status = 'sent'; Pay.putMyOrder(o); }
    leavingForWa = null;
  });

  function esc(s) { return R.esc(s); }

  function payCfg() {
    return (site.payments && site.payments.cardToCard) || {};
  }

  /* ---------- کپی در حافظه ---------- */
  function copyText(t, btn) {
    function done() {
      if (!btn) return;
      var old = btn.innerHTML;
      btn.innerHTML = R.icon('check') + ' کپی شد';
      btn.classList.add('copied');
      setTimeout(function () { btn.innerHTML = old; btn.classList.remove('copied'); R.paintIcons(); }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done, function () { legacy(); });
    } else legacy();
    function legacy() {
      var ta = document.createElement('textarea');
      ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  /* ---------- باکسِ رهگیریِ مرسولهٔ پستی ---------- */
  function trackHTML(o) {
    if (!o.tracking) return '';
    return '<div class="track-box">' +
        '<div class="track-head">' + R.icon('box') + ' رهگیریِ مرسولهٔ پستی</div>' +
        '<div class="track-row"><b class="track-code" dir="ltr">' + esc(o.tracking) + '</b>' +
          '<button type="button" class="copy-btn" data-copy="' + esc(o.tracking) + '">' + R.icon('copy') + ' کپیِ کد</button></div>' +
        '<a class="btn btn-primary btn-block" target="_blank" rel="noopener" href="https://www.post.ir/">' + R.icon('truck') + ' پیگیری در سایتِ پست</a>' +
        '<p class="hint">کد را کپی کن و در سایتِ پست، در کادرِ «رهگیریِ مرسوله» بچسبان تا مسیرِ بسته‌ات را ببینی.</p>' +
      '</div>';
  }

  /* ---------- شمارشِ معکوس ---------- */
  function countdown(expiresAt, el) {
    function paint() {
      if (!el) return;
      var left = Number(expiresAt) - Date.now();
      if (left <= 0) { el.innerHTML = R.icon('clock') + ' مهلتِ این سفارش تمام شد'; el.classList.add('over'); if (timer) clearInterval(timer); return; }
      var h = Math.floor(left / 3600000), m = Math.floor(left % 3600000 / 60000), s = Math.floor(left % 60000 / 1000);
      el.innerHTML = R.icon('clock') + ' مهلتِ پرداخت: ' +
        R.fa(String(h).padStart(2, '0')) + ':' + R.fa(String(m).padStart(2, '0')) + ':' + R.fa(String(s).padStart(2, '0'));
    }
    paint();
    timer = setInterval(paint, 1000);
  }

  /* ---------- نمایِ سفارشِ فعال ---------- */
  function renderOrder(o) {
    var box = document.getElementById('payBox');
    var cfg = payCfg();
    var st = o.status;

    /* اگر فروشگاه وضعیت یا کدِ رهگیری را منتشر کرده، همان حرفِ آخر است */
    Pay.fetchRemoteStatus(o.code).then(function (remote) {
      if (remote && ((remote.status && remote.status !== o.status) ||
                     (remote.tracking && remote.tracking !== o.tracking))) {
        if (remote.status) o.status = remote.status;
        o.remoteNote = remote.note || '';
        if (remote.tracking) o.tracking = remote.tracking;
        Pay.putMyOrder(o);
        renderOrder(o);
        return;
      }
      if (Pay.isExpired(o) && (st === 'created' || st === 'sent')) {
        o.status = 'expired'; Pay.putMyOrder(o); renderOrder(o); return;
      }
      paintOrder(o, cfg);
    });
  }

  function paintOrder(o, cfg) {
    var box = document.getElementById('payBox');
    var st = o.status;

    /* وضعیت‌هایِ بسته: دیگر صفحهٔ پرداخت نمی‌خواهند */
    if (st === 'paid' || st === 'shipped') {
      box.innerHTML =
        '<div class="panel-card pay-done">' +
          '<div class="done-mark">' + R.icon('check') + '</div>' +
          '<h3>سفارشِ ' + esc(o.code) + ' ' + Pay.statusLabel(st) + '</h3>' +
          (o.remoteNote ? '<p class="hint">' + esc(o.remoteNote) + '</p>' : '') +
          (st === 'shipped'
            ? '<p class="hint">جزئیاتِ ارسال همین‌جاست؛ با کدِ رهگیری، مرسوله‌ات را دنبال کن. ممنون که به بوتیکِ کوچکِ ما اعتماد کردی 🌸</p>'
            : '<p class="hint">ممنون که به بوتیکِ کوچکِ ما اعتماد کردی 🌸 به‌محضِ ارسال، کدِ رهگیریِ پست همین‌جا می‌آید.</p>') +
          trackHTML(o) +
          '<a class="btn btn-ghost" href="./">' + R.icon('sparkles') + ' بازگشت به فروشگاه</a>' +
        '</div>' + myOrdersHTML(o.code);
      bindCopy();
      bindMyOrders();
      R.paintIcons();
      stopPolling();
      return;
    }
    if (st === 'expired' || st === 'rejected') {
      box.innerHTML =
        '<div class="panel-card pay-closed">' +
          '<h3>' + R.icon('info') + ' سفارشِ ' + esc(o.code) + ' ' + Pay.statusLabel(st) + '</h3>' +
          (st === 'rejected' && o.remoteNote ? '<p class="hint">' + esc(o.remoteNote) + '</p>' : '') +
          '<p class="hint">' + (st === 'expired'
            ? 'اگر پرداخت کرده‌ای، با فروشگاه در واتساپ بگو تا سفارش را دوباره فعال کند.'
            : 'برایِ روشِ بعدی با فروشگاه در واتساپ صحبت کن.') + '</p>' +
          '<a class="btn btn-primary" target="_blank" rel="noopener" href="' + esc(Pay.shopWhatsApp(site)) + '">' + R.icon('whatsapp') + ' گفتگو با فروشگاه</a>' +
        '</div>' + myOrdersHTML(o.code);
      bindMyOrders();
      R.paintIcons();
      stopPolling();
      return;
    }

    /* وضعیت‌هایِ زنده: created / sent / mismatch */
    var cardNum = String(cfg.cardNumber || '');
    var hasCard = cardNum.replace(/\D/g, '').length >= 16;
    var grouped = hasCard
      ? R.fa(cardNum.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 '))
      : '—';
    var payMsg = Pay.paidMessage(o, site);
    var wa = Pay.shopWhatsApp(site);

    box.innerHTML =
      '<div class="panel-card pay-card">' +
        '<div class="pay-code-row"><span class="pay-code">' + esc(o.code) + '</span>' +
          '<button type="button" class="copy-btn copy-code-btn" data-copy="' + esc(Pay.encodePayload(o)) + '" title="کدِ کاملِ سفارش برایِ چسباندن در پنل">' + R.icon('copy') + ' کدِ پنل</button>' +
          '<span class="status-chip ' + Pay.statusClass(st) + '">' + Pay.statusLabel(st) + '</span></div>' +
        '<div class="amount-box">' +
          '<span class="amount-label">مبلغِ دقیقِ کارت به کارت</span>' +
          '<div class="amount-row"><b class="amount">' + R.faG(o.pricing.payAmount) + '</b><span>تومان</span>' +
            '<button type="button" class="copy-btn" data-copy="' + R.normDigits(String(o.pricing.payAmount)) + '">' + R.icon('copy') + ' کپی</button></div>' +
          '<p class="hint">' + R.icon('info') + ' «مبلغِ دقیقاً همین» بفرست — رقمِ آخرِ یکتا، واریزی‌ات را خودکار به سفارشِ ' + esc(o.code) + ' می‌رساند. مبلغِ گرد یا متفاوت، تأیید را کند می‌کند.</p>' +
        '</div>' +
        (hasCard
          ? '<div class="card-box">' +
              '<div class="card-box-head">' + R.icon('credit-card') + ' کارتِ ' + esc(cfg.bank || 'فروشگاه') + '</div>' +
              '<div class="card-num-row"><b class="card-num" dir="ltr">' + grouped + '</b>' +
                '<button type="button" class="copy-btn" data-copy="' + R.normDigits(cardNum.replace(/\D/g, '')) + '">' + R.icon('copy') + ' کپیِ شماره</button></div>' +
              '<p class="hint">به نامِ ' + esc(cfg.cardHolder || 'فروشگاه') + ' — کارت به کارت در اپِ بانکیِ خودت</p>' +
            '</div>'
          : '<div class="card-box">' +
              '<div class="card-box-head">' + R.icon('info') + ' کارتِ فروشگاه هنوز ثبت نشده</div>' +
              '<p class="hint">برایِ پرداخت، با فروشگاه در واتساپ هماهنگ کن.</p>' +
            '</div>') +
        '<div class="countdown" id="cdBox"></div>' +
        '<ol class="pay-steps">' +
          '<li>مبلغِ دقیق را با اپِ بانکی کارت به کارت کن.</li>' +
          '<li>اسکرین‌شاتِ رسید را نگه دار.</li>' +
          '<li>دکمهٔ زیر را بزن و پیامِ آماده را بفرست؛ رسید را هم همان‌جا بفرست.</li>' +
        '</ol>' +
        trackHTML(o) +
        '<a class="btn btn-primary btn-block" id="paidBtn" target="_blank" rel="noopener" href="' +
          (wa.indexOf('wa.me') > -1 ? wa + '?text=' + encodeURIComponent(payMsg) : wa) + '">' +
          R.icon('whatsapp') + '<span class="btn-2l"><span>پرداخت کردم</span><span>اعلام به فروشگاه</span></span></a>' +
        '<p class="hint">پیامِ آماده، کدِ سفارش و مبلغ را هم دارد؛ فروشگاه با همان، سفارشت را در پنل ثبت و تأیید می‌کند.</p>' +
        (st === 'mismatch' && o.remoteNote ? '<p class="hint warn-hint">' + esc(o.remoteNote) + '</p>' : '') +
      '</div>' + myOrdersHTML(o.code);

    countdown(o.expiresAt, document.getElementById('cdBox'));
    bindCopy();
    bindMyOrders();
    var pb = document.getElementById('paidBtn');
    if (pb) pb.addEventListener('click', function () {
      /* وضعیت فقط وقتی عوض می‌شود که صفحه واقعاً ترک شود (رفتن به واتساپ)؛
         کلیکِ خالی و برگشتن، سفارش را «پرداخت‌شده» نشان نمی‌دهد */
      leavingForWa = o.code;
    });
    R.paintIcons();
    startPolling(o.code);
  }

  /* ---------- فهرستِ سفارش‌هایِ من ---------- */
  function myOrdersHTML(activeCode) {
    var list = Pay.myOrders();
    if (!list.length) return '';
    var rows = list.map(function (o) {
      var n = o.items.reduce(function (s, it) { return s + Number(it.qty); }, 0);
      return '<a class="my-order' + (o.code === activeCode ? ' active' : '') + '" href="payment.html?code=' + encodeURIComponent(o.code) + '">' +
        '<b>' + esc(o.code) + '</b>' +
        '<span>' + R.fa(n) + ' کالا · ' + R.faG(o.pricing.payAmount) + ' تومان</span>' +
        '<span class="status-chip ' + Pay.statusClass(o.status) + '">' + Pay.statusLabel(o.status) + '</span>' +
      '</a>';
    }).join('');
    return '<div class="panel-card"><h3>' + R.icon('bag') + ' سفارش‌هایِ من</h3><div class="my-orders">' + rows + '</div></div>';
  }

  function bindMyOrders() {}
  function bindCopy() {
    document.querySelectorAll('.copy-btn').forEach(function (b) {
      b.addEventListener('click', function () { copyText(b.getAttribute('data-copy') || '', b); });
    });
  }

  /* ---------- نظرسنجیِ وضعیتِ منتشرشده ---------- */
  function startPolling(code) {
    stopPolling();
    poll = setInterval(function () {
      if (document.hidden) return;
      var o = Pay.myOrderByCode(code);
      if (!o) { stopPolling(); return; }
      Pay.fetchRemoteStatus(code).then(function (remote) {
        if (remote && ((remote.status && remote.status !== o.status) ||
                       (remote.tracking && remote.tracking !== o.tracking))) {
          if (remote.status) o.status = remote.status;
          o.remoteNote = remote.note || '';
          if (remote.tracking) o.tracking = remote.tracking;
          Pay.putMyOrder(o); renderOrder(o);
        }
      });
    }, 30000);
  }
  function stopPolling() { if (poll) { clearInterval(poll); poll = null; } }

  /* ---------- نمایِ فهرست (بدونِ ?code) ---------- */
  function renderList() {
    var box = document.getElementById('payBox');
    var list = Pay.myOrders();
    if (!list.length) {
      box.innerHTML =
        '<div class="panel-card">' +
          '<h3>' + R.icon('bag') + ' هنوز سفارشی نداری</h3>' +
          '<p class="hint">وقتی سفارشِ ثبت کنی، صفحهٔ پرداخت و پیگیری‌اش این‌جا می‌آید.</p>' +
          '<a class="btn btn-primary" href="./#products">' + R.icon('shirt') + ' رفتن به محصولات</a>' +
        '</div>';
      return;
    }
    box.innerHTML = list.map(function (o) { return '<div data-code="' + esc(o.code) + '"></div>'; }).join('') || '';
    /* هر سفارش را با وضعیتِ تازه می‌سازیم؛ فقط اولی کامل رندر می‌شود */
    var first = list[0];
    location.replace('payment.html?code=' + encodeURIComponent(first.code));
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

    R.fetchJSON('data/site.json').catch(function () { return { name: 'نینا شاپ', channels: {} }; })
      .then(function (s) {
        site = s || {};
        document.querySelectorAll('[data-site="name"]').forEach(function (el) { el.textContent = site.name || 'نینا شاپ'; });
        var ig = document.querySelector('[data-channel="instagram"]');
        if (ig && site.channels && site.channels.instagram) ig.href = site.channels.instagram;

        var code = new URLSearchParams(location.search).get('code');
        if (code) {
          var o = Pay.myOrderByCode(code);
          if (!o) {
            document.getElementById('payBox').innerHTML =
              '<div class="panel-card"><h3>' + R.icon('info') + ' سفارش در این مرورگر پیدا نشد</h3>' +
              '<p class="hint">سفارش‌ها فقط در گوشیِ خودت ذخیره می‌شوند؛ اگر همین‌جا سفارش دادی، از فهرستِ پایین انتخاب کن.</p></div>' +
              myOrdersHTML('');
          } else renderOrder(o);
        } else renderList();
        R.paintIcons();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
