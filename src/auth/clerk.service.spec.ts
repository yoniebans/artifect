// src/auth/clerk.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClerkService } from './clerk.service';
import * as jose from 'jose';

// Mock jose library
jest.mock('jose', () => ({
    createRemoteJWKSet: jest.fn().mockReturnValue(() => ({})),
    jwtVerify: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('ClerkService', () => {
    let service: ClerkService;
    let configService: ConfigService;

    const mockConfig = {
        'CLERK_API_KEY': 'test-api-key',
        'CLERK_JWKS_URL': 'https://test.clerk.dev/v1/jwks',
        'CLERK_API_BASE_URL': 'https://test.clerk.com/v1',
        'CLERK_JWT_AUDIENCE': 'test-audience',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ClerkService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: keyof typeof mockConfig) => mockConfig[key]),
                    },
                },
            ],
        }).compile();

        service = module.get<ClerkService>(ClerkService);
        configService = module.get<ConfigService>(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should initialize with correct config values', () => {
        expect(configService.get).toHaveBeenCalledWith('CLERK_JWKS_URL');
        expect(configService.get).toHaveBeenCalledWith('CLERK_API_KEY');
        expect(configService.get).toHaveBeenCalledWith('CLERK_API_BASE_URL');
        expect(jose.createRemoteJWKSet).toHaveBeenCalledWith(
            new URL(mockConfig.CLERK_JWKS_URL)
        );
    });

    describe('verifyToken', () => {
        it('should correctly verify a valid token', async () => {
            const mockPayload = {
                sub: 'user_123',
                exp: Math.floor(Date.now() / 1000) + 3600,
                iss: 'clerk',
            };

            // Mock successful token verification
            (jose.jwtVerify as jest.Mock).mockResolvedValueOnce({
                payload: mockPayload,
                protectedHeader: {},
            });

            const result = await service.verifyToken('valid.test.token');

            expect(jose.jwtVerify).toHaveBeenCalledWith(
                'valid.test.token',
                expect.any(Function),
                {
                    issuer: 'clerk',
                    audience: mockConfig.CLERK_JWT_AUDIENCE,
                }
            );
            expect(result).toEqual(mockPayload);
        });

        it('should return null for an invalid token', async () => {
            // Mock failed token verification
            (jose.jwtVerify as jest.Mock).mockRejectedValueOnce(
                new Error('Invalid token')
            );

            const result = await service.verifyToken('invalid.token');

            expect(result).toBeNull();
        });
    });

    describe('getUserDetails', () => {
        it('should return user details for a valid user ID', async () => {
            const mockUserData = {
                id: 'user_123',
                email_addresses: [{ email_address: 'test@example.com' }],
                first_name: 'Test',
                last_name: 'User',
            };

            // Mock successful API response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(mockUserData),
            });

            const result = await service.getUserDetails('user_123');

            expect(global.fetch).toHaveBeenCalledWith(
                `${mockConfig.CLERK_API_BASE_URL}/users/user_123`,
                {
                    headers: {
                        Authorization: `Bearer ${mockConfig.CLERK_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            expect(result).toEqual(mockUserData);
        });

        it('should return null when API request fails', async () => {
            // Mock failed API response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found',
            });

            const result = await service.getUserDetails('invalid_user');

            expect(result).toBeNull();
        });

        it('should return null when fetch throws an error', async () => {
            // Mock network error
            (global.fetch as jest.Mock).mockRejectedValueOnce(
                new Error('Network error')
            );

            const result = await service.getUserDetails('user_123');

            expect(result).toBeNull();
        });
    });
});