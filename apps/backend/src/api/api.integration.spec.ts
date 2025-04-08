// src/api/api.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { HealthController } from './controllers/health.controller';
import { ProjectController } from './controllers/project.controller';
import { ArtifactController } from './controllers/artifact.controller';
import { AIProviderController } from './controllers/ai-provider.controller';
import { StreamingController } from './controllers/streaming.controller';
import { UserController } from './controllers/user.controller';
import { AppService } from '../app.service';
import { WorkflowOrchestratorService } from '../workflow/workflow-orchestrator.service';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { SSEService } from './services/sse.service';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthService } from '../auth/auth.service';
import { ClerkService } from '../auth/clerk.service';
import { UserRepository } from '../repositories/user.repository';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

// Create mock implementations for dependencies
const mockAppService = {
    getHealth: jest.fn().mockReturnValue({ status: 'healthy', timestamp: new Date().toISOString() }),
};

const mockWorkflowOrchestrator = {
    createProject: jest.fn(),
    listProjects: jest.fn(),
    listProjectsByUser: jest.fn(), // Add this method for user-specific projects
    viewProject: jest.fn(),
    getArtifactDetails: jest.fn(),
    createArtifact: jest.fn(),
    updateArtifact: jest.fn(),
    interactArtifact: jest.fn(),
    transitionArtifact: jest.fn(),
};

// Mock the AuthService
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

// Mock the ClerkService
const mockClerkService = {
    verifyToken: jest.fn().mockResolvedValue({ sub: 'test_clerk_id' }),
    getUserDetails: jest.fn().mockResolvedValue({
        id: 'test_clerk_id',
        email_addresses: [{ email_address: 'test@example.com' }],
        first_name: 'Test',
        last_name: 'User'
    }),
};

// Mock the UserRepository
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
    create: jest.fn(),
    findAll: jest.fn(),
    updateAdminStatus: jest.fn(),
};

// Create a mock Reflector
const mockReflector = {
    getAllAndOverride: jest.fn((key) => {
        // For testing, mark the health endpoint as public, everything else as protected
        if (key === 'isPublic') {
            return true; // Consider all routes public for testing
        }
        return false;
    }),
};

describe('API Integration Tests', () => {
    let app: INestApplication;

    beforeAll(async () => {
        // Create a test module with controllers and necessary mocks
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [
                HealthController,
                ProjectController,
                ArtifactController,
                AIProviderController,
                StreamingController,
                UserController
            ],
            providers: [
                { provide: AppService, useValue: mockAppService },
                { provide: WorkflowOrchestratorService, useValue: mockWorkflowOrchestrator },
                { provide: SSEService, useClass: SSEService },
                { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },

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

                // Add the AdminGuard for completeness
                AdminGuard
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

    describe('Health Check', () => {
        it('GET /health - should return health status', async () => {
            mockAppService.getHealth.mockReturnValue({
                status: 'healthy',
                timestamp: new Date().toISOString(),
            });

            const response = await request(app.getHttpServer())
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('timestamp');
            expect(mockAppService.getHealth).toHaveBeenCalled();
        });
    });

    describe('Project Endpoints', () => {
        let projectId: string;

        it('POST /project/new - should create a new project', async () => {
            const projectData = { name: 'Test Project' };
            const createdProject = {
                project_id: '1',
                name: 'Test Project',
                created_at: new Date(),
                updated_at: null
            };

            mockWorkflowOrchestrator.createProject.mockResolvedValue({
                project_id: '1',
                name: 'Test Project',
                created_at: new Date(),
                updated_at: null
            });

            const response = await request(app.getHttpServer())
                .post('/project/new')
                .send(projectData)
                .expect(201);

            // Instead of comparing the entire object, check individual fields
            expect(response.body.project_id).toEqual(createdProject.project_id);
            expect(response.body.name).toEqual(createdProject.name);
            expect(response.body).toHaveProperty('created_at');
            expect(response.body).toHaveProperty('updated_at');

            expect(mockWorkflowOrchestrator.createProject).toHaveBeenCalledWith(
                projectData.name,
                1, // Check that the user ID was passed
                undefined // No project type specified
            );

            // Store the project ID for later tests
            projectId = response.body.project_id;
        });

        it('GET /project - should list projects for the current user', async () => {
            const projects = [
                {
                    project_id: '1',
                    name: 'Project for List Test',
                    created_at: new Date(),
                    updated_at: null,
                }
            ];

            mockWorkflowOrchestrator.listProjectsByUser.mockResolvedValue(projects);

            const response = await request(app.getHttpServer())
                .get('/project')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).toHaveProperty('name', 'Project for List Test');
            expect(mockWorkflowOrchestrator.listProjectsByUser).toHaveBeenCalledWith(1);
        });

        it('GET /project/:id - should return project details', async () => {
            const projectDetails = {
                project_id: '1',
                name: 'Project for Details Test',
                created_at: new Date(),
                updated_at: null,
                phases: [],
                artifacts: {
                    'Requirements': []
                }
            };

            mockWorkflowOrchestrator.viewProject.mockResolvedValue(projectDetails);

            const response = await request(app.getHttpServer())
                .get(`/project/${projectId || '1'}`)
                .expect(200);

            expect(response.body).toHaveProperty('project_id');
            expect(mockWorkflowOrchestrator.viewProject).toHaveBeenCalledWith(
                Number(projectId || '1'),
                1 // Check that the user ID was passed
            );
        });

        it('GET /project/:id - should handle not found', async () => {
            mockWorkflowOrchestrator.viewProject.mockRejectedValue(
                new Error('Project with id 9999 not found')
            );

            await request(app.getHttpServer())
                .get('/project/9999')
                .expect(404);
        });

        // Add project type specific tests
        it('POST /project/new - should create a project with specified project type', async () => {
            const projectData = { 
                name: 'Product Design Project',
                project_type_id: 2
            };
            
            const createdProject = {
                project_id: '2',
                name: 'Product Design Project',
                created_at: new Date(),
                updated_at: null,
                project_type_id: '2',
                project_type_name: 'Product Design'
            };

            mockWorkflowOrchestrator.createProject.mockResolvedValue(createdProject);

            const response = await request(app.getHttpServer())
                .post('/project/new')
                .send(projectData)
                .expect(201);

            expect(response.body.project_id).toEqual(createdProject.project_id);
            expect(response.body.name).toEqual(createdProject.name);
            expect(response.body.project_type_id).toEqual('2');
            expect(response.body.project_type_name).toEqual('Product Design');

            expect(mockWorkflowOrchestrator.createProject).toHaveBeenCalledWith(
                projectData.name,
                1,
                projectData.project_type_id
            );
        });
    });

    describe('Artifact Endpoints', () => {
        let projectId = '1';
        let artifactId: string;

        it('POST /artifact/new - should create a new artifact', async () => {
            const artifactData = {
                project_id: projectId,
                artifact_type_name: 'Vision Document'
            };

            const createdArtifact = {
                artifact: {
                    artifact_id: '1',
                    artifact_type_id: '1',
                    artifact_type_name: 'Vision Document',
                    name: 'New Vision Document',
                    state_id: '1',
                    state_name: 'In Progress',
                    available_transitions: []
                },
                chat_completion: {
                    messages: []
                }
            };

            mockWorkflowOrchestrator.createArtifact.mockResolvedValue(createdArtifact);

            const response = await request(app.getHttpServer())
                .post('/artifact/new')
                .send(artifactData)
                .set('X-AI-Provider', 'anthropic')
                .set('X-AI-Model', 'claude-3-opus-20240229')
                .expect(201);

            expect(response.body).toHaveProperty('artifact');
            expect(response.body.artifact).toHaveProperty('artifact_id');
            expect(mockWorkflowOrchestrator.createArtifact).toHaveBeenCalledWith(
                Number(artifactData.project_id),
                artifactData.artifact_type_name,
                'anthropic',
                'claude-3-opus-20240229',
                1 // Check that the user ID was passed
            );

            // Save artifact ID for future tests
            artifactId = response.body.artifact.artifact_id;
        });

        it('GET /artifact/:id - should return artifact details', async () => {
            const artifactDetails = {
                artifact: {
                    artifact_id: artifactId || '1',
                    artifact_type_id: '1',
                    artifact_type_name: 'Vision Document',
                    name: 'Test Artifact',
                    state_id: '1',
                    state_name: 'In Progress',
                    available_transitions: []
                },
                chat_completion: {
                    messages: []
                }
            };

            mockWorkflowOrchestrator.getArtifactDetails.mockResolvedValue(artifactDetails);

            const response = await request(app.getHttpServer())
                .get(`/artifact/${artifactId || '1'}`)
                .expect(200);

            expect(response.body).toHaveProperty('artifact');
            expect(response.body.artifact).toHaveProperty('artifact_id');
            expect(mockWorkflowOrchestrator.getArtifactDetails).toHaveBeenCalledWith(
                Number(artifactId || '1'),
                1 // Check that the user ID was passed
            );
        });

        it('PUT /artifact/:id - should update an artifact', async () => {
            const updateData = {
                name: 'Updated Artifact Name',
                content: 'Updated artifact content'
            };

            const updatedArtifact = {
                id: 1,
                name: 'Updated Artifact Name',
            };

            const artifactDetails = {
                artifact: {
                    artifact_id: artifactId || '1',
                    artifact_type_id: '1',
                    artifact_type_name: 'Vision Document',
                    name: 'Updated Artifact Name',
                    artifact_version_content: 'Updated artifact content',
                    state_id: '1',
                    state_name: 'In Progress',
                    available_transitions: []
                },
                chat_completion: {
                    messages: []
                }
            };

            mockWorkflowOrchestrator.updateArtifact.mockResolvedValue(updatedArtifact);
            mockWorkflowOrchestrator.getArtifactDetails.mockResolvedValue(artifactDetails);

            const response = await request(app.getHttpServer())
                .put(`/artifact/${artifactId || '1'}`)
                .send(updateData)
                .expect(200);

            expect(response.body.artifact).toHaveProperty('name', 'Updated Artifact Name');
            expect(mockWorkflowOrchestrator.updateArtifact).toHaveBeenCalledWith(
                Number(artifactId || '1'),
                updateData.name,
                updateData.content,
                1 // Check that the user ID was passed
            );
            expect(mockWorkflowOrchestrator.getArtifactDetails).toHaveBeenCalledWith(
                Number(artifactId || '1'),
                1 // Check that the user ID was passed
            );
        });

        it('PUT /artifact/:id/ai - should interact with an artifact', async () => {
            const interactionPayload = {
                messages: [
                    {
                        role: 'user',
                        content: 'Update the vision to include mobile support'
                    }
                ]
            };

            const interactionResponse = {
                artifact: {
                    artifact_id: artifactId || '1',
                    artifact_type_id: '1',
                    artifact_type_name: 'Vision Document',
                    name: 'Test Artifact',
                    state_id: '1',
                    state_name: 'In Progress',
                    available_transitions: []
                },
                chat_completion: {
                    messages: [
                        {
                            role: 'assistant',
                            content: 'I have updated the vision to include mobile support'
                        }
                    ]
                }
            };

            mockWorkflowOrchestrator.interactArtifact.mockResolvedValue(interactionResponse);

            const response = await request(app.getHttpServer())
                .put(`/artifact/${artifactId || '1'}/ai`)
                .send(interactionPayload)
                .set('X-AI-Provider', 'anthropic')
                .expect(200);

            expect(response.body).toHaveProperty('artifact');
            expect(response.body).toHaveProperty('chat_completion');
            expect(response.body.chat_completion).toHaveProperty('messages');
            expect(mockWorkflowOrchestrator.interactArtifact).toHaveBeenCalledWith(
                Number(artifactId || '1'),
                interactionPayload.messages[0].content,
                'anthropic',
                undefined,
                1 // Check that the user ID was passed
            );
        });

        it('PUT /artifact/:id/state/:state_id - should update artifact state', async () => {
            const stateId = '2';

            const stateUpdateResponse = {
                artifact: {
                    artifact_id: artifactId || '1',
                    artifact_type_id: '1',
                    artifact_type_name: 'Vision Document',
                    name: 'Test Artifact',
                    state_id: stateId,
                    state_name: 'Approved',
                    available_transitions: []
                },
                chat_completion: {
                    messages: []
                }
            };

            mockWorkflowOrchestrator.transitionArtifact.mockResolvedValue(stateUpdateResponse);

            const response = await request(app.getHttpServer())
                .put(`/artifact/${artifactId || '1'}/state/${stateId}`)
                .expect(200);

            expect(response.body.artifact).toHaveProperty('state_id', stateId);
            expect(mockWorkflowOrchestrator.transitionArtifact).toHaveBeenCalledWith(
                Number(artifactId || '1'),
                Number(stateId),
                1 // Check that the user ID was passed
            );
        });

        // Add new test for project type validation in artifacts
        it('POST /artifact/new - should reject invalid artifact type for project type', async () => {
            const artifactData = {
                project_id: projectId,
                artifact_type_name: 'Market Analysis' // Not valid for Software Engineering
            };

            mockWorkflowOrchestrator.createArtifact.mockRejectedValue(
                new Error('Artifact type "Market Analysis" is not allowed in this project type')
            );

            const response = await request(app.getHttpServer())
                .post('/artifact/new')
                .send(artifactData)
                .set('X-AI-Provider', 'anthropic')
                .set('X-AI-Model', 'claude-3-opus-20240229')
                .expect(400);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('not allowed in this project type');
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
            await request(app.getHttpServer())
                .put(`/artifact/1/ai`)
                .send({
                    // Missing messages array
                })
                .expect(400);
        });

        // Add project type validation test
        it('should validate project_type_id as a number', async () => {
            await request(app.getHttpServer())
                .post('/project/new')
                .send({
                    name: 'Test Project',
                    project_type_id: 'not-a-number'
                })
                .expect(400);
        });
    });

    // Add additional tests for project type functionality
    describe('Project Type Integration', () => {
        it('GET /project/:id - should return project with project type information', async () => {
            const projectDetails = {
                project_id: '2',
                name: 'Product Design Project',
                created_at: new Date(),
                updated_at: null,
                project_type_id: '2',
                project_type_name: 'Product Design',
                phases: [],
                artifacts: {
                    'Research': []
                }
            };

            mockWorkflowOrchestrator.viewProject.mockResolvedValue(projectDetails);

            const response = await request(app.getHttpServer())
                .get('/project/2')
                .expect(200);

            expect(response.body).toHaveProperty('project_id', '2');
            expect(response.body).toHaveProperty('project_type_id', '2');
            expect(response.body).toHaveProperty('project_type_name', 'Product Design');
        });

        it('GET /artifact/:id - should return artifact with project type info', async () => {
            const artifactDetails = {
                artifact: {
                    artifact_id: '2',
                    artifact_type_id: '8',
                    artifact_type_name: 'User Research',
                    name: 'User Research Document',
                    state_id: '1',
                    state_name: 'In Progress',
                    available_transitions: [],
                    project_type_id: '2',
                    project_type_name: 'Product Design'
                },
                chat_completion: {
                    messages: []
                }
            };

            mockWorkflowOrchestrator.getArtifactDetails.mockResolvedValue(artifactDetails);

            const response = await request(app.getHttpServer())
                .get('/artifact/2')
                .expect(200);

            expect(response.body).toHaveProperty('artifact');
            expect(response.body.artifact).toHaveProperty('artifact_id', '2');
            expect(response.body.artifact).toHaveProperty('project_type_id', '2');
            expect(response.body.artifact).toHaveProperty('project_type_name', 'Product Design');
        });
    });
});