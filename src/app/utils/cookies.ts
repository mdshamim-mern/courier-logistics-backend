import type { CookieOptions, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config";

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.env === "production",
  sameSite: config.cookie_same_site,
  path: "/",
};

export function setSessionCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  for (const name of ["accessToken", "refreshToken"] as const) {
    const token = tokens[name];
    const expiry = (jwt.decode(token) as JwtPayload).exp;
    if (!expiry) throw new Error("Session token expiry is missing");
    res.cookie(name, token, { ...sessionCookieOptions, maxAge: Math.max(0, expiry * 1000 - Date.now()) });
  }
}

export function clearSessionCookies(res: Response) {
  res.clearCookie("accessToken", sessionCookieOptions);
  res.clearCookie("refreshToken", sessionCookieOptions);
}
