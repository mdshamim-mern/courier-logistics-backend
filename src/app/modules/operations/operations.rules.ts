import { Prisma } from "@prisma/client";
export function calculateQuote(
	rate: {
		baseWeight: Prisma.Decimal | number;
		baseCharge: Prisma.Decimal | number;
		extraPerKg: Prisma.Decimal | number;
		pickupFee: Prisma.Decimal | number;
		codPercent: Prisma.Decimal | number;
	},
	weight: number,
	codAmount: number,
	pickupMode: string,
) {
	const extraUnits = Prisma.Decimal.max(
		new Prisma.Decimal(weight).minus(rate.baseWeight),
		0,
	).ceil();
	const base = new Prisma.Decimal(rate.baseCharge);
	const extra = extraUnits.mul(rate.extraPerKg);
	const pickup = new Prisma.Decimal(pickupMode === "HOME" ? rate.pickupFee : 0);
	const codFee = new Prisma.Decimal(codAmount)
		.mul(rate.codPercent)
		.div(100)
		.toDecimalPlaces(2);
	return {
		baseCharge: base.toString(),
		extraWeightCharge: extra.toString(),
		pickupFee: pickup.toString(),
		deliveryCharge: base.add(extra).add(pickup).toDecimalPlaces(2).toString(),
		codFee: codFee.toString(),
		merchantPayable: new Prisma.Decimal(codAmount)
			.minus(codFee)
			.toDecimalPlaces(2)
			.toString(),
	};
}

export function collectionAvailable(
	area: { pickupEnabled: boolean; dropoffEnabled: boolean },
	mode: string,
) {
	return mode === "BRANCH" ? area.dropoffEnabled : area.pickupEnabled;
}
export function deliveryServiceAtCutoff(
	serviceType: string,
	cutoffMinutes: number | null,
	now: Date,
	requestedPickupAt?: string,
) {
	if (serviceType !== "SAME_DAY") return serviceType;
	if (!cutoffMinutes || cutoffMinutes < 1 || cutoffMinutes > 1439)
		throw new Error("Same-day cutoff is not configured");
	const local = new Date(now.getTime() + 6 * 3600000);
	const requested = new Date(
		(requestedPickupAt ? Date.parse(requestedPickupAt) : now.getTime()) +
			6 * 3600000,
	);
	const sameDate =
		local.toISOString().slice(0, 10) === requested.toISOString().slice(0, 10);
	return !sameDate ||
		local.getUTCHours() * 60 + local.getUTCMinutes() >= cutoffMinutes
		? "NEXT_DAY"
		: "SAME_DAY";
}
