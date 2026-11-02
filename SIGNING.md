# باش ويندوز ما يعتبرش التطبيق ضار (SmartScreen / Defender)

التحذير «Windows protected your PC» كيبان حيت الـ .exe **ماشي موقّع (code signing)**. ما كاين حتى كود كيحيّدو؛ الحل الحقيقي هو شهادة توقيع.

## 1) توقيع الـ installer (الحل الأساسي)
خُد شهادة Code Signing (خيارات: شهادة OV/EV من Certum/Sectigo/DigiCert…، ولا Azure Trusted Signing، ولا SignPath مجاناً للمشاريع المفتوحة المصدر). شوف الشروط والأثمنة فـ مواقعهم، تتبدل.

إلا عطاوك ملف `.pfx`:
1. حطو فـ مجلد المشروع بسمية `cert.pfx` (جنب `package.json`). مستثنى من الحزمة وما غاديش يتدخل فـ التطبيق.
2. شغّل `build-installer.bat` — غادي يسولك على password الشهادة ويوقّع وحدو.
3. **من بعد التوقيع** زيد فـ `package.json` داخل `build.win`:
   `"publisherName": ["الاسم اللي فـ الشهادة بالضبط"]`
   (ما تزيدوش قبل التوقيع، وإلا التحديث التلقائي غادي يرفض النسخ غير الموقعة).
4. وقّع كل نسخة جديدة بنفس الشهادة.

ملاحظة: شهادة OV عادية كتحتاج وقت باش SmartScreen يثق (سمعة كتبنى مع التحميلات)، وEV كتشيل التحذير مباشرة تقريباً.

## 2) حاجات كتنقص الإنذارات الكاذبة (حتى بلا شهادة)
- ارفع الـ installer لـ https://www.microsoft.com/wdsi/filesubmission كـ «Incorrectly detected as malware» — Microsoft كتحلل وكتحيّد الإنذار.
- ارفعو لـ VirusTotal وإلا ظهر فيه محرك واحد، دير false-positive report لشركتو.
- وزّع الملف من رابط ثابت (GitHub Release) ماشي من أماكن عشوائية.
- التطبيق دابا كيتنصب لـ user فقط (بلا admin) وكيطلب `asInvoker`، وهادشي مزيان.

## 3) للناس اللي كيحملو
إلا بان التحذير: **More info ← Run anyway**.
