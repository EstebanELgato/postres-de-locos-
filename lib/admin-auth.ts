import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "postres_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type AdminSessionPayload = {
  sub: string;
  exp: number;
};

function getAdminSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;

  if (!secret) {
    throw new Error("Falta ADMIN_PASSWORD.");
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getAdminSecret()).update(value).digest("base64url");
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export function getAdminSessionMaxAge() {
  return SESSION_MAX_AGE_SECONDS;
}

export function createAdminSessionToken(username: string) {
  const payload: AdminSessionPayload = {
    sub: username,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

  return `${body}.${sign(body)}`;
}

export function verifyAdminSessionToken(token?: string) {
  const expectedUser = process.env.ADMIN_USER;

  if (!token || !expectedUser) {
    return false;
  }

  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return false;
  }

  const expectedSignature = sign(body);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AdminSessionPayload;
    return payload.sub === expectedUser && payload.exp > Date.now();
  } catch {
    return false;
  }
}
