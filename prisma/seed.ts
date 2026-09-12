import { PrismaClient, Role, UserStatus, AuthProvider } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@courier.com";

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