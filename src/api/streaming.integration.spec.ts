// src/api/streaming.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { StreamingController } from './controllers/streaming.controller';
import { SSEService } from './services/sse.service';
import { WorkflowOrchestratorService } from '../workflow/workflow-orchestrator.service';
import { HttpExceptionFilter } from './filters/http-exception.filter';

// Create properly typed mock function
const mockStreamInteractArtifact = jest.fn();

// Create mock implementations for dependencies with our typed mock
const mockWorkflowOrchestrator = {
    streamInteractArtifact: mockStreamInteractArtifact
};

describe('Streaming API Integration Tests', () => {
    let app: INestApplication;

    beforeAll(async () => {
        // Reset mocks
        mockStreamInteractArtifact.mockReset();

        // Set up default implementation
        mockStreamInteractArtifact.mockImplementation(async (artifactId, userMessage, onChunk) => {
            // Mock streaming behavior by calling onChunk a few times
            onChunk('Chunk 1');
            onChunk('Chunk 2');
            onChunk('Chunk 3');

            return {
                artifactContent: 'Final artifact content',
                commentary: 'Final commentary'
            };
        });

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

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Streaming Artifact Interaction', () => {
        it('POST /stream/artifact/:id/ai - should stream AI response', async () => {
            const artifactId = '1';

            // Make streaming request
            await request(app.getHttpServer())
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

            // Verify the mock was called with correct parameters
            expect(mockStreamInteractArtifact).toHaveBeenCalledWith(
                expect.any(Number),
                'Update the vision document with streaming',
                expect.any(Function),
                undefined,
                undefined
            );
        }, 15000); // Keep increased timeout for streaming

        it('POST /stream/artifact/:id/ai - should handle validation errors', async () => {
            // Send an invalid request (missing messages array)
            const response = await request(app.getHttpServer())
                .post('/stream/artifact/1/ai')
                .send({}) // Invalid - missing messages array
                .set('Accept', 'text/event-stream')
                .expect(400);

            // Response should contain validation error
            expect(response.body).toHaveProperty('statusCode', 400);

            // Mock should not have been called
            expect(mockStreamInteractArtifact).not.toHaveBeenCalled();
        });
    });
});