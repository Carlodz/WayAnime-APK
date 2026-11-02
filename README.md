# WayAnime — Android فقط

تطبيق Android (Capacitor). نسخة ويندوز (Electron) تحيّدات نهائياً.

## بناء الـ APK (مجاناً بـ GitHub Actions)
1. ارفع محتوى هاد المجلد كيما هو لـ Repo فـ GitHub (خاص يكون فيه `.github`).
2. Actions ← **Build Android APK** ← Run workflow.
3. من بعد ~5-10 دقايق: Artifacts ← **WayAnime-apk** ← `app-debug.apk`.

## بناء محلي (Android Studio)
    npm install
    npx cap add android
    npx cap sync android
    # انسخ native/*.java إلى android/app/src/main/java/com/wayanime/app/
    npx cap open android

## الهيكل
- `www/` — واجهة التطبيق + `android-api.js` (منطق المصادر: Animeify, WitAnime, Anime4up, Stardima)
- `native/` — بلوغن ملء الشاشة (Java)
- `tools/diag.js` — أداة تشخيص المصادر

## تعديلات (30/10/2026)
- **آخر الحلقات**: فلتر «مترجم / الكل / مدبلج» (الافتراضي مترجم) + مصدر AniList مضمون (بلا Cloudflare) + شريط مصادر مصغّر.
- **التصنيفات**: تصنيفات حقيقية من AniList (genre + tag) مرتبة بالشعبية؛ الضغط على أنمي كيفتحو بالبحث بالعنوان. إلا AniList وقع فيه مشكل كيرجع للمصدر القديم.
- **المشغّل**: كل السيرفرات كتبان (بلا حدّ 40/4)، + سيرفرات Animeify كمصدر إضافي، + أي سيرفر ما تفكّش رابطو المباشر كيتفتح داخل التطبيق (iframe) بدل المتصفح.
