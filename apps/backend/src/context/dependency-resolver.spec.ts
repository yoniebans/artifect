import { Test, TestingModule } from '@nestjs/testing';
import { DependencyResolver } from './dependency-resolver';
import { ArtifactRepository } from '../repositories/artifact.repository';
import { CacheService } from '../services/cache/cache.service';
import { ArtifactWithRelations } from './types/artifact-with-relations';

describe('DependencyResolver', () => {
    let resolver: DependencyResolver;
    let artifactRepository: ArtifactRepository;
    let cacheService: CacheService;

    // Mock data
    const mockVision = {
        id: 1,
        projectId: 1,
        artifactTypeId: 1,
        stateId: 2,
        name: 'Vision Document',
        createdAt: new Date(),
        updatedAt: new Date(),
        currentVersion: { content: 'Vision content' },
        currentVersionId: 101
    };

    const mockFR = {
        id: 2,
        projectId: 1,
        artifactTypeId: 2,
        stateId: 2,
        name: 'Functional Requirements',
        createdAt: new Date(),
        updatedAt: new Date(),
        currentVersion: { content: 'Functional requirements content' },
        currentVersionId: 102
    };

    const mockArtifact = {
        id: 10,
        projectId: 1,
        artifactTypeId: 2, // Functional Requirements
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

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DependencyResolver,
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

        resolver = module.get<DependencyResolver>(DependencyResolver);
        artifactRepository = module.get<ArtifactRepository>(ArtifactRepository);
        cacheService = module.get<CacheService>(CacheService);

        // Default mock implementations
        jest.spyOn(cacheService, 'getArtifactTypeInfo')
            .mockImplementation((name: string) => {
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
            });
    });

    it('should be defined', () => {
        expect(resolver).toBeDefined();
    });

    it('should resolve dependencies for an artifact', async () => {
        // Mock dependencies for Functional Requirements
        jest.spyOn(artifactRepository, 'getArtifactTypeDependencies')
            .mockResolvedValue([
                { id: 1, name: 'Vision Document' } as any,
            ]);

        // Mock Vision Document dependency
        jest.spyOn(artifactRepository, 'getArtifactsByType')
            .mockImplementation((artifact, type) => {
                if (type === 'Vision Document') {
                    return Promise.resolve([mockVision as any]);
                }
                return Promise.resolve([]);
            });

        const dependencies = await resolver.resolveDependencies(mockArtifact);

        expect(dependencies).toBeDefined();
        expect(dependencies.size).toBe(1);
        expect(dependencies.get('vision')).toBe('Vision content');

        expect(artifactRepository.getArtifactTypeDependencies).toHaveBeenCalledWith('Functional Requirements');
        expect(artifactRepository.getArtifactsByType).toHaveBeenCalledWith(mockArtifact, 'Vision Document');
    });

    it('should throw error if required dependency is missing', async () => {
        // Mock dependencies for Functional Requirements
        jest.spyOn(artifactRepository, 'getArtifactTypeDependencies')
            .mockResolvedValue([
                { id: 1, name: 'Vision Document' } as any,
            ]);

        // Return empty array to simulate missing dependency
        jest.spyOn(artifactRepository, 'getArtifactsByType')
            .mockResolvedValue([]);

        await expect(resolver.resolveDependencies(mockArtifact))
            .rejects.toThrow('Vision Document missing; Vision Document is required context');
    });

    it('should handle multiple artifacts for dependencies that allow multiple', async () => {
        // Create mock for an artifact type that can have multiple dependencies (like Use Cases)
        const mockC4ComponentArtifact = {
            id: 20,
            projectId: 1,
            artifactTypeId: 7, // C4 Component
            stateId: 2,
            currentVersionId: null,
            name: 'API Component',
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

        // Mock dependencies for C4 Component
        jest.spyOn(artifactRepository, 'getArtifactTypeDependencies')
            .mockResolvedValue([
                { id: 7, name: 'C4 Component' } as any,
            ]);

        // Mock multiple C4 Components
        const mockComponents = [
            { id: 101, currentVersion: { content: 'Component 1 content' } },
            { id: 102, currentVersion: { content: 'Component 2 content' } },
        ];

        jest.spyOn(artifactRepository, 'getArtifactsByType')
            .mockResolvedValue(mockComponents as any);

        const dependencies = await resolver.resolveDependencies(mockC4ComponentArtifact);

        expect(dependencies).toBeDefined();
        expect(dependencies.size).toBe(1);
        expect(dependencies.get('c4_component')).toEqual([
            'Component 1 content',
            'Component 2 content'
        ]);
    });

    it('should handle a second-level Use Case with all dependencies', async () => {
        // Create a Use Case artifact (which depends on Vision, FR, NFR, and existing Use Cases)
        const mockUseCaseArtifact = {
            id: 30,
            projectId: 1,
            artifactTypeId: 4, // Use Case
            stateId: 2,
            currentVersionId: null,
            name: 'User Registration',
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

        // Create mock dependencies
        const mockVision = {
            id: 1,
            projectId: 1,
            artifactTypeId: 1,
            stateId: 2,
            name: 'Vision Document',
            currentVersionId: 101,
            currentVersion: { content: 'Vision content' }
        };

        const mockFR = {
            id: 2,
            projectId: 1,
            artifactTypeId: 2,
            stateId: 2,
            name: 'Functional Requirements',
            currentVersionId: 102,
            currentVersion: { content: 'Functional requirements content' }
        };

        const mockNFR = {
            id: 3,
            projectId: 1,
            artifactTypeId: 3,
            stateId: 2,
            name: 'Non-Functional Requirements',
            currentVersionId: 103,
            currentVersion: { content: 'Non-functional requirements content' }
        };

        const mockExistingUseCase = {
            id: 4,
            projectId: 1,
            artifactTypeId: 4,
            stateId: 2,
            name: 'User Login',
            currentVersionId: 104,
            currentVersion: { content: 'Login use case content' }
        };

        // Set up dependencies for Use Case
        jest.spyOn(artifactRepository, 'getArtifactTypeDependencies')
            .mockResolvedValue([
                { id: 1, name: 'Vision Document' } as any,
                { id: 2, name: 'Functional Requirements' } as any,
                { id: 3, name: 'Non-Functional Requirements' } as any,
                { id: 4, name: 'Use Cases' } as any, // Self-reference for existing use cases
            ]);

        // Mock retrieving dependencies
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

        const dependencies = await resolver.resolveDependencies(mockUseCaseArtifact);

        expect(dependencies).toBeDefined();
        expect(dependencies.size).toBe(4);
        expect(dependencies.get('vision')).toBe('Vision content');
        expect(dependencies.get('functional_requirements')).toBe('Functional requirements content');
        expect(dependencies.get('non_functional_requirements')).toBe('Non-functional requirements content');
        expect(dependencies.get('use_cases')).toEqual(['Login use case content']);
    });

    it('should handle a C4 Context diagram (Phase 2) including all Phase 1 artifacts', async () => {
        // Create a C4 Context artifact
        const mockC4ContextArtifact = {
            id: 40,
            projectId: 1,
            artifactTypeId: 5, // C4 Context
            stateId: 2,
            currentVersionId: null,
            name: 'System Context Diagram',
            createdAt: new Date(),
            updatedAt: new Date(),
            project: {
                id: 1,
                name: 'Test Project',
                projectTypeId: 1
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

        // Set up all Phase 1 artifacts
        const mockVision = {
            id: 1,
            projectId: 1,
            artifactTypeId: 1,
            stateId: 2,
            name: 'Vision Document',
            currentVersionId: 101,
            currentVersion: { content: 'Vision content' }
        };

        const mockFR = {
            id: 2,
            projectId: 1,
            artifactTypeId: 2,
            stateId: 2,
            name: 'Functional Requirements',
            currentVersionId: 102,
            currentVersion: { content: 'Functional requirements content' }
        };

        const mockNFR = {
            id: 3,
            projectId: 1,
            artifactTypeId: 3,
            stateId: 2,
            name: 'Non-Functional Requirements',
            currentVersionId: 103,
            currentVersion: { content: 'Non-functional requirements content' }
        };

        const mockUseCase1 = {
            id: 4,
            projectId: 1,
            artifactTypeId: 4,
            stateId: 2,
            name: 'Login Use Case',
            currentVersionId: 104,
            currentVersion: { content: 'Login use case content' }
        };

        const mockUseCase2 = {
            id: 5,
            projectId: 1,
            artifactTypeId: 4,
            stateId: 2,
            name: 'Registration Use Case',
            currentVersionId: 105,
            currentVersion: { content: 'Registration use case content' }
        };

        // Set up dependencies for C4 Context
        jest.spyOn(artifactRepository, 'getArtifactTypeDependencies')
            .mockResolvedValue([
                { id: 1, name: 'Vision Document' } as any,
                { id: 2, name: 'Functional Requirements' } as any,
                { id: 3, name: 'Non-Functional Requirements' } as any,
                { id: 4, name: 'Use Cases' } as any,
            ]);

        // Mock retrieving dependencies
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

        const dependencies = await resolver.resolveDependencies(mockC4ContextArtifact);

        expect(dependencies).toBeDefined();
        expect(dependencies.size).toBe(4);
        expect(dependencies.get('vision')).toBe('Vision content');
        expect(dependencies.get('functional_requirements')).toBe('Functional requirements content');
        expect(dependencies.get('non_functional_requirements')).toBe('Non-functional requirements content');
        expect(dependencies.get('use_cases')).toEqual([
            'Login use case content',
            'Registration use case content'
        ]);
    });

    it('should handle a second-level C4 Component including all relevant artifacts', async () => {
        // Create a second C4 Component artifact
        const mockC4ComponentArtifact = {
            id: 50,
            projectId: 1,
            artifactTypeId: 7, // C4 Component
            stateId: 2,
            currentVersionId: null,
            name: 'User Authentication Component',
            createdAt: new Date(),
            updatedAt: new Date(),
            project: {
                id: 1,
                name: 'Test Project',
                projectTypeId: 1
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

        // Set up all dependencies
        const mockVision = {
            id: 1,
            projectId: 1,
            artifactTypeId: 1,
            stateId: 2,
            name: 'Vision Document',
            currentVersionId: 101,
            currentVersion: { content: 'Vision content' }
        };

        const mockFR = {
            id: 2,
            projectId: 1,
            artifactTypeId: 2,
            stateId: 2,
            name: 'Functional Requirements',
            currentVersionId: 102,
            currentVersion: { content: 'Functional requirements content' }
        };

        const mockNFR = {
            id: 3,
            projectId: 1,
            artifactTypeId: 3,
            stateId: 2,
            name: 'Non-Functional Requirements',
            currentVersionId: 103,
            currentVersion: { content: 'Non-functional requirements content' }
        };

        const mockUseCase = {
            id: 4,
            projectId: 1,
            artifactTypeId: 4,
            stateId: 2,
            name: 'Login Use Case',
            currentVersionId: 104,
            currentVersion: { content: 'Login use case content' }
        };

        const mockC4Context = {
            id: 5,
            projectId: 1,
            artifactTypeId: 5,
            stateId: 2,
            name: 'System Context Diagram',
            currentVersionId: 105,
            currentVersion: { content: 'C4 Context content' }
        };

        const mockC4Container = {
            id: 6,
            projectId: 1,
            artifactTypeId: 6,
            stateId: 2,
            name: 'Container Diagram',
            currentVersionId: 106,
            currentVersion: { content: 'C4 Container content' }
        };

        const mockExistingComponent = {
            id: 7,
            projectId: 1,
            artifactTypeId: 7,
            stateId: 2,
            name: 'API Component',
            currentVersionId: 107,
            currentVersion: { content: 'API Component content' }
        };

        // Set up dependencies for C4 Component
        jest.spyOn(artifactRepository, 'getArtifactTypeDependencies')
            .mockResolvedValue([
                { id: 1, name: 'Vision Document' } as any,
                { id: 2, name: 'Functional Requirements' } as any,
                { id: 3, name: 'Non-Functional Requirements' } as any,
                { id: 4, name: 'Use Cases' } as any,
                { id: 5, name: 'C4 Context' } as any,
                { id: 6, name: 'C4 Container' } as any,
                { id: 7, name: 'C4 Component' } as any, // Self-reference for existing components
            ]);

        // Mock retrieving dependencies
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
                        return Promise.resolve([mockC4Context as any]);
                    case 'C4 Container':
                        return Promise.resolve([mockC4Container as any]);
                    case 'C4 Component':
                        return Promise.resolve([mockExistingComponent as any]);
                    default:
                        return Promise.resolve([]);
                }
            });

        const dependencies = await resolver.resolveDependencies(mockC4ComponentArtifact);

        expect(dependencies).toBeDefined();
        expect(dependencies.size).toBe(7);
        expect(dependencies.get('vision')).toBe('Vision content');
        expect(dependencies.get('functional_requirements')).toBe('Functional requirements content');
        expect(dependencies.get('non_functional_requirements')).toBe('Non-functional requirements content');
        expect(dependencies.get('use_cases')).toEqual(['Login use case content']);
        expect(dependencies.get('c4_context')).toBe('C4 Context content');
        expect(dependencies.get('c4_container')).toBe('C4 Container content');
        expect(dependencies.get('c4_component')).toEqual(['API Component content']);
    });

    it('should handle multiple versions of artifacts and only use the current version', async () => {
        // Create a Use Case artifact
        const mockUseCaseArtifact = {
            id: 30,
            projectId: 1,
            artifactTypeId: 4, // Use Case
            stateId: 2,
            currentVersionId: null,
            name: 'User Registration',
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

        // Mock FR with multiple versions
        const mockFR = {
            id: 2,
            projectId: 1,
            artifactTypeId: 2,
            stateId: 2,
            name: 'Functional Requirements',
            currentVersionId: 102,
            currentVersion: { content: 'Current FR content (v3)' },
            versions: [
                { id: 100, versionNumber: 1, content: 'Old FR content (v1)' },
                { id: 101, versionNumber: 2, content: 'Old FR content (v2)' },
                { id: 102, versionNumber: 3, content: 'Current FR content (v3)' }
            ]
        };

        // Set up dependencies
        jest.spyOn(artifactRepository, 'getArtifactTypeDependencies')
            .mockResolvedValue([
                { id: 2, name: 'Functional Requirements' } as any,
            ]);

        // Mock retrieving dependencies
        jest.spyOn(artifactRepository, 'getArtifactsByType')
            .mockResolvedValue([mockFR as any]);

        const dependencies = await resolver.resolveDependencies(mockUseCaseArtifact);

        expect(dependencies).toBeDefined();
        expect(dependencies.size).toBe(1);
        expect(dependencies.get('functional_requirements')).toBe('Current FR content (v3)');
        // Should not contain any of the older versions
        expect(dependencies.get('functional_requirements')).not.toContain('Old FR content');
    });
});