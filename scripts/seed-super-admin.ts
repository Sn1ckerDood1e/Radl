/**
 * Seed Super Admin Script
 *
 * Creates the first super admin record in the database.
 *
 * SECURITY NOTES:
 * - This is a one-time setup script for platform initialization
 * - Super admin status cannot be granted via the UI (intentional security measure)
 * - Additional super admins require direct database INSERT or running this script again
 * - The SuperAdmin table is protected by RLS and only readable by existing super admins
 *
 * Usage:
 *   npx tsx scripts/seed-super-admin.ts <userId>
 *
 * Arguments:
 *   userId: Supabase auth.users ID (UUID) of the user to make super admin
 *
 * Example:
 *   npx tsx scripts/seed-super-admin.ts 123e4567-e89b-12d3-a456-426614174000
 *
 * Prerequisites:
 *   - User must already exist in Supabase Auth
 *   - Database must have SuperAdmin table (run migration 00018_super_admin.sql first)
 *   - DATABASE_URL environment variable must be set
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('Usage: npx tsx scripts/seed-super-admin.ts <userId>');
    console.error('');
    console.error('Arguments:');
    console.error('  userId: Supabase auth.users ID (UUID)');
    console.error('');
    console.error('Example:');
    console.error('  npx tsx scripts/seed-super-admin.ts 123e4567-e89b-12d3-a456-426614174000');
    process.exit(1);
  }

  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    console.error('Error: userId must be a valid UUID');
    console.error(`  Received: ${userId}`);
    process.exit(1);
  }

  // Check if user is already a super admin
  const existing = await prisma.superAdmin.findUnique({
    where: { userId },
  });

  if (existing) {
    console.log(`User ${userId} is already a super admin`);
    console.log(`  ID: ${existing.id}`);
    console.log(`  Created: ${existing.createdAt.toISOString()}`);
    console.log(`  Created by: ${existing.createdBy ?? '(initial seed)'}`);
    process.exit(0);
  }

  // Create super admin record
  const superAdmin = await prisma.superAdmin.create({
    data: {
      userId,
      createdBy: null, // First admin has no creator (seeded)
    },
  });

  console.log('Super admin created successfully');
  console.log(`  ID: ${superAdmin.id}`);
  console.log(`  User ID: ${superAdmin.userId}`);
  console.log(`  Created: ${superAdmin.createdAt.toISOString()}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. User must log out and log back in to get new JWT with is_super_admin claim');
  console.log('  2. User can now access /admin routes');
}

main()
  .catch((e) => {
    console.error('Error creating super admin:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
