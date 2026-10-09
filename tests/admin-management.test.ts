import "./environment";
import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { Role } from "@prisma/client";
import { prisma } from "../src/app/utils/prisma";
import { HubService } from "../src/app/modules/hub/hub.service";
import { HubValidation } from "../src/app/modules/hub/hub.validation";
import { CourierService } from "../src/app/modules/courier/courier.service";

const originalHubFind = prisma.hub.findUnique;
const originalCourierFind = prisma.courier.findUnique;
const originalShipmentCount = prisma.shipment.count;
afterEach(() => { mock.restoreAll(); prisma.hub.findUnique = originalHubFind; prisma.courier.findUnique = originalCourierFind; prisma.shipment.count = originalShipmentCount; });
const hubId = "11111111-1111-4111-8111-111111111111";
const nextHubId = "22222222-2222-4222-8222-222222222222";

for (const linked of ["serviceArea", "courier", "shipment", "shipmentTransfer", "shipmentTracking"]) {
  test(`hub deletion rejects linked ${linked} records without archiving`, async () => {
    let archived = false;
    const tx: any = { $queryRaw: async () => [], hub: { findUnique: async () => ({ id: hubId }), update: async () => { archived = true; } } };
    for (const name of ["serviceArea", "courier", "shipment", "shipmentTransfer", "shipmentTracking"]) tx[name] = { count: async () => name === linked ? 1 : 0 };
    mock.method(prisma, "$transaction", async (callback: any) => callback(tx));
    await assert.rejects(HubService.deleteHub(hubId), (error: any) => error.statusCode === 409 && error.message.includes("Hub is in use"));
    assert.equal(archived, false);
  });
}

test("unused hub deletion is a recoverable soft archive", async () => {
  let data: any;
  const tx: any = { $queryRaw: async () => [], hub: { findUnique: async () => ({ id: hubId }), update: async (input: any) => { data = input.data; return { id: hubId, ...data }; } } };
  for (const name of ["serviceArea", "courier", "shipment", "shipmentTransfer", "shipmentTracking"]) tx[name] = { count: async () => 0 };
  mock.method(prisma, "$transaction", async (callback: any) => callback(tx));
  await HubService.deleteHub(hubId);
  assert.equal(data.isDeleted, true);
  assert.ok(data.deletedAt instanceof Date);
});

test("deleted or unknown hub cannot be archived twice", async () => {
  mock.method(prisma, "$transaction", async (callback: any) => callback({ $queryRaw: async () => [], hub: { findUnique: async () => null } }));
  await assert.rejects(HubService.deleteHub(hubId), (error: any) => error.statusCode === 404);
});

test("hub validation trims names and rejects hidden or empty mutations", () => {
  assert.equal(HubValidation.CreateHubSchema.parse({ body: { name: " Test Hub ", location: "Dhaka", address: "Address" } }).body.name, "Test Hub");
  assert.throws(() => HubValidation.CreateHubSchema.parse({ body: { name: " ", location: "Dhaka", address: "Address" } }));
  assert.throws(() => HubValidation.UpdateHubSchema.parse({ body: { isDeleted: true } }));
  assert.throws(() => HubValidation.UpdateHubSchema.parse({ body: {} }));
});

test("duplicate hub name returns a conflict without updating", async () => {
  prisma.hub.findUnique = (async (input: any) => input.where.id ? { id: hubId, name: "Original" } : { id: nextHubId, name: "Taken" }) as typeof prisma.hub.findUnique;
  await assert.rejects(HubService.updateHub(hubId, { name: "Taken" }), (error: any) => error.statusCode === 409);
});

test("active courier workload prevents reassignment to another hub", async () => {
  prisma.courier.findUnique = (async () => ({ id: hubId, userId: "worker", currentHubId: hubId })) as typeof prisma.courier.findUnique;
  prisma.hub.findUnique = (async () => ({ id: nextHubId })) as typeof prisma.hub.findUnique;
  prisma.shipment.count = (async () => 1) as typeof prisma.shipment.count;
  await assert.rejects(CourierService.updateCourierProfile(hubId, { currentHubId: nextHubId }, { userId: "admin", role: Role.ADMIN }), (error: any) => error.statusCode === 409 && error.message.includes("active parcel assignments"));
});

test("courier creation rejects an inactive hub before writing an account", async () => {
  prisma.hub.findUnique = (async () => null) as typeof prisma.hub.findUnique;
  await assert.rejects(CourierService.createCourier({ name: "Worker", email: "worker@example.test", password: "A-test-Password1!", contactNumber: "01700112233", currentHubId: hubId }), (error: any) => error.statusCode === 400);
});
