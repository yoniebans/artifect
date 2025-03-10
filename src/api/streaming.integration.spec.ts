// src/api/streaming.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { StreamingController } from './controllers/streaming.controller';
import { SSEService } from './services/sse.service';
import { WorkflowOrchestratorService } from '../workflow/workflow-orchestrator.service';
import { HttpExceptionFilter } from './filters/http-exception.filter';

// Create mock implementations for dependencies
const mockWorkflowOrchestrator = {
    streamInteractArtifact: jest.fn().mockImplementation(async (artifactId, userMessage, onChunk) => {
        // Mock streaming behavior by calling onChunk a few times
        onChunk('Chunk 1');
        onChunk('Chunk 2');
        onChunk('Chunk 3');

        return {
            artifactContent: 'Final artifact content',
            commentary: 'Final commentary'
        };
    }),
};

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

    beforeAll(async () => {
        // Create a test module with just the specific controller we need to test
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [StreamingController],
            providers: [
                SSEService,
                {
                    provide: WorkflowOrchestratorService,
                    useValue: mockWorkflowOrchestrator
                }
            ],
        }).compile();

        app = moduleFixture.createNestApplication();

        // Set up global pipes and filters for testing
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

    describe('Streaming Artifact Interaction', () => {
        it('POST /stream/artifact/:id/ai - should stream AI response', async () => {
            const artifactId = '1';

            // Configure mock response if needed
            mockWorkflowOrchestrator.streamInteractArtifact.mockImplementationOnce(
                async (artifactId, userMessage, onChunk) => {
                    onChunk('Chunk 1');
                    onChunk('Chunk 2');
                    onChunk('Chunk 3');

                    return {
                        artifactContent: 'Final artifact content',
                        commentary: 'Final commentary'
                    };
                }
            );

            // Make streaming request
            const response = await request(app.getHttpServer())
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
                .expect(200)
                .expect('Content-Type', /text\/event-stream/);

            // Parse the SSE response
            const { events, hasCompleteEvent, hasArtifactContent, hasCommentary } =
                parseSSEResponse(response.text);

            // Should have at least one event
            expect(events.length).toBeGreaterThan(0);

            // Verify the mock was called
            expect(mockWorkflowOrchestrator.streamInteractArtifact).toHaveBeenCalledWith(
                expect.any(Number),
                'Update the vision document with streaming',
                expect.any(Function),
                undefined,
                undefined
            );
        }, 15000); // Increase timeout for streaming

        it('POST /stream/artifact/:id/ai - should handle not found error', async () => {
            const invalidArtifactId = '9999';

            // Configure mock to throw an error
            mockWorkflowOrchestrator.streamInteractArtifact.mockRejectedValueOnce(
                new Error('Artifact with id 9999 not found')
            );

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
            // Invalid request (missing messages array)
            const response = await request(app.getHttpServer())
                .post('/stream/artifact/1/ai')
                .send({})
                .set('Accept', 'text/event-stream')
                .expect(400);

            // Response should contain validation error
            expect(response.body).toHaveProperty('statusCode', 400);
        });
    });
});