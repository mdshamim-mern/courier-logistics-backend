import { PrismaClient } from "@prisma/client";
import app from "./app/app";
import config from "./app/config";
import { connectRedis } from "./app/utils/redis";

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    await connectRedis();

    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });
  } catch (err) {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();