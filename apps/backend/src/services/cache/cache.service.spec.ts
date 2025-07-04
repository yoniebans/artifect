import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from './cache.service';

describe('CacheService', () => {
    let service: CacheService;
    let prismaService: PrismaService;

    // Mock data for testing
    const mockArtifactTypes = [
        { id: 1, name: 'Vision Document', slug: 'vision', syntax: 'markdown', lifecyclePhaseId: 1 },
        { id: 2, name: 'Requirements', slug: 'requirements', syntax: 'markdown', lifecyclePhaseId: 1 }
    ];

    const mockArtifactStates = [
        { id: 1, name: 'To Do' },
        { id: 2, name: 'In Progress' },
        { id: 3, name: 'Approved' }
    ];

    const mockStateTransitions = [
        { id: 1, fromStateId: 1, toStateId: 2 }, // To Do -> In Progress
        { id: 2, fromStateId: 2, toStateId: 3 }, // In Progress -> Approved
        { id: 3, fromStateId: 3, toStateId: 2 }  // Approved -> In Progress
    ];

    const mockLifecyclePhases = [
        { id: 1, name: 'Requirements', order: 1 },
        { id: 2, name: 'Design', order: 2 }
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CacheService,
                {
                    provide: PrismaService,
                    useValue: {
                        artifactType: {
                            findMany: jest.fn().mockResolvedValue(mockArtifactTypes)
                        },
                        artifactState: {
                            findMany: jest.fn().mockResolvedValue(mockArtifactStates)
                        },
                        stateTransition: {
                            findMany: jest.fn().mockResolvedValue(mockStateTransitions)
                        },
                        lifecyclePhase: {
                            findMany: jest.fn().mockResolvedValue(mockLifecyclePhases)
                        }
                    }
                }
            ],
        }).compile();

        service = module.get<CacheService>(CacheService);
        prismaService = module.get<PrismaService>(PrismaService);

        // Reset initialized flag to force reinitialization
        (service as any).initialized = false;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('initialize', () => {
        it('should load cache data from the database', async () => {
            await service.initialize();

            expect(prismaService.artifactType.findMany).toHaveBeenCalled();
            expect(prismaService.artifactState.findMany).toHaveBeenCalled();
            expect(prismaService.stateTransition.findMany).toHaveBeenCalled();
            expect(prismaService.lifecyclePhase.findMany).toHaveBeenCalled();
            expect((service as any).initialized).toBe(true);
        });

        it('should not reload data if already initialized', async () => {
            await service.initialize();

            // Reset the spy counts
            jest.clearAllMocks();

            await service.initialize();

            expect(prismaService.artifactType.findMany).not.toHaveBeenCalled();
        });
    });

    describe('getLifecyclePhaseIdByName', () => {
        it('should return phase ID by name', async () => {
            await service.initialize();
            const phaseId = await service.getLifecyclePhaseIdByName('Requirements');
            expect(phaseId).toBe(1);
        });

        it('should return null for unknown phase name', async () => {
            await service.initialize();
            const phaseId = await service.getLifecyclePhaseIdByName('Unknown');
            expect(phaseId).toBeNull();
        });

        it('should initialize cache if not initialized', async () => {
            const phaseId = await service.getLifecyclePhaseIdByName('Requirements');
            expect(phaseId).toBe(1);
            expect(prismaService.lifecyclePhase.findMany).toHaveBeenCalled();
        });
    });

    describe('getArtifactTypeInfo', () => {
        it('should return type info by name', async () => {
            await service.initialize();
            const typeInfo = await service.getArtifactTypeInfo('Vision Document');
            expect(typeInfo).toEqual({ typeId: 1, slug: 'vision' });
        });

        it('should return null for unknown type name', async () => {
            await service.initialize();
            const typeInfo = await service.getArtifactTypeInfo('Unknown');
            expect(typeInfo).toBeNull();
        });
    });

    describe('getArtifactFormat', () => {
        it('should return format by slug', async () => {
            await service.initialize();
            const format = await service.getArtifactFormat('vision');
            expect(format).toEqual({
                startTag: '[VISION]',
                endTag: '[/VISION]',
                syntax: 'markdown',
                commentaryStartTag: '[COMMENTARY]',
                commentaryEndTag: '[/COMMENTARY]'
            });
        });

        it('should return default format for unknown slug', async () => {
            await service.initialize();
            const format = await service.getArtifactFormat('unknown');
            expect(format).toEqual({
                startTag: '[ARTIFACT]',
                endTag: '[/ARTIFACT]',
                syntax: 'markdown',
                commentaryStartTag: '[COMMENTARY]',
                commentaryEndTag: '[/COMMENTARY]'
            });
        });
    });

    describe('getArtifactStateIdByName', () => {
        it('should return state ID by name', async () => {
            await service.initialize();
            const stateId = await service.getArtifactStateIdByName('In Progress');
            expect(stateId).toBe(2);
        });

        it('should return null for unknown state name', async () => {
            await service.initialize();
            const stateId = await service.getArtifactStateIdByName('Unknown');
            expect(stateId).toBeNull();
        });
    });

    describe('getStateTransitionId', () => {
        it('should return transition ID for valid transition', async () => {
            await service.initialize();
            const transitionId = await service.getStateTransitionId('To Do', 'In Progress');
            expect(transitionId).toBe(1);
        });

        it('should return null for invalid transition', async () => {
            await service.initialize();
            const transitionId = await service.getStateTransitionId('To Do', 'Approved');
            expect(transitionId).toBeNull();
        });

        it('should return null if states not found', async () => {
            await service.initialize();
            const transitionId = await service.getStateTransitionId('Unknown', 'In Progress');
            expect(transitionId).toBeNull();
        });
    });
});