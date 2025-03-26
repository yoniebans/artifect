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
            .set('Authorization', 'Bearer valid-token')  // The token doesn't matter as we're mocking auth
            .send({ name: 'Test Project E2E' })
            .expect(201);

        expect(response.body).toHaveProperty('project_id');
        projectId = response.body.project_id;
        expect(response.body.name).toBe('Test Project E2E');
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
    });

    it('should get project details', async () => {
        const response = await request(app.getHttpServer())
            .get(`/project/${projectId}`)
            .set('Authorization', 'Bearer valid-token')
            .expect(200);

        expect(response.body).toHaveProperty('project_id', projectId);
        expect(response.body).toHaveProperty('name', 'Test Project E2E');
        expect(response.body).toHaveProperty('phases');
    });

    it('should return 404 for non-existent project', async () => {
        await request(app.getHttpServer())
            .get('/project/99999')
            .set('Authorization', 'Bearer valid-token')
            .expect(404);
    });
});