# প্রকাশ্য Checkout ও প্রদানকারীর বিজ্ঞপ্তির প্রাথমিক যাচাই

সর্বশেষ ৯ অক্টোবর: ব্যবহারকারীর অনুরোধে bKash স্থগিত। সফল Stripe ঘটনার তথ্য দিয়ে দুই সমসাময়িক নিজের স্বাক্ষরিত পুনরাবৃত্তিতে ২০০ ও সফলতার নথি একটি পাওয়া গেছে; এটি Stripe dashboard/CLI থেকে প্রকৃত পুনঃসরবরাহ নয়। বাস্তব অ্যাপের ছবি আপলোডও সফল। বিস্তারিত: [দ্বিতীয় যাচাই](D:/NEXT_LEVEL_WEB_DEV/assignment/courier-backend/docs/production-hardening.bn.md)। নিচের লেখা ধারাবাহিক পূর্ববর্তী পর্যবেক্ষণ।

তারিখ: ৮ অক্টোবর ২০২৬।

পরীক্ষামূলক ব্যাকএন্ড: https://courier-logistics-backend-lake.vercel.app

## ৯ অক্টোবর ২০২৬: Stripe সফলতার নিশ্চিতকরণ এবং bKash ওয়ালেট-লক

ব্যবহারকারীর পাঠানো ছবির পরে প্রদানকারীর API, ডেটাবেস ও Stripe ঘটনার প্রাপ্তিস্বীকার আলাদাভাবে পড়ে যাচাই হয়েছে। নিজের স্বাক্ষরযুক্ত বিজ্ঞপ্তি পাঠানো হয়নি, reconcile endpoint ডাকা হয়নি এবং কোনো অর্থপ্রদানের অবস্থা নিজে বদলানো হয়নি।

নতুন Stripe Checkout `cs_test_a1ihKYNrrlANyzvRCl5OqcED1DHLUQ6M7zgxcIamPDsvELYeAyrEsFQHRJ` complete ও paid; livemode false, amount_total 12000 এবং currency bdt। প্রকৃত পরীক্ষামূলক PaymentIntent `pi_3UOMwEDpm6kSsUsI4YyGJU7K` succeeded এবং amount_received 12000।

পার্সেল `f0b44eb4-519c-45e5-9445-3190db27311f`-এর Payment `31c589b3-3cda-4976-9c77-1cd28bcf1ade` ও PaymentAttempt `fa63febe-8ce2-4824-9274-dadf031c0785` দুটিই PAID। paidAt `2026-10-08T19:25:14.170Z`, অর্থাৎ ৯ অক্টোবর রাত ১:২৫:১৪ বাংলাদেশ সময়। providerTransactionId প্রকৃত PaymentIntent-এর পরিচয়ের সঙ্গে মেলে। PAYMENT_SUCCESS লগ একটি; PAYMENT_REQUIRES_REVIEW লগ শূন্য।

Stripe-এর প্রকৃত `checkout.session.completed` ঘটনা `evt_1UOMwFDpm6kSsUsIjCB1dEBa`, livemode false এবং pending_webhooks 0। অ্যাকাউন্টে endpoint তালিকায় একটিই সক্রিয় পরীক্ষামূলক endpoint, যা প্রকাশ্য `/api/v1/payments/stripe/webhook` পথে রয়েছে। ফলে প্রকৃত সফল Checkout, প্রদানকারীর সফল অর্থপ্রদান, অ্যাপের PAID অবস্থা ও বহিরাগত বিজ্ঞপ্তির প্রাপ্তিস্বীকার নিশ্চিত। এই পর্যবেক্ষণে সফলতার লগ একটি আছে; সফলতার ঘটনা ইচ্ছাকৃতভাবে পুনরায় পাঠিয়ে প্রকাশ্য duplicate-delivery পরীক্ষা এখনো করা হয়নি।

পুরোনো Checkout `cs_test_a1PhnmaePRGkXjsoEpu9seq8u9TOFuLHEmfjxM52ZluWbB9gxbSKAWWIdC` expired ও unpaid; তার অ্যাপের Payment/PaymentAttempt FAILED এবং সফলতার লগ শূন্য। পুরোনো পাতার completed অথবা timed out বার্তা থেকে সফলতা ধরা হয়নি। অর্থপ্রদানের ফলের পাতায় প্রবেশ করতে বলা browser session অনুপস্থিতির সঙ্গে সঙ্গতিপূর্ণ; তা একা অর্থপ্রদান ব্যর্থতার প্রমাণ নয়। ব্রাউজারে সেই ব্যবহারকারীর লগইন-পরবর্তী পূর্ণ ফলের পাতা পরীক্ষা এখনো করা হয়নি।

bKash-এর নতুন `TR0011iwFUa9K1791487295570` পরিচয়ে স্যান্ডবক্স query HTTP 200, statusCode 0000, transactionStatus Initiated, amount 120.00 এবং currency BDT। trxID নেই। পার্সেল `12700d05-8585-40b8-9bbd-11b8519258f4`-এর অ্যাপের Payment/PaymentAttempt UNPAID, paidAt শূন্য এবং সফলতার লগ শূন্য।

ব্যবহারকারীর ছবিতে `Payment Failed — Your wallet is locked` দেখা গেছে। প্রদত্ত নম্বর `01770618575` bKash-এর নিজস্ব প্রকাশ্য ডেমোতেও আছে, কিন্তু প্রকাশ্য ডেমোতে নম্বর থাকা দিয়ে বর্তমান wallet লক নেই বলে নিশ্চিত হওয়া যায় না। আর OTP/PIN চেষ্টা বা কল্পিত বিকল্প নম্বর দেওয়া হয়নি। স্যান্ডবক্স শংসাপত্র যাঁরা দিয়েছেন তাঁদের মাধ্যমে ওয়ালেট আনলক অথবা অনুমোদিত সক্রিয় পরীক্ষার ওয়ালেট পাওয়া দরকার। তার পরে নতুন bKash Checkout, callback, execute, Completed ও অ্যাপের PAID অবস্থা পরীক্ষা করা যাবে। এখন bKash-এর সম্পূর্ণ সফল অর্থপ্রদান দাবি করা হচ্ছে না।

প্রকাশ্য ডেমোর উৎস: [bKash Tokenized Checkout](https://merchantdemo.sandbox.bka.sh/tokenized-checkout/version/v1.2.0-beta)। নিচের অংশগুলি পরীক্ষার আগের অবস্থার ইতিহাস।

## ৯ অক্টোবর ২০২৬: নতুন অনুমোদনের জন্য Checkout পুনর্নির্মাণ

ব্যবহারকারী আগের Stripe পাতায় session has timed out দেখার পরে দুই প্রদানকারীর জন্য নতুন সেশন চেয়েছেন। স্থানীয় BKASH_CALLBACK_URL পূর্ণ `/api/v1/payments/bkash/callback` পথে আছে; স্থানীয় Stripe key পরীক্ষামূলক এবং webhook গোপন মান উপস্থিত। প্রকাশ্য ব্যাকএন্ড প্রস্তুত, অনুমোদিত origin প্রকাশ্য সম্মুখভাগ এবং তার প্রকৃত API proxy-তে origin যাচাই আর বাধা দিচ্ছে না।

নিজের আগে তৈরি পরীক্ষার গ্রাহকের পরিচয় নিশ্চিত করে শুধু তার এলোমেলো পরীক্ষার পাসওয়ার্ড নবায়ন করা হয়েছে। প্রকাশ্য `/api/backend/auth/login` দিয়ে লগইন সফল, গ্রাহকের পরিচয় পরীক্ষামূলক ডেটাবেসের সঙ্গে মেলে এবং শেষে সেই সেশন logout হয়েছে। নতুন পরীক্ষার পরিচয় `50230d56-50b8-4209-9188-b179f30e9b26`। পুরোনো পার্সেল বা চলমান অর্থপ্রদানের অবস্থা বদলে পুনরায় চেষ্টা জোর করে চালানো হয়নি; আলাদা দুটি নতুন পরীক্ষার পার্সেল ব্যবহার হয়েছে।

| সেবা | নতুন পার্সেল | চেষ্টা | প্রদানকারীর পরিচয় |
| --- | --- | --- | --- |
| Stripe | f0b44eb4-519c-45e5-9445-3190db27311f | fa63febe-8ce2-4824-9274-dadf031c0785 | cs_test_a1ihKYNrrlANyzvRCl5OqcED1DHLUQ6M7zgxcIamPDsvELYeAyrEsFQHRJ |
| bKash | 12700d05-8585-40b8-9bbd-11b8519258f4 | d4e99f35-b4d8-4f29-a80f-03361d524124 | TR0011iwFUa9K1791487295570 |

প্রতিটি পরীক্ষার পরিমাণ BDT 120.00। Stripe-এর session সরাসরি প্রদানকারীর কাছ থেকে পড়ে open, unpaid, livemode false, পরিমাণ, মুদ্রা, নিজের metadata এবং প্রকাশ্য সম্মুখভাগে success/cancel redirect যাচাই হয়েছে। মেয়াদ শেষের সময় `2026-10-08T19:51:30.000Z`, অর্থাৎ ৯ অক্টোবর ২০২৬ রাত ১:৫১:৩০ বাংলাদেশ সময়। bKash-এর নতুন লিংক স্যান্ডবক্সের এবং অ্যাপে চেষ্টা UNPAID।

প্রদানকারীর ফেরত দেওয়া লিংক অপরিবর্তিতভাবে ব্যবহারকারীর জন্য browser panel-এ খোলার অনুরোধ করা হয়েছে। লিংকের hash, সেশন-কুকি, পরীক্ষার পাসওয়ার্ড বা গোপন API মান এই প্রতিবেদনে রাখা হয়নি। লিংক খোলার UI অনুরোধ queued হওয়া দিয়ে পাতা লোড বা গ্রাহক অনুমোদন সফল ধরা হয়নি।

দুটি নতুন সেশন তৈরির অনুরোধ সম্পন্ন; সফল অর্থপ্রদান বা নতুন সফলতার webhook এখনো এই ধাপে পরীক্ষা হয়নি। bKash-এর আগের পরীক্ষার ওয়ালেট লক হওয়ার সমস্যা নতুন সেশন তৈরি করে সমাধান হয় না। প্রকাশিত সেবার নতুন callback প্রকৃত ফেরত যাওয়ার সময় আবার মেলাতে হবে। নতুন নিজস্ব পরীক্ষার রেকর্ড অনুসন্ধান ও প্রদানকারীর বিজ্ঞপ্তির জন্য রাখা হয়েছে।

## সর্বশেষ প্রকাশনা: লগইন, Checkout ও প্রকৃত webhook

প্রকাশ্য ব্যাকএন্ড এখন `Access-Control-Allow-Origin: https://courier-frontend-sigma.vercel.app` ফেরাচ্ছে। সম্মুখভাগের proxy ও সরাসরি ব্যাকএন্ডে অস্তিত্বহীন পরীক্ষার গ্রাহকের লগইন অনুরোধ এখন প্রত্যাশিত HTTP 401, `Invalid credentials`; আগের origin-সংক্রান্ত HTTP 403 আর নেই। স্বাস্থ্য পরীক্ষা HTTP 200 এবং স্বাক্ষরবিহীন webhook অনুরোধ HTTP 400।

পরীক্ষার নিজস্ব পরিচয়: `206e70b8-082e-4112-8972-18585f3bbc08`। শুধু স্পষ্টভাবে কনফিগার করা STAGING_DATABASE_URL-এ পরীক্ষার গ্রাহক `7f0b9480-fd72-4010-a1f8-f3d6bf0814e3` ও তিনটি পরীক্ষার পার্সেল তৈরি হয়েছে। সম্মুখভাগের আসল `/api/backend/auth/login` proxy দিয়ে সেই গ্রাহকের লগইন সফল এবং ফেরত আসা পরিচয় স্থানীয় পরীক্ষার ডেটাবেসের গ্রাহকের পরিচয়ের সঙ্গে মেলানো হয়েছে। সেশন-কুকি ছাড়া জাল টোকেন ব্যবহার হয়নি; পরীক্ষার শেষে নিজের সেশন logout হয়েছে। প্রকৃত গ্রাহকের রেকর্ড পরিবর্তন করা হয়নি।

| পরীক্ষা | ফল |
| --- | --- |
| প্রকাশ্য proxy দিয়ে গ্রাহকের লগইন | সফল |
| অ্যাপের Stripe Checkout তৈরি | সফল; BDT 120.00, পরীক্ষামূলক মোড, প্রকাশ্য সম্মুখভাগে success redirect |
| একই Stripe Checkout আবার চাওয়া | একই লিংক ফেরত, চেষ্টা একটি; সফল |
| অ্যাপের bKash Checkout তৈরি | স্যান্ডবক্স লিংক ও অ্যাপের চেষ্টা তৈরি; সফল অর্থপ্রদান নয় |
| Stripe থেকে প্রকৃত মেয়াদ-শেষ webhook | সফল; নিচে পৃথক প্রমাণ |
| Stripe সফল অর্থপ্রদানের Checkout | অনুমোদনের অপেক্ষায়; সর্বশেষ open/unpaid |
| bKash সফল Checkout | ব্যর্থ গ্রাহক অনুমোদন; ওয়ালেট-লক ও ভুল callback পথ |

Stripe-এর মূল পার্সেল `84dfdd36-c7ee-49e3-9b13-ec3db75cbfe1`, চেষ্টা `95f31de6-3e11-49d2-8f91-12c8dbeef1ed`, Checkout `cs_test_a1PhnmaePRGkXjsoEpu9seq8u9TOFuLHEmfjxM52ZluWbB9gxbSKAWWIdC`। প্রদানকারীর কাছ থেকে session পড়ে `livemode: false`, amount_total 12000, currency bdt, নিজের shipment/attempt metadata এবং প্রকাশ্য success redirect মেলানো হয়েছে।

### Stripe-এর প্রকৃত মেয়াদ-শেষ বিজ্ঞপ্তির প্রমাণ

আলাদা নিজের পরীক্ষার পার্সেল `7785529a-f6c5-4d95-9a19-a22ec868bba1`, চেষ্টা `3b070ace-314d-4f99-bdb8-973ea660b4a8`, Checkout `cs_test_a1IID8jHV59ObGqe2NbMJiJBSBGfZSvpFslaXnk04bzC2Bccvvdbjy5QDE` তৈরি হয়েছে। নিজের পরীক্ষামূলক session যাচাই করে শুধু সেটি Stripe API-তে expire করা হয়েছে।

নিজের তৈরি স্বাক্ষরযুক্ত বিজ্ঞপ্তি পাঠানো হয়নি, অ্যাপের webhook handler সরাসরি ডাকা হয়নি এবং reconcile endpoint দিয়ে ফল বদলানো হয়নি। Stripe-এর তৈরি `checkout.session.expired` ঘটনার পরিচয় `evt_1UOGxZDpm6kSsUsIewagL3wG`। অ্যাপের PaymentAttempt ও Payment দুটিই FAILED, paidAt শূন্য এবং PAYMENT_SUCCESS লগ শূন্য। সম্মুখভাগের প্রকৃত payment-detail API-তেও HTTP 200 ও FAILED পাওয়া গেছে।

প্রথম পর্যবেক্ষণে ডেটাবেস বদলালেও Stripe-এ pending_webhooks ছিল 1, তাই তখন সম্পূর্ণ সফল ঘোষণা করা হয়নি। আবার প্রদানকারীর কাছ থেকে পড়ে pending_webhooks 0 নিশ্চিত হয়েছে। এই পরীক্ষামূলক অ্যাকাউন্টে endpoint তালিকায় একটিই সক্রিয় endpoint রয়েছে, যা সঠিক প্রকাশ্য পথে এই ঘটনা গ্রহণ করে। ফলে প্রকৃত বাইরের বিজ্ঞপ্তি গ্রহণ ও মেয়াদ-শেষ নিষ্পত্তির প্রমাণ পাওয়া গেছে; এটি সফল অর্থপ্রদানের বিজ্ঞপ্তি নয়।

### bKash: গ্রাহক অনুমোদন ও callback-এর পৃথক সমস্যা

পার্সেল `7f7ba0d7-3da8-4da7-97a9-fc6d66f56f10`, চেষ্টা `d74c7adc-c20f-4af5-babe-e6aca626efe6`, প্রদানকারীর পরিচয় `TR001157WRHGQ1791464337213`। ব্যবহারকারীর পাঠানো নতুন স্ক্রিনশটে `Payment Failed — Your wallet is locked` দেখা গেছে। আর OTP/PIN চেষ্টা করার অনুরোধ করা হয়নি; সক্রিয় বা আনলক করা অনুমোদিত স্যান্ডবক্স ওয়ালেট প্রদানকারীর কাছ থেকে নিতে হবে।

এই নতুন লেনদেনের failure প্রত্যাবর্তনও `/api/v1?paymentID=...`-এ গেছে, সঠিক `/api/v1/payments/bkash/callback`-এ নয়। ব্যবহারকারীর ছবিতে সেই ভুল পথে `API Not Found` স্পষ্ট। তাই প্রকাশিত ব্যাকএন্ডের BKASH_CALLBACK_URL মানটি আবার পূর্ণ সঠিক পথসহ নিশ্চিত করতে হবে; পরিবর্তন পুরোনো লেনদেনের callback বদলায় না। নম্বর আনলক ও সঠিক প্রকাশনার পরে নতুন পরীক্ষার পার্সেল দিয়ে নতুন Checkout প্রয়োজন।

প্রদানকারীর স্যান্ডবক্সে আবার পরিচয় যাচাই ও payment/status পড়ে HTTP 200, statusCode 0000, transactionStatus Initiated, amount 120.00, currency BDT এবং কোনো trxID নেই পাওয়া গেছে। অ্যাপেও UNPAID। তাই শুধু browser failure থেকে FAILED বা PAID লেখা হয়নি।

### পরীক্ষার সীমা ও রেখে দেওয়া তথ্য

ব্রাউজার নিয়ন্ত্রণ নতুন প্রচেষ্টাতেও `trusted Node process exited unexpectedly; kernel reset, rerun your request` ত্রুটিতে চালু হয়নি। প্রকৃত সম্মুখভাগের API proxy পরীক্ষা হয়েছে, কিন্তু UI ফর্মে লগইন ও Checkout বোতাম চাপার সম্পূর্ণ স্বয়ংক্রিয় পরীক্ষা হয়নি। প্রদানকারীর ফেরত দেওয়া লিংক অপরিবর্তিতভাবে ব্যবহারকারীর জন্য খোলা হয়েছে এবং শুধু প্রদানকারীর প্রকাশ্য পরীক্ষামূলক কার্ড/ওয়ালেট তথ্য দেওয়া হয়েছে। কোনো ব্যক্তিগত OTP/PIN বা প্রকৃত কার্ড চাওয়া হয়নি।

মেয়াদ-শেষ ও অপেক্ষমাণ পরীক্ষার Payment/PaymentAttempt এবং নিজস্ব তিনটি পার্সেল অনুসন্ধান ও পরবর্তী বিজ্ঞপ্তির জন্য তথ্যভান্ডারে রাখা হয়েছে; মুছে দেওয়া হয়নি। পরীক্ষার গ্রাহকের পাসওয়ার্ড এলোমেলো, গিট বা প্রতিবেদনে নেই; সেশন logout হয়েছে। Stripe-এর মূল Checkout অনুমোদিত না হওয়ায় সফল অর্থপ্রদানের প্রকৃত webhook, PAID অবস্থা ও সফলতার পুনরাবৃত্তি-প্রতিরোধ এই প্রকাশনায় এখনো যাচাই হয়নি।

নিচের অংশগুলি আগের প্রকাশনার পর্যবেক্ষণ ও নির্দেশনার ইতিহাস; বর্তমান ফল এই অংশে দেওয়া আছে।

## পুনঃপ্রকাশের পর সর্বশেষ যাচাই

পরীক্ষার প্রকাশ্য সম্মুখভাগ: https://courier-frontend-sigma.vercel.app

ব্যবহারকারীর অনুমতি অনুযায়ী বিদ্যমান Stripe পরীক্ষামূলক endpoint `we_1UOD84Dpm6kSsUsIbJ9PjMUF`-এর ঠিকানা `/api/v1/payments/stripe/webhook`-এ সংশোধন করা হয়েছে। endpoint সক্রিয় এবং `livemode: false`। আগের `payment_intent.succeeded` ঘটনা বজায় রেখে অ্যাপের চারটি Checkout Session ঘটনা যুক্ত করা হয়েছে; signing secret তৈরি বা বদলানো হয়নি।

প্রকাশ্য ব্যাকএন্ডের `/health/ready` আবার HTTP 200। সঠিক Stripe webhook পথে স্বাক্ষরবিহীন খালি POST এখন HTTP 400, বার্তা `Invalid webhook request`; আগে ছিল 503। এটি webhook গোপন মান উপস্থিত হওয়ার প্রমাণ, কিন্তু মানটি Stripe-এর endpoint secret-এর সঙ্গে মেলা বা প্রকৃত বিজ্ঞপ্তি সফল হওয়ার প্রমাণ নয়। অর্থপ্রদানের কোনো অবস্থা বদলানোর চেষ্টা এই অনুরোধে হয়নি।

সম্মুখভাগের `/bn/login` HTTP 200। তার `/api/backend/payments/stripe/webhook` proxy-ও বর্তমান ব্যাকএন্ডের একই প্রতিক্রিয়া ফেরায়। bKash callback-এ একটি অস্তিত্বহীন পরীক্ষার পরিচয় ও failure পাঠালে HTTP 404, `Payment attempt not found`; handler পৌঁছেছে, প্রদানকারীর execute বা নতুন লেনদেন হয়নি। নতুন bKash Checkout তৈরি না করায় প্রকাশ্য সার্ভার থেকে প্রদানকারীকে পাঠানো callback মান এখনো সরাসরি যাচাই হয়নি।

### এখনকার বাধা: প্রকাশ্য সম্মুখভাগ অনুমোদিত নয়

প্রকাশ্য ব্যাকএন্ড এখনো `Access-Control-Allow-Origin: http://localhost:3000` ফেরাচ্ছে। একটি অস্তিত্বহীন পরীক্ষার গ্রাহক দিয়ে, `Origin: https://courier-frontend-sigma.vercel.app` এবং অ্যাপের `X-Courier-Client: 1` হেডারসহ লগইনের অনুরোধ করা হয়েছে। সরাসরি ব্যাকএন্ড ও সম্মুখভাগের প্রকৃত `/api/backend/auth/login` proxy—দুটিতেই HTTP 403 এবং `Request origin is not allowed` এসেছে। পরীক্ষায় কোনো ব্যক্তিগত গ্রাহকের শংসাপত্র ব্যবহার হয়নি; নতুন গ্রাহকও তৈরি হয়নি।

ব্যাকএন্ডের Vercel পরিবেশে নিচের মান বসিয়ে পুনঃপ্রকাশ প্রয়োজন:

```text
FRONTEND_URL=https://courier-frontend-sigma.vercel.app
```

শুধু CORS নয়, অ্যাপের CSRF যাচাইও এই মানের origin ব্যবহার করে। Stripe success/cancel এবং bKash-এর চূড়ান্ত প্রত্যাবর্তনের ঠিকানাও এই মান থেকে তৈরি হয়। তাই নিরাপত্তা যাচাই বাদ দিয়ে, Origin সরিয়ে বা localhost পরিচয় দিয়ে পূর্ণ ব্যবহারকারী-পথ সফল দেখানো হয়নি। কোনো নতুন Checkout লেনদেন বা পরীক্ষার পার্সেল তৈরি করা হয়নি।

ব্রাউজার পরীক্ষা চালাতে computer-use নির্দেশনা পড়া হয়েছে। প্রকাশ্য লগইন পাতা খোলার browser-control প্রচেষ্টা `trusted Node process exited unexpectedly; kernel reset, rerun your request` ত্রুটিতে ব্যর্থ হয়েছে; কোনো UI ইনপুট দেওয়া হয়নি। উপরের HTTP যাচাই সরাসরি নেটওয়ার্ক অনুরোধে করা হয়েছে, ব্রাউজারভিত্তিক পূর্ণ ব্যবহারকারী পরীক্ষা হিসেবে দাবি করা হয়নি।

নিচের প্রাথমিক পর্যবেক্ষণগুলি আগের প্রকাশনার ইতিহাস। Stripe ঠিকানা ও গোপন মান অনুপস্থিতির আগের বাধা উপরের অবস্থায় পরিবর্তিত হয়েছে; সম্পূর্ণ Checkout ও প্রকৃত webhook পৌঁছানোর পরীক্ষা এখনো অসম্পূর্ণ।

## সম্পন্ন যাচাই

মূল শাখা `1f4c420`-এ মার্জ করা সংশোধন উপস্থিত। প্রকাশ্য `/`, `/health/live` এবং `/health/ready` ঠিকানায় HTTP 200 পাওয়া গেছে। প্রস্তুতি পরীক্ষায় ডেটাবেস ও Redis সংযোগ কাজ করছে; এটি স্থানীয় ও প্রকাশ্য সার্ভারের ডেটাবেস একই হওয়ার প্রমাণ নয়।

স্থানীয় Stripe শংসাপত্র পরীক্ষামূলক; প্রদানকারীর ব্যালেন্স প্রতিক্রিয়ায় `livemode: false`। স্থানীয় bKash সংযোগ স্যান্ডবক্সের `tokenized.sandbox.bka.sh`-এ। প্রকাশ্য সার্ভারের গোপন Stripe ও bKash শংসাপত্র আলাদাভাবে যাচাই করা হয়নি। ব্যবহারকারী আগের পরীক্ষামূলক ইমেইল ইনবক্সে পাওয়া নিশ্চিত করেছেন; নতুন ইমেইল পাঠানো হয়নি।

## Checkout-এর আগে পাওয়া বাধা

| যাচাই | পাওয়া ফল | প্রয়োজনীয় পরিবর্তন |
| --- | --- | --- |
| স্থানীয় BKASH_CALLBACK_URL | প্রকাশ্য ডোমেইন, কিন্তু পথ `/api/v1`; সেখানে GET-এ 404 | নিচের পূর্ণ callback ঠিকানা স্থানীয় ও Vercel পরিবেশে বসাতে হবে |
| নিবন্ধিত Stripe পরীক্ষামূলক webhook | সক্রিয় endpoint `we_1UOD84Dpm6kSsUsIbJ9PjMUF`, পথ `/api/v1/payments/webhook` | বর্তমান কোডের `/api/v1/payments/stripe/webhook` পথে নিবন্ধন সংশোধন করতে হবে |
| পুরোনো Stripe webhook পথ | স্বাক্ষরবিহীন খালি POST-এ 400, বার্তা `Validation failed`; প্রত্যাশিত webhook handler নয় | এটিকে webhook গ্রহণের সফলতা ধরা যাবে না |
| সঠিক Stripe webhook পথ | স্বাক্ষরবিহীন খালি POST-এ 503, বার্তা `Stripe webhook is not configured` | সংশ্লিষ্ট endpoint-এর signing secret Vercel-এ বসিয়ে পুনঃপ্রকাশ করতে হবে |
| সম্মুখভাগের সংযোগ | স্থানীয় `.env.local`-এ API_BASE_URL নেই; বিকল্প পরিবেশ-মান না থাকলে কোডের fallback স্থানীয় ব্যাকএন্ড | পরীক্ষার সম্মুখভাগ ও তার upstream API ঠিকানা নিশ্চিত করতে হবে |

বর্তমান Stripe endpoint-এ `checkout.session.completed` ও `payment_intent.succeeded` নিবন্ধিত। অ্যাপ Checkout নিষ্পত্তির জন্য Checkout Session ঘটনা ব্যবহার করে; PaymentIntent ঘটনা একা এই অ্যাপের পার্সেলের অর্থপ্রদান নিষ্পত্তি করে না। অ্যাপের সমর্থিত ঘটনাগুলি:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

সঠিক প্রত্যাবর্তনের ঠিকানা:

```text
BKASH_CALLBACK_URL=https://courier-logistics-backend-lake.vercel.app/api/v1/payments/bkash/callback
```

সঠিক Stripe বিজ্ঞপ্তির ঠিকানা:

```text
https://courier-logistics-backend-lake.vercel.app/api/v1/payments/stripe/webhook
```

পরীক্ষার সম্মুখভাগে API সংযোগ:

```text
API_BASE_URL=https://courier-logistics-backend-lake.vercel.app/api/v1
```

ব্যাকএন্ডের `FRONTEND_URL` পরীক্ষার আসল সম্মুখভাগের origin-এর সঙ্গে মিলতে হবে। স্থানীয় মান এখন `http://localhost:3000`; প্রকাশ্য সার্ভারের মান এই পরীক্ষা থেকে জানা যায়নি। স্থানীয় `.env` পরিবর্তন Vercel-এর পরিবেশ-মান আপডেট করে না। Next-এর rewrite কনফিগারেশন বদলানোর পরে পরীক্ষার সম্মুখভাগ পুনরায় শুরু বা পুনর্নির্মাণ করতে হবে। Signing secret চ্যাট বা গিটে নয়, নিজের গোপন পরিবেশ-মান হিসেবে রাখতে হবে।

## পরবর্তী যাচাইয়ের শর্ত

সংশোধিত Vercel পরিবেশসহ পুনঃপ্রকাশ, Stripe পরীক্ষামূলক endpoint-এর সঠিক ঠিকানা এবং পরীক্ষার সম্মুখভাগ নিশ্চিত করার পরে নিজের পরীক্ষার গ্রাহক ও পার্সেল দিয়ে Checkout চালাতে হবে। প্রকাশ্য অ্যাপের শংসাপত্র পরীক্ষামূলক নিশ্চিত না করে কোনো অর্থপ্রদান শুরু করা যাবে না।

Stripe-এর ক্ষেত্রে প্রদানকারীর প্রকৃত `checkout.session.completed` বিজ্ঞপ্তি সঠিক পথে পৌঁছানো, সফল HTTP প্রতিক্রিয়া, ডেটাবেসে PAID অবস্থা এবং পুনরাবৃত্ত বিজ্ঞপ্তিতে একবার সফলতার লগ যাচাই করতে হবে। bKash-এর ক্ষেত্রে গ্রাহক অনুমোদন, সঠিক callback, execute, প্রদানকারীর Completed অবস্থা এবং অ্যাপের PAID অবস্থা মিলতে হবে। bKash-এর browser callback-কে Stripe-এর সার্ভার-থেকে-সার্ভার webhook বলে গণ্য করা যাবে না।

এই ধাপে কোনো নতুন Checkout লেনদেন, পরীক্ষার গ্রাহক/পার্সেল বা অর্থপ্রদানের রেকর্ড তৈরি করা হয়নি। Stripe endpoint বা Vercel সেটিং পরিবর্তন করা হয়নি। স্থানীয় গোপন পরিবেশ-ফাইলও বদলানো হয়নি। সম্পূর্ণ Checkout বা প্রকৃত বহিরাগত webhook যাচাই এখনো সফল দাবি করা হচ্ছে না।

প্রদানকারীর নির্দেশনা: [Stripe webhook](https://docs.stripe.com/webhooks), [Checkout নিষ্পত্তি](https://docs.stripe.com/checkout/fulfillment)।
