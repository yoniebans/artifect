// test/test-utils.ts

import { PrismaClient, User } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';

// Constants for non-authenticated tests
const DUMMY_CLERK_ID = 'test_user_clerk_id_dummy';
const DUMMY_EMAIL = 'test_dummy@example.com';

// Constants for authenticated tests (from environment)
export const TEST_USER_CLERK_ID = process.env.TEST_USER_CLERK_ID || '';
export const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || '';

// Project Type IDs (these should always be 1 and 2 after fresh seeding)
export const PROJECT_TYPES = {
    SOFTWARE_ENGINEERING: 1,
    PRODUCT_DESIGN: 2
};

// Software Engineering Artifact Types (exactly as defined in seed script)
export const SOFTWARE_ARTIFACT_TYPES = {
    VISION_DOCUMENT: 'Vision Document',
    FUNCTIONAL_REQUIREMENTS: 'Functional Requirements',
    NONFUNCTIONAL_REQUIREMENTS: 'Non-Functional Requirements',
    USE_CASES: 'Use Cases',
    C4_CONTEXT: 'C4 Context Diagram',
    C4_CONTAINER: 'C4 Container Diagram',
    C4_COMPONENT: 'C4 Component Diagram'
};

// Product Design Artifact Types (exactly as defined in seed script)
export const PRODUCT_DESIGN_ARTIFACT_TYPES = {
    USER_RESEARCH: 'User Research',
    DESIGN_BRIEF: 'Design Brief',
    WIREFRAMES: 'Wireframes',
    MOCKUPS: 'Mockups',
    INTERACTIVE_PROTOTYPE: 'Interactive Prototype',
    DESIGN_SYSTEM: 'Design System',
    USABILITY_TEST_PLAN: 'Usability Test Plan',
    USABILITY_TEST_RESULTS: 'Usability Test Results'
};

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
        // Try to find an existing user first
        const existingUser = await prisma.user.findFirst({
            where: { clerkId: TEST_USER_CLERK_ID }
        });

        if (existingUser) {
            user = existingUser;
            console.log(`[Test Utils] Found existing test user with ID: ${user.id}`);
        } else {
            // Create a new user if none exists
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
        }
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
 * Generate a JWT token for testing using direct HTTP request to Clerk API
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

        console.log(`[Test Utils] Creating session for user ${clerkUserId} using direct HTTP request`);

        // Step 1: Create a session via direct HTTP request
        const response = await fetch('https://api.clerk.com/v1/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${secretKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: clerkUserId })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error ${response.status}: ${errorData}`);
        }

        const sessionData = await response.json();
        console.log(`[Test Utils] Created session with ID: ${sessionData.id}`);
        console.log(`[Test Utils] Full session data:`, JSON.stringify(sessionData, null, 2));

        // Step 2: Use the Clerk SDK to get a token from the session ID
        console.log(`[Test Utils] Creating session token using template "basic"`);
        const sessionToken = await clerk.sessions.getToken(sessionData.id, "basic");
        console.log(`[Test Utils] Token created successfully (length: ${sessionToken.jwt.length})`);

        // Step 3: Print the full token for inspection
        console.log(`[Test Utils] Full token: ${sessionToken}`);

        // Step 4: Decode and log token info for validation
        try {
            const parts = sessionToken.jwt.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                console.log(`[Test Utils] Token payload:`, JSON.stringify(payload, null, 2));
                console.log(`[Test Utils] Token payload contains user_id: ${payload.user_id || 'not found'}`);
                console.log(`[Test Utils] Token payload contains email: ${payload.email || 'not found'}`);
            }
        } catch (e) {
            console.log(`[Test Utils] Could not decode token payload: ${e.message}`);
        }

        return sessionToken.jwt;
    } catch (error) {
        console.error('[Test Utils] Error generating token:', error);
        throw error;
    }
}