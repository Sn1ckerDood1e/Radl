import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const revision = crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
});

const nextConfig: NextConfig = {
  // viewTransition disabled due to Performance.measure timing issues in Next.js 16
  // Can re-enable when Next.js fixes the negative timestamp bug

  // Fix Prisma "Query Engine not found" on Vercel with custom output path
  outputFileTracingIncludes: {
    "/*": ["./src/generated/prisma/**/*"],
  },
};

export default withSerwist(nextConfig);
