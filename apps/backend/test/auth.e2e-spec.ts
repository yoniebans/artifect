// test/auth.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/api/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import { User } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service';
import { ClerkService } from '../src/auth/clerk.service';
import { AdminGuard } from '../src/auth/guards/admin.guard';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { Reflector } from '@nestjs/core';
import { APP_GUARD } from '@nestjs/core';
import { UserRepository } from '../src/repositories/user.repository';
import { TEST_USER_CLERK_ID, TEST_USER_EMAIL, getTestUserFromDb } from './test-utils';

/**
 * E2E tests for Authentication
 * 
 * Note: These tests use mocked auth services to avoid requiring
 * actual Clerk credentials
 */
describe('Authentication (e2e)', () => {
    let app: INestApplication;
    let prismaService: PrismaService;
    let testUser: User;
    let testAdminUser: User;

    beforeAll(async () => {
        // First, get the test user from the database
        testUser = await getTestUserFromDb();
        console.log(`Using test user with ID: ${testUser.id}`);

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(ClerkService)
            .useValue({
                // Mock clerk service functions
                verifyToken: jest.fn().mockImplementation((token) => {
                    if (token === 'valid-user-token') {
                        return { sub: 'clerk-user-123' };
                    } else if (token === 'valid-admin-token') {
                        return { sub: 'clerk-admin-123' };
                    }
                    return null;
                }),
                getUserDetails: jest.fn().mockImplementation((userId) => {
                    if (userId === 'clerk-user-123') {
                        return {
                            email_addresses: [{ email_address: 'user@example.com' }],
                            first_name: 'Test',
                            last_name: 'User'
                        };
                    } else if (userId === 'clerk-admin-123') {
                        return {
                            email_addresses: [{ email_address: 'admin@example.com' }],
                            first_name: 'Admin',
                            last_name: 'User'
                        };
                    }
                    return null;
                })
            })
            .overrideProvider(AuthService)
            .useValue({
                validateToken: jest.fn().mockImplementation((token) => {
                    if (token === 'valid-user-token') {
                        return testUser;
                    } else if (token === 'valid-admin-token') {
                        return { ...testUser, id: testUser.id, isAdmin: true };
                    }
                    throw new Error('Invalid token');
                }),
                isAdmin: jest.fn().mockImplementation((userId) => {
                    return userId === 'clerk-admin-123';
                })
            })
            // Override the UserRepository to control database access
            .overrideProvider(UserRepository)
            .useValue({
                findByClerkId: jest.fn().mockImplementation((clerkId) => {
                    if (clerkId === 'clerk-user-123') {
                        return testUser;
                    } else if (clerkId === 'clerk-admin-123') {
                        return { ...testUser, id: testUser.id, isAdmin: true };
                    }
                    return null;
                }),
                findById: jest.fn().mockImplementation((id) => {
                    if (id === testUser.id) {
                        return testUser;
                    }
                    return null;
                }),
                findAll: jest.fn().mockResolvedValue([
                    testUser,
                    { ...testUser, id: 999, email: 'admin@example.com', isAdmin: true }
                ]),
                create: jest.fn()
            })
            // Replace the AuthGuard with our test version
            .overrideGuard(AuthGuard)
            .useValue({
                canActivate: (context: ExecutionContext) => {
                    const req = context.switchToHttp().getRequest();
                    const path = req.url;
                    
                    // Make the health endpoint public
                    if (path === '/health') {
                        return true;
                    }
                    
                    const authHeader = req.headers.authorization;
                    if (!authHeader) {
                        return false;
                    }
                    
                    const [type, token] = authHeader.split(' ');
                    if (type !== 'Bearer') {
                        return false;
                    }
                    
                    // Set the user based on the token
                    if (token === 'valid-user-token') {
                        req.user = testUser;
                        return true;
                    } else if (token === 'valid-admin-token') {
                        req.user = { ...testUser, id: testUser.id, isAdmin: true };
                        return true;
                    }
                    
                    return false;
                }
            })
            // Override the AdminGuard
            .overrideGuard(AdminGuard)
            .useValue({
                canActivate: (context: ExecutionContext) => {
                    const req = context.switchToHttp().getRequest();
                    const token = req.headers.authorization?.split(' ')[1];
                    // Only allow admin token for admin endpoints
                    return token === 'valid-admin-token';
                }
            })
            // Override the APP_GUARD to avoid any global guards
            .overrideProvider(APP_GUARD)
            .useValue({
                canActivate: () => true
            })
            .compile();

        app = moduleFixture.createNestApplication();
        
        // Apply same pipes and filters as in main.ts
        app.useGlobalPipes(
            new ValidationPipe({
                transform: true,
                whitelist: true,
                forbidNonWhitelisted: true,
            })
        );
        app.useGlobalFilters(new HttpExceptionFilter());
        
        await app.init();

        // Get services
        prismaService = moduleFixture.get<PrismaService>(PrismaService);

        // Create a test project for the user
        try {
            await prismaService.project.create({
                data: {
                    name: 'Test Project',
                    userId: testUser.id
                }
            });
            console.log('Created test project for user', testUser.id);
        } catch (error) {
            console.error('Failed to create test project:', error);
        }
    });

    afterAll(async () => {
        try {
            // Close the app if it exists
            if (app) {
                await app.close();
            }
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    });

    describe('Public endpoints', () => {
        it('should allow access to health check without authentication', async () => {
            return request(app.getHttpServer())
                .get('/health')
                .expect(200)
                .expect(res => {
                    expect(res.body).toHaveProperty('status', 'healthy');
                    expect(res.body).toHaveProperty('timestamp');
                });
        });
    });

    describe('Protected endpoints', () => {
        it('should reject requests without authentication token', async () => {
            const response = await request(app.getHttpServer())
                .get('/project');
                
            expect(response.status).toBe(401);
        });

        it('should reject requests with invalid authentication token', async () => {
            const response = await request(app.getHttpServer())
                .get('/project')
                .set('Authorization', 'Bearer invalid-token');
                
            expect(response.status).toBe(401);
        });

        it('should allow access with valid authentication token', async () => {
            const response = await request(app.getHttpServer())
                .get('/project')
                .set('Authorization', 'Bearer valid-user-token');
                
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('Admin endpoints', () => {
        it('should reject admin requests from non-admin users', async () => {
            const response = await request(app.getHttpServer())
                .get('/admin/users')
                .set('Authorization', 'Bearer valid-user-token');
                
            expect(response.status).toBe(403);
        });

        it('should allow access to admin endpoints for admin users', async () => {
            const response = await request(app.getHttpServer())
                .get('/admin/users')
                .set('Authorization', 'Bearer valid-admin-token');
                
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });
});