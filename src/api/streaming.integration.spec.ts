// test/api/streaming.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { HttpExceptionFilter } from '../../src/api/filters/http-exception.filter';

// Helper to parse SSE stream response
function parseSSEResponse(text: string): {
    events: any[],
    hasCompleteEvent: boolean,
    hasArtifactContent: boolean,
    hasCommentary: boolean
} {
    const events = [];
    let hasCompleteEvent = false;
    let hasArtifactContent = false;
    let hasCommentary = false;

    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('data:')) {
            try {
                const eventData = JSON.parse(line.substring(5));
                events.push(eventData);

                if (eventData.done) {
                    hasCompleteEvent = true;
                }

                if (eventData.artifact_content) {
                    hasArtifactContent = true;
                }

                if (eventData.commentary) {
                    hasCommentary = true;
                }
            } catch (e) {
                // Skip invalid JSON
            }
        }
    }

    return { events, hasCompleteEvent, hasArtifactContent, hasCommentary };
}

describe('Streaming API Integration Tests', () => {
    let app: INestApplication;
    let prismaService: PrismaService;
    let projectId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        app.useGlobalPipes(
            new ValidationPipe({
                transform: true,
                whitelist: true,
                forbidNonWhitelisted: true,
            }),
        );
        app.useGlobalFilters(new HttpExceptionFilter());

        prismaService = app.get<PrismaService>(PrismaService);

        await app.init();
    });

    beforeEach(async () => {
        await prismaService.cleanDatabase();

        // Create a project for testing
        const response = await request(app.getHttpServer())
            .post('/project/new')
            .send({ name: 'Streaming Test Project' });

        projectId = response.body.project_id;
    });

    afterAll(async () => {
        await prismaService.$disconnect();
        await app.close();
    });

    describe('Streaming Artifact Interaction', () => {
        it('POST /stream/artifact/:id/ai - should stream AI response', async () => {
            // First create an artifact
            const createResponse = await request(app.getHttpServer())
                .post('/artifact/new')
                .send({
                    project_id: projectId,
                    artifact_type_name: 'Vision Document'
                });

            const artifactId = createResponse.body.artifact.artifact_id;

            // Make streaming request
            const response = await request(app.getHttpServer())
                .post(`/stream/artifact/${artifactId}/ai`)
                .send({
                    messages: [
                        {
                            role: 'user',
                            content: 'Add information about streaming capabilities to the vision document'
                        }
                    ]
                })
                .set('Accept', 'text/event-stream')
                .expect(200)
                .expect('Content-Type', /text\/event-stream/);

            // Parse the SSE response
            const { events, hasCompleteEvent, hasArtifactContent, hasCommentary } =
                parseSSEResponse(response.text);

            // Should have at least one event
            expect(events.length).toBeGreaterThan(0);

            // The first events should have chunks without final data
            if (events.length > 1) {
                expect(events[0]).toHaveProperty('chunk');
                expect(events[0]).not.toHaveProperty('done');
                expect(events[0]).not.toHaveProperty('artifact_content');
                expect(events[0]).not.toHaveProperty('commentary');
            }

            // The stream should contain a complete event
            expect(hasCompleteEvent).toBe(true);

            // The complete event should have artifact content and commentary
            expect(hasArtifactContent).toBe(true);
            expect(hasCommentary).toBe(true);
        }, 30000); // Increase timeout for streaming

        it('POST /stream/artifact/:id/ai - should handle not found error', async () => {
            // Use non-existent artifact ID
            const invalidArtifactId = '9999';

            // Make streaming request to non-existent artifact
            const response = await request(app.getHttpServer())
                .post(`/stream/artifact/${invalidArtifactId}/ai`)
                .send({
                    messages: [
                        {
                            role: 'user',
                            content: 'This should fail'
                        }
                    ]
                })
                .set('Accept', 'text/event-stream')
                .expect(404);

            // Response should contain error message
            expect(response.body).toHaveProperty('statusCode', 404);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('not found');
        });

        it('POST /stream/artifact/:id/ai - should handle validation errors', async () => {
            // Create an artifact first
            const createResponse = await request(app.getHttpServer())
                .post('/artifact/new')
                .send({
                    project_id: projectId,
                    artifact_type_name: 'Vision Document'
                });

            const artifactId = createResponse.body.artifact.artifact_id;

            // Send invalid request (missing messages)
            const response = await request(app.getHttpServer())
                .post(`/stream/artifact/${artifactId}/ai`)
                .send({})
                .set('Accept', 'text/event-stream')
                .expect(400);

            // Response should contain validation error
            expect(response.body).toHaveProperty('statusCode', 400);
            expect(response.body).toHaveProperty('message');
        });
    });
});