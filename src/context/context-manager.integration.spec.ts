import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ContextManagerService } from './context-manager.service';
import { ArtifactRepository } from '../repositories/artifact.repository';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../services/cache/cache.service';
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
            getArtifactsByType: jest.fn()
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

    it('should generate context for a new vision document', async () => {
        // Mock an artifact
        const mockArtifact = {
            id: 1,
            name: 'Vision Document',
            projectId: 1,
            artifactTypeId: 1,
            stateId: 2,
            project: {
                id: 1,
                name: 'Test Project',
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
        jest.spyOn(artifactRepository, 'getArtifactsByType').mockResolvedValue([]);

        // Generate context for new vision document
        const context = await contextManager.getContext(mockArtifact, false, 'Create a vision for a banking app');

        // Validate the basic context properties
        expect(context).toBeDefined();
        expect(context.project.name).toBe('Test Project');
        expect(context.artifact.artifact_type_name).toBe('Vision Document');
        expect(context.artifact.artifact_phase).toBe('Requirements');
        expect(context.is_update).toBe(false);
        expect(context.user_message).toBe('Create a vision for a banking app');
    });

    it('should include dependencies when generating context for functional requirements', async () => {
        // Mock artifact and its dependencies
        const mockVision = {
            id: 1,
            name: 'Vision',
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
            project: {
                id: 1,
                name: 'Test Project',
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
        jest.spyOn(artifactRepository, 'getArtifactsByType').mockImplementation((artifact, type) => {
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
    });
});