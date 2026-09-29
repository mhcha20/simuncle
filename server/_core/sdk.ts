import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { timingSafeEqual } from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

/** Result of `sdk.authenticateRequest`. */
export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

/** Secret the built-in scheduler and external cron services present as `Authorization: Bearer <secret>`. */
let internalCronSecret = ENV.cronSecret;

/** Set by the scheduler when CRON_SECRET is unset, so it can still call its own endpoints. */
export function setInternalCronSecret(secret: string) {
  internalCronSecret = secret;
}

function isCronRequest(req: Request): boolean {
  if (!internalCronSecret) return false;
  const header = req.headers.authorization ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice(7));
  const expected = Buffer.from(internalCronSecret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const cronUser = (): AuthenticatedUser => {
  const now = new Date();
  return {
    id: -1,
    openId: "cron",
    name: "Scheduled task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: "cron",
    isCron: true,
  };
};

/** Session cookie handling (signed HS256 JWT). Login itself lives in ./auth.ts. */
class SessionService {
  private getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    return new SignJWT({ openId, appId: ENV.appId, name: options.name || "" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor((Date.now() + expiresInMs) / 1000))
      .sign(this.getSessionSecret());
  }

  async verifySession(cookieValue: string | undefined | null): Promise<SessionPayload | null> {
    if (!cookieValue) return null;
    try {
      const { payload } = await jwtVerify(cookieValue, this.getSessionSecret(), { algorithms: ["HS256"] });
      const { openId, appId, name } = payload as Record<string, unknown>;
      if (!isNonEmptyString(openId) || appId !== ENV.appId) return null;
      return { openId, appId: ENV.appId, name: typeof name === "string" ? name : "" };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    // Scheduled jobs authenticate with the shared cron secret instead of a session.
    if (isCronRequest(req)) return cronUser();

    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    const session = await this.verifySession(cookies[COOKIE_NAME]);
    if (!session) throw ForbiddenError("Invalid session cookie");

    const user = await db.getUserByOpenId(session.openId);
    if (!user) throw ForbiddenError("User not found");
    return user;
  }
}

export const sdk = new SessionService();
