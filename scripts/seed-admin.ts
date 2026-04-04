/**
 * Seed an admin user with proper Better Auth password hashing.
 *
 * Usage: DATABASE_URL=<url> SEED_ADMIN_PASSWORD=<pw> bun run scripts/seed-admin.ts
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { user, account, customer } from '../src/lib/db/schema';
import { hashPassword } from 'better-auth/crypto';

neonConfig.webSocketConstructor = ws;

const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? 'Fernando Govea';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'fennyg83@gmail.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error('SEED_ADMIN_PASSWORD environment variable is required');
  process.exit(1);
}

async function seedAdmin() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle({ client: pool });

  try {
    console.log('Seeding admin user...');

    // Check if user already exists
    const existing = await db.select().from(user).where(eq(user.email, ADMIN_EMAIL)).limit(1);

    if (existing[0]) {
      console.log(`  User exists: ${existing[0].email} (role: ${existing[0].role})`);

      if (existing[0].role !== 'super_admin') {
        await db.update(user)
          .set({ role: 'super_admin', updatedAt: new Date() })
          .where(eq(user.id, existing[0].id));
        console.log('  Promoted to super_admin');
      } else {
        console.log('  Already super_admin');
      }
      return;
    }

    // Hash password using Better Auth's scrypt hashing
    const passwordHash = await hashPassword(ADMIN_PASSWORD);

    // Create user
    const [newUser] = await db.insert(user).values({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      emailVerified: true,
      role: 'super_admin',
    }).returning();
    console.log(`  Created user: ${newUser.name} (${newUser.email})`);

    // Create credential account with hashed password
    await db.insert(account).values({
      userId: newUser.id,
      accountId: newUser.id,
      providerId: 'credential',
      type: 'credential',
      password: passwordHash,
    });
    console.log('  Created credential account');

    // Link to customer record if exists
    const existingCustomer = await db.select().from(customer)
      .where(eq(customer.email, ADMIN_EMAIL)).limit(1);
    if (existingCustomer[0] && !existingCustomer[0].userId) {
      await db.update(customer)
        .set({ userId: newUser.id })
        .where(eq(customer.id, existingCustomer[0].id));
      console.log(`  Linked to customer: ${existingCustomer[0].firstName}`);
    }

    console.log('  Role: super_admin');
    console.log('Admin seed complete.');
  } finally {
    await pool.end();
  }
}

seedAdmin()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .then(() => process.exit(0));
