# পশ্চাৎভাগের উৎপাদন-প্রস্তুতির নির্দেশিকা

যাচাইয়ের তারিখ: ৮ অক্টোবর ২০২৬।

সর্বশেষ পরীক্ষামূলক ডেটাবেসে মাইগ্রেশন, আটটি সফল সমন্বিত পরীক্ষা ও সরাসরি প্রদানকারী পরীক্ষার ফল: একই ফোল্ডারের `staging-verification.bn.md`। নিচের প্রাথমিক যাচাইয়ের বিবরণের চেয়ে সর্বশেষ ওই ফলকে অগ্রাধিকার দিন।

## পরিবর্তনের সীমা

মূল মডিউলভিত্তিক কাঠামো বজায় আছে। নতুন সহায়ক ফাইল, তথ্যভান্ডার পরিবর্তনের নথি, পরীক্ষা ও স্বয়ংক্রিয় যাচাই যোগ হয়েছে। পরিবর্তনগুলো `codex/production-readiness` ব্রাঞ্চে পাঠানো হয়েছে; আপনার প্রকৃত বা পরীক্ষামূলক তথ্যভান্ডারে পরিবর্তন প্রয়োগ এবং মূল ব্রাঞ্চে মার্জ বা প্রকাশ করা হয়নি।

সকল পরিবর্তিত কোডের পূর্ণ পথ ও সম্পূর্ণ বর্তমান কোড: একই ফোল্ডারের `updated-code.bn.md`।

সম্মিলিত বাংলা প্রতিবেদন:

D:\NEXT_LEVEL_WEB_DEV\assignment\courier-frontend\docs\production-readiness.bn.md

## গুরুত্বপূর্ণ ফাইল

| কাজ | সম্পূর্ণ পথ |
| --- | --- |
| কনফিগারেশন যাচাই | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\config\index.ts |
| বর্তমান ভূমিকা ও সেশন অনুযায়ী অনুমতি | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\middlewares\auth.ts |
| ইনপুট যাচাইয়ের পর নিরাপদ ইনপুট ব্যবহার | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\middlewares\validateRequest.ts |
| একবার ব্যবহারযোগ্য নবায়ন এবং সেশন বাতিল | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\utils\session.ts |
| সুরক্ষিত কুকি | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\utils\cookies.ts |
| বাইরের অনাকাঙ্ক্ষিত পরিবর্তন প্রতিরোধ | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\middlewares\csrf.ts |
| সাধারণ, প্রবেশ এবং যাচাইসংখ্যার অনুরোধসীমা | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\middlewares\rateLimiter.ts |
| প্রোফাইলের অনুমোদিত ক্ষেত্র ও ছবি | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\user\user.service.ts |
| প্রশাসকের ভূমিকা ও সেশন অকার্যকর করা | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\admin\admin.service.ts |
| কুরিয়ারের সঠিক পরিচয় ও সংরক্ষিত আয় | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\courier\courier.service.ts |
| বৈধ পার্সেল ধাপ | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\shipment\shipment.rules.ts |
| সমসাময়িক পরিবর্তন, হাব এবং সম্পূর্ণ সারসংক্ষেপ | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\shipment\shipment.service.ts |
| প্রত্যেক অর্থপ্রদানের আলাদা চেষ্টা ও পুনর্মিলন | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\payment\payment.service.ts |
| অর্থপ্রদানের পরিচয়, মুদ্রা ও পরিমাণ যাচাই | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\payment\payment.gateway.ts |
| স্বাক্ষরিত Stripe বিজ্ঞপ্তি | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\payment\payment.webhook.ts |
| অভিন্ন তথ্যভান্ডার সংযোগ | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\utils\prisma.ts |
| স্বাস্থ্য যাচাই ও অনুরোধের নথি | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\app.ts |
| নিয়ন্ত্রিত বন্ধ ও সার্ভার শুরু | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\server.ts |
| নতুন তথ্যের কাঠামো | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\prisma\schema.prisma |
| তথ্যভান্ডার পরিবর্তন | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\prisma\migrations\20261008000000_security_payment_attempts\migration.sql |
| নিরাপত্তার স্বতন্ত্র পরীক্ষা | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\tests\security.test.ts |
| বিচ্ছিন্ন প্রকৃত তথ্যভান্ডারের পরীক্ষা | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\tests\integration\transactions.test.ts |
| স্বয়ংক্রিয় যাচাই | D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\.github\workflows\ci.yml |

## পরিবেশের শর্ত

নমুনা ফাইল:

D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\.env.example

নিজের শংসাপত্রের ফাইল:

D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\.env

Node.js ২৪ এবং `npm ci` ব্যবহার করুন। প্রকল্পে Node.js ২২ থেকে ২৬ গ্রহণের শর্ত আছে। পরীক্ষিত যন্ত্রে Node.js ২৪.১৫.০ ব্যবহার হয়েছে।

`JWT_ACCESS_SECRET` এবং `JWT_REFRESH_SECRET` কমপক্ষে ৩২ অক্ষরের পৃথক এলোমেলো গোপন মান হতে হবে। নমুনার লেখা উৎপাদনের গোপন মান নয়। পুরোনো সেশনের Redis নথি না থাকলে ব্যবহারকারীকে আবার প্রবেশ করতে হবে।

`DATABASE_URL` ও `REDIS_URL` বৈধ সংযোগের ঠিকানা; উৎপাদনে নিয়ন্ত্রিত প্রবেশাধিকার, এনক্রিপ্ট করা সংযোগ ও উপযুক্ত সংযোগের সংখ্যা নিশ্চিত করুন।

`FRONTEND_URL` সম্মুখভাগের প্রকৃত ঠিকানা হতে হবে; ব্রাউজারের পরিবর্তনকারী অনুরোধের উৎস এর সঙ্গে মিলতে হবে। দুই অংশের ডোমেইন আলাদা হলেও ব্রাউজার একই সম্মুখভাগের `/api/backend` পথ ব্যবহার করে।

`NODE_ENV=production` হলে কুকি শুধু নিরাপদ সংযোগে যায়। `COOKIE_SAME_SITE=lax` সাধারণ একই-ঠিকানার সংযোগে যথেষ্ট। `TRUST_PROXY_HOPS` প্রকৃত মধ্যবর্তী সংযোগব্যবস্থা জেনে নির্ধারণ করুন; অন্ধভাবে বাড়াবেন না।

`COURIER_COMMISSION_RATE` শূন্য থেকে একের মধ্যে অনুমোদিত হার। ফাঁকা রাখলে আয় অজানা হিসেবে থাকবে। হার বসানোর পর নতুন সম্পন্ন পার্সেলের আয় সংরক্ষিত হবে; পুরোনো হিসাব অনুমান করে পাল্টানো হয় না।

`ALLOW_DEMO_SEED=false` রাখুন। উৎপাদনে নমুনা ব্যবহারকারী তৈরির কাজ নিষিদ্ধ। প্রশাসকের আসল হিসাব আলাদাভাবে নিয়ন্ত্রিত প্রক্রিয়ায় তৈরি ও যাচাই করতে হবে।

Google, ইমেইল, Cloudinary, bKash ও Stripe-এর প্রকৃত শংসাপত্র দরকার। নমুনা মানকে কার্যকর সংযোগ ধরে নেওয়া যাবে না।

## তথ্যভান্ডার পরিবর্তন

নতুন পরিবর্তনে `User.tokenVersion`, `Shipment.courierEarning` এবং `PaymentAttempt` যোগ হয়েছে। বিদ্যমান লেনদেনের প্রদানকারী-পরিচয় থাকলে আলাদা চেষ্টা হিসেবে স্থানান্তর করা হয়। এটি প্রদানকারীর সঙ্গে পুরোনো লেনদেনের সত্যতা পুনরায় যাচাই করে না।

প্রথমে ব্যাকআপ নিন, পরীক্ষামূলক পরিবেশে প্রয়োগ করুন এবং ফল যাচাই করুন। বড় বাস্তব তথ্যভান্ডারে সূচক তৈরির সময় ও তালাবদ্ধ থাকার প্রভাব মাপতে হবে। এখানে বাস্তব পরিবর্তন চালানো হয়নি।

কমান্ডের কাজের ফোল্ডার:

D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run db:deploy
npm run build
npm run start
```

সরাসরি উৎপাদনে `prisma migrate dev` বা `prisma db push` ব্যবহার করবেন না। নতুন অ্যাপ চালুর আগে প্রয়োজনীয় পরিবর্তন প্রয়োগ করতে হবে। শুধুমাত্র অ্যাপের পুরোনো সংস্করণে ফিরে গেলেই অর্থপ্রদানের নথির পরিবর্তন আগের অবস্থায় ফিরে যায় না; পরীক্ষিত প্রত্যাহার পরিকল্পনা দরকার।

## অর্থপ্রদানের সংযোগ

Stripe বিজ্ঞপ্তির পথ:

`POST /api/v1/payments/stripe/webhook`

`STRIPE_SECRET_KEY` এবং `STRIPE_WEBHOOK_SECRET` ছাড়া নতুন Stripe অর্থপ্রদান শুরু হবে না। বিজ্ঞপ্তিতে `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired` ও `checkout.session.async_payment_failed` গ্রহণের ব্যবস্থা আছে। সফল অর্থপ্রদান মেনে নেওয়ার আগে পরিচয়, মুদ্রা, পরিমাণ ও সফল অবস্থা যাচাই করা হয়। বিজ্ঞপ্তির কাঁচা দেহ স্বাক্ষর পরীক্ষার আগে পরিবর্তন করা হয় না।

bKash প্রত্যাবর্তনের পথ:

`GET /api/v1/payments/bkash/callback`

`BKASH_CALLBACK_URL`-এ সম্পূর্ণ এই ঠিকানা দিন; আবার পথ যোগ করা হয় না। bKash-এর প্রদত্ত সফল, বাতিল বা ব্যর্থ শব্দ একা বিশ্বাস করা হয় না; প্রদানকারীর কাছ থেকে প্রকৃত অবস্থা নেওয়া হয়।

গ্রাহকের পুনরায় যাচাই:

`POST /api/v1/payments/reconcile`

দেহে শুধু `shipmentId`। মালিকানা যাচাই করে জানা প্রদানকারী-পরিচয় দিয়ে অবস্থা পুনরায় নেওয়া হয়। পরিচয় সংরক্ষিত না থাকলে অনিশ্চিত লেনদেন বন্ধ রেখে সহায়তাকারীর পর্যালোচনা চাওয়া হয়। এই অবস্থায় নতুন চেষ্টা খুলে সম্ভাব্য দ্বিগুণ অর্থপ্রদান সৃষ্টি করা হয় না।

পুরোনো Stripe চেষ্টায় নতুন `attemptId` মেটাডেটা না থাকলে প্রদানকারীর নথি মিলিয়ে নিরাপদ নিষ্পত্তি দরকার। `PAYMENT_REQUIRES_REVIEW` ঘটনার জন্য মানবীয় পর্যালোচনা ও ভবিষ্যৎ স্বয়ংক্রিয় হিসাব-মিলানোর ব্যবস্থা দরকার।

মূল নির্দেশনা: [Stripe-এর অর্থপ্রদান নিশ্চিতকরণ](https://docs.stripe.com/checkout/fulfillment)।

## পরীক্ষার ফল এবং বিচ্ছিন্ন পরীক্ষা

টাইপ যাচাই, কোড যাচাই, উৎপাদন সংস্করণ ও নিরাপত্তার ১৬টি স্বতন্ত্র পরীক্ষা সফল। `npm audit`-এ যাচাইয়ের সময় পরিচিত দুর্বলতা শূন্য।

প্রকৃত PostgreSQL এবং Redis দিয়ে আটটি সমন্বিত পরীক্ষা আছে: একই পার্সেল দুই কুরিয়ারকে একসঙ্গে দেওয়া, একই ধাপ দুবার লেখা, প্রোফাইলের ঠিকানা ও ফোন, পুনরাবৃত্ত বিজ্ঞপ্তি, একবার ব্যবহারযোগ্য নবায়ন, চলমান অর্থপ্রদানের মধ্যে বাতিল, অন্য গ্রাহকের পুনর্মিলন এবং সব পার্সেলের সারসংক্ষেপ।

এই যন্ত্রে Docker-এর সেবা বন্ধ ছিল; সমন্বিত পরীক্ষা এখানে চালানো হয়নি। GitHub-এর বিচ্ছিন্ন PostgreSQL ও Redis দিয়ে মাইগ্রেশন এবং আটটি সমন্বিত পরীক্ষা সফল হয়েছে: [যাচাইয়ের ফল](https://github.com/mdshamim-mern/courier-logistics-backend/actions/runs/37685257053)। এটি আপনার পরীক্ষামূলক তথ্যভান্ডার বা Stripe, bKash, ইমেইল কিংবা ছবি সংরক্ষণকারী প্রতিষ্ঠানের সরাসরি পরীক্ষা নয়।

আলাদা পরীক্ষার তথ্যভান্ডারের নাম `_test` দিয়ে শেষ হতে হবে। `INTEGRATION_REDIS_URL`-এ আলাদা পরীক্ষার Redis সেবা বা ডেটাবেস দিন। নিজস্ব পরীক্ষার রেকর্ডের পরিচয় ধরে পরিষ্কার করা হয়; সব তথ্য মুছে দেওয়া হয় না।

নিচের উদাহরণের জন্য আগে স্থানীয় পরীক্ষার PostgreSQL ও Redis তৈরি করতে হবে। এই মানগুলো কেবল পরীক্ষার উদাহরণ। কাজের ফোল্ডার:

D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend

```powershell
$env:DATABASE_URL = "postgresql://courier:courier@localhost:5432/courier_test"
$env:INTEGRATION_DATABASE_URL = $env:DATABASE_URL
$env:INTEGRATION_REDIS_URL = "redis://localhost:6379/15"
npm run db:deploy
npm run test:integration
```

প্রকাশের আগে বাস্তব প্রদানকারী-পরীক্ষা, স্বয়ংক্রিয় হিসাব-মিলানোর কর্মী, অর্থফেরত ও নগদে মূল্য গ্রহণের নীতি, প্রাপক যাচাই, ব্যাকআপ-পুনরুদ্ধার, নজরদারি, সতর্কতা এবং লোড পরীক্ষা বাকি। পূর্ণ উৎপাদন-প্রস্তুতির দাবি করা হয়নি।
