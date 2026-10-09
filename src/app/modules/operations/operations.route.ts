import express from "express";
import { z } from "zod";
import auth from "../../middlewares/auth";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { OperationsService as service } from "./operations.service";
const router = express.Router();
const id = (value: string) => z.string().uuid().parse(value);
const action = (fn: (req: express.Request) => Promise<unknown>) =>
	catchAsync(async (req, res) => {
		const data = await fn(req);
		sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Operation completed",
			data,
		});
	});
router.get(
	"/coverage",
	action(() => service.coverage()),
);
router.post(
	"/quote",
	action((req) => service.quote(req.body)),
);
router.post(
	"/quotes",
	auth("CUSTOMER"),
	action((req) => service.quotes(req.body)),
);
router.get(
	"/mine",
	auth("CUSTOMER", "COURIER"),
	action((req) => service.mine(req.user)),
);
router.put(
	"/business",
	auth("CUSTOMER"),
	action((req) => service.business(req.body, req.user)),
);
router.post(
	"/applications",
	auth("CUSTOMER"),
	action((req) => service.apply(req.body, req.user)),
);
router.get(
	"/admin",
	auth("ADMIN"),
	action(() => service.admin()),
);
router.post(
	"/areas",
	auth("ADMIN"),
	action((req) => service.configure("area", req.body, req.user)),
);
router.patch(
	"/areas/:id",
	auth("ADMIN"),
	action((req) =>
		service.configure("area", req.body, req.user, id(req.params.id)),
	),
);
router.post(
	"/rates",
	auth("ADMIN"),
	action((req) => service.configure("rate", req.body, req.user)),
);
router.patch(
	"/rates/:id",
	auth("ADMIN"),
	action((req) =>
		service.configure("rate", req.body, req.user, id(req.params.id)),
	),
);
router.patch(
	"/business/:id/review",
	auth("ADMIN"),
	action((req) =>
		service.review("business", id(req.params.id), req.body, req.user),
	),
);
router.patch(
	"/applications/:id/review",
	auth("ADMIN"),
	action((req) =>
		service.review("application", id(req.params.id), req.body, req.user),
	),
);
router.patch(
	"/collections/:id",
	auth("ADMIN"),
	action((req) => service.settle(id(req.params.id), req.body, req.user)),
);
export const OperationsRoutes = router;
