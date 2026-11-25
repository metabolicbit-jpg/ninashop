/* ============================================================
   نینا شاپ — js/faq.js  (پرسش‌هایِ پرتکرار + اسکیمای FAQPage)
   ============================================================ */
(function () {
  'use strict';
  var R = window.Nina;

  function boot() {
    R.initTheme();
    R.bindBottomNav();
    R.registerSW();
    R.bindThemeToggle();
    R.paintIcons();
    var y = document.getElementById('year');
    if (y) y.textContent = R.fa(new Date().getFullYear());

    Promise.all([
      R.fetchJSON('data/site.json').catch(function () { return { name: 'نینا شاپ', domain: '' }; }),
      R.fetchJSON('data/faq.json').catch(function () { return []; })
    ]).then(function (res) {
      var site = res[0] || {}, faq = res[1] || [];
      document.querySelectorAll('[data-site="name"]').forEach(function (el) { el.textContent = site.name || 'نینا شاپ'; });
      var box = document.getElementById('faqList');
      if (!box) return;
      if (!faq.length) {
        box.innerHTML = '<p class="hint">هنوز پرسشی ثبت نشده است.</p>';
        return;
      }
      box.innerHTML = faq.map(function (f) {
        return '<details class="faq-item reveal">' +
          '<summary>' + R.esc(f.q) + '<i data-ic="chevron-left"></i></summary>' +
          '<p>' + R.esc(f.a) + '</p>' +
        '</details>';
      }).join('');
      R.paintIcons();
      if (R.bindReveal) R.bindReveal();

      /* اسکیمای FAQPage برایِ نتیجهٔ غنیِ گوگل */
      var domain = (site.domain || '').replace(/\/$/, '');
      var ld = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': faq.map(function (f) {
          return {
            '@type': 'Question',
            'name': f.q,
            'acceptedAnswer': { '@type': 'Answer', 'text': f.a }
          };
        })
      };
      var s = document.createElement('script');
      s.type = 'application/ld+json';
      s.textContent = JSON.stringify(ld);
      document.head.appendChild(s);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
