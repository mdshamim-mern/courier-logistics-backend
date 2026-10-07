import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject } from "zod";

const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        cookies: req.cookies,
        params: req.params,
      });

      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.cookies !== undefined) req.cookies = parsed.cookies;
      if (parsed.params !== undefined) req.params = parsed.params;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validateRequest;
