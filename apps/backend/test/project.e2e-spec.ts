// test/project.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/api/filters/http-exception.filter';
import { AuthService } from '../src/auth/auth.service';
import { ClerkService } from '../src/auth/clerk.service';
import { AdminGuard } from '../src/auth/guards/admin.guard';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { TEST_USER_CLERK_ID, TEST_USER_EMAIL, getTestUserFromDb } from './test-utils';
import { User } from '@prisma/client';

/**
 * E2E tests for Project endpoints
 */
describe('Project Management (e2e)', () => {
    let app: INestApplication;
    let projectId: string;
    let testUser: User;

    beforeAll(async () => {
        // First, get the test user from the database
        testUser = await getTestUserFromDb();
        console.log(`Using test user with ID: ${testUser.id}`);

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(ClerkService)
            .useValue({
                verifyToken: jest.fn().mockImplementation(() => ({ sub: TEST_USER_CLERK_ID })),
                getUserDetails: jest.fn().mockImplementation(() => ({
                    email_addresses: [{ email_address: TEST_USER_EMAIL }],
                    first_name: 'Test',
                    last_name: 'User'
                }))
            })
            .overrideProvider(AuthService)
            .useValue({
                validateToken: jest.fn().mockResolvedValue(testUser),
                isAdmin: jest.fn().mockResolvedValue(false)
            })
            .overrideGuard(AdminGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(AuthGuard)
            .useValue({
                canActivate: (context: ExecutionContext) => {
                    const req = context.switchToHttp().getRequest();
                    req.user = testUser;
                    return true;
                }
            })
            .compile();

        app = moduleFixture.createNestApplication();

        // Apply same pipes and filters as in main.ts
        app.useGlobalPipes(
            new ValidationPipe({
                transform: true,
                whitelist: true,
                forbidNonWhitelisted: true,
            }),
        );
        app.useGlobalFilters(new HttpExceptionFilter());

        await app.init();
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });

    it('should create a new project', async () => {
        const response = await request(app.getHttpServer())
            .post('/project/new')
            .set('Authorization', 'Bearer valid-token')
            .send({ name: 'Test Project E2E' })
            .expect(201);

        expect(response.body).toHaveProperty('project_id');
        projectId = response.body.project_id;
        expect(response.body.name).toBe('Test Project E2E');

        // Add check for default project type (Software Engineering)
        expect(response.body).toHaveProperty('project_type_id');
        expect(response.body).toHaveProperty('project_type_name', 'Software Engineering');
    });

    it('should list all projects', async () => {
        const response = await request(app.getHttpServer())
            .get('/project')
            .set('Authorization', 'Bearer valid-token')
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);

        // The newly created project should be in the list
        const project = response.body.find((p: any) => p.project_id === projectId);
        expect(project).toBeDefined();
        expect(project.name).toBe('Test Project E2E');

        // Check project type info
        expect(project).toHaveProperty('project_type_id');
        expect(project).toHaveProperty('project_type_name');
    });

    it('should get project details', async () => {
        const response = await request(app.getHttpServer())
            .get(`/project/${projectId}`)
            .set('Authorization', 'Bearer valid-token')
            .expect(200);

        expect(response.body).toHaveProperty('project_id', projectId);
        expect(response.body).toHaveProperty('name', 'Test Project E2E');
        expect(response.body).toHaveProperty('phases');

        // Check project type info
        expect(response.body).toHaveProperty('project_type_id');
        expect(response.body).toHaveProperty('project_type_name');
    });

    it('should return 404 for non-existent project', async () => {
        await request(app.getHttpServer())
            .get('/project/99999')
            .set('Authorization', 'Bearer valid-token')
            .expect(404);
    });

    // Additional tests for project type functionality
    describe('Project Type Support', () => {
        let productDesignProjectId: string;

        // Test creating a project with a specific project type
        it('should create a project with specified project type', async () => {
            const response = await request(app.getHttpServer())
                .post('/project/new')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    name: 'Product Design Test Project',
                    project_type_id: 2  // Product Design project type
                })
                .expect(201);

            expect(response.body).toHaveProperty('project_id');
            productDesignProjectId = response.body.project_id;

            // Verify the project was created with the specified project type
            expect(response.body).toHaveProperty('project_type_id', '2');
            expect(response.body).toHaveProperty('project_type_name', 'Product Design');
        });

        // Test that project details include phases specific to the project type
        it('should include phases specific to the project type', async () => {
            // Get details for the Product Design project
            const response = await request(app.getHttpServer())
                .get(`/project/${productDesignProjectId}`)
                .set('Authorization', 'Bearer valid-token')
                .expect(200);

            expect(response.body).toHaveProperty('project_id', productDesignProjectId);
            expect(response.body).toHaveProperty('project_type_id', '2');
            expect(response.body).toHaveProperty('project_type_name', 'Product Design');

            // Check that phases match Product Design
            expect(response.body).toHaveProperty('phases');
            expect(Array.isArray(response.body.phases)).toBe(true);

            // Extract phase names
            const phaseNames = response.body.phases.map((phase: any) => phase.name);

            // Product Design should have Research and Concept phases
            expect(phaseNames).toContain('Research');
            expect(phaseNames).toContain('Concept');

            // Should NOT contain Software Engineering phases
            expect(phaseNames).not.toContain('Implementation');
        });

        // Test that invalid project_type_id is properly validated
        it('should validate project_type_id as a number', async () => {
            const response = await request(app.getHttpServer())
                .post('/project/new')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    name: 'Invalid Project Type Test',
                    project_type_id: 'not-a-number'
                })
                .expect(400);

            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('error');
        });
    });
});