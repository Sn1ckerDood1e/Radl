// Prisma configuration for Supabase PostgreSQL
// See https://pris.ly/d/config-datasource
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Main connection URL (pooler/transaction mode for app queries)
    // For migrations, use DIRECT_URL (bypasses pooler) by setting it as DATABASE_URL temporarily
    // Or run: DATABASE_URL=$DIRECT_URL npx prisma migrate dev
    url: process.env["DATABASE_URL"],
  },
});
