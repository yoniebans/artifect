// test/auth.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/api/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import { User } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service';
import { ClerkService } from '../src/auth/clerk.service';

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
    let authService: AuthService;

    beforeAll(async () => {
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
            .compile();

        app = moduleFixture.createNestApplication();

        // Apply pipes and filters as in main.ts
        app.useGlobalPipes(
            new ValidationPipe({
                transform: true,
                whitelist: true,
                forbidNonWhitelisted: true,
            }),
        );
        app.useGlobalFilters(new HttpExceptionFilter());

        await app.init();

        // Get services
        prismaService = app.get<PrismaService>(PrismaService);
        authService = app.get<AuthService>(AuthService);

        // Create test users
        testUser = await prismaService.user.upsert({
            where: { clerkId: 'clerk-user-123' },
            update: {},
            create: {
                clerkId: 'clerk-user-123',
                email: 'user@example.com',
                firstName: 'Test',
                lastName: 'User',
                isAdmin: false
            }
        });

        testAdminUser = await prismaService.user.upsert({
            where: { clerkId: 'clerk-admin-123' },
            update: { isAdmin: true },
            create: {
                clerkId: 'clerk-admin-123',
                email: 'admin@example.com',
                firstName: 'Admin',
                lastName: 'User',
                isAdmin: true
            }
        });
    });

    afterAll(async () => {
        // Clean up test users
        await prismaService.user.deleteMany({
            where: {
                clerkId: {
                    in: ['clerk-user-123', 'clerk-admin-123']
                }
            }
        });

        await app.close();
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
            return request(app.getHttpServer())
                .get('/project')
                .expect(401);
        });

        it('should reject requests with invalid authentication token', async () => {
            return request(app.getHttpServer())
                .get('/project')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });

        it('should allow access with valid authentication token', async () => {
            // Create a test project for the user
            await prismaService.project.create({
                data: {
                    name: 'Test Project',
                    userId: testUser.id
                }
            });

            return request(app.getHttpServer())
                .get('/project')
                .set('Authorization', 'Bearer valid-user-token')
                .expect(200)
                .expect(res => {
                    expect(Array.isArray(res.body)).toBe(true);
                    expect(res.body.length).toBeGreaterThan(0);
                    expect(res.body[0]).toHaveProperty('name', 'Test Project');
                });
        });
    });

    describe('Admin endpoints', () => {
        it('should reject admin requests from non-admin users', async () => {
            return request(app.getHttpServer())
                .get('/admin/users')
                .set('Authorization', 'Bearer valid-user-token')
                .expect(403);
        });

        it('should allow access to admin endpoints for admin users', async () => {
            return request(app.getHttpServer())
                .get('/admin/users')
                .set('Authorization', 'Bearer valid-admin-token')
                .expect(200)
                .expect(res => {
                    expect(Array.isArray(res.body)).toBe(true);
                    // Should include our test users
                    expect(res.body.some((user: User) => user.email === 'user@example.com')).toBe(true);
                    expect(res.body.some((user: User) => user.email === 'admin@example.com')).toBe(true);
                });
        });
    });
});