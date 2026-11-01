import "./environment";
import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { prisma } from "../src/app/utils/prisma";
import { redisClient } from "../src/app/utils/redis";
import { getAiContext } from "../src/app/modules/ai/ai.route";
import { PaymentService } from "../src/app/modules/payment/payment.service";
const originals = { groupBy: prisma.shipment.groupBy, findMany: prisma.payment.findMany, count: prisma.payment.count };
afterEach(() => { mock.restoreAll(); prisma.shipment.groupBy = originals.groupBy; prisma.payment.findMany = originals.findMany; prisma.payment.count = originals.count; });
test("AI insights scope counts to the actor and omit individual records", async () => {
  mock.method(redisClient, "eval", async () => 1);
  for (const role of ["CUSTOMER", "COURIER", "ADMIN"] as const) {
    prisma.shipment.groupBy = (async (args: any) => {
      assert.deepEqual(args.where, { isDeleted: false, ...(role === "CUSTOMER" ? { senderId: "owner" } : role === "COURIER" ? { courierId: "owner" } : {}) });
      return [{ status: "PENDING", _count: { status: 3 }, receiverPhone: "must-not-leak" }];
    }) as typeof prisma.shipment.groupBy;
    const result = await getAiContext({ userId: "owner", role }, { mode: "insights" });
    assert.deepEqual(result.counts, [{ status: "PENDING", count: 3 }]);
    assert(!JSON.stringify(result).includes("must-not-leak"));
  }
});
test("AI quota and input validation block requests before querying shipments", async () => {
  let calls = 0;
  prisma.shipment.groupBy = (async () => { calls++; return []; }) as typeof prisma.shipment.groupBy;
  mock.method(redisClient, "eval", async () => 16);
  await assert.rejects(() => getAiContext({ userId: "owner", role: "CUSTOMER" }, { mode: "insights" }), (e: any) => e.statusCode === 429);
  await assert.rejects(() => getAiContext({ userId: "owner", role: "CUSTOMER" }, { mode: "wrong" }));
  assert.equal(calls, 0);
});
test("payment filtering keeps customer ownership and applies before pagination", async () => {
  let list: any;
  prisma.payment.findMany = ((args: any) => { list = args; return Promise.resolve([]); }) as typeof prisma.payment.findMany;
  prisma.payment.count = ((args: any) => { assert.deepEqual(args.where, list.where); return Promise.resolve(0); }) as typeof prisma.payment.count;
  mock.method(prisma, "$transaction", async (queries: any) => Promise.all(queries));
  await PaymentService.getPayments({ page: 2, limit: 10, status: "PAID", paymentGateway: "STRIPE", searchTerm: "TRK" }, { userId: "owner", role: "CUSTOMER" });
  assert.deepEqual(list.where.shipment, { senderId: "owner" });
  assert.equal(list.where.status, "PAID");
  assert.equal(list.where.paymentGateway, "STRIPE");
  assert.equal(list.where.OR.length, 2);
  assert.equal(list.skip, 10);
});
