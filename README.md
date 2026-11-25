# نینا شاپ 🌸 — بوتیکِ لباس زیرِ زنانه

سایتِ فروشِ مینیمال، سبک و فانتزی — بدونِ هیچ CDN، ردیاب و کتابخانهٔ بیرونی. کلِ سایت چند ده کیلوبایت است و در یک لحظه باز می‌شود.

## ساختار

```
├── index.html            صفحهٔ اصلی (قهرمان، محصولات، نظرات)
├── product.html          صفحهٔ محصول (با اسکیمای Product و Breadcrumb)
├── admin/                پنلِ مدیریت (noindex — در گوگل ایندکس نمی‌شود)
├── css/style.css         سیستمِ طراحیِ مشترک (شب/روز + سه رنگِ تأکید)
├── js/icons.js           کدِ مشترک: آیکون‌ها، ارقامِ فارسی، پوسته
├── js/app.js             منطقِ صفحهٔ اصلی
├── js/product.js         منطقِ صفحهٔ محصول
├── data/site.json        نام، شعار، درباره، کانال‌هایِ ارتباط
├── data/products.json    محصولات
├── data/testimonials.json نظرات (نمونه! پیش از تبلیغ جایگزین کن)
├── assets/fonts/         وزیرمتنِ متغیر (تعبیه‌شده)
├── assets/og.png         تصویرِ اشتراک‌گذاری (توییتر/تلگرام/واتساپ)
├── robots.txt · sitemap.xml · manifest.webmanifest · favicon.svg
└── .github/workflows/deploy.yml   انتشارِ خودکار به Cloudflare Pages
```

## راه‌اندازی از صفر (از گوشی، حدود ۱۰ دقیقه)

### ۱) ساختِ ریپوی پرایوت در گیت‌هاب
1. در github.com وارد شو → دکمهٔ **+** → **New repository**.
2. نام: `roya-shop` — دیدگی: **Private** — Create.
3. فایلِ zipِ تحویلی را باز کن و همهٔ محتوای پوشه را آپلود کن (در صفحهٔ خالیِ ریپو: **uploading an existing file**). یا اگر git داری:

```bash
git init && git add . && git commit -m "شروعِ نینا شاپ"
git branch -M main
git remote add origin https://github.com/USERNAME/roya-shop.git
git push -u origin main
```

### ۲) دامنه و سئو — دو جایگزینیِ مهم
1. در پنلِ مدیریت → تبِ «سایت» → فیلدِ **دامنه** را با آدرسِ واقعیِ سایتت (مثلاً `https://roya-shop.pages.dev`) پر کن و ذخیره و انتشار بزن.
2. چون دامنه عوض شد، در `robots.txt` و `sitemap.xml` هم `example.com` را با دامنهٔ واقعی جایگزین کن (از پنل منتشر نمی‌شوند؛ یک‌بار در گیت‌هاب ویرایششان کن). بعد از انتشار، آدرسِ نقشهٔ سایت را در **Google Search Console** ثبت کن — این مهم‌ترین قدمِ سئو است.

### ۳) انتشار (یکی از دو راه)

**راهِ اول — Cloudflare Pages (پیشنهادی، رایگان، برای ریپوی پرایوت کار می‌کند):**
1. در dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git → ریپو را وصل کن.
2. Build command: خالی — Build output directory: `/`.
3. هر push = انتشارِ خودکار. (فایلِ workflow هم برای انتشار از Actions هست؛ برای آن به secrets دو مقدار `CLOUDFLARE_API_TOKEN` و `CLOUDFLARE_ACCOUNT_ID` لازم داری.)

**راهِ دوم — GitHub Pages (ساده‌تر، اما برای ریپوی پرایوت به حسابِ Pro نیاز دارد):**
Settings → Pages → Deploy from a branch → main → / (root).

> نکته: پسوندِ `pages.dev` در ایران فیلتر است؛ برای بازدیدِ داخل، یک دامنهٔ شخصی به Pages وصل کن یا از GitHub Pages با دامنهٔ در دسترس استفاده کن.

### ۴) پنلِ مدیریت
آدرس: `دامنهٔ تو/admin/`
1. توکنِ گیت‌هاب بساز: Settings → Developer settings → **Fine-grained tokens** → فقط همین مخزن، فقط مجوزِ **Contents: Read and write**، انقضای کوتاه.
2. در پنل، نامِ کاربری، نامِ ریپو و توکن را وارد کن. توکن فقط در گوشیِ خودت می‌ماند.
3. محصول/نظر/متن‌ها را ویرایش کن → دکمهٔ **انتشار**. تغییرها اول محلی ذخیره می‌شوند؛ با انتشار به گیت‌هاب می‌روند و سایت خودکار به‌روز می‌شود.
4. هر هفته از تبِ «انتشار» **پشتیبان** بگیر (برون‌بریِ JSON).
5. ⚠️ بعد از هر دورهٔ کار، توکن را در گیت‌هاب باطل کن.

## سئو — چه چیزهایی از قبل انجام شده
- ساختارِ معنایی (header/main/article/footer)، یک h1 در هر صفحه، alt و aria کامل
- اسکیما: `ClothingStore` + `WebSite` در خانه، `Product` + `BreadcrumbList` در صفحهٔ محصول
- متا، Open Graph و Twitter Card کامل (تصویرِ اشتراک‌گذاریِ اختصاصی)
- `sitemap.xml` + `robots.txt` + canonical + lang/dir درست
- سرعت: بدونِ هیچ درخواستِ بیرونی، فونتِ تعبیه‌شده با `font-display:swap`، بدونِ کتابخانه
- پنلِ مدیریت با `noindex`

قدم‌های بعدیِ سئو (پس از انتشار): ثبت در Search Console، ثبت در Bing Webmaster، لینکِ سایت در بیوِ اینستاگرام/تلگرام، و به‌مرور محتوای تازه (پستِ وبلاگ یا راهنمای سایز).

## پوسته‌ها
شب/روز با دکمهٔ ماه/خورشید در سربرگ. سه رنگِ تأکید (گلگون، بنفش، نیلیِ دریایی) در `css/style.css` بخشِ `data-accent` — با تغییرِ یک خط، کلِ سایت عوض می‌شود.

## ویرایشِ رنگِ برند
رنگِ اصلی در `css/style.css` → `html[data-accent='rose'] { --accent: … }`.
