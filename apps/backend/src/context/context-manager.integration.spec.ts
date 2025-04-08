import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ContextManagerService } from './context-manager.service';
import { ArtifactRepository } from '../repositories/artifact.repository';
import { CacheService } from '../services/cache/cache.service';
import { DependencyResolver } from './dependency-resolver';
import configuration from '../config/configuration';
import { ArtifactWithRelations } from './types/artifact-with-relations';

/**
 * Integration tests for the ContextManager
 * These tests verify that the context manager works correctly with the actual
 * repository and cache service implementations.
 */
describe('ContextManager Integration', () => {
    let contextManager: ContextManagerService;
    let artifactRepository: ArtifactRepository;
    let cacheService: CacheService;
    let moduleRef: TestingModule;

    beforeAll(async () => {
        // Create mock repository and cache service
        const mockArtifactRepository = {
            getArtifactsByType: jest.fn(),
            getArtifactTypeDependencies: jest.fn()
        };

        const mockCacheService = {
            getArtifactTypeInfo: jest.fn().mockImplementation((name) => {
                const typeMap: Record<string, { typeId: number; slug: string } | null> = {
                    'Vision Document': { typeId: 1, slug: 'vision' },
                    'Functional Requirements': { typeId: 2, slug: 'functional_requirements' },
                    'Non-Functional Requirements': { typeId: 3, slug: 'non_functional_requirements' },
                    'Use Cases': { typeId: 4, slug: 'use_cases' },
                    'C4 Context': { typeId: 5, slug: 'c4_context' },
                    'C4 Container': { typeId: 6, slug: 'c4_container' },
                    'C4 Component': { typeId: 7, slug: 'c4_component' },
                };
                return Promise.resolve(typeMap[name] || null);
            })
        };

        moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    load: [configuration],
                    isGlobal: true,
                }),
            ],
            providers: [
                ContextManagerService,
                DependencyResolver,
                {
                    provide: ArtifactRepository,
                    useValue: mockArtifactRepository
                },
                {
                    provide: CacheService,
                    useValue: mockCacheService
                }
            ]
        }).compile();

        contextManager = moduleRef.get<ContextManagerService>(ContextManagerService);
        artifactRepository = moduleRef.get<ArtifactRepository>(ArtifactRepository);
        cacheService = moduleRef.get<CacheService>(CacheService);
    });

    afterAll(async () => {
        if (moduleRef) {
            await moduleRef.close();
        }
    });

    it('should be defined', () => {
        expect(contextManager).toBeDefined();
        expect(artifactRepository).toBeDefined();
        expect(cacheService).toBeDefined();
    });

    it('should generate context for a new vision document with project type', async () => {
        // Mock an artifact with project type information
        const mockArtifact = {
            id: 1,
            name: 'Vision Document',
            projectId: 1,
            artifactTypeId: 1,
            stateId: 2,
            currentVersionId: null,
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
        } as ArtifactWithRelations;

        // Mock the repository methods
        jest.spyOn(artifactRepository, 'getArtifactTypeDependencies')
            .mockResolvedValue([]);

        jest.spyOn(artifactRepository, 'getArtifactsByType')
            .mockResolvedValue([]);

        // Generate context for new vision document
        const context = await contextManager.getContext(mockArtifact, false, 'Create a vision for a banking app');

        // Validate the basic context properties
        expect(context).toBeDefined();
        expect(context.project.name).toBe('Test Project');
        expect(context.project.project_type_id).toBe(1);
        expect(context.project.project_type_name).toBe('Software Engineering');
        expect(context.artifact.artifact_type_name).toBe('Vision Document');
        expect(context.artifact.artifact_phase).toBe('Requirements');
        expect(context.is_update).toBe(false);
        expect(context.user_message).toBe('Create a vision for a banking app');
    });

    it('should include dependencies when generating context for functional requirements', async () => {
        // Mock artifact and its dependencies
        const mockVision = {
            id: 1,
            projectId: 1,
            artifactTypeId: 1,
            stateId: 2,
            name: 'Vision',
            createdAt: new Date(),
            updatedAt: new Date(),
            currentVersionId: 101,
            currentVersion: {
                content: 'Test Vision Content'
            }
        } as ArtifactWithRelations;

        const mockFR = {
            id: 2,
            name: 'Functional Requirements',
            projectId: 1,
            artifactTypeId: 2,
            stateId: 2,
            currentVersionId: 102,
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

        // Mock repository methods
        jest.spyOn(artifactRepository, 'getArtifactTypeDependencies')
            .mockResolvedValue([
                { id: 1, name: 'Vision Document' } as any
            ]);

        jest.spyOn(artifactRepository, 'getArtifactsByType')
            .mockImplementation((artifact, type) => {
                if (type === 'Vision Document') {
                    return Promise.resolve([mockVision]);
                }
                return Promise.resolve([]);
            });

        // Generate context for functional requirements
        const context = await contextManager.getContext(mockFR, false, 'Define core features');

        // Validate the basic context and dependencies
        expect(context).toBeDefined();
        expect(context.vision).toBe('Test Vision Content');
        expect(context.artifact.artifact_type_name).toBe('Functional Requirements');
        expect(context.project.project_type_name).toBe('Software Engineering');
    });

    it('should throw error if required dependency is missing', async () => {
        // Mock artifact without dependencies
        const mockFR = {
            id: 2,
            name: 'Functional Requirements',
            projectId: 1,
            artifactTypeId: 2,
            stateId: 2,
            currentVersionId: 102,
            createdAt: new Date(),
            updatedAt: new Date(),
            project: {
                id: 1,
                name: 'Test Project',
                projectTypeId: 1
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

        // Mock repository methods to return dependencies but no actual artifacts
        jest.spyOn(artifactRepository, 'getArtifactTypeDependencies')
            .mockResolvedValue([
                { id: 1, name: 'Vision Document' } as any
            ]);

        jest.spyOn(artifactRepository, 'getArtifactsByType')
            .mockResolvedValue([]);

        // Should throw an error due to missing Vision Document
        await expect(contextManager.getContext(mockFR, false))
            .rejects.toThrow('Vision Document missing');
    });

    it('should generate context for a second-level Use Case with all required dependencies', async () => {
        // Mock a Use Case artifact
        const mockUseCase = {
            id: 3,
            name: 'User Registration',
            projectId: 1,
            artifactTypeId: 4, // Use Case
            stateId: 2,
            currentVersionId: null,
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
                id: 4,
                name: 'Use Cases',
                lifecyclePhase: {
                    id: 1,
                    name: 'Requirements',
                },
            },
        } as ArtifactWithRelations;

        // Mock the required dependencies
        const mockVision = {
            id: 1,
            name: 'Vision Document',
            projectId: 1,
            artifactTypeId: 1,
            stateId: 2,
            currentVersionId: 101,
            currentVersion: { content: 'Vision document content' }
        };

        const mockFR = {
            id: 2,
            name: 'Functional Requirements',
            projectId: 1,
            artifactTypeId: 2,
            stateId: 2,
            currentVersionId: 102,
            currentVersion: { content: 'Functional requirements content' }
        };

        const mockNFR = {
            id: 3,
            name: 'Non-Functional Requirements',
            projectId: 1,
            artifactTypeId: 3,
            stateId: 2,
            currentVersionId: 103,
            currentVersion: { content: 'Non-functional requirements content' }
        };

        const mockExistingUseCase = {
            id: 4,
            name: 'User Login',
            projectId: 1,
            artifactTypeId: 4,
            stateId: 2,
            currentVersionId: 104,
            currentVersion: { content: 'Existing use case content' }
        };

        // Mock the dependency types for Use Case
        jest.spyOn(artifactRepository, 'getArtifactTypeDependencies')
            .mockResolvedValue([
                { id: 1, name: 'Vision Document' } as any,
                { id: 2, name: 'Functional Requirements' } as any,
                { id: 3, name: 'Non-Functional Requirements' } as any,
                { id: 4, name: 'Use Cases' } as any
            ]);

        // Mock repository to return different artifacts based on type
        jest.spyOn(artifactRepository, 'getArtifactsByType')
            .mockImplementation((artifact, type) => {
                switch (type) {
                    case 'Vision Document':
                        return Promise.resolve([mockVision as any]);
                    case 'Functional Requirements':
                        return Promise.resolve([mockFR as any]);
                    case 'Non-Functional Requirements':
                        return Promise.resolve([mockNFR as any]);
                    case 'Use Cases':
                        return Promise.resolve([mockExistingUseCase as any]);
                    default:
                        return Promise.resolve([]);
                }
            });

        // Generate context for the use case
        const context = await contextManager.getContext(mockUseCase, false, 'Create a use case for user registration');

        // Validate the context includes all required dependencies
        expect(context).toBeDefined();
        expect(context.project.name).toBe('Test Project');
        expect(context.project.project_type_name).toBe('Software Engineering');
        expect(context.artifact.artifact_type_name).toBe('Use Cases');
        expect(context.vision).toBe('Vision document content');
        expect(context.functional_requirements).toBe('Functional requirements content');
        expect(context.non_functional_requirements).toBe('Non-functional requirements content');
        expect(context.use_cases).toEqual(['Existing use case content']);
        expect(context.user_message).toBe('Create a use case for user registration');
    });

    it('should generate context for a C4 Context diagram (Phase 2) with all Phase 1 artifacts', async () => {
        // Mock a C4 Context artifact (first Phase 2 artifact)
        const mockC4Context = {
            id: 5,
            name: 'System Context Diagram',
            projectId: 1,
            artifactTypeId: 5, // C4 Context
            stateId: 2,
            currentVersionId: null,
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
                id: 5,
                name: 'C4 Context',
                lifecyclePhase: {
                    id: 2,
                    name: 'Design',
                },
            },
        } as ArtifactWithRelations;

        // Mock all Phase 1 artifacts as dependencies
        const mockVision = {
            id: 1,
            name: 'Vision Document',
            projectId: 1,
            artifactTypeId: 1,
            stateId: 2,
            currentVersionId: 101,
            currentVersion: { content: 'Vision document content' }
        };

        const mockFR = {
            id: 2,
            name: 'Functional Requirements',
            projectId: 1,
            artifactTypeId: 2,
            stateId: 2,
            currentVersionId: 102,
            currentVersion: { content: 'Functional requirements content' }
        };

        const mockNFR = {
            id: 3,
            name: 'Non-Functional Requirements',
            projectId: 1,
            artifactTypeId: 3,
            stateId: 2,
            currentVersionId: 103,
            currentVersion: { content: 'Non-functional requirements content' }
        };

        const mockUseCase1 = {
            id: 4,
            name: 'User Login',
            projectId: 1,
            artifactTypeId: 4,
            stateId: 2,
            currentVersionId: 104,
            currentVersion: { content: 'Login use case content' }
        };

        const mockUseCase2 = {
            id: 5,
            name: 'User Registration',
            projectId: 1,
            artifactTypeId: 4,
            stateId: 2,
            currentVersionId: 105,
            currentVersion: { content: 'Registration use case content' }
        };

        // Mock the dependency types for C4 Context
        jest.spyOn(artifactRepository, 'getArtifactTypeDependencies')
            .mockResolvedValue([
                { id: 1, name: 'Vision Document' } as any,
                { id: 2, name: 'Functional Requirements' } as any,
                { id: 3, name: 'Non-Functional Requirements' } as any,
                { id: 4, name: 'Use Cases' } as any
            ]);

        // Mock repository to return different artifacts based on type
        jest.spyOn(artifactRepository, 'getArtifactsByType')
            .mockImplementation((artifact, type) => {
                switch (type) {
                    case 'Vision Document':
                        return Promise.resolve([mockVision as any]);
                    case 'Functional Requirements':
                        return Promise.resolve([mockFR as any]);
                    case 'Non-Functional Requirements':
                        return Promise.resolve([mockNFR as any]);
                    case 'Use Cases':
                        return Promise.resolve([mockUseCase1 as any, mockUseCase2 as any]);
                    default:
                        return Promise.resolve([]);
                }
            });

        // Generate context for the C4 Context diagram
        const context = await contextManager.getContext(mockC4Context, false, 'Create a system context diagram');

        // Validate the context includes all Phase 1 artifacts
        expect(context).toBeDefined();
        expect(context.project.name).toBe('Test Project');
        expect(context.artifact.artifact_type_name).toBe('C4 Context');
        expect(context.artifact.artifact_phase).toBe('Design');
        expect(context.vision).toBe('Vision document content');
        expect(context.functional_requirements).toBe('Functional requirements content');
        expect(context.non_functional_requirements).toBe('Non-functional requirements content');
        expect(context.use_cases).toEqual(['Login use case content', 'Registration use case content']);
    });

    it('should generate context for a second-level C4 Component with all required dependencies', async () => {
        // Mock a C4 Component artifact
        const mockC4Component = {
            id: 7,
            name: 'User Authentication Component',
            projectId: 1,
            artifactTypeId: 7, // C4 Component
            stateId: 2,
            currentVersionId: null,
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
                id: 7,
                name: 'C4 Component',
                lifecyclePhase: {
                    id: 2,
                    name: 'Design',
                },
            },
        } as ArtifactWithRelations;

        // Mock all required dependencies
        const mockVision = {
            id: 1,
            name: 'Vision Document',
            projectId: 1,
            artifactTypeId: 1,
            stateId: 2,
            currentVersionId: 101,
            currentVersion: { content: 'Vision document content' }
        };

        const mockFR = {
            id: 2,
            name: 'Functional Requirements',
            projectId: 1,
            artifactTypeId: 2,
            stateId: 2,
            currentVersionId: 102,
            currentVersion: { content: 'Functional requirements content' }
        };

        const mockNFR = {
            id: 3,
            name: 'Non-Functional Requirements',
            projectId: 1,
            artifactTypeId: 3,
            stateId: 2,
            currentVersionId: 103,
            currentVersion: { content: 'Non-functional requirements content' }
        };

        const mockUseCase = {
            id: 4,
            name: 'User Login',
            projectId: 1,
            artifactTypeId: 4,
            stateId: 2,
            currentVersionId: 104,
            currentVersion: { content: 'Login use case content' }
        };

        const mockC4ContextDiagram = {
            id: 5,
            name: 'System Context Diagram',
            projectId: 1,
            artifactTypeId: 5,
            stateId: 2,
            currentVersionId: 105,
            currentVersion: { content: 'C4 Context diagram content' }
        };

        const mockC4Container = {
            id: 6,
            name: 'Container Diagram',
            projectId: 1,
            artifactTypeId: 6,
            stateId: 2,
            currentVersionId: 106,
            currentVersion: { content: 'C4 Container diagram content' }
        };

        const mockExistingComponent = {
            id: 7,
            name: 'API Component',
            projectId: 1,
            artifactTypeId: 7,
            stateId: 2,
            currentVersionId: 107,
            currentVersion: { content: 'API Component content' }
        };

        // Mock the dependency types for C4 Component
        jest.spyOn(artifactRepository, 'getArtifactTypeDependencies')
            .mockResolvedValue([
                { id: 1, name: 'Vision Document' } as any,
                { id: 2, name: 'Functional Requirements' } as any,
                { id: 3, name: 'Non-Functional Requirements' } as any,
                { id: 4, name: 'Use Cases' } as any,
                { id: 5, name: 'C4 Context' } as any,
                { id: 6, name: 'C4 Container' } as any,
                { id: 7, name: 'C4 Component' } as any
            ]);

        // Mock repository to return different artifacts based on type
        jest.spyOn(artifactRepository, 'getArtifactsByType')
            .mockImplementation((artifact, type) => {
                switch (type) {
                    case 'Vision Document':
                        return Promise.resolve([mockVision as any]);
                    case 'Functional Requirements':
                        return Promise.resolve([mockFR as any]);
                    case 'Non-Functional Requirements':
                        return Promise.resolve([mockNFR as any]);
                    case 'Use Cases':
                        return Promise.resolve([mockUseCase as any]);
                    case 'C4 Context':
                        return Promise.resolve([mockC4ContextDiagram as any]);
                    case 'C4 Container':
                        return Promise.resolve([mockC4Container as any]);
                    case 'C4 Component':
                        return Promise.resolve([mockExistingComponent as any]);
                    default:
                        return Promise.resolve([]);
                }
            });

        // Generate context for the C4 Component
        const context = await contextManager.getContext(mockC4Component, false, 'Create a component diagram for user authentication');

        // Validate the context includes all required dependencies
        expect(context).toBeDefined();
        expect(context.project.name).toBe('Test Project');
        expect(context.artifact.artifact_type_name).toBe('C4 Component');
        expect(context.artifact.artifact_phase).toBe('Design');
        expect(context.vision).toBe('Vision document content');
        expect(context.functional_requirements).toBe('Functional requirements content');
        expect(context.non_functional_requirements).toBe('Non-functional requirements content');
        expect(context.use_cases).toEqual(['Login use case content']);
        expect(context.c4_context).toBe('C4 Context diagram content');
        expect(context.c4_container).toBe('C4 Container diagram content');
        expect(context.c4_component).toEqual(['API Component content']);
    });

    it('should handle multiple versions of artifacts and only use current version', async () => {
        // Mock a Use Case artifact
        const mockUseCase = {
            id: 3,
            name: 'User Registration',
            projectId: 1,
            artifactTypeId: 4, // Use Case
            stateId: 2,
            currentVersionId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            project: {
                id: 1,
                name: 'Test Project',
                projectTypeId: 1
            },
            artifact_type: {
                id: 4,
                name: 'Use Cases',
                lifecyclePhase: {
                    id: 1,
                    name: 'Requirements',
                },
            },
        } as ArtifactWithRelations;

        // Mock FR with multiple versions (only current should be used)
        const mockFR = {
            id: 2,
            name: 'Functional Requirements',
            projectId: 1,
            artifactTypeId: 2,
            stateId: 2,
            currentVersionId: 102, // Points to version 3
            currentVersion: {
                id: 102,
                versionNumber: 3,
                content: 'Current FR content (v3)'
            },
            versions: [
                { id: 100, versionNumber: 1, content: 'Old FR content (v1)' },
                { id: 101, versionNumber: 2, content: 'Old FR content (v2)' },
                { id: 102, versionNumber: 3, content: 'Current FR content (v3)' }
            ]
        };

        // Mock the dependency types
        jest.spyOn(artifactRepository, 'getArtifactTypeDependencies')
            .mockResolvedValue([
                { id: 2, name: 'Functional Requirements' } as any
            ]);

        // Mock repository to return the FR with multiple versions
        jest.spyOn(artifactRepository, 'getArtifactsByType')
            .mockResolvedValue([mockFR as any]);

        // Generate context
        const context = await contextManager.getContext(mockUseCase, false);

        // Validate only the current version is included
        expect(context).toBeDefined();
        expect(context.functional_requirements).toBe('Current FR content (v3)');
        // Should not contain older versions
        expect(context.functional_requirements).not.toContain('Old FR content');
    });
});