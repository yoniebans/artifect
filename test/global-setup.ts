// test/global-setup.ts

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { createTestUser } from './test-utils';

/**
 * Global setup function run once before all tests
 */
module.exports = async () => {
    console.log('🔧 Setting up test environment...');

    // Debug: Print database URL (obfuscating password)
    console.log('DATABASE_URL =', process.env.DATABASE_URL?.replace(/:.+@/, ':****@'));

    // Create a Prisma client
    const prisma = new PrismaClient();

    try {
        // First check if database is accessible
        try {
            await prisma.$queryRaw`SELECT 1`;
            console.log('✅ Database connection successful');
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            throw new Error('Database connection failed. Make sure PostgreSQL is running.');
        }

        // Clean the database to start fresh
        console.log('🧹 Cleaning database...');
        await cleanDatabase(prisma);

        // Run the seed script using the CLI
        console.log('🌱 Seeding database...');
        try {
            execSync('npx prisma db seed', { stdio: 'inherit' });
            console.log('✅ Database seeded successfully');
        } catch (error) {
            console.error('❌ Failed to seed database:', error);
            throw error;
        }

        // Create test user that will be used across all tests
        console.log('👤 Creating shared test user...');
        await createTestUser();
        console.log('✅ Test user created');

        console.log('🚀 Test environment ready!');
    } catch (error) {
        console.error('❌ Test setup failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
};

/**
 * Cleans the database by truncating all tables
 */
async function cleanDatabase(prisma: PrismaClient) {
    try {
        // Disable foreign key checks temporarily
        await prisma.$executeRaw`SET session_replication_role = 'replica';`;

        // Get all table names from the database
        const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename != '_prisma_migrations';
    `;

        // Truncate each table (in a safe way that doesn't break foreign keys)
        for (const { tablename } of tables) {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
        }

        // Re-enable foreign key checks
        await prisma.$executeRaw`SET session_replication_role = 'origin';`;

        console.log(`✅ Truncated ${tables.length} tables`);
    } catch (error) {
        console.error('❌ Failed to clean database:', error);
        throw error;
    }
}