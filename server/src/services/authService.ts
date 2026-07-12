import bcrypt from "bcryptjs";
import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import type { LoginInput, SignupInput } from "../validators/authValidators";

const SALT_ROUNDS = 12;

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: string;
  departmentId: number | null;
  status: string;
}

function toPublicUser(row: {
  id: number;
  name: string;
  email: string;
  role: string;
  department_id: number | null;
  status: string;
}): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    departmentId: row.department_id,
    status: row.status,
  };
}

export async function signup(input: SignupInput) {
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [input.email]);
  if (existing.rowCount) throw ApiError.conflict("An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  // Signup ALWAYS creates an Employee account, regardless of what's sent
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, department_id)
     VALUES ($1, $2, $3, 'Employee', $4)
     RETURNING id, name, email, role, department_id, status`,
    [input.name, input.email, passwordHash, input.departmentId ?? null]
  );
  return issueTokens(toPublicUser(rows[0]), 0);
}

export async function login(input: LoginInput) {
  const { rows } = await pool.query(
    `SELECT id, name, email, password_hash, role, department_id, status, refresh_token_version
     FROM users WHERE email = $1`,
    [input.email]
  );
  const user = rows[0];
  if (!user) throw ApiError.unauthorized("Invalid email or password");
  if (user.status !== "Active") throw ApiError.forbidden("Account is suspended");

  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  return issueTokens(toPublicUser(user), user.refresh_token_version);
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const { rows } = await pool.query(
    `SELECT id, name, email, role, department_id, status, refresh_token_version
     FROM users WHERE id = $1`,
    [payload.sub]
  );
  const user = rows[0];
  if (!user || user.refresh_token_version !== payload.tokenVersion) {
    throw ApiError.unauthorized("Refresh token no longer valid");
  }
  return issueTokens(toPublicUser(user), user.refresh_token_version);
}

/** Invalidate all refresh tokens for a user (logout everywhere). */
export async function logout(userId: number) {
  await pool.query("UPDATE users SET refresh_token_version = refresh_token_version + 1 WHERE id = $1", [
    userId,
  ]);
}

function issueTokens(user: PublicUser, tokenVersion: number) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, departmentId: user.departmentId });
  const refreshToken = signRefreshToken({ sub: user.id, tokenVersion });
  return { user, accessToken, refreshToken };
}
