// test/api/api.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { HttpExceptionFilter } from '../../src/api/filters/http-exception.filter';

describe('API Integration Tests', () => {
    let app: INestApplication;
    let prismaService: PrismaService;
    let projectId: string;
    let artifactId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        // Set up global pipes and filters for testing, just like in the main application
        app.useGlobalPipes(
            new ValidationPipe({
                transform: true,
                whitelist: true,
                forbidNonWhitelisted: true,
            }),
        );
        app.useGlobalFilters(new HttpExceptionFilter());

        // Get prisma service for database cleanup
        prismaService = app.get<PrismaService>(PrismaService);

        await app.init();
    });

    beforeEach(async () => {
        // Clean database between tests
        await prismaService.cleanDatabase();
    });

    afterAll(async () => {
        await prismaService.$disconnect();
        await app.close();
    });

    describe('Health Check', () => {
        it('GET /health - should return health status', async () => {
            const response = await request(app.getHttpServer())
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('timestamp');
        });
    });

    describe('Project Endpoints', () => {
        it('POST /project/new - should create a new project', async () => {
            const response = await request(app.getHttpServer())
                .post('/project/new')
                .send({ name: 'Test Project' })
                .expect(201);

            expect(response.body).toHaveProperty('project_id');
            expect(response.body).toHaveProperty('name', 'Test Project');
            expect(response.body).toHaveProperty('created_at');

            // Save project ID for future tests
            projectId = response.body.project_id;
        });

        it('GET /project - should list all projects', async () => {
            // Create a test project first
            const createResponse = await request(app.getHttpServer())
                .post('/project/new')
                .send({ name: 'Project for List Test' });

            const response = await request(app.getHttpServer())
                .get('/project')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).toHaveProperty('name', 'Project for List Test');
        });

        it('GET /project/:id - should return project details', async () => {
            // Create a test project first
            const createResponse = await request(app.getHttpServer())
                .post('/project/new')
                .send({ name: 'Project for Details Test' });

            const projectId = createResponse.body.project_id;

            const response = await request(app.getHttpServer())
                .get(`/project/${projectId}`)
                .expect(200);

            expect(response.body).toHaveProperty('project_id', projectId);
            expect(response.body).toHaveProperty('name', 'Project for Details Test');
            expect(response.body).toHaveProperty('phases');
            expect(Array.isArray(response.body.phases)).toBe(true);
        });

        it('GET /project/:id - should handle not found', async () => {
            await request(app.getHttpServer())
                .get('/project/9999')
                .expect(404);
        });
    });

    describe('Artifact Endpoints', () => {
        // Create a project before testing artifacts
        beforeEach(async () => {
            const response = await request(app.getHttpServer())
                .post('/project/new')
                .send({ name: 'Artifact Test Project' });

            projectId = response.body.project_id;
        });

        it('POST /artifact/new - should create a new artifact', async () => {
            const response = await request(app.getHttpServer())
                .post('/artifact/new')
                .send({
                    project_id: projectId,
                    artifact_type_name: 'Vision Document'
                })
                .set('X-AI-Provider', 'anthropic')
                .set('X-AI-Model', 'claude-3-opus-20240229')
                .expect(201);

            expect(response.body).toHaveProperty('artifact');
            expect(response.body.artifact).toHaveProperty('artifact_id');
            expect(response.body.artifact).toHaveProperty('artifact_type_name', 'Vision Document');
            expect(response.body).toHaveProperty('chat_completion');

            // Save artifact ID for future tests
            artifactId = response.body.artifact.artifact_id;
        });

        it('GET /artifact/:id - should return artifact details', async () => {
            // Create a test artifact first
            const createResponse = await request(app.getHttpServer())
                .post('/artifact/new')
                .send({
                    project_id: projectId,
                    artifact_type_name: 'Vision Document'
                });

            const artifactId = createResponse.body.artifact.artifact_id;

            const response = await request(app.getHttpServer())
                .get(`/artifact/${artifactId}`)
                .expect(200);

            expect(response.body).toHaveProperty('artifact');
            expect(response.body.artifact).toHaveProperty('artifact_id', artifactId);
            expect(response.body).toHaveProperty('chat_completion');
        });

        it('PUT /artifact/:id - should update an artifact', async () => {
            // Create a test artifact first
            const createResponse = await request(app.getHttpServer())
                .post('/artifact/new')
                .send({
                    project_id: projectId,
                    artifact_type_name: 'Vision Document'
                });

            const artifactId = createResponse.body.artifact.artifact_id;

            const response = await request(app.getHttpServer())
                .put(`/artifact/${artifactId}`)
                .send({
                    name: 'Updated Artifact Name',
                    content: 'Updated artifact content'
                })
                .expect(200);

            expect(response.body.artifact).toHaveProperty('name', 'Updated Artifact Name');
            expect(response.body.artifact).toHaveProperty('artifact_version_content', 'Updated artifact content');
        });

        it('PUT /artifact/:id/ai - should interact with an artifact', async () => {
            // Create a test artifact first
            const createResponse = await request(app.getHttpServer())
                .post('/artifact/new')
                .send({
                    project_id: projectId,
                    artifact_type_name: 'Vision Document'
                });

            const artifactId = createResponse.body.artifact.artifact_id;

            const response = await request(app.getHttpServer())
                .put(`/artifact/${artifactId}/ai`)
                .send({
                    messages: [
                        {
                            role: 'user',
                            content: 'Update the vision to include mobile support'
                        }
                    ]
                })
                .set('X-AI-Provider', 'anthropic')
                .expect(200);

            expect(response.body).toHaveProperty('artifact');
            expect(response.body).toHaveProperty('chat_completion');
            expect(response.body.chat_completion).toHaveProperty('messages');
            expect(Array.isArray(response.body.chat_completion.messages)).toBe(true);
        });

        it('PUT /artifact/:id/state/:state_id - should update artifact state', async () => {
            // Create a test artifact first
            const createResponse = await request(app.getHttpServer())
                .post('/artifact/new')
                .send({
                    project_id: projectId,
                    artifact_type_name: 'Vision Document'
                });

            const artifactId = createResponse.body.artifact.artifact_id;
            const stateId = createResponse.body.artifact.available_transitions[0].state_id;

            const response = await request(app.getHttpServer())
                .put(`/artifact/${artifactId}/state/${stateId}`)
                .expect(200);

            expect(response.body.artifact).toHaveProperty('state_id', stateId);
        });
    });

    describe('AI Provider Endpoints', () => {
        it('GET /ai-providers - should list available AI providers', async () => {
            const response = await request(app.getHttpServer())
                .get('/ai-providers')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);

            const provider = response.body[0];
            expect(provider).toHaveProperty('id');
            expect(provider).toHaveProperty('name');
            expect(provider).toHaveProperty('models');
            expect(Array.isArray(provider.models)).toBe(true);
        });
    });

    describe('Streaming Endpoints', () => {
        // This test is more challenging as we need to handle SSE in supertest
        it('POST /stream/artifact/:id/ai - should stream artifact interaction', async () => {
            // Create a test artifact first
            const createResponse = await request(app.getHttpServer())
                .post('/artifact/new')
                .send({
                    project_id: projectId,
                    artifact_type_name: 'Vision Document'
                });

            const artifactId = createResponse.body.artifact.artifact_id;

            // Make the streaming request
            const res = await request(app.getHttpServer())
                .post(`/stream/artifact/${artifactId}/ai`)
                .send({
                    messages: [
                        {
                            role: 'user',
                            content: 'Update the vision document with streaming'
                        }
                    ]
                })
                .set('Accept', 'text/event-stream')
                .set('X-AI-Provider', 'anthropic')
                .expect(200)
                .expect('Content-Type', /text\/event-stream/);

            // The response should include SSE data
            expect(res.text).toContain('data:');
        });
    });

    // Test validation errors
    describe('Validation', () => {
        it('should reject invalid project creation request', async () => {
            await request(app.getHttpServer())
                .post('/project/new')
                .send({}) // Missing name
                .expect(400);
        });

        it('should reject invalid artifact creation request', async () => {
            await request(app.getHttpServer())
                .post('/artifact/new')
                .send({
                    // Missing required fields
                })
                .expect(400);
        });

        it('should reject invalid AI interaction request', async () => {
            // Create a test artifact first
            const createResponse = await request(app.getHttpServer())
                .post('/artifact/new')
                .send({
                    project_id: projectId,
                    artifact_type_name: 'Vision Document'
                });

            const artifactId = createResponse.body.artifact.artifact_id;

            await request(app.getHttpServer())
                .put(`/artifact/${artifactId}/ai`)
                .send({
                    // Missing messages array
                })
                .expect(400);
        });
    });
});