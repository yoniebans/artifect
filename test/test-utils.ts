// test/test-utils.ts

import { PrismaClient, User } from '@prisma/client';

// Test constants that will be used across test files
export const TEST_USER_CLERK_ID = 'test_user_clerk-id';
export const TEST_USER_EMAIL = 'test_user_email@example.com';

/**
 * Create a test user in the database
 */
export async function createTestUser(): Promise<User> {
    const prisma = new PrismaClient();

    try {
        const user = await prisma.user.upsert({
            where: { clerkId: TEST_USER_CLERK_ID },
            update: {},
            create: {
                clerkId: TEST_USER_CLERK_ID,
                email: TEST_USER_EMAIL,
                firstName: 'Test',
                lastName: 'User',
                isAdmin: false,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        console.log(`[Test Utils] Created test user with ID: ${user.id}`);
        return user;
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Get the test user from the database
 */
export async function getTestUserFromDb(): Promise<User> {
    const prisma = new PrismaClient();

    try {
        const user = await prisma.user.findUnique({
            where: { clerkId: TEST_USER_CLERK_ID }
        });

        if (!user) {
            throw new Error(`Test user with clerkId ${TEST_USER_CLERK_ID} not found in database`);
        }

        return user;
    } finally {
        await prisma.$disconnect();
    }
}