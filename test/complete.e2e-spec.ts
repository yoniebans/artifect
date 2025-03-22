// test/complete.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/api/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';
import dotenv from 'dotenv';

/**
 * True End-to-End Test with Real Clerk Authentication
 * 
 * IMPORTANT: This test requires:
 * 1. A valid .env.e2e file with the following variables:
 *    - CLERK_API_KEY - Your Clerk API key
 *    - CLERK_SECRET_KEY - Your Clerk secret key
 *    - TEST_USER_ID - ID of a test user in your Clerk instance
 *    - TEST_USER_TOKEN - A valid JWT for your test user
 * 
 * 2. You may need to create a separate Clerk development/test instance
 *    to avoid interference with your production environment
 * 
 * To run only this test:
 * npm run test:e2e -- complete
 */
describe('Complete E2E Test with Real Auth', () => {
    let app: INestApplication;
    let config: ConfigService;
    // This test uses actual tokens, so we'll need to load them from environment
    let testUserToken: string | undefined;
    let projectId: string;

    // This is a complete E2E test that should only run when explicitly called
    // It requires actual Clerk credentials to be set in the environment
    const shouldSkipTests = process.env.SKIP_COMPLETE_E2E === 'true';

    beforeAll(async () => {
        if (shouldSkipTests) {
            console.log('Skipping complete E2E tests. Set SKIP_COMPLETE_E2E=false to run them.');
            return;
        }

        // Load environment variables from .env.e2e
        dotenv.config({ path: '.env.e2e' });

        // Get test token from environment
        testUserToken = process.env.TEST_USER_TOKEN;

        if (!testUserToken) {
            console.error('TEST_USER_TOKEN not found in environment variables');
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

        config = app.get<ConfigService>(ConfigService);

        await app.init();
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });

    // Skip all tests if environment variables are not set
    beforeEach(() => {
        if (shouldSkipTests || !testUserToken) {
            console.log('Skipping complete E2E test due to missing environment variables');
        }
    });

    it('GET /health - should work without authentication', async () => {
        const response = await request(app.getHttpServer())
            .get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('GET /project - should fail without authentication', async () => {
        const response = await request(app.getHttpServer())
            .get('/project');

        expect(response.status).toBe(401);
    });

    it('GET /project - should work with valid authentication', async () => {
        const response = await request(app.getHttpServer())
            .get('/project')
            .set('Authorization', `Bearer ${testUserToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('POST /project/new - should create a new project', async () => {
        const response = await request(app.getHttpServer())
            .post('/project/new')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ name: 'E2E Test Project' });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('project_id');
        expect(response.body).toHaveProperty('name', 'E2E Test Project');

        // Save the project ID for later tests
        projectId = response.body.project_id;
    });

    it('GET /project/:id - should return project details', async () => {
        // Skip if we couldn't create a project
        if (!projectId) {
            console.log('Skipping test because no project was created');
            return;
        }

        const response = await request(app.getHttpServer())
            .get(`/project/${projectId}`)
            .set('Authorization', `Bearer ${testUserToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('project_id', projectId);
        expect(response.body).toHaveProperty('name', 'E2E Test Project');
        expect(response.body).toHaveProperty('phases');
    });

    it('POST /artifact/new - should create a new artifact', async () => {
        // Skip if we couldn't create a project
        if (!projectId) {
            console.log('Skipping test because no project was created');
            return;
        }

        const response = await request(app.getHttpServer())
            .post('/artifact/new')
            .set('Authorization', `Bearer ${testUserToken}`)
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