// src/auth/clerk.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClerkService } from './clerk.service';

// Mock @clerk/backend module
jest.mock('@clerk/backend', () => ({
    createClerkClient: jest.fn(() => ({
        users: {
            getUser: jest.fn().mockResolvedValue({
                id: 'user_123',
                email_addresses: [{ email_address: 'test@example.com' }],
                first_name: 'Test',
                last_name: 'User'
            })
        }
    })),
    verifyToken: jest.fn()
}));

import { createClerkClient, verifyToken } from '@clerk/backend';

describe('ClerkService', () => {
    let service: ClerkService;
    let configService: ConfigService;

    const mockConfig = {
        get: jest.fn().mockImplementation((key: string) => {
            const values: { [key: string]: string } = {
                'CLERK_SECRET_KEY': 'test_secret_key',
                'CLERK_JWT_AUDIENCE': 'test_audience',
                'CLERK_JWT_KEY': 'test_jwt_key'
            };
            return values[key];
        })
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ClerkService,
                {
                    provide: ConfigService,
                    useValue: mockConfig
                }
            ],
        }).compile();

        service = module.get<ClerkService>(ClerkService);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should initialize Clerk client with secret key', () => {
        expect(createClerkClient).toHaveBeenCalledWith({
            secretKey: 'test_secret_key'
        });
    });

    describe('verifyToken', () => {
        it('should verify token successfully', async () => {
            const token = 'valid.jwt.token';
            const payload = { sub: 'user_123', aud: 'test_audience' };

            // Mock successful token verification
            (verifyToken as jest.Mock).mockResolvedValueOnce(payload);

            const result = await service.verifyToken(token);

            expect(verifyToken).toHaveBeenCalledWith(token, {
                audience: 'test_audience',
                jwtKey: 'test_jwt_key'
            });

            expect(result).toEqual(payload);
        });

        it('should return null when token verification fails', async () => {
            const token = 'invalid.jwt.token';

            // Mock failed token verification
            (verifyToken as jest.Mock).mockRejectedValueOnce(new Error('Invalid token'));

            const result = await service.verifyToken(token);

            expect(verifyToken).toHaveBeenCalled();
            expect(result).toBeNull();
        });
    });

    describe('getUserDetails', () => {
        it('should fetch user details from Clerk', async () => {
            const userId = 'user_123';
            const expectedUser = {
                id: 'user_123',
                email_addresses: [{ email_address: 'test@example.com' }],
                first_name: 'Test',
                last_name: 'User'
            };

            const result = await service.getUserDetails(userId);

            // Check that it calls the mocked client
            expect(result).toEqual(expectedUser);
        });

        it('should return null when fetching user details fails', async () => {
            const userId = 'invalid_user';

            // Access private field using TypeScript private field accessor
            const clerkClient = (service as any)['clerk'];
            clerkClient.users.getUser.mockRejectedValueOnce(new Error('User not found'));

            const result = await service.getUserDetails(userId);

            expect(result).toBeNull();
        });
    });
});