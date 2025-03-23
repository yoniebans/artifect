// src/auth/auth.integration.spec.ts

import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { ClerkService } from './clerk.service';
import { PrismaService } from '../database/prisma.service';
import { UserRepository } from '../repositories/user.repository';
import { clerkClient } from '@clerk/clerk-sdk-node';

/**
 * This integration test verifies that the Auth Module correctly
 * interfaces with the Clerk service.
 * 
 * To run this test:
 * npm run test:integration -- src/auth/auth.integration.spec.ts
 *
 * Required environment variables:
 * - CLERK_SECRET_KEY
 * - CLERK_JWT_AUDIENCE (optional)
 * - TEST_USER_CLERK_ID (a real user ID in your Clerk instance)
 */
describe('Auth Module Integration Tests', () => {
    let authService: AuthService;
    let clerkService: ClerkService;
    let userRepository: UserRepository;
    let configService: ConfigService;
    let testUserId: string | undefined;
    let testUserToken: string | undefined;

    beforeAll(async () => {
        // Load environment variables
        testUserId = process.env.TEST_USER_CLERK_ID;

        if (!testUserId) {
            console.warn('TEST_USER_CLERK_ID not set. Some tests will be skipped.');
        }

        if (!process.env.CLERK_SECRET_KEY) {
            console.warn('CLERK_SECRET_KEY not set. Tests will likely fail.');
        }

        // Set up the test module
        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                }),
            ],
            providers: [
                AuthService,
                ClerkService,
                PrismaService,
                UserRepository,
            ],
        }).compile();

        // Get service instances
        authService = moduleRef.get<AuthService>(AuthService);
        clerkService = moduleRef.get<ClerkService>(ClerkService);
        userRepository = moduleRef.get<UserRepository>(UserRepository);
        configService = moduleRef.get<ConfigService>(ConfigService);

        // If we have a test user, generate a token for them
        if (testUserId && process.env.CLERK_SECRET_KEY) {
            try {
                // Create a direct instance of the Clerk client
                // Use the pre-initialized client
                const clerk = clerkClient;

                // Check for existing sessions or create a sign-in token
                const sessions = await clerk.sessions.getSessionList({
                    userId: testUserId,
                });

                if (sessions.totalCount > 0) {
                    const sessionId = sessions.data[0].id;
                    console.log(`Using existing Clerk session: ${sessionId}`);
                    const result = await clerk.sessions.getToken(sessionId, "");
                    testUserToken = result.jwt;
                } else {
                    console.log(`Creating new sign-in token`);
                    const signIn = await clerk.signInTokens.createSignInToken({
                        userId: testUserId,
                        expiresInSeconds: 60 * 60, // 1 hour
                    });
                    testUserToken = signIn.token;
                }

                // For debugging 
                console.log(`Generated token for integration tests`);
            } catch (error) {
                console.error('Failed to generate test token:', error);
            }
        }
    });

    describe('ClerkService', () => {
        it('should be defined', () => {
            expect(clerkService).toBeDefined();
        });

        it('should access configuration', () => {
            const secretKey = configService.get<string>('CLERK_SECRET_KEY');
            expect(secretKey).toBeDefined();
        });

        it('should verify a token', async () => {
            // Skip if no token available
            if (!testUserToken) {
                console.log('Skipping token verification test - no token available');
                return;
            }

            const result = await clerkService.verifyToken(testUserToken);

            // Log result for debugging
            console.log('Token verification result:', JSON.stringify(result, null, 2));

            expect(result).toBeDefined();
            expect(result.sub).toBe(testUserId);
        });

        it('should get user details', async () => {
            // Skip if no test user ID available
            if (!testUserId) {
                console.log('Skipping user details test - no test user ID available');
                return;
            }

            const result = await clerkService.getUserDetails(testUserId);

            // Log result for debugging
            console.log('User details:', result ? 'Retrieved' : 'Failed');
            if (result) {
                console.log(`- User email: ${result.emailAddresses?.[0]?.emailAddress}`);
            }

            expect(result).toBeDefined();
            expect(result.id).toBe(testUserId);
        });
    });

    describe('AuthService', () => {
        it('should be defined', () => {
            expect(authService).toBeDefined();
        });

        it('should validate a token and get or create user', async () => {
            // Skip if no token available
            if (!testUserToken) {
                console.log('Skipping token validation test - no token available');
                return;
            }

            // Create a mock implementation for findByClerkId to avoid database dependency
            jest.spyOn(userRepository, 'findByClerkId').mockResolvedValue(null);
            jest.spyOn(userRepository, 'create').mockImplementation(async (userData) => {
                return {
                    id: 1,
                    clerkId: userData.clerkId,
                    email: userData.email || 'test@example.com',
                    firstName: userData.firstName || 'Test',
                    lastName: userData.lastName || 'User',
                    isAdmin: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
            });

            const result = await authService.validateToken(testUserToken);

            // Log result for debugging
            console.log('Token validation result:', result ? 'Success' : 'Failed');
            if (result) {
                console.log(`- Created user with ID: ${result.id}`);
            }

            expect(result).toBeDefined();
            expect(result.clerkId).toBe(testUserId);
        });
    });
});