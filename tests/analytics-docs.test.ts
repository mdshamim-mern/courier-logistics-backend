import "./environment";
import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import http from "node:http";
import express from "express";
import { prisma } from "../src/app/utils/prisma";
import { AdminService } from "../src/app/modules/admin/admin.service";
import { registerDocumentation } from "../src/app/documentation";

const originals = {userCount: prisma.user.count, shipmentCount: prisma.shipment.count, groupBy: prisma.shipment.groupBy, aggregate: prisma.payment.aggregate};
afterEach(() => { mock.restoreAll(); prisma.user.count = originals.userCount; prisma.shipment.count = originals.shipmentCount; prisma.shipment.groupBy = originals.groupBy; prisma.payment.aggregate = originals.aggregate; });
test("dashboard charts return verified fees with six-month timezone-aware aggregation", async () => {
  prisma.user.count = (async () => 3) as typeof prisma.user.count;
  prisma.shipment.count = (async () => 7) as typeof prisma.shipment.count;
  prisma.shipment.groupBy = (async () => [{status: "DELIVERED", _count: {status: 7}}]) as typeof prisma.shipment.groupBy;
  prisma.payment.aggregate = (async () => ({_sum: {amount: 456}})) as typeof prisma.payment.aggregate;
  let sql = "";
  mock.method(prisma, "$queryRaw", async (parts: TemplateStringsArray) => {
    sql = parts.join("");
    return [{month: "2026-10", amount: 456}];
  });
  const result = await AdminService.getDashboardStats();
  assert.equal(result.totalRevenue, 456);
  assert.deepEqual(result.monthlyRevenue, [{month: "2026-10", amount: 456}]);
  assert.match(sql, /generate_series/);
  assert.match(sql, /LEFT JOIN "payments"/);
  assert.match(sql, /Asia\/Dhaka/);
  assert.match(sql, /p.status = 'PAID'/);
  assert.match(sql, /p\."isDeleted" = false/);
});

test("public reference and both safe Postman downloads are reachable", async () => {
  const app = express();
  registerDocumentation(app);
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address() as {port: number};
    const base = "http://127.0.0.1:" + address.port;
    const reference = await fetch(base + "/docs");
    assert.equal(reference.status, 200);
    assert.match(await reference.text(), /HttpOnly/);
    for (const slug of ["collection", "environment"]) {
      const response = await fetch(base + "/docs/postman/" + slug);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.ok(slug === "collection" ? body.item.length : body.values.length);
      assert.match(response.headers.get("content-disposition") || "", /attachment/);
    }
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
