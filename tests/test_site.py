# آزمونِ مرورگریِ نینا شاپ — کنسولِ بی‌خطا، رندرِ کامل، هر دو پوسته، موبایل و دسکتاپ
import json, sys
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8901'
results = []
console_errors = []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))

with sync_playwright() as p:
    browser = p.chromium.launch()

    # ---------- دسکتاپ، روز ----------
    pg = browser.new_page(viewport={'width': 1280, 'height': 900})
    pg.on('console', lambda m: console_errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: console_errors.append(str(e)))
    pg.goto(BASE + '/', wait_until='networkidle')
    pg.wait_for_timeout(600)

    check('خانه: عنوان درست است', 'نینا شاپ' in pg.title())
    check('خانه: h1 هست', pg.locator('h1').count() == 1)
    cards = pg.locator('#productGrid .card').count()
    check('خانه: ۹ کارتِ محصول رندر شد', cards == 9, f'دریافتی: {cards}')
    slides = pg.locator('#tTrack .slide').count()
    check('خانه: ۳ اسلایدِ نظر', slides == 3, f'دریافتی: {slides}')
    check('خانه: ارقامِ قیمت فارسی‌اند', '۱۸۹٬۰۰۰' in pg.locator('#productGrid').inner_text())
    check('خانه: کانالِ واتساپ وصل است', 'wa.me' in (pg.locator('.footer [data-channel="whatsapp"]').get_attribute('href') or ''))
    check('خانه: اسکیما هست', pg.locator('script[type="application/ld+json"]').count() >= 1)
    check('خانه: ناوبریِ پایین در دسکتاپ مخفی است', not pg.locator('.bottom-nav').is_visible())
    check('خانه: لینکِ وبلاگ در منو', pg.locator('.nav a[href="blog.html"]').count() == 1)
    check('خانه: لینکِ پرسش‌ها در منو', pg.locator('.nav a[href="faq.html"]').count() == 1)
    # درباره: فاصله از دیواره‌ها
    mg = pg.evaluate("""() => { const s = getComputedStyle(document.querySelector('.about-strip'));
      return { l: parseFloat(s.marginLeft), r: parseFloat(s.marginRight) }; }""")
    check('خانه: «درباره» از دیواره فاصله دارد (≥۳px)', mg['l'] >= 3 and mg['r'] >= 3, str(mg))
    # کارت‌هایِ آبشاریِ نقل‌قول: پشتِ اسلایدر، ثابت
    deck = pg.evaluate("""() => { const s = getComputedStyle(document.querySelector('.slider'), '::before');
      return s.content !== 'none' && s.content !== ''; }""")
    check('خانه: کارتِ پشتِ نقل‌قول (آبشاری) هست', deck)
    check('خانه: کارتِ جلو دیگر شبه‌عنصرِ متحرک ندارد', pg.evaluate(
      "getComputedStyle(document.querySelector('.t-card'), '::before').content") in ('none', '""', 'normal'))
    # گرافیکِ پارچه‌ای روی کاورها
    arts = pg.locator('#productGrid svg.art').count()
    check('خانه: گرافیکِ پارچه‌ای روی کارت‌ها', arts >= 5, f'دریافتی: {arts}')
    pg.screenshot(path='/tmp/shot-home-desktop-day.png', full_page=True)

    # پوستهٔ شب
    pg.click('.theme-btn')
    pg.wait_for_timeout(300)
    check('خانه: پوستهٔ شب اعمال شد', pg.get_attribute('html', 'data-theme') == 'night')
    bg = pg.evaluate("getComputedStyle(document.body).backgroundColor")
    check('خانه: پس‌زمینهٔ شب واقعاً تیره است', bg not in ('rgb(255, 248, 246)',), bg)
    pg.screenshot(path='/tmp/shot-home-desktop-night.png', full_page=True)

    # اسلایدر: کلیکِ نقطهٔ دوم
    pg.click('#tDots button:nth-child(2)')
    pg.wait_for_timeout(800)
    tr = pg.evaluate("document.getElementById('tTrack').style.transform")
    check('خانه: اسلایدر به اسلایدِ دوم رفت', '100%' in tr, tr)
    # کارت‌هایِ پشت هنگامِ لغزش ثابت می‌مانند
    t_before = pg.evaluate("getComputedStyle(document.querySelector('.slider'), '::before').transform")
    pg.click('#tDots button:nth-child(1)')
    pg.wait_for_timeout(500)
    t_after = pg.evaluate("getComputedStyle(document.querySelector('.slider'), '::before').transform")
    check('خانه: کارت‌هایِ پشتِ اسلایدر ثابت‌اند', t_before == t_after, f'{t_before} → {t_after}')
    # کشیدن با ماوس (شبیه‌سازیِ لمس): کشیدن به راست = اسلایدِ بعدی
    box = pg.locator('#tSlider').bounding_box()
    cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    pg.mouse.move(cx, cy); pg.mouse.down()
    for i in range(1, 13):
        pg.mouse.move(cx + i * 12, cy)
        pg.wait_for_timeout(8)
    pg.mouse.up()
    pg.wait_for_timeout(600)
    dot2 = pg.evaluate("document.querySelectorAll('#tDots button')[1].className")
    check('خانه: کشیدن به راست، اسلایدِ بعدی را می‌آورد', 'active' in dot2, dot2)
    # کشیدن به چپ = قبلی
    pg.mouse.move(cx, cy); pg.mouse.down()
    for i in range(1, 13):
        pg.mouse.move(cx - i * 12, cy)
        pg.wait_for_timeout(8)
    pg.mouse.up()
    pg.wait_for_timeout(600)
    dot1 = pg.evaluate("document.querySelectorAll('#tDots button')[0].className")
    check('خانه: کشیدن به چپ، اسلایدِ قبلی را می‌آورد', 'active' in dot1, dot1)

    # علاقه‌مندی‌ها، موجودیِ محدود، به‌زودی (روی کارت‌ها)
    pg.goto(BASE + '/', wait_until='networkidle')
    pg.wait_for_timeout(500)
    check('خانه: قلبِ علاقه‌مندی روی همهٔ کارت‌ها', pg.locator('#productGrid .wish-btn').count() == 9,
          f'دریافتی: {pg.locator("#productGrid .wish-btn").count()}')
    check('خانه: لینکِ علاقه‌مندی‌ها در سرصفحه', pg.locator('.header-actions a[href="wishlist.html"]').count() == 1)
    pg.locator('#productGrid .wish-btn').first.click()
    check('خانه: قلب با کلیک فعال می‌شود', 'active' in pg.locator('#productGrid .wish-btn').first.get_attribute('class'))
    check('خانه: نشانِ موجودیِ محدود (۲ محصول)', pg.locator('#productGrid .stock-badge').count() == 2,
          f'دریافتی: {pg.locator("#productGrid .stock-badge").count()}')
    check('خانه: محصولِ به‌زودی دکمهٔ سفارش ندارد', pg.locator('#productGrid .card-order.soon').count() == 1)
    pg.goto(BASE + '/wishlist.html', wait_until='networkidle')
    pg.wait_for_timeout(500)
    check('علاقه‌مندی: کارتِ ذخیره‌شده نمایش داده شد', pg.locator('#wishGrid .card').count() == 1,
          f'دریافتی: {pg.locator("#wishGrid .card").count()}')
    pg.locator('#wishGrid .wish-btn').first.click()
    pg.wait_for_timeout(200)
    check('علاقه‌مندی: حذف، صفحه را خالی می‌کند', 'هنوز چیزی' in pg.locator('#wishGrid').inner_text())

    # فیلترِ دسته روی صفحهٔ اصلی
    pg.goto(BASE + '/', wait_until='networkidle')
    pg.wait_for_timeout(500)
    chips = pg.locator('#catFilter .cat-chip')
    check('خانه: فیلترِ دسته با ۵ چیپ (همه + ۴ دسته)', chips.count() == 5, f'دریافتی: {chips.count()}')
    check('خانه: فیلترِ دسته دیده می‌شود', pg.locator('#catFilter').is_visible())
    pg.locator('#catFilter .cat-chip[data-cat="لوازم آرایشی"]').click()
    pg.wait_for_timeout(900)
    cos = pg.locator('#productGrid .card').count()
    check('خانه: فیلترِ آرایشی فقط ۳ کارت می‌گذارد', cos == 3, f'دریافتی: {cos}')
    # ریشهٔ باگِ قبلی: کارت‌هایِ تازه‌رندرشده باید واقعاً دیده شوند (opacity = 1)
    op = pg.evaluate("getComputedStyle(document.querySelector('#productGrid .card')).opacity")
    check('خانه: کارت‌هایِ فیلترشده محو نمی‌مانند', op == '1', f'opacity: {op}')
    check('خانه: چیپِ فعال کلاسِ active دارد', 'active' in pg.locator('#catFilter .cat-chip[data-cat="لوازم آرایشی"]').get_attribute('class'))
    check('خانه: کارتِ رژِ لب رندر شد', 'رژِ لبِ مخملیِ نینا' in pg.locator('#productGrid').inner_text())
    pg.locator('#catFilter .cat-chip[data-cat=""]').click()
    pg.wait_for_timeout(900)
    check('خانه: «همه» دوباره ۹ کارت می‌آورد', pg.locator('#productGrid .card').count() == 9)
    op2 = pg.evaluate("getComputedStyle(document.querySelector('#productGrid .card')).opacity")
    check('خانه: بعد از «همه» هم کارت‌ها دیده می‌شوند', op2 == '1', f'opacity: {op2}')
    # لینکِ دسته‌ها در فوتر
    foot = pg.locator('#footCats a')
    check('خانه: ۴ لینکِ دسته در فوتر', foot.count() == 4, f'دریافتی: {foot.count()}')
    check('خانه: لینکِ فوتر به category.html می‌رود', 'category.html?id=' in (foot.first.get_attribute('href') or ''))

    # صفحهٔ دسته: لوازم آرایشی
    import urllib.parse
    pg.goto(BASE + '/category.html?id=' + urllib.parse.quote('لوازم آرایشی'), wait_until='networkidle')
    pg.wait_for_timeout(600)
    check('دسته: عنوانِ دسته درست است', 'لوازم آرایشی' in pg.locator('#catTitle').inner_text())
    check('دسته: معرفیِ سئویی پر شده', len(pg.locator('#catIntro').inner_text().strip()) > 50)
    check('دسته: ۳ کارتِ آرایشی', pg.locator('#catGrid .card').count() == 3,
          f'دریافتی: {pg.locator("#catGrid .card").count()}')
    check('دسته: مسیرِ راهنما (breadcrumb) هست', 'خانه' in pg.locator('#crumbs').inner_text())
    lds = pg.evaluate("() => Array.from(document.querySelectorAll('script[type=\"application/ld+json\"]')).map(s => s.textContent)")
    ld_all = ' '.join(lds)
    check('دسته: اسکیمای ItemList هست', '"ItemList"' in ld_all)
    check('دسته: اسکیمای BreadcrumbList هست', '"BreadcrumbList"' in ld_all)
    check('دسته: هر ۳ محصول در ItemList', ld_all.count('"ListItem"') >= 5, str(ld_all.count('"ListItem"')))
    check('دسته: عنوانِ صفحه دسته را می‌گیرد', 'لوازم آرایشی' in pg.title())
    pg.screenshot(path='/tmp/shot-category.png', full_page=True)

    # گرافیکِ آرایشی روی کارت‌ها
    pg.goto(BASE + '/', wait_until='networkidle')
    pg.wait_for_timeout(500)
    arts_cos = pg.locator('#productGrid svg.art').count()
    check('خانه: گرافیک روی همهٔ ۹ کارت', arts_cos == 9, f'دریافتی: {arts_cos}')

    # سایت‌مپ
    pg.goto(BASE + '/sitemap.xml', wait_until='domcontentloaded')
    sm = pg.content()
    check('سایت‌مپ: صفحه‌هایِ جدید در آن', 'blog.html' in sm and 'faq.html' in sm and 'post.html' in sm)

    # ---------- PWA ----------
    import urllib.request as _ur
    man = json.loads(_ur.urlopen(BASE + '/manifest.webmanifest').read().decode('utf-8'))
    check('PWA: مانیفست معتبر است', man.get('display') == 'standalone' and man.get('short_name') == 'نینا شاپ')
    check('PWA: آیکون‌هایِ ۱۹۲ و ۵۱۲ ثبت شده‌اند',
          any('192x192' in i.get('sizes', '') for i in man['icons']) and
          any('512x512' in i.get('sizes', '') for i in man['icons']))
    ics = pg.evaluate("() => new Promise(res => { const i = new Image(); i.onload = () => res(i.naturalWidth); i.onerror = () => res(0); i.src = '/assets/icon-512.png'; })")
    check('PWA: آیکونِ ۵۱۲ واقعاً ۵۱۲ پیکسل است', ics == 512, f'دریافتی: {ics}')
    sw_ok = pg.evaluate("""() => Promise.race([
        navigator.serviceWorker.ready.then(() => true),
        new Promise(r => setTimeout(() => r(false), 4000))
      ])""")
    check('PWA: سرویس‌ورکر ثبت شد', sw_ok)
    sw_src = _ur.urlopen(BASE + '/sw.js').read().decode('utf-8')
    check('PWA: سرویس‌ورکر fetch و cache دارد', 'addEventListener(\'fetch\'' in sw_src and 'caches' in sw_src)
    pages_ok = all('manifest' in _ur.urlopen(BASE + '/' + p).read().decode('utf-8')
                   for p in ['index.html', 'category.html', 'product.html', 'wishlist.html', 'blog.html', 'post.html', 'faq.html'])
    check('PWA: همهٔ صفحه‌ها مانیفست دارند', pages_ok)
    pg.close()

    # ---------- صفحهٔ محصول ----------
    pg2 = browser.new_page(viewport={'width': 1280, 'height': 900})
    pg2.on('console', lambda m: console_errors.append(m.text) if m.type == 'error' else None)
    pg2.on('pageerror', lambda e: console_errors.append(str(e)))
    pg2.goto(BASE + '/product.html?id=short-naz', wait_until='networkidle')
    pg2.wait_for_timeout(500)
    check('محصول: عنوانِ صفحه نامِ محصول است', 'شُرتِ ناز' in pg2.title())
    check('محصول: h1 درست', 'شُرتِ ناز' in pg2.locator('h1').inner_text())
    check('محصول: اسکیمای Product تزریق شد', pg2.locator('script[type="application/ld+json"]').count() >= 1)
    ld = pg2.evaluate("Array.from(document.querySelectorAll('script[type=\"application/ld+json\"]')).map(s=>s.textContent).join()")
    check('محصول: اسکیما Product دارد', '"Product"' in ld)
    check('محصول: دکمهٔ سفارش به واتساپ', 'wa.me' in pg2.locator('.order-box .btn-primary').get_attribute('href'))
    rel = pg2.locator('#relatedGrid .card').count()
    check('محصول: ۳ محصولِ مرتبط', rel == 3, f'دریافتی: {rel}')
    # سایزها: از کوچک به بزرگ
    sizes = pg2.locator('.size-chip').all_inner_texts()
    check('محصول: سایزها مرتب‌اند (S→M→L→XL)', sizes == ['S', 'M', 'L', 'XL'], str(sizes))
    pg2.click('.size-chip:nth-child(2)')
    check('محصول: انتخابِ سایز کار می‌کند', 'selected' in pg2.locator('.size-chip:nth-child(2)').get_attribute('class'))
    # نمادِ رنگِ واقعی
    dots = pg2.locator('.color-dot').count()
    check('محصول: نمادِ رنگ برای همهٔ رنگ‌ها', dots == 3, f'دریافتی: {dots}')
    dot_bg = pg2.locator('.color-dot').first.get_attribute('style')
    check('محصول: نمادِ رنگ، رنگِ واقعی دارد', 'background' in dot_bg, dot_bg)
    # کاورِ بلندتر
    ch = pg2.evaluate("document.querySelector('.product-cover .cover').getBoundingClientRect().height")
    check('محصول: کاورِ بلند (۳۸۰px)', ch >= 370, f'{ch}px')
    check('محصول: آیکون روی کاورِ بدونِ عکس', pg2.locator('.product-cover .cover svg').count() == 1)
    check('محصول: گرافیکِ شُرت روی کاور', pg2.locator('.product-cover svg.art').count() == 1)
    # سفارشِ آماده: سایز و رنگ، پیامِ واتساپ را زنده کامل می‌کنند
    pg2.click('.size-chip:nth-child(2)')
    pg2.click('.color-chip:nth-child(1)')
    href = pg2.get_attribute('#orderWa', 'href')
    msg = pg2.evaluate("h => decodeURIComponent(h.split('?text=')[1])", href)
    check('محصول: پیامِ سفارش، نام دارد', 'شُرتِ ناز' in msg, msg)
    check('محصول: پیامِ سفارش، سایز دارد', 'سایزِ M' in msg, msg)
    check('محصول: پیامِ سفارش، رنگ دارد', 'رنگِ' in msg, msg)
    pg2.click('.color-chip:nth-child(1)')  # لغوِ انتخابِ رنگ
    msg2 = pg2.evaluate("h => decodeURIComponent(h.split('?text=')[1])", pg2.get_attribute('#orderWa', 'href'))
    check('محصول: لغوِ رنگ، پیام را تمیز می‌کند', 'رنگِ' not in msg2 and 'سایزِ M' in msg2, msg2)
    # og:image: بدونِ عکسِ محصول، تصویرِ عمومی
    og = pg2.evaluate("document.querySelector('meta[property=\"og:image\"]').content")
    check('محصول: og:image عمومی وقتی عکس نیست', og.endswith('/assets/og.jpg'), og)
    # قلبِ بزرگ و نشانِ موجودی در صفحهٔ محصول
    check('محصول: قلبِ بزرگِ علاقه‌مندی', pg2.locator('.title-row .wish-btn.big').count() == 1)
    check('محصول: نشانِ موجودیِ محدود', pg2.locator('.stock-badge.big').count() == 1)
    pg2.screenshot(path='/tmp/shot-product-desktop.png', full_page=True)
    pg2.close()

    # ---------- محصولِ به‌زودی ----------
    pg5 = browser.new_page(viewport={'width': 1280, 'height': 900})
    pg5.on('console', lambda m: console_errors.append(m.text) if m.type == 'error' else None)
    pg5.on('pageerror', lambda e: console_errors.append(str(e)))
    pg5.goto(BASE + '/product.html?id=jorab-narm', wait_until='networkidle')
    pg5.wait_for_timeout(500)
    check('به‌زودی: جعبهٔ به‌زودی جای سفارش', pg5.locator('.soon-box').count() == 1)
    check('به‌زودی: دکمهٔ واتساپ نیست', pg5.locator('#orderWa').count() == 0)
    check('به‌زودی: نشانِ به‌زودی (عنوان + جعبه)', pg5.locator('.soon-chip').count() == 2,
          f'دریافتی: {pg5.locator(".soon-chip").count()}')
    ld5 = pg5.evaluate("Array.from(document.querySelectorAll('script[type=\"application/ld+json\"]')).map(s=>s.textContent).join()")
    check('به‌زودی: اسکیمای PreOrder', 'PreOrder' in ld5)
    pg5.close()

    # ---------- وبلاگ ----------
    pg3 = browser.new_page(viewport={'width': 1280, 'height': 900})
    pg3.on('console', lambda m: console_errors.append(m.text) if m.type == 'error' else None)
    pg3.on('pageerror', lambda e: console_errors.append(str(e)))
    pg3.goto(BASE + '/blog.html', wait_until='networkidle')
    pg3.wait_for_timeout(500)
    check('وبلاگ: ۳ مقاله در فهرست', pg3.locator('#postList .post-card').count() == 3,
          f'دریافتی: {pg3.locator("#postList .post-card").count()}')
    check('وبلاگ: عنوانِ صفحه داردِ سئو', 'وبلاگ' in pg3.title())
    pg3.click('#postList .post-card:nth-child(1)')
    pg3.wait_for_timeout(500)
    check('مقاله: h1 عنوانِ مقاله است', 'راهنمای' in pg3.locator('h1').inner_text())
    check('مقاله: ۴ پاراگراف', pg3.locator('.post-page > p').count() == 4,
          f'دریافتی: {pg3.locator(".post-page > p").count()}')
    ld3 = pg3.evaluate("Array.from(document.querySelectorAll('script[type=\"application/ld+json\"]')).map(s=>s.textContent).join()")
    check('مقاله: اسکیمای Article', '"Article"' in ld3)
    check('مقاله: اسکیمای BreadcrumbList', '"BreadcrumbList"' in ld3)
    check('مقاله: جعبهٔ محصولِ پیشنهادی', pg3.locator('#postProduct .post-product').count() == 1)
    check('مقاله: og:type مقاله است', pg3.evaluate("document.querySelector('meta[property=\"og:type\"]').content") == 'article')
    pg3.screenshot(path='/tmp/shot-post-desktop.png', full_page=True)
    pg3.close()

    # ---------- پرسش‌هایِ پرتکرار ----------
    pg4 = browser.new_page(viewport={'width': 1280, 'height': 900})
    pg4.on('console', lambda m: console_errors.append(m.text) if m.type == 'error' else None)
    pg4.on('pageerror', lambda e: console_errors.append(str(e)))
    pg4.goto(BASE + '/faq.html', wait_until='networkidle')
    pg4.wait_for_timeout(500)
    check('پرسش‌ها: ۷ پرسش', pg4.locator('#faqList .faq-item').count() == 7,
          f'دریافتی: {pg4.locator("#faqList .faq-item").count()}')
    pg4.click('#faqList .faq-item:nth-child(1) summary')
    pg4.wait_for_timeout(200)
    check('پرسش‌ها: آکاردئون باز می‌شود', pg4.locator('#faqList .faq-item:nth-child(1)').get_attribute('open') is not None)
    ld4 = pg4.evaluate("Array.from(document.querySelectorAll('script[type=\"application/ld+json\"]')).map(s=>s.textContent).join()")
    check('پرسش‌ها: اسکیمای FAQPage', '"FAQPage"' in ld4)
    pg4.screenshot(path='/tmp/shot-faq-desktop.png', full_page=True)
    pg4.close()

    # ---------- موبایل ۳۹۰ ----------
    m = browser.new_page(viewport={'width': 390, 'height': 844})
    m.on('console', lambda mm: console_errors.append(mm.text) if mm.type == 'error' else None)
    m.on('pageerror', lambda e: console_errors.append(str(e)))
    m.goto(BASE + '/', wait_until='networkidle')
    m.wait_for_timeout(500)
    check('موبایل: منویِ همبرگری دیده می‌شود', m.locator('#menuBtn').is_visible())
    m.click('#menuBtn')
    m.wait_for_timeout(250)
    check('موبایل: منو باز شد', m.locator('#mobileNav').is_visible())
    m.screenshot(path='/tmp/shot-home-mobile-menu.png')
    m.click('#mobileNav a[href="./#products"]')
    m.wait_for_timeout(400)
    check('موبایل: منو بعد از کلیک بسته شد', not m.locator('#mobileNav').is_visible())
    # سرریزِ افقی؟
    overflow = m.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check('موبایل: بدونِ سرریزِ افقی', overflow <= 0, f'{overflow}px سرریز')
    # ناوبریِ پایین
    check('موبایل: ناوبریِ پایین دیده می‌شود', m.locator('.bottom-nav').is_visible())
    check('موبایل: ناوبریِ پایین ۵ لینک دارد', m.locator('.bottom-nav a').count() == 5)
    check('موبایل: «خانه» در ناوبریِ پایین فعال است', 'active' in m.locator('.bottom-nav [data-bn="home"]').get_attribute('class'))
    m.goto(BASE + '/wishlist.html', wait_until='networkidle')
    m.wait_for_timeout(300)
    check('موبایل: در صفحهٔ علاقه‌مندی‌ها، «علاقه‌مندی‌ها» فعال است', 'active' in m.locator('.bottom-nav [data-bn="wish"]').get_attribute('class'))
    ind = m.evaluate("""() => { const el = document.querySelector('.bn-ind');
      const a = document.querySelector('.bottom-nav a.active');
      return { t: el.style.transform, cx: a.offsetLeft + a.offsetWidth / 2, w: el.offsetWidth }; }""")
    check('موبایل: نشانگرِ موجی روی تبِ فعال نشسته', 'scale(1)' in ind['t'], ind['t'])
    import re as _re
    mx = float(_re.search(r'translateX\((-?[\d.]+)px\)', ind['t']).group(1))
    check('موبایل: نشانگر با تبِ فعال هم‌مرکز است', abs((mx + ind['w'] / 2) - ind['cx']) < 2, f'{mx + ind["w"]/2} vs {ind["cx"]}')
    # ریشهٔ باگِ وبلاگ/پرسش‌ها: تبِ فعال در همهٔ صفحه‌ها
    for p_, k_ in [('blog.html', 'blog'), ('faq.html', 'faq'), ('product.html?id=short-naz', None), ('post.html?id=moraghabate-labas-zirin', None)]:
        m.goto(BASE + '/' + p_, wait_until='networkidle')
        m.wait_for_timeout(400)
        r_ = m.evaluate("""() => { const el = document.querySelector('.bn-ind');
          const a = document.querySelector('.bottom-nav a.active');
          return { t: el ? el.style.transform : 'NO', a: a ? a.dataset.bn : 'NONE' }; }""")
        check(f'موبایل: ناوبری در {p_.split("?")[0]} کار می‌کند',
              r_['a'] != 'NONE' and 'scale(1)' in r_['t'], str(r_))
    m.screenshot(path='/tmp/shot-home-mobile.png', full_page=True)
    # اندازهٔ کارت: دو ستونه در ۳۹۰؟ (کلاس‌بندی: <380 تک‌ستون)
    m2 = browser.new_page(viewport={'width': 390, 'height': 844})
    m2.goto(BASE + '/product.html?id=short-roya', wait_until='networkidle')
    m2.wait_for_timeout(400)
    check('موبایلِ محصول: بدونِ سرریز', m2.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0)
    m2.screenshot(path='/tmp/shot-product-mobile.png', full_page=True)
    m2.close()

    # ---------- پنل ----------
    a = browser.new_page(viewport={'width': 390, 'height': 844})
    a.on('console', lambda mm: console_errors.append(mm.text) if mm.type == 'error' else None)
    a.on('pageerror', lambda e: console_errors.append(str(e)))
    a.goto(BASE + '/admin/', wait_until='networkidle')
    a.wait_for_timeout(500)
    check('پنل: فرمِ ورود دیده می‌شود', a.locator('#loginBox').is_visible())
    check('پنل: noindex دارد', 'noindex' in (a.locator('meta[name="robots"]').get_attribute('content') or ''))
    a.fill('#ghUser', 'testuser'); a.fill('#ghRepo', 'roya-shop'); a.fill('#ghToken', 'fake_token_for_ui_test')
    a.click('#loginBtn'); a.wait_for_timeout(300)
    check('پنل: بعد از ورود، پنل دیده می‌شود', a.locator('#panelBox').is_visible())
    items = a.locator('#productList .admin-item').count()
    check('پنل: ۹ محصول در فهرست', items == 9, f'دریافتی: {items}')
    # ویرایشِ محصولِ اول
    a.click('[data-edit="0"]'); a.wait_for_timeout(200)
    check('پنل: ویرایشگر باز شد', a.locator('#productEditor').is_visible())
    check('پنل: فیلدِ موجودی هست', a.locator('#f-stock').count() == 1)
    check('پنل: موجودیِ محصولِ اول پر است', a.locator('#f-stock').input_value() != '')
    check('پنل: وضعیتِ به‌زودی در انتخابگر', a.locator('#f-status option[value="soon"]').count() == 1)
    a.fill('#f-name', 'شُرتِ ناز — پنبهٔ مصری')
    a.click('#saveProduct'); a.wait_for_timeout(200)
    check('پنل: ذخیره، پیامِ موفق', 'ok' in a.locator('#pubMsg').get_attribute('class'))
    check('پنل: فایلِ products در فهرستِ انتشار', 'data/products.json' in a.locator('#dirtyList').inner_text())
    a.click('.admin-tab[data-pane="site"]'); a.wait_for_timeout(200)
    check('پنل: تبِ سایت، دامنه را دارد', a.locator('#s-domain').input_value() == 'https://example.com')
    # ویرایشگرِ رنگ و عکس
    a.click('.admin-tab[data-pane="products"]'); a.wait_for_timeout(200)
    a.click('[data-edit="0"]'); a.wait_for_timeout(300)
    rows = a.locator('#colorRows .color-row').count()
    check('پنل: ردیف‌هایِ رنگِ محصولِ اول', rows == 3, f'دریافتی: {rows}')
    check('پنل: ورودیِ آپلودِ عکس هست', a.locator('#f-image').count() == 1)
    check('پنل: جایگاهِ عکس خالی، راهنما دیده می‌شود', a.locator('#imgPlaceholder').is_visible())
    check('پنل: انتخابگرِ گرافیکِ کاور', a.locator('#f-art').input_value() == 'panty')
    a.click('#addColor'); a.wait_for_timeout(100)
    check('پنل: افزودنِ رنگِ جدید', a.locator('#colorRows .color-row').count() == 4)
    a.click('#cancelEdit'); a.wait_for_timeout(100)
    # دسته‌ها
    a.click('.admin-tab[data-pane="categories"]'); a.wait_for_timeout(200)
    check('پنل: ۴ دسته در فهرست', a.locator('#catList .admin-item').count() == 4,
          f'دریافتی: {a.locator("#catList .admin-item").count()}')
    a.click('#addCategory'); a.wait_for_timeout(200)
    check('پنل: ویرایشگرِ دسته باز شد', a.locator('#catEditor').is_visible())
    a.fill('#c-name', 'کرمِ ضدِ آفتاب'); a.fill('#c-intro', 'یک معرفیِ آزمایشی برایِ دستهٔ تازه.')
    a.click('#saveCategory'); a.wait_for_timeout(200)
    check('پنل: دستهٔ تازه ذخیره شد', a.locator('#catList .admin-item').count() == 5)
    check('پنل: پیشنهادِ دسته در فرمِ محصول هست', a.locator('#catSuggestions option').count() == 5)
    a.on('dialog', lambda d: d.accept())
    a.click('[data-cdel="4"]'); a.wait_for_timeout(300)
    check('پنل: حذفِ دسته با تأیید انجام شد', a.locator('#catList .admin-item').count() == 4)
    check('پنل: فایلِ categories در فهرستِ انتشار', 'categories' in a.locator('#dirtyList').inner_text())
    # تبِ وبلاگ
    a.click('.admin-tab[data-pane="posts"]'); a.wait_for_timeout(200)
    check('پنل: ۳ مقاله در فهرست', a.locator('#postList .admin-item').count() == 3,
          f'دریافتی: {a.locator("#postList .admin-item").count()}')
    a.click('[data-pedit="0"]'); a.wait_for_timeout(200)
    check('پنل: ویرایشگرِ مقاله باز شد', a.locator('#postEditor').is_visible())
    check('پنل: انتخابگرِ محصولِ پیشنهادی', a.locator('#p-related').count() == 1)
    a.click('#cancelP'); a.wait_for_timeout(100)
    # تبِ پرسش‌ها
    a.click('.admin-tab[data-pane="faq"]'); a.wait_for_timeout(200)
    check('پنل: ۷ پرسش در فهرست', a.locator('#faqList .admin-item').count() == 7,
          f'دریافتی: {a.locator("#faqList .admin-item").count()}')
    a.click('[data-qedit="0"]'); a.wait_for_timeout(200)
    check('پنل: ویرایشگرِ پرسش باز شد', a.locator('#faqEditor').is_visible())
    a.click('#cancelQ'); a.wait_for_timeout(100)
    a.click('.admin-tab[data-pane="publish"]'); a.wait_for_timeout(200)
    a.click('#exportBtn')  # فقط بدونِ خطا
    a.wait_for_timeout(200)
    a.screenshot(path='/tmp/shot-admin-mobile.png', full_page=True)
    a.close()
    browser.close()

passed = sum(1 for _, ok, _ in results if ok)
print(f'\n===== {passed}/{len(results)} سبز =====')
for name, ok, detail in results:
    print(('✅' if ok else '❌'), name, ('— ' + detail if detail and not ok else ''))
if console_errors:
    print('\n⚠️ خطاهایِ کنسول:')
    for e in console_errors:
        print('  -', e)
    sys.exit(1)
print('\n✨ بدونِ هیچ خطایِ کنسول')
sys.exit(0 if passed == len(results) else 1)
