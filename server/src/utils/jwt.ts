import jwt, { type SignOptions } from "jsonwebtoken";
import "dotenv/config";

export interface AccessTokenPayload {
  sub: number;
  role: string;
  departmentId: number | null;
}

export interface RefreshTokenPayload {
  sub: number;
  tokenVersion: number;
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
const ACCESS_TTL = (process.env.ACCESS_TOKEN_TTL ?? "15m") as SignOptions["expiresIn"];
const REFRESH_TTL = (process.env.REFRESH_TOKEN_TTL ?? "7d") as SignOptions["expiresIn"];

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error("JWT secrets are not configured. Check your .env file.");
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as unknown as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as unknown as RefreshTokenPayload;
}
