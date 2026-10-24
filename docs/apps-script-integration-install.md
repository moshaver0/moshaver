# نصب اتصال Sheets و Drive در Apps Script

**قبل از تغییر:** از پروژه Apps Script یک کپی/نسخه پشتیبان بگیر. این فایل را به عنوان فایل جدید اضافه کن؛ doGet/doPost فعلی را جایگزین نکن.

## 1) فایل جدید
در Apps Script روی **+ > Script** بزن، نام را `MoshaverDataRoutes` بگذار و محتوای فایل `apps-script/MoshaverDataRoutes.gs` همین شاخه را کامل کپی کن و ذخیره کن.

## 2) وصل کردن مسیرها به روتر فعلی
در فایل اصلی روتر، داخل `const protectedActions = { ... }` این چهار خط را اضافه کن (کاماها را درست نگه دار):

```javascript
  'records.list': function(ctx) { return successResponse_(moshaverDataRoute_('records.list', ctx), null); },
  'records.save': function(ctx) { return successResponse_(moshaverDataRoute_('records.save', ctx), null); },
  'records.delete': function(ctx) { return successResponse_(moshaverDataRoute_('records.delete', ctx), null); },
  'drive.upload': function(ctx) { return successResponse_(moshaverDataRoute_('drive.upload', ctx), null); }
```

**مهم:** روتر فعلی شما در حال حاضر با `protectedActions[action](ctx)` کار می‌کند، بنابراین این چهار خط را داخل همان شیء قرار بده؛ تابع doGet/doPost و تابع routeRequest_ را دوباره نساز یا جایگزین نکن. این مسیرها از `withAuth_` عبور می‌کنند.

## 3) قبل از استفاده واقعی
- اول روی یک سازمان آزمایشی با دیتابیس آزمایشی تست کن؛ هنوز صفحات سایت به این API وصل نشده‌اند.
- کد فقط وقتی به شیت موجود می‌نویسد که ستون شناسه مورد انتظار همان موجود باشد. نام شیت/شناسه‌ها باید با ساختار واقعی پروژه یکسان باشد. اگر خطای `has no ... column` دیدی، چیزی را خودکار rename نکن؛ نام ستون واقعی را بررسی کن.
- حذف فیزیکی انجام نمی‌شود. حذف امن فقط وقتی فعال است که شیت ستون `isDeleted` داشته باشد؛ وگرنه خطای کنترل‌شده می‌دهد.
- بارگذاری فایل تا 4MB و فقط انواع MIME مشخص‌شده مجاز است.
- پس از تست، از **Deploy > Manage deployments > Edit** نسخه جدید را انتخاب و Deploy کن تا URL فعلی حفظ شود. جزئیات رسمی: https://developers.google.com/apps-script/concepts/deployments

## نکته مهم درباره ساختار موجود
کدهای فعلی پروژه برای شیت‌های مختلف نام‌گذاری متفاوت دارند؛ مخصوصاً شناسه‌های `appointmentId` و `followUpId`. این فایل را بدون تست روی داده اصلی فعال نکن. اگر نام ستون‌های واقعی متفاوت است، فقط جدول `MOSHAVER_DATA_V1.ENTITIES` را مطابق هدرهای واقعی تنظیم کن.
