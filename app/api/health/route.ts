import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Deployment health check. Reports only whether settings exist — never their values. */
export async function GET() {
  const env = Object.fromEntries(
    ["DATABASE_URL", "DIRECT_URL", "AUTH_SECRET", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"].map(
      (k) => [k, process.env[k] ? "set" : "MISSING"]
    )
  );
  const url = process.env.DATABASE_URL ?? "";
  const dbUrlFormat = !url ? "missing" : url.startsWith("postgresql://") || url.startsWith("postgres://") ? "ok" : `invalid (starts with "${url.slice(0, 8)}")`;

  let database = "ok";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (e) {
    const err = e as { code?: string; message?: string; constructor?: { name?: string } };
    // Strip anything that looks like a connection string before returning the message.
    const msg = (err.message ?? String(e)).replace(/postgres(ql)?:\/\/\S+/g, "[url]").split("\n").filter(Boolean).slice(-3).join(" ").slice(0, 400);
    database = `ERROR ${err.constructor?.name ?? ""} ${err.code ?? ""}: ${msg}`;
  }

  return NextResponse.json({ ok: database === "ok", database, dbUrlFormat, env, node: process.version, region: process.env.VERCEL_REGION ?? "local" });
}
