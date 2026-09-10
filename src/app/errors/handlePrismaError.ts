import { Prisma } from "@prisma/client";

const handlePrismaError = (err: Prisma.PrismaClientKnownRequestError) => {
  let errorSources = [];
  let message = "";
  const statusCode = 400;

  if (err.code === "P2025") {
    message = "Record not found";
    errorSources = [
      {
        path: "",
        message: err.meta?.cause as string || "Record not found",
      },
    ];
  } else if (err.code === "P2003") {
    message = "Foreign key constraint failed";
    errorSources = [
      {
        path: "",
        message: "Foreign key constraint failed on the field",
      },
    ];
  } else {
    message = "Prisma Request Error";
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  }

  return {
    statusCode,
    message,
    errorSources,
  };
};

export default handlePrismaError;