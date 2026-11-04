import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** True for "two transactions touched the same rows, try again" errors (Prisma P2034 / SQLSTATE 40001). */
function isRetryable(e: unknown) {
  const err = e as { code?: string; message?: string } | null;
  if (err?.code === "P2034") return true;
  const msg = err?.message ?? "";
  return msg.includes("40001") || /restart transaction|TransactionRetry|write conflict|deadlock/i.test(msg);
}

/**
 * Runs a transaction and retries it when it collides with another one.
 * CockroachDB uses SERIALIZABLE isolation, so e.g. two customers buying the same product at the same
 * moment can make one transaction fail with a retryable error. Retrying makes that invisible to them.
 * Pass a function that BUILDS the transaction (so every attempt runs fresh queries):
 *   await withRetry(() => db.$transaction(async (tx) => { ... }))
 * Normal errors (e.g. "out of stock") are not retried.
 */
export async function withRetry<T>(run: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await run();
    } catch (e) {
      if (i >= attempts || !isRetryable(e)) throw e;
      await new Promise((r) => setTimeout(r, 2 ** i * 25 + Math.random() * 50)); // 50ms, 100ms, 200ms… + jitter
    }
  }
}
