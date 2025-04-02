// src/api/streaming.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { StreamingController } from './controllers/streaming.controller';
import { SSEService } from './services/sse.service';
import { WorkflowOrchestratorService } from '../workflow/workflow-orchestrator.service';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AuthService } from '../auth/auth.service';
import { ClerkService } from '../auth/clerk.service';
import { UserRepository } from '../repositories/user.repository';

// Create properly typed mock function
const mockStreamInteractArtifact = jest.fn();

// Create mock implementations for dependencies with our typed mock
const mockWorkflowOrchestrator = {
    streamInteractArtifact: mockStreamInteractArtifact
};

// Mock auth-related services
const mockAuthService = {
    validateToken: jest.fn().mockResolvedValue({
        id: 1,
        clerkId: 'test_clerk_id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date()
    }),
    isAdmin: jest.fn().mockResolvedValue(false),
};

const mockClerkService = {
    verifyToken: jest.fn().mockResolvedValue({ sub: 'test_clerk_id' }),
    getUserDetails: jest.fn().mockResolvedValue({
        id: 'test_clerk_id',
        email_addresses: [{ email_address: 'test@example.com' }],
        first_name: 'Test',
        last_name: 'User'
    }),
};

const mockUserRepository = {
    findByClerkId: jest.fn().mockResolvedValue({
        id: 1,
        clerkId: 'test_clerk_id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date()
    }),
    findById: jest.fn().mockResolvedValue({
        id: 1,
        clerkId: 'test_clerk_id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date()
    }),
    create: jest.fn()
};

// Create a mock Reflector
const mockReflector = {
    getAllAndOverride: jest.fn().mockReturnValue(true), // Consider all routes public for testing
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
                },
                // Auth related mocks
                { provide: AuthService, useValue: mockAuthService },
                { provide: ClerkService, useValue: mockClerkService },
                { provide: UserRepository, useValue: mockUserRepository },
                { provide: Reflector, useValue: mockReflector },

                // Override the auth guard with a testing version
                {
                    provide: APP_GUARD,
                    useValue: {
                        canActivate: jest.fn().mockImplementation((context) => {
                            // Mock user in the request
                            const req = context.switchToHttp().getRequest();
                            req.user = {
                                id: 1,
                                clerkId: 'test_clerk_id',
                                email: 'test@example.com',
                                firstName: 'Test',
                                lastName: 'User',
                                isAdmin: false
                            };
                            return true; // Allow all requests
                        }),
                    },
                },
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
                undefined,
                1 // Check that the user ID was passed
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