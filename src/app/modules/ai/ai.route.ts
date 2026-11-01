import express from "express";
import { z } from "zod";
import auth from "../../middlewares/auth";
import catchAsync from "../../utils/catchAsync";
import { prisma } from "../../utils/prisma";
import { redisClient } from "../../utils/redis";
import { AppError } from "../../errors/AppError";

export const AiRoutes = express.Router();
// Quota is shared across serverless instances and tied to the authenticated user.
export async function getAiContext(user: { userId: string; role: "ADMIN" | "CUSTOMER" | "COURIER" }, body: unknown) {
  const { mode } = z.object({ mode: z.enum(["support", "insights"]) }).parse(body);
  const hits = await redisClient.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],3600) end; return n", { keys: [`ai:quota:${user.userId}`], arguments: [] });
  if (Number(hits) > 15) throw new AppError(429, "AI hourly limit reached. Please try again later.");
  const where = { isDeleted: false, ...(user.role === "CUSTOMER" ? { senderId: user.userId } : user.role === "COURIER" ? { courierId: user.userId } : {}) };
  const counts = mode === "insights" ? await prisma.shipment.groupBy({ by: ["status"], where, _count: { status: true } }) : [];
  return { role: user.role, counts: counts.map(row => ({ status: row.status, count: row._count.status })), generatedAt: new Date().toISOString() };
}
AiRoutes.post("/context", auth("CUSTOMER", "ADMIN", "COURIER"), catchAsync(async (req, res) => {
  const data = await getAiContext(req.user, req.body);
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ success: true, data });
}));
