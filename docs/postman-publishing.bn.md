# Dropzo — Updated Postman documentation প্রকাশ

পুরোনো প্রকাশনা: https://documenter.getpostman.com/view/56161283/2sBYB1P8Wz
সর্বশেষ public reference: https://courier-logistics-backend-lake.vercel.app/docs
Collection: https://courier-logistics-backend-lake.vercel.app/docs/postman/collection
Environment: https://courier-logistics-backend-lake.vercel.app/docs/postman/environment

## কী বদলেছে

পুরোনো cleaned collection-এ ৩৭টি request এবং কোনো saved response example নেই। বর্তমান collection-এ ১২টি folder, ৬৭টি request example এবং ৬১টি unique route আছে: ৫৮টি versioned API ও ৩টি root/health route। Quote/bulk booking, coverage, merchant/worker reviews, COD ledger, hub handoff, recipient acknowledgment, Stripe checkout/webhook/reconciliation, courier earnings ও dashboard analytics অন্তর্ভুক্ত।

১৩১টি response example illustrative contract; কিছুতে শুধু প্রাসঙ্গিক field দেখানো হয়েছে। এগুলো live capture বা সব API পরীক্ষার প্রমাণ নয়। প্রতিটি request-এ সফল input-এর assertion আছে। Default safety script write/callback বন্ধ রাখে। Assertion থাকা মানেই request live-এ চালানো হয়েছে নয়।

## নিজের Postman account থেকে প্রকাশ

১. Collection ও environment download করে Postman-এ Import করুন।
২. নিজের workspace-এ collection রাখুন। পুরোনো collection replace করার আগে backup রাখুন। নতুন import পুরোনো Documenter URL নিজে থেকে update করে না।
৩. ১২টি folder, ৬৭টি request, description, body, response example, Tests এবং collection Pre-request script যাচাই করুন।
৪. Local environment-এ authorized demo password দিয়ে login → GET /users/me চালিয়ে cookie session যাচাই করুন। Login JSON থেকে token কপি করার পুরোনো পদ্ধতি ব্যবহার করবেন না।
৫. Collection documentation-এর publish/share ব্যবস্থায় public documentation প্রকাশ করুন। Preview-তে সব folder/response আছে কিনা দেখুন। UI সংস্করণ অনুযায়ী menu label ভিন্ন হতে পারে।
৬. Password/session/OTP/signature পূরণ করা local environment প্রকাশ করবেন না। Safe blank export ব্যবহার করুন, অথবা environment ছাড়া প্রকাশ করুন।
৭. Generated Documenter link guest/incognito browser-এ খুলুন। /operations/quote, /shipments/bulk, /payments/stripe/initiate এবং courier history-earnings আছে কিনা দেখুন।
৮. নতুন verified link frontend README ও submission-এর API Documentation field-এ বসান। ততক্ষণ /docs-এ updated সব endpoint পাওয়া যায়।

## নিরাপদ পরীক্ষা

- Health ও coverage → নির্দিষ্ট role login → users/me → অনুমোদিত read endpoint → logout।
- Quote-এর জন্য প্রকৃত area UUID এবং ভবিষ্যৎ pickup time বসান।
- Authorized booking-এর আগে merchant/COD eligibility, exact quote/version ও request UUID যাচাই করুন। কেবল নির্দিষ্ট request-এর write flag চালু করুন।
- Provider test checkout সম্পন্ন না করে PAID দাবি করবেন না; fabricated callback ID/signature ব্যবহার করবেন না।
- Live response save করলে personal data, cookies, signatures ও provider secrets বাদ দিন। কোন পরিবেশে কখন পরীক্ষা হয়েছে আলাদা লিখুন।
- Role/workflow dependency-র কারণে সব request একসঙ্গে Run All করবেন না, বিশেষ করে writes enabled অবস্থায়।

## Submission

Project Name: Courier & Logistics Platform (Dropzo)
Backend Repo: https://github.com/mdshamim-mern/courier-logistics-backend
Frontend Repo: https://github.com/mdshamim-mern/courier-frontend
Live Backend URL: https://courier-logistics-backend-lake.vercel.app
Live Frontend URL: https://courier-frontend-sigma.vercel.app
API Documentation: https://courier-logistics-backend-lake.vercel.app/docs
Demo Video: আপনার বাস্তব ৫–১০ মিনিটের shareable recording link দরকার।
Demo Admin Email: admin@courier.com
Demo Admin Password: Admin@12345

Account access ছাড়া পুরোনো Postman publication বদলানো যায় না। শুধু Documenter URL account ownership বা edit access দেয় না। Backend README নির্দেশ অনুযায়ী অপরিবর্তিত; সঠিক current authentication/API-এর জন্য updated reference দেখুন।
