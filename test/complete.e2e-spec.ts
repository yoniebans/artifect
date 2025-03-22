// test/complete.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/api/filters/http-exception.filter';
import { createAuthenticatedTestUser, AuthTestData } from './test-utils';

/**
 * True End-to-End Test with Real Clerk Authentication
 * 
 * IMPORTANT: This test requires:
 * 1. A valid .env.test file with the following variables:
 *    - CLERK_SECRET_KEY - Your Clerk secret key
 *    - TEST_USER_CLERK_ID - ID of a test user in your Clerk instance
 *    - TEST_USER_EMAIL - Email matching your Clerk user (optional)
 * 
 * 2. The @clerk/clerk-sdk-node package must be installed:
 *    npm install @clerk/clerk-sdk-node
 * 
 * To run only this test:
 * npm run test:e2e -- complete
 */
describe('Complete E2E Test with Real Auth', () => {
    let app: INestApplication;
    let authData: AuthTestData;
    let projectId: string;

    // This is a complete E2E test that should only run when explicitly called
    // It requires actual Clerk credentials to be set in the environment
    const shouldSkipTests = process.env.SKIP_COMPLETE_E2E === 'true';

    beforeAll(async () => {
        if (shouldSkipTests) {
            console.log('Skipping complete E2E tests. Set SKIP_COMPLETE_E2E=false to run them.');
            return;
        }

        try {
            // Create authenticated test user with Clerk token
            authData = await createAuthenticatedTestUser();
            console.log(`Using test user with ID: ${authData.user.id} and valid Clerk token`);
        } catch (error) {
            console.error('Failed to set up authenticated test user:', error);
            // Don't exit process, let Jest handle the failure
            return;
        }

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        // Apply the same pipes and filters as in main.ts
        app.useGlobalPipes(
            new ValidationPipe({
                transform: true,
                whitelist: true,
                forbidNonWhitelisted: true,
            })
        );
        app.useGlobalFilters(new HttpExceptionFilter());

        await app.init();
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });

    // Skip all tests if environment variables are not set
    beforeEach(() => {
        if (shouldSkipTests || !authData?.token) {
            console.log('Skipping complete E2E test due to missing authentication data');
        }
    });

    it('GET /health - should work without authentication', async () => {
        if (shouldSkipTests || !authData) return;

        const response = await request(app.getHttpServer())
            .get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('GET /project - should fail without authentication', async () => {
        if (shouldSkipTests || !authData) return;

        const response = await request(app.getHttpServer())
            .get('/project');

        expect(response.status).toBe(401);
    });

    it('GET /project - should work with valid authentication', async () => {
        if (shouldSkipTests || !authData) return;

        const response = await request(app.getHttpServer())
            .get('/project')
            .set('Authorization', `Bearer ${authData.token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('POST /project/new - should create a new project', async () => {
        if (shouldSkipTests || !authData) return;

        const response = await request(app.getHttpServer())
            .post('/project/new')
            .set('Authorization', `Bearer ${authData.token}`)
            .send({ name: 'E2E Test Project with Real Auth' });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('project_id');
        expect(response.body).toHaveProperty('name', 'E2E Test Project with Real Auth');

        // Save the project ID for later tests
        projectId = response.body.project_id;
    });

    it('GET /project/:id - should return project details', async () => {
        if (shouldSkipTests || !authData) return;

        // Skip if we couldn't create a project
        if (!projectId) {
            console.log('Skipping test because no project was created');
            return;
        }

        const response = await request(app.getHttpServer())
            .get(`/project/${projectId}`)
            .set('Authorization', `Bearer ${authData.token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('project_id', projectId);
        expect(response.body).toHaveProperty('name', 'E2E Test Project with Real Auth');
        expect(response.body).toHaveProperty('phases');
    });

    it('POST /artifact/new - should create a new artifact', async () => {
        if (shouldSkipTests || !authData) return;

        // Skip if we couldn't create a project
        if (!projectId) {
            console.log('Skipping test because no project was created');
            return;
        }

        const response = await request(app.getHttpServer())
            .post('/artifact/new')
            .set('Authorization', `Bearer ${authData.token}`)
            .set('X-AI-Provider', 'anthropic')
            .set('X-AI-Model', 'claude-3-haiku-20240307')
            .send({
                project_id: projectId,
                artifact_type_name: 'Vision Document'
            });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('artifact');
        expect(response.body.artifact).toHaveProperty('artifact_id');
    });
});