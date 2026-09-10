import { Prisma } from "@prisma/client";

const handleDuplicateError = (err: Prisma.PrismaClientKnownRequestError) => {
  const target = err.meta?.target as string[];
  const message = "Duplicate Entry Error";
  
  const errorSources = target?.map((field: string) => ({
    path: field,
    message: `The ${field} provided is already in use`,
  })) || [
    {
      path: "",
      message: "Duplicate value entered",
    }
  ];

  const statusCode = 409;

  return {
    statusCode,
    message,
    errorSources,
  };
};

export default handleDuplicateError;