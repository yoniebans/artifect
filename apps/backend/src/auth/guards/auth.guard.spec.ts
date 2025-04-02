// src/auth/guards/admin.guard.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AuthService } from '../auth.service';

describe('AdminGuard', () => {
    let guard: AdminGuard;
    let authService: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminGuard,
                {
                    provide: AuthService,
                    useValue: {
                        isAdmin: jest.fn(),
                    },
                },
            ],
        }).compile();

        guard = module.get<AdminGuard>(AdminGuard);
        authService = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should throw ForbiddenException when no user in request', async () => {
        const context = createMockExecutionContext(false);

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        expect(authService.isAdmin).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not admin', async () => {
        const mockUser = { id: 1, email: 'user@example.com' };
        const context = createMockExecutionContext(true, mockUser);

        // Mock auth service to indicate user is not an admin
        jest.spyOn(authService, 'isAdmin').mockResolvedValue(false);

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        expect(authService.isAdmin).toHaveBeenCalledWith(1);
    });

    it('should allow access when user is admin', async () => {
        const mockUser = { id: 1, email: 'admin@example.com' };
        const context = createMockExecutionContext(true, mockUser);

        // Mock auth service to indicate user is an admin
        jest.spyOn(authService, 'isAdmin').mockResolvedValue(true);

        const result = await guard.canActivate(context);

        expect(authService.isAdmin).toHaveBeenCalledWith(1);
        expect(result).toBe(true);
    });

    // Helper function to create a mock execution context
    function createMockExecutionContext(withUser = false, user: any = null) {
        const mockRequest = {
            user: withUser ? user : undefined,
        };

        const mockExecutionContext = {
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue(mockRequest),
            }),
        } as unknown as ExecutionContext;

        return mockExecutionContext;
    }
});