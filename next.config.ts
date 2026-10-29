import type { NextConfig } from "next";

// Shared hosting (e.g. Hostinger) caps how many processes an account may start, and the
// default parallel build workers hit that cap ("spawn node EAGAIN"). Outside Vercel, build
// with a single worker so the build stays within those limits.
const constrainedHost = !process.env.VERCEL;

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
    ...(constrainedHost ? { cpus: 1, workerThreads: false, webpackBuildWorker: false } : {}),
  },
};

export default nextConfig;
