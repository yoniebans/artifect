// test/test-utils.ts

import { PrismaClient, User } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';

// Constants for non-authenticated tests
const DUMMY_CLERK_ID = 'test_user_clerk_id_dummy';
const DUMMY_EMAIL = 'test_dummy@example.com';

// Constants for authenticated tests (from environment)
export const TEST_USER_CLERK_ID = process.env.TEST_USER_CLERK_ID || '';
export const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || '';

/**
 * Interface for authentication test data
 */
export interface AuthTestData {
    user: User;
    token: string;
    clerkId: string;
}

/**
 * Create a non-authenticated test user in the database
 * Use this for standard tests that don't require real Clerk authentication
 * 
 * @returns The created test user
 */
export async function createTestUser(): Promise<User> {
    const prisma = new PrismaClient();

    try {
        // Always create a fresh user - we assume DB is wiped between test runs
        const user = await prisma.user.create({
            data: {
                clerkId: DUMMY_CLERK_ID,
                email: DUMMY_EMAIL,
                firstName: 'Test',
                lastName: 'User',
                isAdmin: false,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        console.log(`[Test Utils] Created non-authenticated test user with ID: ${user.id}`);
        return user;
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Create an authenticated test user with a valid Clerk token
 * Use this for E2E tests that require real Clerk authentication
 * 
 * @returns Authentication data including user and token
 */
export async function createAuthenticatedTestUser(): Promise<AuthTestData> {
    console.log('[Test Utils] Creating authenticated test user...');

    // Verify required environment variables
    if (!TEST_USER_CLERK_ID) {
        throw new Error('TEST_USER_CLERK_ID is required in environment variables');
    }

    if (!process.env.CLERK_SECRET_KEY) {
        throw new Error('CLERK_SECRET_KEY is required in environment variables');
    }

    // Create user in the database
    const prisma = new PrismaClient();
    let user: User;

    try {
        // Always create a fresh user - we assume DB is wiped between test runs
        user = await prisma.user.create({
            data: {
                clerkId: TEST_USER_CLERK_ID,
                email: TEST_USER_EMAIL || `test_${TEST_USER_CLERK_ID}@example.com`,
                firstName: 'Test',
                lastName: 'User',
                isAdmin: false,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        console.log(`[Test Utils] Created authenticated test user with ID: ${user.id}`);
    } catch (error) {
        console.error('[Test Utils] Failed to create authenticated test user:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }

    // Generate a Clerk token
    console.log('[Test Utils] Generating Clerk authentication token...');
    const token = await generateClerkToken(TEST_USER_CLERK_ID);

    return {
        user,
        token,
        clerkId: TEST_USER_CLERK_ID
    };
}

/**
 * Get the most recently created test user from the database
 * This works with either createTestUser() or createAuthenticatedTestUser()
 */
export async function getTestUserFromDb(): Promise<User> {
    const prisma = new PrismaClient();

    try {
        // Get the most recently created user
        const user = await prisma.user.findFirst({
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!user) {
            throw new Error('No test user found in database. Did you call createTestUser() or createAuthenticatedTestUser() first?');
        }

        return user;
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Generate a JWT token for testing using Clerk SDK
 * @param clerkUserId The Clerk user ID to generate a token for
 * @returns A JWT token
 * @private Internal use only - called by createAuthenticatedTestUser()
 */
async function generateClerkToken(clerkUserId: string): Promise<string> {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
        throw new Error("CLERK_SECRET_KEY is not defined");
    }

    try {
        const clerk = createClerkClient({ secretKey });

        // Use the TestingTokenAPI to create a testing token
        const testingToken = await clerk.testingTokens.createTestingToken();
        console.log(`[Test Utils] Created testing token, expires at: ${new Date(testingToken.expiresAt * 1000).toISOString()}`);

        // Debug the token
        try {
            const parts = testingToken.token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                console.log('[Test Utils] Token payload:', payload);
            }
        } catch (e) {
            console.error('[Test Utils] Failed to decode token for debugging');
        }

        return testingToken.token;
    } catch (error) {
        console.error('[Test Utils] Error generating token:', error);
        throw error;
    }
}