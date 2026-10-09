export function assertOwnedRecoverySchema(schema, expectedOid, currentOid) {
	if (!/^courier_recovery_[a-f0-9]{32}_test$/.test(schema))
		throw new Error("Recovery requires a runner-owned schema");
	if (
		!Number.isInteger(expectedOid) ||
		expectedOid <= 0 ||
		currentOid !== expectedOid
	)
		throw new Error("Recovery schema ownership changed");
}
