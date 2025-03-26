// src/auth/auth.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ClerkService } from './clerk.service';
import { UserRepository } from '../repositories/user.repository';

describe('AuthService', () => {
    let service: AuthService;
    let clerkService: ClerkService;
    let userRepository: UserRepository;

    const mockUser = {
        id: 1,
        clerkId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockClerkUser = {
        id: 'clerk_123',
        email_addresses: [{ email_address: 'test@example.com' }],
        first_name: 'Test',
        last_name: 'User',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: ClerkService,
                    useValue: {
                        verifyToken: jest.fn(),
                        getUserDetails: jest.fn(),
                    },
                },
                {
                    provide: UserRepository,
                    useValue: {
                        findByClerkId: jest.fn(),
                        findById: jest.fn(),
                        create: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        clerkService = module.get<ClerkService>(ClerkService);
        userRepository = module.get<UserRepository>(UserRepository);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateToken', () => {
        it('should throw UnauthorizedException for invalid token', async () => {
            // Mock token verification failure
            jest.spyOn(clerkService, 'verifyToken').mockResolvedValue(null);

            await expect(service.validateToken('invalid.token')).rejects.toThrow(
                UnauthorizedException
            );
            expect(clerkService.verifyToken).toHaveBeenCalledWith('invalid.token');
        });

        it('should throw UnauthorizedException for token without subject', async () => {
            // Mock token verification with missing subject
            jest.spyOn(clerkService, 'verifyToken').mockResolvedValue({
                exp: Math.floor(Date.now() / 1000) + 3600,
            });

            await expect(service.validateToken('token.without.sub')).rejects.toThrow(
                UnauthorizedException
            );
        });

        it('should return existing user when found by clerk ID', async () => {
            // Mock successful token verification
            jest.spyOn(clerkService, 'verifyToken').mockResolvedValue({
                sub: 'clerk_123',
                exp: Math.floor(Date.now() / 1000) + 3600,
            });

            // Mock user repository to return existing user
            jest.spyOn(userRepository, 'findByClerkId').mockResolvedValue(mockUser);

            const result = await service.validateToken('valid.token');

            expect(clerkService.verifyToken).toHaveBeenCalledWith('valid.token');
            expect(userRepository.findByClerkId).toHaveBeenCalledWith('clerk_123');
            expect(clerkService.getUserDetails).not.toHaveBeenCalled();
            expect(userRepository.create).not.toHaveBeenCalled();
            expect(result).toEqual(mockUser);
        });

        it('should create a new user when user not found by clerk ID', async () => {
            // Mock successful token verification
            jest.spyOn(clerkService, 'verifyToken').mockResolvedValue({
                sub: 'clerk_123',
                exp: Math.floor(Date.now() / 1000) + 3600,
            });

            // Mock user repository to not find existing user
            jest.spyOn(userRepository, 'findByClerkId').mockResolvedValue(null);

            // Mock clerk service to return user details
            jest.spyOn(clerkService, 'getUserDetails').mockResolvedValue(mockClerkUser);

            // Mock user repository to create new user
            jest.spyOn(userRepository, 'create').mockResolvedValue(mockUser);

            const result = await service.validateToken('valid.token');

            expect(clerkService.verifyToken).toHaveBeenCalledWith('valid.token');
            expect(userRepository.findByClerkId).toHaveBeenCalledWith('clerk_123');
            expect(clerkService.getUserDetails).toHaveBeenCalledWith('clerk_123');
            expect(userRepository.create).toHaveBeenCalledWith({
                clerkId: 'clerk_123',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                isAdmin: false,
            });
            expect(result).toEqual(mockUser);
        });

        it('should throw UnauthorizedException when clerk user not found', async () => {
            // Mock successful token verification
            jest.spyOn(clerkService, 'verifyToken').mockResolvedValue({
                sub: 'clerk_123',
                exp: Math.floor(Date.now() / 1000) + 3600,
            });

            // Mock user repository to not find existing user
            jest.spyOn(userRepository, 'findByClerkId').mockResolvedValue(null);

            // Mock clerk service to not find user details
            jest.spyOn(clerkService, 'getUserDetails').mockResolvedValue(null);

            await expect(service.validateToken('valid.token')).rejects.toThrow(
                UnauthorizedException
            );
            expect(userRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('isAdmin', () => {
        it('should return true for admin users', async () => {
            // Mock user repository to return admin user
            jest.spyOn(userRepository, 'findById').mockResolvedValue({
                ...mockUser,
                isAdmin: true,
            });

            const result = await service.isAdmin(1);

            expect(userRepository.findById).toHaveBeenCalledWith(1);
            expect(result).toBe(true);
        });

        it('should return false for non-admin users', async () => {
            // Mock user repository to return non-admin user
            jest.spyOn(userRepository, 'findById').mockResolvedValue({
                ...mockUser,
                isAdmin: false,
            });

            const result = await service.isAdmin(1);

            expect(userRepository.findById).toHaveBeenCalledWith(1);
            expect(result).toBe(false);
        });

        it('should return false when user not found', async () => {
            // Mock user repository to not find user
            jest.spyOn(userRepository, 'findById').mockResolvedValue(null);

            const result = await service.isAdmin(999);

            expect(userRepository.findById).toHaveBeenCalledWith(999);
            expect(result).toBe(false);
        });
    });
});