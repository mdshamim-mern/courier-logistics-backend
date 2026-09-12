import { PrismaClient, Role, UserStatus, AuthProvider } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@courier.com";
  const courierEmail = "courier@courier.com";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("Admin@12345", 10);
    await prisma.user.create({
      data: {
        name: "Demo Admin",
        email: adminEmail,
        password: hashedPassword,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.CREDENTIAL,
        emailVerified: true,
      },
    });
  }

  const existingCourier = await prisma.user.findUnique({
    where: { email: courierEmail },
  });

  if (!existingCourier) {
    const hashedPassword = await bcrypt.hash("Courier@1234", 10);
    const courierUser = await prisma.user.create({
      data: {
        name: "Demo Courier",
        email: courierEmail,
        password: hashedPassword,
        role: Role.COURIER,
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.CREDENTIAL,
        emailVerified: true,
      },
    });

    await prisma.courier.create({
      data: {
        userId: courierUser.id,
        contactNumber: "01700000000",
        isAvailable: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });