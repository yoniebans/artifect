// test/global-setup.ts

import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { createTestUser } from './test-utils';

/**
 * Global setup function run once before all tests
 */
module.exports = async () => {
    console.log('🔧 Setting up test environment...');

    // Debug: Print database URL (obfuscating password)
    console.log('DATABASE_URL =', process.env.DATABASE_URL?.replace(/:.+@/, ':****@'));

    // Create a Prisma client just to check connection
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

        // Run the reset script to clean and reset sequences
        console.log('🧹 Running database reset script...');
        try {
            execSync('npx ts-node prisma/reset.ts', { stdio: 'inherit' });
            console.log('✅ Database reset successfully');
        } catch (error) {
            console.error('❌ Failed to reset database:', error);
            throw error;
        }

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