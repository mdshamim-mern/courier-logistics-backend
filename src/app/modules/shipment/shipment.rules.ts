import { Role, ShipmentStatus } from "@prisma/client";

export const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  PENDING: [ShipmentStatus.ASSIGNED, ShipmentStatus.CANCELLED],
  ASSIGNED: [ShipmentStatus.PICKED_UP, ShipmentStatus.CANCELLED],
  PICKED_UP: [ShipmentStatus.AT_ORIGIN_HUB],
  AT_ORIGIN_HUB: [ShipmentStatus.IN_TRANSIT],
  IN_TRANSIT: [ShipmentStatus.AT_DESTINATION_HUB],
  AT_DESTINATION_HUB: [ShipmentStatus.OUT_FOR_DELIVERY],
  OUT_FOR_DELIVERY: [ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED],
  DELIVERY_FAILED: [ShipmentStatus.RETURNED],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

export const ACTIVE_SHIPMENT_STATUSES = Object.values(ShipmentStatus).filter(status => ![
  ShipmentStatus.PENDING, ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED, ShipmentStatus.CANCELLED,
].includes(status as "PENDING" | "DELIVERED" | "RETURNED" | "CANCELLED"));

export function nextShipmentStatuses(status: ShipmentStatus, role: string) {
  if (role === Role.CUSTOMER) return status === ShipmentStatus.PENDING ? [ShipmentStatus.CANCELLED] : [];
  return ALLOWED_TRANSITIONS[status].filter(next => next !== ShipmentStatus.ASSIGNED && (role === Role.ADMIN || next !== ShipmentStatus.CANCELLED));
}
