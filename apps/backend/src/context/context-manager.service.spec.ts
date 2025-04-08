import { Test, TestingModule } from '@nestjs/testing';
import { ContextManagerService } from './context-manager.service';
import { ArtifactRepository } from '../repositories/artifact.repository';
import { CacheService } from '../services/cache/cache.service';
import { ArtifactWithRelations } from './types/artifact-with-relations';
import { DependencyResolver } from './dependency-resolver';

describe('ContextManagerService', () => {
    let service: ContextManagerService;
    let dependencyResolver: DependencyResolver;
    let artifactRepository: ArtifactRepository;
    let cacheService: CacheService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContextManagerService,
                {
                    provide: DependencyResolver,
                    useValue: {
                        resolveDependencies: jest.fn(),
                    },
                },
                {
                    provide: ArtifactRepository,
                    useValue: {
                        getArtifactsByType: jest.fn(),
                        getArtifactTypeDependencies: jest.fn(),
                    },
                },
                {
                    provide: CacheService,
                    useValue: {
                        getArtifactTypeInfo: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ContextManagerService>(ContextManagerService);
        dependencyResolver = module.get<DependencyResolver>(DependencyResolver);
        artifactRepository = module.get<ArtifactRepository>(ArtifactRepository);
        cacheService = module.get<CacheService>(CacheService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create basic context for a new artifact with project type info', async () => {
        const mockArtifact = {
            id: 1,
            projectId: 1,
            artifactTypeId: 1,
            stateId: 2,
            name: 'Test Artifact',
            createdAt: new Date(),
            updatedAt: new Date(),
            project: {
                id: 1,
                name: 'Test Project',
                projectTypeId: 1,
                projectType: {
                    id: 1,
                    name: 'Software Engineering'
                }
            },
            artifact_type: {
                id: 1,
                name: 'Vision Document',
                lifecyclePhase: {
                    id: 1,
                    name: 'Requirements',
                },
            },
            currentVersionId: null,
        } as ArtifactWithRelations;

        // Mock the dependency resolver to return an empty map
        jest.spyOn(dependencyResolver, 'resolveDependencies')
            .mockResolvedValue(new Map());

        const context = await service.getContext(mockArtifact, false);

        expect(context).toBeDefined();
        expect(context.project.name).toBe('Test Project');
        expect(context.project.project_type_id).toBe(1);
        expect(context.project.project_type_name).toBe('Software Engineering');
        expect(context.artifact.artifact_type_name).toBe('Vision Document');
        expect(context.artifact.artifact_phase).toBe('Requirements');
        expect(context.is_update).toBe(false);
        expect(dependencyResolver.resolveDependencies).toHaveBeenCalledWith(mockArtifact);
    });

    it('should include current content for an update', async () => {
        const mockArtifact = {
            id: 1,
            projectId: 1,
            artifactTypeId: 1,
            stateId: 2,
            name: 'Test Artifact',
            createdAt: new Date(),
            updatedAt: new Date(),
            currentVersionId: 101,
            project: {
                id: 1,
                name: 'Test Project',
                projectTypeId: 1,
                projectType: {
                    id: 1,
                    name: 'Software Engineering'
                }
            },
            artifact_type: {
                id: 1,
                name: 'Vision Document',
                lifecyclePhase: {
                    id: 1,
                    name: 'Requirements',
                },
            },
            currentVersion: {
                id: 101,
                artifactId: 1,
                versionNumber: 1,
                createdAt: new Date(),
                content: 'Current artifact content'
            }
        } as ArtifactWithRelations;

        // Mock the dependency resolver to return an empty map
        jest.spyOn(dependencyResolver, 'resolveDependencies')
            .mockResolvedValue(new Map());

        const context = await service.getContext(mockArtifact, true);

        expect(context).toBeDefined();
        expect(context.artifact.content).toBe('Current artifact content');
    });

    it('should include resolved dependencies in the context', async () => {
        const mockArtifact = {
            id: 2,
            projectId: 1,
            artifactTypeId: 2,
            stateId: 2,
            currentVersionId: null,
            name: 'Functional Requirements',
            createdAt: new Date(),
            updatedAt: new Date(),
            project: {
                id: 1, 
                name: 'Test Project',
                projectTypeId: 1,
                projectType: {
                    id: 1,
                    name: 'Software Engineering'
                }
            },
            artifact_type: {
                id: 2,
                name: 'Functional Requirements',
                lifecyclePhase: {
                    id: 1,
                    name: 'Requirements',
                },
            },
        } as ArtifactWithRelations;

        // Mock dependencies
        const mockDependencies = new Map<string, any>([
            ['vision', 'Vision content'],
        ]);

        // Mock the dependency resolver
        jest.spyOn(dependencyResolver, 'resolveDependencies')
            .mockResolvedValue(mockDependencies);

        const context = await service.getContext(mockArtifact, false);

        expect(context).toBeDefined();
        expect(context.vision).toBe('Vision content');
    });

    it('should handle user message when provided', async () => {
        const mockArtifact = {
            id: 1,
            projectId: 1,
            artifactTypeId: 1,
            stateId: 2,
            currentVersionId: null,
            name: 'Test Artifact',
            createdAt: new Date(),
            updatedAt: new Date(),
            project: {
                id: 1,
                name: 'Test Project',
            },
            artifact_type: {
                id: 1,
                name: 'Vision Document',
                lifecyclePhase: {
                    name: 'Requirements',
                },
            },
        } as ArtifactWithRelations;

        // Mock the dependency resolver to return an empty map
        jest.spyOn(dependencyResolver, 'resolveDependencies')
            .mockResolvedValue(new Map());

        const userMessage = 'Create a vision for a banking app';
        const context = await service.getContext(mockArtifact, false, userMessage);

        expect(context).toBeDefined();
        expect(context.user_message).toBe(userMessage);
    });

    it('should propagate errors from dependency resolver', async () => {
        const mockArtifact = {
            id: 2,
            projectId: 1,
            artifactTypeId: 2,
            stateId: 2,
            name: 'Functional Requirements',
            createdAt: new Date(),
            updatedAt: new Date(),
            project: {
                id: 1,
                name: 'Test Project',
            },
            artifact_type: {
                id: 2,
                name: 'Functional Requirements',
                lifecyclePhase: {
                    name: 'Requirements',
                },
            },
        } as ArtifactWithRelations;

        // Mock dependency resolver to throw an error
        jest.spyOn(dependencyResolver, 'resolveDependencies')
            .mockRejectedValue(new Error('Vision document missing'));

        await expect(service.getContext(mockArtifact, false))
            .rejects.toThrow('Vision document missing');
    });
});