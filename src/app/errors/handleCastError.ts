const handleCastError = (err: { path?: string; message?: string }) => {
  const statusCode = 400;
  
  const errorSources = [
    {
      path: err.path || "id",
      message: err.message || "Invalid data type provided",
    },
  ];

  return {
    statusCode,
    message: "Invalid Type Error",
    errorSources,
  };
};

export default handleCastError;
