// src/api/api.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { HealthController } from './controllers/health.controller';
import { ProjectController } from './controllers/project.controller';
import { ArtifactController } from './controllers/artifact.controller';
import { AIProviderController } from './controllers/ai-provider.controller';
import { AppService } from '../app.service';
import { WorkflowOrchestratorService } from '../workflow/workflow-orchestrator.service';
import { HttpExceptionFilter } from './filters/http-exception.filter';

// Create mock implementations for dependencies
const mockAppService = {
    getHealth: jest.fn().mockReturnValue({ status: 'healthy', timestamp: new Date().toISOString() }),
};

const mockWorkflowOrchestrator = {
    createProject: jest.fn(),
    listProjects: jest.fn(),
    viewProject: jest.fn(),
    getArtifactDetails: jest.fn(),
    createArtifact: jest.fn(),
    updateArtifact: jest.fn(),
    interactArtifact: jest.fn(),
    transitionArtifact: jest.fn(),
};

describe('API Integration Tests', () => {
    let app: INestApplication;

    beforeAll(async () => {
        // Create a test module with only the controllers we need to test
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [
                HealthController,
                ProjectController,
                ArtifactController,
                AIProviderController
            ],
            providers: [
                { provide: AppService, useValue: mockAppService },
                { provide: WorkflowOrchestratorService, useValue: mockWorkflowOrchestrator }
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

    // Continue with the existing tests, but configure the mock responses appropriately
    describe('Project Endpoints', () => {
        let projectId: string;

        it('POST /project/new - should create a new project', async () => {
            const projectData = { name: 'Test Project' };
            const createdProject = {
                project_id: '1',
                name: 'Test Project',
                created_at: new Date(),
                updated_at: null,
            };

            mockWorkflowOrchestrator.createProject.mockResolvedValue(createdProject);

            const response = await request(app.getHttpServer())
                .post('/project/new')
                .send(projectData)
                .expect(201);

            expect(response.body).toEqual(createdProject);
            expect(mockWorkflowOrchestrator.createProject).toHaveBeenCalledWith(projectData.name);

            // Store the project ID for later tests
            projectId = response.body.project_id;
        });

        it('GET /project - should list all projects', async () => {
            const projects = [
                {
                    project_id: '1',
                    name: 'Project for List Test',
                    created_at: new Date(),
                    updated_at: null,
                }
            ];

            mockWorkflowOrchestrator.listProjects.mockResolvedValue(projects);

            const response = await request(app.getHttpServer())
                .get('/project')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).toHaveProperty('name', 'Project for List Test');
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
            expect(mockWorkflowOrchestrator.viewProject).toHaveBeenCalled();
        });

        it('GET /project/:id - should handle not found', async () => {
            mockWorkflowOrchestrator.viewProject.mockRejectedValue(
                new Error('Project with id 9999 not found')
            );

            await request(app.getHttpServer())
                .get('/project/9999')
                .expect(404);
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
            expect(mockWorkflowOrchestrator.createArtifact).toHaveBeenCalled();

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
            expect(mockWorkflowOrchestrator.updateArtifact).toHaveBeenCalled();
            expect(mockWorkflowOrchestrator.getArtifactDetails).toHaveBeenCalled();
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
            expect(mockWorkflowOrchestrator.interactArtifact).toHaveBeenCalled();
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
            expect(mockWorkflowOrchestrator.transitionArtifact).toHaveBeenCalled();
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
    });
});