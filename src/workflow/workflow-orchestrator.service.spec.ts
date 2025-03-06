import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { WorkflowOrchestratorService } from './workflow-orchestrator.service';
import { ProjectRepository } from '../repositories/project.repository';
import { ArtifactRepository } from '../repositories/artifact.repository';
import { ReasoningRepository } from '../repositories/reasoning.repository';
import { TemplateManagerService } from '../templates/template-manager.service';
import { ContextManagerService } from '../context/context-manager.service';
import { AIAssistantService } from '../ai/ai-assistant.service';

describe('WorkflowOrchestratorService', () => {
    let service: WorkflowOrchestratorService;
    let projectRepository: ProjectRepository;
    let artifactRepository: ArtifactRepository;
    let reasoningRepository: ReasoningRepository;
    let templateManager: TemplateManagerService;
    let contextManager: ContextManagerService;
    let aiAssistant: AIAssistantService;

    // Mock project
    const mockProject = {
        id: 1,
        name: 'Test Project',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
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
        artifactType: mockArtifactType,
        state: mockArtifactState,
        currentVersion: {
            id: 1,
            artifactId: 1,
            versionNumber: 1,
            content: 'Vision document content',
            createdAt: new Date('2023-01-01'),
        },
        project: mockProject,
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
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkflowOrchestratorService,
                {
                    provide: ProjectRepository,
                    useValue: {
                        create: jest.fn(),
                        findById: jest.fn(),
                        findAll: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                        getProjectMetadata: jest.fn(),
                        getPhaseArtifacts: jest.fn(),
                    },
                },
                {
                    provide: ArtifactRepository,
                    useValue: {
                        create: jest.fn(),
                        findById: jest.fn(),
                        findAll: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                        getArtifactsByProjectId: jest.fn(),
                        getArtifactsByProjectIdAndPhase: jest.fn(),
                        getAvailableTransitions: jest.fn(),
                        getArtifactStateByName: jest.fn(),
                        updateArtifactState: jest.fn(),
                        updateArtifactStateWithId: jest.fn(),
                        createArtifactVersion: jest.fn(),
                        getArtifactVersions: jest.fn(),
                        getNextVersionNumber: jest.fn(),
                        getArtifactTypes: jest.fn(),
                        getArtifactTypesByPhase: jest.fn(),
                        getArtifactTypeByName: jest.fn(),
                        getArtifactType: jest.fn(),
                        getArtifactStates: jest.fn(),
                        getArtifactState: jest.fn(),
                        getLifecyclePhases: jest.fn(),
                        getArtifactTypeDependencies: jest.fn(),
                        isValidStateTransition: jest.fn(),
                        getArtifactsByType: jest.fn(),
                        createInteraction: jest.fn(),
                        getLastInteractions: jest.fn(),
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
                        getContext: jest.fn(),
                    },
                },
                {
                    provide: AIAssistantService,
                    useValue: {
                        generateArtifact: jest.fn(),
                        kickoffArtifactInteraction: jest.fn(),
                        updateArtifact: jest.fn(),
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
        templateManager = module.get<TemplateManagerService>(TemplateManagerService);
        contextManager = module.get<ContextManagerService>(ContextManagerService);
        aiAssistant = module.get<AIAssistantService>(AIAssistantService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createProject', () => {
        it('should create a new project', async () => {
            // Setup
            jest.spyOn(projectRepository, 'create').mockResolvedValue(mockProject);

            // Execute
            const result = await service.createProject('Test Project');

            // Verify
            expect(projectRepository.create).toHaveBeenCalledWith({ name: 'Test Project' });
            expect(result).toEqual({
                project_id: '1',
                name: 'Test Project',
                created_at: mockProject.createdAt,
                updated_at: mockProject.updatedAt,
            });
        });
    });

    describe('listProjects', () => {
        it('should return a list of projects', async () => {
            // Setup
            jest.spyOn(projectRepository, 'findAll').mockResolvedValue([mockProject]);

            // Execute
            const result = await service.listProjects();

            // Verify
            expect(projectRepository.findAll).toHaveBeenCalled();
            expect(result).toEqual([{
                project_id: '1',
                name: 'Test Project',
                created_at: mockProject.createdAt,
                updated_at: mockProject.updatedAt,
            }]);
        });
    });

    describe('viewProject', () => {
        it('should return project details with artifacts', async () => {
            // Setup
            jest.spyOn(projectRepository, 'findById').mockResolvedValue(mockProject);
            jest.spyOn(artifactRepository, 'getArtifactTypesByPhase').mockResolvedValue([mockArtifactType]);
            jest.spyOn(artifactRepository, 'getArtifactsByProjectIdAndPhase').mockResolvedValue([mockArtifact]);
            jest.spyOn(artifactRepository, 'getArtifactStateByName').mockResolvedValue(mockArtifactState);
            jest.spyOn(artifactRepository, 'getAvailableTransitions').mockResolvedValue([
                { id: 3, name: 'Approved' },
            ]);

            // Execute
            const result = await service.viewProject(1);

            // Verify
            expect(projectRepository.findById).toHaveBeenCalledWith(1);
            expect(artifactRepository.getArtifactTypesByPhase).toHaveBeenCalledWith('Requirements');
            expect(artifactRepository.getArtifactTypesByPhase).toHaveBeenCalledWith('Design');
            expect(result.project_id).toBe('1');
            expect(result.name).toBe('Test Project');
            expect(result.artifacts).toBeDefined();
            expect(result.artifacts.Requirements).toBeDefined();
            expect(result.artifacts.Requirements.length).toBeGreaterThan(0);
        });

        it('should throw NotFoundException if project not found', async () => {
            // Setup
            jest.spyOn(projectRepository, 'findById').mockResolvedValue(null);

            // Execute & Verify
            await expect(service.viewProject(999)).rejects.toThrow(NotFoundException);
        });
    });

    describe('getArtifactDetails', () => {
        it('should return artifact details with chat history', async () => {
            // Setup
            jest.spyOn(artifactRepository, 'findById').mockResolvedValue(mockArtifact);
            jest.spyOn(artifactRepository, 'getAvailableTransitions').mockResolvedValue([
                { id: 3, name: 'Approved' },
            ]);
            jest.spyOn(artifactRepository, 'getLastInteractions').mockResolvedValue([
                [mockInteraction],
                2,
            ]);

            // Execute
            const result = await service.getArtifactDetails(1);

            // Verify
            expect(artifactRepository.findById).toHaveBeenCalledWith(1);
            expect(artifactRepository.getAvailableTransitions).toHaveBeenCalledWith(mockArtifact);
            expect(artifactRepository.getLastInteractions).toHaveBeenCalledWith(1, 10);
            expect(result.artifact.artifact_id).toBe('1');
            expect(result.artifact.name).toBe('Test Vision');
            expect(result.chat_completion.messages.length).toBeGreaterThan(0);
        });

        it('should throw NotFoundException if artifact not found', async () => {
            // Setup
            jest.spyOn(artifactRepository, 'findById').mockResolvedValue(null);

            // Execute & Verify
            await expect(service.getArtifactDetails(999)).rejects.toThrow(NotFoundException);
        });
    });

    describe('createArtifact', () => {
        it('should create a new artifact and generate initial AI content', async () => {
            // Setup
            jest.spyOn(projectRepository, 'findById').mockResolvedValue(mockProject);
            jest.spyOn(artifactRepository, 'getArtifactTypeByName').mockResolvedValue(mockArtifactType);
            jest.spyOn(artifactRepository, 'getArtifactsByProjectIdAndPhase').mockResolvedValue([]);
            jest.spyOn(artifactRepository, 'create').mockResolvedValue(mockArtifact);
            jest.spyOn(artifactRepository, 'findById').mockResolvedValue(mockArtifact);
            jest.spyOn(contextManager, 'getContext').mockResolvedValue({
                project: { name: 'Test Project' },
                artifact: { artifact_type_name: 'Vision Document', artifact_phase: 'Requirements' },
                is_update: false,
            });
            jest.spyOn(aiAssistant, 'kickoffArtifactInteraction').mockResolvedValue({
                artifactContent: 'Generated vision content',
                commentary: 'AI commentary',
            });
            jest.spyOn(artifactRepository, 'createInteraction').mockResolvedValue(mockInteraction);
            jest.spyOn(artifactRepository, 'createArtifactVersion').mockResolvedValue(mockArtifact.currentVersion);
            jest.spyOn(artifactRepository, 'getAvailableTransitions').mockResolvedValue([
                { id: 3, name: 'Approved' },
            ]);

            // Execute
            const result = await service.createArtifact(1, 'Vision Document');

            // Verify
            expect(projectRepository.findById).toHaveBeenCalledWith(1);
            expect(artifactRepository.getArtifactTypeByName).toHaveBeenCalledWith('Vision Document');
            expect(artifactRepository.create).toHaveBeenCalledWith({
                projectId: 1,
                artifactTypeId: 1,
                name: 'New Vision Document',
            });
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
            jest.spyOn(projectRepository, 'findById').mockResolvedValue(null);

            // Execute & Verify
            await expect(service.createArtifact(999, 'Vision Document')).rejects.toThrow(NotFoundException);
        });

        it('should throw Error if artifact type is invalid', async () => {
            // Setup
            jest.spyOn(projectRepository, 'findById').mockResolvedValue(mockProject);
            jest.spyOn(artifactRepository, 'getArtifactTypeByName').mockResolvedValue(null);

            // Execute & Verify
            await expect(service.createArtifact(1, 'Invalid Type')).rejects.toThrow('Invalid artifact type');
        });

        it('should throw Error if artifact of type already exists', async () => {
            // Setup
            jest.spyOn(projectRepository, 'findById').mockResolvedValue(mockProject);
            jest.spyOn(artifactRepository, 'getArtifactTypeByName').mockResolvedValue(mockArtifactType);
            jest.spyOn(artifactRepository, 'getArtifactsByProjectIdAndPhase').mockResolvedValue([mockArtifact]);

            // Execute & Verify
            await expect(service.createArtifact(1, 'Vision Document')).rejects.toThrow('Project already has an artifact');
        });
    });

    describe('interactArtifact', () => {
        it('should send user message to AI and update artifact', async () => {
            // Setup
            jest.spyOn(artifactRepository, 'findById').mockResolvedValue(mockArtifact);
            jest.spyOn(artifactRepository, 'getLastInteractions').mockResolvedValue([
                [mockInteraction],
                2,
            ]);
            jest.spyOn(artifactRepository, 'createInteraction').mockResolvedValue(mockInteraction);
            jest.spyOn(contextManager, 'getContext').mockResolvedValue({
                project: { name: 'Test Project' },
                artifact: {
                    artifact_type_name: 'Vision Document',
                    artifact_phase: 'Requirements',
                    content: 'Current content',
                },
                is_update: true,
                user_message: 'Update the vision',
            });
            jest.spyOn(aiAssistant, 'updateArtifact').mockResolvedValue({
                artifactContent: 'Updated vision content',
                commentary: 'AI update commentary',
            });
            jest.spyOn(artifactRepository, 'createArtifactVersion').mockResolvedValue({
                ...mockArtifact.currentVersion,
                content: 'Updated vision content',
            });
            jest.spyOn(artifactRepository, 'updateArtifactState').mockResolvedValue(mockArtifact);
            jest.spyOn(artifactRepository, 'getAvailableTransitions').mockResolvedValue([
                { id: 3, name: 'Approved' },
            ]);

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
            expect(artifactRepository.createArtifactVersion).toHaveBeenCalledWith(1, 'Updated vision content');
            expect(artifactRepository.createInteraction).toHaveBeenCalledWith(expect.objectContaining({
                artifactId: 1,
                role: 'assistant',
                content: 'AI update commentary',
            }));
            expect(result.artifact.artifact_id).toBe('1');
            expect(result.chat_completion.messages.length).toBeGreaterThan(0);
        });

        it('should throw NotFoundException if artifact not found', async () => {
            // Setup
            jest.spyOn(artifactRepository, 'findById').mockResolvedValue(null);

            // Execute & Verify
            await expect(service.interactArtifact(999, 'Update')).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateArtifact', () => {
        it('should update artifact properties', async () => {
            // Setup
            jest.spyOn(artifactRepository, 'update').mockResolvedValue(mockArtifact);

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
            jest.spyOn(artifactRepository, 'update').mockResolvedValue(null);

            // Execute & Verify
            await expect(service.updateArtifact(999, 'New Name', 'New Content')).rejects.toThrow(NotFoundException);
        });
    });

    describe('transitionArtifact', () => {
        it('should transition artifact to new state', async () => {
            // Setup
            jest.spyOn(artifactRepository, 'findById').mockResolvedValue(mockArtifact);
            jest.spyOn(artifactRepository, 'updateArtifactStateWithId').mockResolvedValue(mockArtifact);
            jest.spyOn(artifactRepository, 'getAvailableTransitions').mockResolvedValue([
                { id: 3, name: 'Approved' },
            ]);

            // Execute
            const result = await service.transitionArtifact(1, 3);

            // Verify
            expect(artifactRepository.findById).toHaveBeenCalledWith(1);
            expect(artifactRepository.updateArtifactStateWithId).toHaveBeenCalledWith(1, 3);
            expect(artifactRepository.getAvailableTransitions).toHaveBeenCalled();
            expect(result.artifact.artifact_id).toBe('1');
            expect(result.artifact.state_id).toBe('2'); // State id from the mock artifact
        });

        it('should throw NotFoundException if artifact not found', async () => {
            // Setup
            jest.spyOn(artifactRepository, 'findById').mockResolvedValue(null);

            // Execute & Verify
            await expect(service.transitionArtifact(999, 3)).rejects.toThrow(NotFoundException);
        });

        it('should throw Error if state transition fails', async () => {
            // Setup
            jest.spyOn(artifactRepository, 'findById').mockResolvedValue(mockArtifact);
            jest.spyOn(artifactRepository, 'updateArtifactStateWithId').mockResolvedValue(null);

            // Execute & Verify
            await expect(service.transitionArtifact(1, 999)).rejects.toThrow('Failed to update artifact state');
        });
    });
});