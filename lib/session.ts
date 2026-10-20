// Edge-safe JWT helpers (used by middleware and server code). No Prisma imports here.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "session";

export type SessionPayload = {
  userId: string;
  role: string;
  name: string;
};

function getKey() {
  const secret = process.env.AUTH_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
