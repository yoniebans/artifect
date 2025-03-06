import { Test, TestingModule } from '@nestjs/testing';
import { ContextManagerService } from './context-manager.service';
import { ArtifactRepository } from '../repositories/artifact.repository';
import { CacheService } from '../services/cache/cache.service';
import { ArtifactWithRelations } from './types/artifact-with-relations';

describe('ContextManagerService', () => {
    let service: ContextManagerService;
    let artifactRepository: ArtifactRepository;
    let cacheService: CacheService;

    // Create mock artifacts with dependencies
    const mockVision = {
        id: 1,
        currentVersion: { content: 'Vision content' }
    };

    const mockFR = {
        id: 2,
        currentVersion: { content: 'Functional requirements content' }
    };

    const mockNFR = {
        id: 3,
        currentVersion: { content: 'Non-functional requirements content' }
    };

    const mockUseCase = {
        id: 4,
        currentVersion: { content: 'Use case content' }
    };

    const mockC4Context = {
        id: 5,
        currentVersion: { content: 'C4 Context content' }
    };

    const mockC4Container = {
        id: 6,
        currentVersion: { content: 'C4 Container content' }
    };

    const mockC4Component = {
        id: 7,
        currentVersion: { content: 'C4 Component content' }
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContextManagerService,
                {
                    provide: ArtifactRepository,
                    useValue: {
                        getArtifactsByType: jest.fn(),
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
        artifactRepository = module.get<ArtifactRepository>(ArtifactRepository);
        cacheService = module.get<CacheService>(CacheService);

        // Mock getArtifactTypeInfo to return type IDs
        jest.spyOn(cacheService, 'getArtifactTypeInfo')
            .mockImplementation((name: string) => {
                const typeMap: Record<string, { typeId: number; slug: string } | undefined> = {
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
        expect(service).toBeDefined();
    });

    it('should create basic context for a new artifact', async () => {
        const mockArtifact = {
            id: 1,
            artifactTypeId: 1,
            name: 'Test Artifact',
            project: {
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

        const context = await service.getContext(mockArtifact, false);

        expect(context).toBeDefined();
        expect(context.project.name).toBe('Test Project');
        expect(context.artifact.artifact_type_name).toBe('Vision Document');
        expect(context.artifact.artifact_phase).toBe('Requirements');
        expect(context.is_update).toBe(false);
    });

    it('should include current content for an update', async () => {
        const mockArtifact = {
            id: 1,
            artifactTypeId: 1,
            name: 'Test Artifact',
            project: {
                name: 'Test Project',
            },
            artifact_type: {
                id: 1,
                name: 'Vision Document',
                lifecyclePhase: {
                    name: 'Requirements',
                },
            },
            currentVersion: {
                content: 'Current artifact content'
            }
        } as ArtifactWithRelations;

        const context = await service.getContext(mockArtifact, true);

        expect(context).toBeDefined();
        expect(context.artifact.content).toBe('Current artifact content');
    });

    it('should include vision document for functional requirements', async () => {
        const mockArtifact = {
            id: 10,
            artifactTypeId: 2, // Functional Requirements
            name: 'Functional Requirements',
            project: {
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

        // Mock repository to return vision document
        jest.spyOn(artifactRepository, 'getArtifactsByType')
            .mockImplementation((artifact, type) => {
                if (type === 'Vision Document') {
                    return Promise.resolve([mockVision as any]);
                }
                return Promise.resolve([]);
            });

        const context = await service.getContext(mockArtifact, false);

        expect(context).toBeDefined();
        expect(context.vision).toBe('Vision content');
    });

    it('should throw error if required dependency is missing', async () => {
        const mockArtifact = {
            id: 10,
            artifactTypeId: 2, // Functional Requirements
            name: 'Functional Requirements',
            project: {
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

        // Mock repository to return empty array (no vision document)
        jest.spyOn(artifactRepository, 'getArtifactsByType')
            .mockResolvedValue([]);

        await expect(service.getContext(mockArtifact, false))
            .rejects.toThrow('Vision document missing');
    });

    it('should include all required dependencies for C4 Component', async () => {
        const mockArtifact = {
            id: 20,
            artifactTypeId: 7, // C4 Component
            name: 'API Component',
            project: {
                name: 'Test Project',
            },
            artifact_type: {
                id: 7,
                name: 'C4 Component',
                lifecyclePhase: {
                    name: 'Design',
                },
            },
        } as ArtifactWithRelations;

        // Mock repository to return all required dependencies
        jest.spyOn(artifactRepository, 'getArtifactsByType')
            .mockImplementation((artifact, type) => {
                const typeMap: Record<string, any[]> = {
                    'Vision Document': [mockVision],
                    'Functional Requirements': [mockFR],
                    'Non-Functional Requirements': [mockNFR],
                    'Use Cases': [mockUseCase],
                    'C4 Context': [mockC4Context],
                    'C4 Container': [mockC4Container],
                    'C4 Component': [mockC4Component],
                };
                return Promise.resolve(typeMap[type] || []);
            });

        const context = await service.getContext(mockArtifact, false);

        expect(context).toBeDefined();
        expect(context.vision).toBe('Vision content');
        expect(context.functional_requirements).toBe('Functional requirements content');
        expect(context.non_functional_requirements).toBe('Non-functional requirements content');
        expect(context.use_cases).toEqual(['Use case content']);
        expect(context.c4_context).toBe('C4 Context content');
        expect(context.c4_container).toBe('C4 Container content');
    });

    it('should include existing components for C4 Component creation', async () => {
        const mockArtifact = {
            id: 21,
            artifactTypeId: 7, // C4 Component
            name: 'New Component',
            project: {
                name: 'Test Project',
            },
            artifact_type: {
                id: 7,
                name: 'C4 Component',
                lifecyclePhase: {
                    name: 'Design',
                },
            },
        } as ArtifactWithRelations;

        // Mock repository to return all dependencies including existing components
        jest.spyOn(artifactRepository, 'getArtifactsByType')
            .mockImplementation((artifact, type) => {
                const typeMap: Record<string, any[]> = {
                    'Vision Document': [mockVision],
                    'Functional Requirements': [mockFR],
                    'Non-Functional Requirements': [mockNFR],
                    'Use Cases': [mockUseCase],
                    'C4 Context': [mockC4Context],
                    'C4 Container': [mockC4Container],
                    'C4 Component': [mockC4Component],
                };
                return Promise.resolve(typeMap[type] || []);
            });

        const context = await service.getContext(mockArtifact, false);

        expect(context).toBeDefined();
        expect(context.c4_components).toEqual(['C4 Component content']);
    });
});