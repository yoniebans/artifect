// src/auth/guards/auth.guard.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('AuthGuard', () => {
    let guard: AuthGuard;
    let authService: AuthService;
    let reflector: Reflector;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthGuard,
                {
                    provide: AuthService,
                    useValue: {
                        validateToken: jest.fn(),
                    },
                },
                {
                    provide: Reflector,
                    useValue: {
                        getAllAndOverride: jest.fn(),
                    },
                },
            ],
        }).compile();

        guard = module.get<AuthGuard>(AuthGuard);
        authService = module.get<AuthService>(AuthService);
        reflector = module.get<Reflector>(Reflector);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should allow access to public routes', async () => {
        // Mock the reflector to indicate this is a public route
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

        const context = createMockExecutionContext();
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
            expect.any(Function),
            expect.any(Function),
        ]);
        expect(authService.validateToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when no token provided', async () => {
        // Mock the reflector to indicate this is not a public route
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

        const context = createMockExecutionContext(false);

        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
        expect(reflector.getAllAndOverride).toHaveBeenCalled();
        expect(authService.validateToken).not.toHaveBeenCalled();
    });

    it('should attach user to request and allow access when valid token provided', async () => {
        // Mock the reflector to indicate this is not a public route
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

        const mockUser = { id: 1, email: 'test@example.com' };
        jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser as any);

        const mockRequest = {
            headers: {
                authorization: 'Bearer valid-token',
            },
            user: undefined,
        };

        const context = createMockExecutionContext(true, mockRequest);
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(authService.validateToken).toHaveBeenCalledWith('valid-token');
        expect(mockRequest.user).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
        // Mock the reflector to indicate this is not a public route
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

        // Mock authService to throw an error
        jest.spyOn(authService, 'validateToken').mockRejectedValue(new Error('Invalid token'));

        const context = createMockExecutionContext(true);

        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
        expect(reflector.getAllAndOverride).toHaveBeenCalled();
        expect(authService.validateToken).toHaveBeenCalled();
    });

    // Helper function to create a mock execution context
    function createMockExecutionContext(withToken = false, mockRequestObj?: any) {
        const mockRequest = mockRequestObj || {
            headers: {
                authorization: withToken ? 'Bearer valid-token' : undefined,
            },
            user: undefined,
        };

        const mockExecutionContext = {
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue(mockRequest),
            }),
            getHandler: jest.fn(),
            getClass: jest.fn(),
        } as unknown as ExecutionContext;

        return mockExecutionContext;
    }
});