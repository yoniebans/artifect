import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkflowOrchestratorService } from './workflow-orchestrator.service';
import { ProjectRepository } from '../repositories/project.repository';
import { ArtifactRepository } from '../repositories/artifact.repository';
import { ReasoningRepository } from '../repositories/reasoning.repository';
import { ProjectTypeRepository } from '../repositories/project-type.repository';
import { TemplateManagerService } from '../templates/template-manager.service';
import { ContextManagerService } from '../context/context-manager.service';
import { AIAssistantService } from '../ai/ai-assistant.service';

describe('WorkflowOrchestratorService', () => {
    // Save original environment
    const originalEnv = process.env.NODE_ENV;

    beforeAll(() => {
        // Set environment to test
        process.env.NODE_ENV = 'test';
    });

    afterAll(() => {
        // Restore original environment
        process.env.NODE_ENV = originalEnv;
    });

    let service: WorkflowOrchestratorService;
    let projectRepository: ProjectRepository;
    let artifactRepository: ArtifactRepository;
    let reasoningRepository: ReasoningRepository;
    let projectTypeRepository: ProjectTypeRepository;
    let templateManager: TemplateManagerService;
    let contextManager: ContextManagerService;
    let aiAssistant: AIAssistantService;

    // Mock project
    const mockProject = {
        id: 1,
        name: 'Test Project',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        userId: 1, // Add the userId field
        projectTypeId: 1,
    };

    // Mock project type
    const mockProjectType = {
        id: 1,
        name: 'Software Engineering',
        description: 'Standard software engineering project',
        isActive: true,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        lifecyclePhases: [
            {
                id: 1,
                name: 'Requirements',
                order: 1,
                projectTypeId: 1
            },
            {
                id: 2,
                name: 'Design',
                order: 2,
                projectTypeId: 1
            }
        ]
    };

    // Mock artifact type
    const mockArtifactType = {
        id: 1,
        name: 'Vision Document',
        slug: 'vision',
        syntax: 'markdown',
        lifecyclePhaseId: 1,
        lifecyclePhase: {
            id: 1,
            name: 'Requirements',
        },
        dependencies: [],
    };

    // Mock artifact state
    const mockArtifactState = {
        id: 2,
        name: 'In Progress',
    };

    // Mock artifact
    const mockArtifact = {
        id: 1,
        projectId: 1,
        artifactTypeId: 1,
        stateId: 2,
        currentVersionId: 1,
        name: 'Test Vision',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        currentVersion: {
            id: 1,
            artifactId: 1,
            versionNumber: 1,
            content: 'Vision document content',
            createdAt: new Date('2023-01-01'),
        },
    };

    // Mock interaction
    const mockInteraction = {
        id: 1,
        artifactId: 1,
        versionId: 1,
        role: 'assistant',
        content: 'AI response',
        sequenceNumber: 1,
        createdAt: new Date('2023-01-01'),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkflowOrchestratorService,
                {
                    provide: ProjectRepository,
                    useValue: {
                        create: jest.fn().mockResolvedValue(mockProject),
                        findById: jest.fn().mockResolvedValue(mockProject),
                        findAll: jest.fn().mockResolvedValue([mockProject]),
                        findByUserId: jest.fn().mockResolvedValue([mockProject]),
                        update: jest.fn(),
                        delete: jest.fn(),
                        getProjectMetadata: jest.fn(),
                        getPhaseArtifacts: jest.fn(),
                        isProjectOwner: jest.fn().mockResolvedValue(true),
                    },
                },
                {
                    provide: ArtifactRepository,
                    useValue: {
                        create: jest.fn().mockResolvedValue(mockArtifact),
                        findById: jest.fn().mockResolvedValue(mockArtifact),
                        findAll: jest.fn(),
                        update: jest.fn().mockResolvedValue(mockArtifact),
                        delete: jest.fn(),
                        getArtifactsByProjectId: jest.fn().mockResolvedValue([mockArtifact]),
                        getArtifactsByProjectIdAndPhase: jest.fn().mockResolvedValue([]),
                        getAvailableTransitions: jest.fn().mockResolvedValue([{ id: 3, name: 'Approved' }]),
                        getArtifactStateByName: jest.fn().mockResolvedValue(mockArtifactState),
                        updateArtifactState: jest.fn().mockResolvedValue(mockArtifact),
                        updateArtifactStateWithId: jest.fn().mockResolvedValue(mockArtifact),
                        createArtifactVersion: jest.fn().mockResolvedValue(mockArtifact.currentVersion),
                        getArtifactVersions: jest.fn(),
                        getNextVersionNumber: jest.fn(),
                        getArtifactTypes: jest.fn(),
                        getArtifactTypesByPhase: jest.fn().mockResolvedValue([mockArtifactType]),
                        getArtifactTypeByName: jest.fn().mockResolvedValue(mockArtifactType),
                        getArtifactType: jest.fn().mockResolvedValue(mockArtifactType),
                        getArtifactStates: jest.fn(),
                        getArtifactState: jest.fn().mockResolvedValue(mockArtifactState),
                        getLifecyclePhases: jest.fn().mockResolvedValue([{ id: 1, name: 'Requirements' }]),
                        getArtifactTypeDependencies: jest.fn().mockResolvedValue([]),
                        isValidStateTransition: jest.fn(),
                        getArtifactsByType: jest.fn(),
                        createInteraction: jest.fn().mockResolvedValue(mockInteraction),
                        getLastInteractions: jest.fn().mockResolvedValue([[mockInteraction], 2]),
                    },
                },
                {
                    provide: ReasoningRepository,
                    useValue: {
                        createReasoningSummary: jest.fn(),
                        getReasoningSummary: jest.fn(),
                        createReasoningPoint: jest.fn(),
                        getReasoningPoints: jest.fn(),
                        updateReasoningSummary: jest.fn(),
                        deleteReasoningEntry: jest.fn(),
                    },
                },
                {
                    provide: ProjectTypeRepository,
                    useValue: {
                        findById: jest.fn().mockResolvedValue(mockProjectType),
                        findAll: jest.fn().mockResolvedValue([mockProjectType]),
                        getDefaultProjectType: jest.fn().mockResolvedValue(mockProjectType),
                        getLifecyclePhases: jest.fn().mockResolvedValue(mockProjectType.lifecyclePhases),
                    },
                },
                {
                    provide: TemplateManagerService,
                    useValue: {
                        renderTemplate: jest.fn(),
                        getSystemPrompt: jest.fn(),
                        getUserMessageTemplate: jest.fn(),
                        getArtifactInput: jest.fn(),
                        readSystemPrompt: jest.fn(),
                    },
                },
                {
                    provide: ContextManagerService,
                    useValue: {
                        getContext: jest.fn().mockResolvedValue({
                            project: {
                                name: 'Test Project',
                                project_type_id: 1,
                                project_type_name: 'Software Engineering'
                            },
                            artifact: {
                                artifact_id: 1,
                                artifact_type_id: 1,
                                artifact_type_name: 'Vision Document',
                                artifact_phase: 'Requirements',
                            },
                            is_update: false,
                        }),
                    },
                },
                {
                    provide: AIAssistantService,
                    useValue: {
                        generateArtifact: jest.fn(),
                        kickoffArtifactInteraction: jest.fn().mockResolvedValue({
                            artifactContent: 'Generated content',
                            commentary: 'AI commentary',
                        }),
                        updateArtifact: jest.fn().mockResolvedValue({
                            artifactContent: 'Updated content',
                            commentary: 'AI update commentary',
                        }),
                        generateStreamingArtifact: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<WorkflowOrchestratorService>(WorkflowOrchestratorService);
        projectRepository = module.get<ProjectRepository>(ProjectRepository);
        artifactRepository = module.get<ArtifactRepository>(ArtifactRepository);
        reasoningRepository = module.get<ReasoningRepository>(ReasoningRepository);
        projectTypeRepository = module.get<ProjectTypeRepository>(ProjectTypeRepository);
        templateManager = module.get<TemplateManagerService>(TemplateManagerService);
        contextManager = module.get<ContextManagerService>(ContextManagerService);
        aiAssistant = module.get<AIAssistantService>(AIAssistantService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createProject', () => {
        it('should create a new project', async () => {
            // Execute
            const result = await service.createProject('Test Project', 1);

            // Verify
            expect(projectRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Test Project',
                userId: 1,
                projectTypeId: 1
            }));
            expect(result).toEqual({
                project_id: '1',
                name: 'Test Project',
                created_at: mockProject.createdAt,
                updated_at: mockProject.updatedAt,
                project_type_id: '1',
                project_type_name: 'Software Engineering',
            });
        });

        it('should create a project with a specified project type', async () => {
            // Execute
            const result = await service.createProject('Test Project', 1, 1);

            // Verify
            expect(projectTypeRepository.findById).toHaveBeenCalledWith(1);
            expect(projectRepository.create).toHaveBeenCalledWith({
                name: 'Test Project',
                userId: 1,
                projectTypeId: 1
            });
            expect(result).toEqual({
                project_id: '1',
                name: 'Test Project',
                created_at: mockProject.createdAt,
                updated_at: mockProject.updatedAt,
                project_type_id: '1',
                project_type_name: 'Software Engineering'
            });
        });

        it('should create a project with default project type when not specified', async () => {
            // Execute
            const result = await service.createProject('Test Project', 1);

            // Verify
            expect(projectTypeRepository.getDefaultProjectType).toHaveBeenCalled();
            expect(projectRepository.create).toHaveBeenCalledWith({
                name: 'Test Project',
                userId: 1,
                projectTypeId: 1
            });
            expect(result.project_type_id).toBe('1');
            expect(result.project_type_name).toBe('Software Engineering');
        });

        it('should throw NotFoundException if specified project type not found', async () => {
            // Setup
            jest.spyOn(projectTypeRepository, 'findById').mockResolvedValueOnce(null);

            // Execute & Verify
            await expect(service.createProject('Test Project', 1, 999)).rejects.toThrow(NotFoundException);
        });
    });

    describe('listProjects', () => {
        it('should return a list of projects with project type information', async () => {
            // Execute
            const result = await service.listProjects();

            // Verify
            expect(projectRepository.findAll).toHaveBeenCalled();
            expect(projectTypeRepository.findById).toHaveBeenCalledWith(1);
            expect(result).toEqual([{
                project_id: '1',
                name: 'Test Project',
                created_at: mockProject.createdAt,
                updated_at: mockProject.updatedAt,
                project_type_id: '1',
                project_type_name: 'Software Engineering',
            }]);
        });
    });

    describe('listProjectsByUser', () => {
        it('should return a list of projects for a user with project type information', async () => {
            // Execute
            const result = await service.listProjectsByUser(1);

            // Verify
            expect(projectRepository.findByUserId).toHaveBeenCalledWith(1);
            expect(projectTypeRepository.findById).toHaveBeenCalledWith(1);
            expect(result).toEqual([{
                project_id: '1',
                name: 'Test Project',
                created_at: mockProject.createdAt,
                updated_at: mockProject.updatedAt,
                project_type_id: '1',
                project_type_name: 'Software Engineering',
            }]);
        });
    });

    describe('viewProject', () => {
        it('should include project type information in project view', async () => {
            // Execute
            const result = await service.viewProject(1, 1);

            // Verify
            expect(projectRepository.findById).toHaveBeenCalledWith(1);
            expect(projectTypeRepository.findById).toHaveBeenCalledWith(1);
            expect(result.project_type_id).toBe('1');
            expect(result.project_type_name).toBe('Software Engineering');
            expect(Object.keys(result.artifacts)).toContain('Requirements');
            expect(Object.keys(result.artifacts)).toContain('Design');
        });

        it('should throw NotFoundException if project not found', async () => {
            // Setup
            jest.spyOn(projectRepository, 'findById').mockResolvedValueOnce(null);

            // Execute & Verify
            await expect(service.viewProject(999, 1)).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException if project type not found', async () => {
            // Setup
            jest.spyOn(projectTypeRepository, 'findById').mockResolvedValueOnce(null);

            // Execute & Verify
            await expect(service.viewProject(1, 1)).rejects.toThrow(NotFoundException);
        });
    });

    describe('getArtifactDetails', () => {
        it('should return artifact details with chat history and project type information', async () => {
            // Setup - Create a mock artifact with project and project type info
            const mockFullArtifact = {
                ...mockArtifact,
                project: {
                    ...mockProject,
                    projectType: mockProjectType
                },
                artifact_type: mockArtifactType,
                state: mockArtifactState,
                currentVersion: mockArtifact.currentVersion
            };

            // Override the findById to return this full artifact
            jest.spyOn(artifactRepository, 'findById').mockResolvedValueOnce(mockFullArtifact);

            // Execute
            const result = await service.getArtifactDetails(1);

            // Verify
            expect(artifactRepository.findById).toHaveBeenCalledWith(1);
            expect(artifactRepository.getAvailableTransitions).toHaveBeenCalled();
            expect(artifactRepository.getLastInteractions).toHaveBeenCalledWith(1, 10);
            expect(result.artifact.artifact_id).toBe('1');
            expect(result.artifact.name).toBe('Test Vision');
            expect(result.artifact.project_type_id).toBe('1');
            expect(result.artifact.project_type_name).toBe('Software Engineering');
            expect(result.chat_completion.messages.length).toBeGreaterThan(0);
        });

        it('should throw NotFoundException if artifact not found', async () => {
            // Setup
            jest.spyOn(artifactRepository, 'findById').mockResolvedValueOnce(null);

            // Execute & Verify
            await expect(service.getArtifactDetails(999)).rejects.toThrow(NotFoundException);
        });
    });

    describe('createArtifact', () => {
        it('should validate artifact type against project type before creation', async () => {
            // Setup
            // Mock findById to return a specific artifact for loadArtifactWithRelations
            const mockFullArtifact = {
                ...mockArtifact,
                project: {
                    ...mockProject,
                    projectType: mockProjectType
                },
                artifact_type: mockArtifactType,
                state: mockArtifactState,
                currentVersion: mockArtifact.currentVersion
            };

            jest.spyOn(artifactRepository, 'findById')
                .mockResolvedValueOnce(mockArtifact) // First call in the method
                .mockResolvedValueOnce(mockFullArtifact); // Second call for loadArtifactWithRelations

            // Execute
            await service.createArtifact(1, 'Vision Document');

            // Verify
            expect(projectRepository.findById).toHaveBeenCalledWith(1);
            expect(projectTypeRepository.findById).toHaveBeenCalledWith(1);
            expect(artifactRepository.getArtifactTypeByName).toHaveBeenCalledWith('Vision Document');
            expect(artifactRepository.getArtifactType).toHaveBeenCalled(); // To validate type is valid for project
            expect(artifactRepository.create).toHaveBeenCalled();
        });

        it('should throw BadRequestException if artifact type is not valid for project type', async () => {
            // Setup
            // Mock getArtifactType to return an artifactType with invalid lifecyclePhaseId
            const invalidArtifactType = {
                ...mockArtifactType,
                lifecyclePhaseId: 999 // Doesn't match any phase in mockProjectType
            };

            jest.spyOn(artifactRepository, 'getArtifactType').mockResolvedValueOnce(invalidArtifactType);

            // Execute & Verify
            await expect(service.createArtifact(1, 'Vision Document')).rejects.toThrow(BadRequestException);
        });

        it('should create a new artifact and generate initial AI content', async () => {
            // Setup
            // Mock findById to return a specific artifact for loadArtifactWithRelations
            const mockFullArtifact = {
                ...mockArtifact,
                project: {
                    ...mockProject,
                    projectType: mockProjectType
                },
                artifact_type: mockArtifactType,
                state: mockArtifactState,
                currentVersion: mockArtifact.currentVersion
            };

            jest.spyOn(artifactRepository, 'findById')
                .mockResolvedValueOnce(mockArtifact) // First call in the method
                .mockResolvedValueOnce(mockFullArtifact); // Second call for loadArtifactWithRelations

            // Execute - with user ID 1 (owner of the mock project)
            const result = await service.createArtifact(1, 'Vision Document', 'openai', 'gpt-4o', 1);

            // Verify
            expect(projectRepository.findById).toHaveBeenCalledWith(1);
            expect(artifactRepository.getArtifactTypeByName).toHaveBeenCalledWith('Vision Document');
            expect(artifactRepository.create).toHaveBeenCalled();
            expect(contextManager.getContext).toHaveBeenCalled();
            expect(aiAssistant.kickoffArtifactInteraction).toHaveBeenCalled();
            expect(artifactRepository.createInteraction).toHaveBeenCalled();
            expect(artifactRepository.createArtifactVersion).toHaveBeenCalled();
            expect(result.artifact.artifact_id).toBe('1');
            expect(result.artifact.artifact_type_name).toBe('Vision Document');
            expect(result.chat_completion.messages.length).toBeGreaterThan(0);
        });

        it('should throw NotFoundException if project not found', async () => {
            // Setup
            jest.spyOn(projectRepository, 'findById').mockResolvedValueOnce(null);

            // Execute & Verify
            await expect(service.createArtifact(999, 'Vision Document', 'openai', 'gpt-4o', 1)).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException if user does not own the project', async () => {
            // Setup
            jest.spyOn(projectRepository, 'isProjectOwner').mockResolvedValueOnce(false);

            // Execute & Verify - using a different user ID than the project owner
            await expect(service.createArtifact(1, 'Vision Document', 'openai', 'gpt-4o', 2)).rejects.toThrow(NotFoundException);
        });

        it('should throw Error if artifact type is invalid', async () => {
            // Setup
            jest.spyOn(artifactRepository, 'getArtifactTypeByName').mockResolvedValueOnce(null);

            // Execute & Verify
            await expect(service.createArtifact(1, 'Invalid Type', 'openai', 'gpt-4o', 1)).rejects.toThrow('Invalid artifact type');
        });
    });

    describe('interactArtifact', () => {
        it('should send user message to AI and update artifact', async () => {
            // Setup
            // Mock findById to return a specific artifact for loadArtifactWithRelations
            const mockFullArtifact = {
                ...mockArtifact,
                project: {
                    ...mockProject,
                    projectType: mockProjectType
                },
                artifact_type: mockArtifactType,
                state: mockArtifactState,
                currentVersion: mockArtifact.currentVersion
            };

            jest.spyOn(artifactRepository, 'findById').mockResolvedValueOnce(mockFullArtifact);

            // Execute
            const result = await service.interactArtifact(1, 'Update the vision');

            // Verify
            expect(artifactRepository.findById).toHaveBeenCalledWith(1);
            expect(artifactRepository.getLastInteractions).toHaveBeenCalledWith(1, 3);
            expect(artifactRepository.createInteraction).toHaveBeenCalledWith(expect.objectContaining({
                artifactId: 1,
                role: 'user',
                content: 'Update the vision',
            }));
            expect(contextManager.getContext).toHaveBeenCalled();
            expect(aiAssistant.updateArtifact).toHaveBeenCalled();
            expect(artifactRepository.createArtifactVersion).toHaveBeenCalled();
            expect(result.artifact.artifact_id).toBe('1');
            expect(result.artifact.project_type_id).toBe('1');
            expect(result.artifact.project_type_name).toBe('Software Engineering');
            expect(result.chat_completion.messages.length).toBeGreaterThan(0);
        });

        it('should throw NotFoundException if artifact not found', async () => {
            // Setup
            jest.spyOn(artifactRepository, 'findById').mockResolvedValueOnce(null);

            // Execute & Verify
            await expect(service.interactArtifact(999, 'Update')).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateArtifact', () => {
        it('should update artifact properties', async () => {
            // Execute
            const result = await service.updateArtifact(1, 'New Name', 'New Content');

            // Verify
            expect(artifactRepository.update).toHaveBeenCalledWith(1, {
                name: 'New Name',
                content: 'New Content',
            });
            expect(result).toEqual(mockArtifact);
        });

        it('should throw NotFoundException if artifact not found', async () => {
            // Setup
            jest.spyOn(artifactRepository, 'update').mockResolvedValueOnce(null);

            // Execute & Verify
            await expect(service.updateArtifact(999, 'New Name', 'New Content')).rejects.toThrow(NotFoundException);
        });
    });

    describe('transitionArtifact', () => {
        it('should transition artifact to new state', async () => {
            // Setup
            // Mock findById to return a specific artifact for loadArtifactWithRelations
            const mockFullArtifact = {
                ...mockArtifact,
                project: {
                    ...mockProject,
                    projectType: mockProjectType
                },
                artifact_type: mockArtifactType,
                state: mockArtifactState,
                currentVersion: mockArtifact.currentVersion
            };

            jest.spyOn(artifactRepository, 'findById')
                .mockResolvedValueOnce(mockFullArtifact) // First call
                .mockResolvedValueOnce(mockFullArtifact); // Second call after state transition

            // Execute
            const result = await service.transitionArtifact(1, 3);

            // Verify
            expect(artifactRepository.findById).toHaveBeenCalledWith(1);
            expect(artifactRepository.updateArtifactStateWithId).toHaveBeenCalledWith(1, 3);
            expect(artifactRepository.getAvailableTransitions).toHaveBeenCalled();
            expect(result.artifact.artifact_id).toBe('1');
            expect(result.artifact.state_id).toBe('2'); // State id from the mock artifact
            expect(result.artifact.project_type_id).toBe('1');
            expect(result.artifact.project_type_name).toBe('Software Engineering');
        });

        it('should throw NotFoundException if artifact not found', async () => {
            // Setup
            jest.spyOn(artifactRepository, 'findById').mockResolvedValueOnce(null);

            // Execute & Verify
            await expect(service.transitionArtifact(999, 3)).rejects.toThrow(NotFoundException);
        });

        it('should throw Error if state transition fails', async () => {
            // Setup
            // Mock findById to return a specific artifact for loadArtifactWithRelations
            const mockFullArtifact = {
                ...mockArtifact,
                project: {
                    ...mockProject,
                    projectType: mockProjectType
                },
                artifact_type: mockArtifactType,
                state: mockArtifactState,
                currentVersion: mockArtifact.currentVersion
            };

            jest.spyOn(artifactRepository, 'findById').mockResolvedValueOnce(mockFullArtifact);
            jest.spyOn(artifactRepository, 'updateArtifactStateWithId').mockResolvedValueOnce(null);

            // Execute & Verify
            await expect(service.transitionArtifact(1, 999)).rejects.toThrow('Failed to update artifact state');
        });
    });
});