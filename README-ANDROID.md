# WayAnime APK (Android)

ما نقدرش نبني الـ APK من هنا (خاص Android SDK)، فالمشروع كيتبنى فـ السحاب مجاناً بـ GitHub Actions:

1. صاوب Repo فـ GitHub وارفع **محتوى مجلد WayAnime** (فيه `.github` و`android-app`) كيما هو.
2. من تبويب **Actions ← Build Android APK ← Run workflow**.
3. من بعد ~5-10 دقايق: افتح الـ run ← **Artifacts ← WayAnime-apk** ← نزّل `app-debug.apk`.
4. فـ الهاتف: فعّل «تثبيت من مصادر غير معروفة» وثبّتو. (Play Protect ممكن يعطي تحذير لأن الـ APK ماشي منشور فـ Play Store.)

## شنو كيخدم / شنو لا
- كيخدم: الكتالوج، البحث، الحلقات، المفضلة وسجل المشاهدة، حساب موقع البطاقات + المزامنة، الأنمي العربي (Animeify/WitAnime/Stardima) والتشغيل المباشر (mp4/HLS)، الترجمات من إضافة الترجمة.
- ما كيخدمش فـ Android: التورنت، تحويل الصيغ (ffmpeg)، فتح ملف من الجهاز، السيرفرات اللي كتحتاج Referer (كتتفتح فـ المتصفح)، الإشعارات الخلفية، التحديث التلقائي.
- **ما تجربش** على جهاز: هاد النسخة مبنية من غير اختبار على هاتف حقيقي. إلا بان شي مشكل (شكل الواجهة، ملء الشاشة فـ المشغّل…) صوّرو وصيفطو.

## كيفاش خدام
`android-app/make-www.js` كياخد ملفات الواجهة (index.html/renderer.js/CSS) وكيولّد `android-api.js` من `main.js` (نفس منطق المصادر)، كيبدل `fetch` بـ HTTP الأصلي ديال Android (بلا CORS). Capacitor كيغلفو فـ تطبيق Android.
لتجربة محلية: `cd android-app && npm i && npx cap add android && npx cap sync android && npx cap open android` (خاص Android Studio).
