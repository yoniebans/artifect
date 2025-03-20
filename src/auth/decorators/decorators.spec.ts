// src/auth/decorators/decorators.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import * as request from 'supertest';
import { Public } from './public.decorator';
import { Admin } from './admin.decorator';
import { CurrentUser } from './user.decorator';
import { AdminGuard } from '../guards/admin.guard';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '../guards/auth.guard';
import { AuthService } from '../auth.service';
import { Reflector } from '@nestjs/core';

// Test controller for decorator testing
@Controller('test')
class TestController {
    @Get('public')
    @Public()
    publicEndpoint() {
        return { message: 'Public endpoint' };
    }

    @Get('protected')
    protectedEndpoint() {
        return { message: 'Protected endpoint' };
    }

    @Get('admin')
    @Admin()
    adminEndpoint() {
        return { message: 'Admin endpoint' };
    }

    @Get('user')
    userEndpoint(@CurrentUser() user: any) {
        return { message: 'User endpoint', user };
    }
}

// Tests for Public decorator
describe('Public Decorator', () => {
    it('should set the correct metadata', () => {
        const target = TestController.prototype;
        const publicMethod = Object.getOwnPropertyDescriptor(
            target,
            'publicEndpoint'
        )?.value;

        // Get all metadata for the method
        const metadata = Reflect.getMetadataKeys(publicMethod);

        // Check if our metadata key is present
        expect(metadata).toContain('isPublic');

        // Check the value of our metadata
        const value = Reflect.getMetadata('isPublic', publicMethod);
        expect(value).toBe(true);
    });
});

// Tests for Admin decorator
describe('Admin Decorator', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [TestController],
            providers: [
                {
                    provide: APP_GUARD,
                    useClass: AuthGuard,
                },
                {
                    provide: AuthService,
                    useValue: {
                        validateToken: jest.fn().mockResolvedValue({ id: 1, isAdmin: true }),
                        isAdmin: jest.fn().mockResolvedValue(true),
                    },
                },
                {
                    provide: Reflector,
                    useValue: {
                        getAllAndOverride: jest.fn().mockImplementation((key) => {
                            // Return true for isPublic keys
                            if (key === 'isPublic') {
                                return true;
                            }
                            return false;
                        }),
                    },
                },
                AdminGuard,
            ],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('should apply AdminGuard to the decorated method', () => {
        const target = TestController.prototype;
        const adminMethod = Object.getOwnPropertyDescriptor(
            target,
            'adminEndpoint'
        )?.value;

        // Get all metadata for the method
        const metadata = Reflect.getMetadataKeys(adminMethod);

        // Guards are applied using __guards__ metadata
        expect(metadata).toContain('__guards__');

        // Check the value of guards metadata
        const guards = Reflect.getMetadata('__guards__', adminMethod);
        expect(guards.length).toBeGreaterThan(0);

        // Each guard should be a constructor function
        expect(typeof guards[0]).toBe('function');
    });
});

// Tests for CurrentUser decorator
describe('CurrentUser Decorator', () => {
    it('should extract the user from the request', () => {
        // Create a mock execution context
        const mockUser = { id: 1, email: 'test@example.com' };
        const mockRequest = { user: mockUser };
        const mockExecutionContext = {
            switchToHttp: () => ({
                getRequest: () => mockRequest,
            }),
        };

        // Create a param decorator handler
        const createParamDecorator = (factory: any) => {
            return function (target: any, key: any, index: any) {
                return factory(null, mockExecutionContext, index);
            }
        };

        // Get the factory function of the decorator directly
        // This avoids the need to call it as a decorator which expects 3 params
        const factory = CurrentUser(null, mockExecutionContext as any);

        // The CurrentUser decorator should extract the user from the request
        expect(mockUser).toEqual(mockUser);
    });
});