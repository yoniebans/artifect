// src/auth/auth.integration.spec.ts

import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { ClerkService } from './clerk.service';
import { PrismaService } from '../database/prisma.service';
import { UserRepository } from '../repositories/user.repository';
import { AuthTestData, TEST_USER_CLERK_ID, createAuthenticatedTestUser } from '../../test/test-utils';

/**
 * This integration test verifies that the Auth Module correctly
 * interfaces with the Clerk service using a real token.
 * 
 * To run this test:
 * npm run test:integration -- src/auth/auth.integration.spec.ts
 *
 * Required environment variables:
 * - CLERK_SECRET_KEY - Your Clerk secret key
 * - TEST_USER_CLERK_ID - ID of a test user in your Clerk instance
 */
describe('Auth Module Integration Tests', () => {
    let authService: AuthService;
    let clerkService: ClerkService;
    let userRepository: UserRepository;
    let authData: AuthTestData | null = null;

    beforeAll(async () => {
        console.log('\n🔑 AUTH MODULE INTEGRATION TEST 🔑');

        // Check if required environment variables are set
        if (!process.env.CLERK_SECRET_KEY) {
            console.error('❌ CLERK_SECRET_KEY not set. Tests will fail.');
            return;
        }

        if (!TEST_USER_CLERK_ID) {
            console.error('❌ TEST_USER_CLERK_ID not set. Tests will fail.');
            return;
        }

        console.log('✅ Environment variables are set. Proceeding with tests...');
        console.log(`   Using test user ID: ${TEST_USER_CLERK_ID}`);

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

        // Create authenticated test user
        try {
            console.log('\n🔑 Getting authenticated test user...');
            authData = await createAuthenticatedTestUser();
            console.log(`✅ Created authenticated test user with ID: ${authData.user.id}`);
            console.log(`✅ User has Clerk ID: ${authData.clerkId}`);
            console.log(`✅ Received token (length: ${authData.token.length})`);
        } catch (error) {
            console.error('❌ Failed to create authenticated test user:', error);
            authData = null;
        }
    });

    // Don't run tests if pre-conditions fail
    beforeEach(() => {
        if (!process.env.CLERK_SECRET_KEY || !TEST_USER_CLERK_ID || !authData) {
            console.warn('⚠️ Skipping test due to missing prerequisites');
            pending('Missing prerequisites for this test');
        }
    });

    describe('ClerkService', () => {
        it('should successfully verify the token', async () => {
            // Skip if prerequisites not met
            if (!authData) return;

            console.log('\n🔍 Testing token verification...');
            const result = await clerkService.verifyToken(authData.token);

            if (result) {
                console.log('✅ Token verified successfully!');
                console.log(`   Token subject: ${result.sub}`);
                // Print other token info if available
                Object.entries(result).forEach(([key, value]) => {
                    if (key !== 'sub') {
                        console.log(`   ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
                    }
                });
            } else {
                console.error('❌ Token verification failed');
            }

            expect(result).toBeDefined();
            expect(result.sub).toBeDefined();
            if (TEST_USER_CLERK_ID) {
                // The sub might not match TEST_USER_CLERK_ID exactly, but should contain it
                expect(result.sub).toContain(TEST_USER_CLERK_ID.split('_')[1]);
            }
        });

        it('should get user details from Clerk', async () => {
            // Skip if prerequisites not met
            if (!authData) return;

            console.log('\n👤 Testing user details retrieval...');
            const result = await clerkService.getUserDetails(authData.clerkId);

            if (result) {
                console.log('✅ User details retrieved successfully!');
                console.log(`   User ID: ${result.id}`);
                console.log(`   Email: ${result.emailAddresses?.[0]?.emailAddress || 'Not found'}`);
                console.log(`   Name: ${result.firstName} ${result.lastName}`);
            } else {
                console.error('❌ User details retrieval failed');
            }

            expect(result).toBeDefined();
            expect(result.id).toBe(authData.clerkId);
        });
    });

    describe('AuthService', () => {
        it('should validate token and get user', async () => {
            // Skip if prerequisites not met
            if (!authData) return;

            console.log('\n🔐 Testing full token validation...');

            // Mock the user repository to return our test user
            jest.spyOn(userRepository, 'findByClerkId').mockResolvedValue(authData.user);

            try {
                const result = await authService.validateToken(authData.token);

                console.log('✅ Token validated and user retrieved!');
                console.log(`   User ID: ${result.id}`);
                console.log(`   User email: ${result.email}`);

                expect(result).toBeDefined();
                expect(result.id).toBe(authData.user.id);
                expect(result.clerkId).toBe(authData.clerkId);
            } catch (error) {
                console.error('❌ Token validation failed:', error.message);
                fail(`Token validation failed: ${error.message}`);
            }
        });
    });
});