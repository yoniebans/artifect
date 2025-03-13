import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/api/filters/http-exception.filter';

/**
 * E2E tests for Project endpoints
 * This test uses the global setup/teardown pattern without utility scripts
 */
describe('Project Management (e2e)', () => {
    let app: INestApplication;
    let projectId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

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
        await app.close();
    });

    it('should create a new project', async () => {
        const response = await request(app.getHttpServer())
            .post('/project/new')
            .send({ name: 'Test Project E2E' })
            .expect(201);

        expect(response.body).toHaveProperty('project_id');
        projectId = response.body.project_id;
    });

    it('should list all projects', async () => {
        const response = await request(app.getHttpServer())
            .get('/project')
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get project details', async () => {
        const response = await request(app.getHttpServer())
            .get(`/project/${projectId}`)
            .expect(200);

        expect(response.body).toHaveProperty('project_id', projectId);
        expect(response.body).toHaveProperty('name', 'Test Project E2E');
    });

    it('should return 404 for non-existent project', async () => {
        await request(app.getHttpServer())
            .get('/project/99999')
            .expect(404);
    });
});