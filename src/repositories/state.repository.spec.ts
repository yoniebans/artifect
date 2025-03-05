import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../services/cache/cache.service';
import { StateRepository } from './state.repository';

describe('StateRepository', () => {
    let repository: StateRepository;
    let prismaService: PrismaService;
    let cacheService: CacheService;

    // Mock data
    const mockStates = [
        { id: 1, name: 'To Do' },
        { id: 2, name: 'In Progress' },
        { id: 3, name: 'Approved' }
    ];

    const mockTransitions = [
        { id: 1, fromStateId: 1, toStateId: 2, fromState: mockStates[0], toState: mockStates[1] },
        { id: 2, fromStateId: 2, toStateId: 3, fromState: mockStates[1], toState: mockStates[2] },
        { id: 3, fromStateId: 3, toStateId: 2, fromState: mockStates[2], toState: mockStates[1] }
    ];

    const mockArtifact = {
        id: 1,
        projectId: 1,
        artifactTypeId: 1,
        stateId: 2,
        state: mockStates[1],
        name: 'Test Artifact',
        createdAt: new Date(),
        updatedAt: new Date(),
        currentVersionId: 1
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StateRepository,
                {
                    provide: PrismaService,
                    useValue: {
                        artifact: {
                            findUnique: jest.fn(),
                            update: jest.fn()
                        },
                        artifactState: {
                            findUnique: jest.fn(),
                            findMany: jest.fn()
                        },
                        stateTransition: {
                            findFirst: jest.fn(),
                            findMany: jest.fn()
                        }
                    }
                },
                {
                    provide: CacheService,
                    useValue: {
                        getArtifactStateIdByName: jest.fn()
                    }
                }
            ]
        }).compile();

        repository = module.get<StateRepository>(StateRepository);
        prismaService = module.get<PrismaService>(PrismaService);
        cacheService = module.get<CacheService>(CacheService);
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
    });

    describe('getCurrentState', () => {
        it('should return the current state of an artifact', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(mockArtifact);

            // Execute
            const result = await repository.getCurrentState(1);

            // Verify
            expect(prismaService.artifact.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
                include: { state: true }
            });
            expect(result).toEqual(mockStates[1]);
        });

        it('should return null if artifact not found', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(null);

            // Execute
            const result = await repository.getCurrentState(999);

            // Verify
            expect(result).toBeNull();
        });

        it('should throw error if database query fails', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

            // Execute & Verify
            await expect(repository.getCurrentState(1)).rejects.toThrow('Error retrieving current state');
        });
    });

    describe('getAvailableTransitions', () => {
        it('should return available transitions for an artifact', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(mockArtifact);
            (prismaService.stateTransition.findMany as jest.Mock).mockResolvedValue([mockTransitions[1]]);

            // Execute
            const result = await repository.getAvailableTransitions(1);

            // Verify
            expect(prismaService.stateTransition.findMany).toHaveBeenCalledWith({
                where: { fromStateId: 2 },
                include: { toState: true }
            });
            expect(result).toEqual([mockStates[2]]);
        });

        it('should return empty array if artifact not found', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(null);

            // Execute
            const result = await repository.getAvailableTransitions(999);

            // Verify
            expect(result).toEqual([]);
        });

        it('should throw error if database query fails', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(mockArtifact);
            (prismaService.stateTransition.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

            // Execute & Verify
            await expect(repository.getAvailableTransitions(1)).rejects.toThrow('Error retrieving available transitions');
        });
    });

    describe('transitionState', () => {
        it('should transition an artifact to a new state', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(mockArtifact);
            (prismaService.artifactState.findUnique as jest.Mock).mockResolvedValue(mockStates[2]);
            (prismaService.stateTransition.findFirst as jest.Mock).mockResolvedValue(mockTransitions[1]);
            (prismaService.artifact.update as jest.Mock).mockResolvedValue({
                ...mockArtifact,
                stateId: 3,
                state: mockStates[2]
            });

            // Execute
            const [success, message] = await repository.transitionState(1, 3);

            // Verify
            expect(prismaService.artifact.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { stateId: 3 }
            });
            expect(success).toBe(true);
            expect(message).toContain('Successfully transitioned');
        });

        it('should return failure if artifact not found', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(null);

            // Execute
            const [success, message] = await repository.transitionState(999, 3);

            // Verify
            expect(success).toBe(false);
            expect(message).toContain('Artifact not found');
        });

        it('should return failure if new state not found', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(mockArtifact);
            (prismaService.artifactState.findUnique as jest.Mock).mockResolvedValue(null);

            // Execute
            const [success, message] = await repository.transitionState(1, 999);

            // Verify
            expect(success).toBe(false);
            expect(message).toContain('New state not found');
        });

        it('should return failure if transition is invalid', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(mockArtifact);
            (prismaService.artifactState.findUnique as jest.Mock).mockResolvedValue(mockStates[0]);
            (prismaService.stateTransition.findFirst as jest.Mock).mockResolvedValue(null);

            // Execute
            const [success, message] = await repository.transitionState(1, 1);

            // Verify
            expect(success).toBe(false);
            expect(message).toContain('Invalid transition');
        });

        it('should throw error if database query fails', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

            // Execute & Verify
            await expect(repository.transitionState(1, 3)).rejects.toThrow('Error transitioning state');
        });
    });

    describe('getAllStates', () => {
        it('should return all states', async () => {
            // Setup
            (prismaService.artifactState.findMany as jest.Mock).mockResolvedValue(mockStates);

            // Execute
            const result = await repository.getAllStates();

            // Verify
            expect(prismaService.artifactState.findMany).toHaveBeenCalled();
            expect(result).toEqual(mockStates);
        });

        it('should throw error if database query fails', async () => {
            // Setup
            (prismaService.artifactState.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

            // Execute & Verify
            await expect(repository.getAllStates()).rejects.toThrow('Error retrieving all states');
        });
    });

    describe('getAllTransitions', () => {
        it('should return all transitions', async () => {
            // Setup
            (prismaService.stateTransition.findMany as jest.Mock).mockResolvedValue(mockTransitions);

            // Execute
            const result = await repository.getAllTransitions();

            // Verify
            expect(prismaService.stateTransition.findMany).toHaveBeenCalledWith({
                include: {
                    fromState: true,
                    toState: true
                }
            });
            expect(result).toEqual(mockTransitions);
        });

        it('should throw error if database query fails', async () => {
            // Setup
            (prismaService.stateTransition.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

            // Execute & Verify
            await expect(repository.getAllTransitions()).rejects.toThrow('Error retrieving all transitions');
        });
    });

    describe('isValidStateTransition', () => {
        it('should return true for valid transition', async () => {
            // Setup
            (cacheService.getArtifactStateIdByName as jest.Mock)
                .mockResolvedValueOnce(2) // fromState
                .mockResolvedValueOnce(3); // toState
            (prismaService.stateTransition.findFirst as jest.Mock).mockResolvedValue(mockTransitions[1]);

            // Execute
            const result = await repository.isValidStateTransition('In Progress', 'Approved');

            // Verify
            expect(prismaService.stateTransition.findFirst).toHaveBeenCalledWith({
                where: {
                    fromStateId: 2,
                    toStateId: 3
                }
            });
            expect(result).toBe(true);
        });

        it('should return false for invalid transition', async () => {
            // Setup
            (cacheService.getArtifactStateIdByName as jest.Mock)
                .mockResolvedValueOnce(1) // fromState
                .mockResolvedValueOnce(3); // toState
            (prismaService.stateTransition.findFirst as jest.Mock).mockResolvedValue(null);

            // Execute
            const result = await repository.isValidStateTransition('To Do', 'Approved');

            // Verify
            expect(result).toBe(false);
        });

        it('should return false if state name not found', async () => {
            // Setup
            (cacheService.getArtifactStateIdByName as jest.Mock).mockResolvedValue(null);

            // Execute
            const result = await repository.isValidStateTransition('Invalid', 'Approved');

            // Verify
            expect(result).toBe(false);
        });

        it('should throw error if database query fails', async () => {
            // Setup
            (cacheService.getArtifactStateIdByName as jest.Mock)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(3);
            (prismaService.stateTransition.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

            // Execute & Verify
            await expect(repository.isValidStateTransition('In Progress', 'Approved')).rejects.toThrow('Error checking state transition');
        });
    });

    describe('getStateByName', () => {
        it('should return state by name', async () => {
            // Setup
            (cacheService.getArtifactStateIdByName as jest.Mock).mockResolvedValue(2);
            (prismaService.artifactState.findUnique as jest.Mock).mockResolvedValue(mockStates[1]);

            // Execute
            const result = await repository.getStateByName('In Progress');

            // Verify
            expect(prismaService.artifactState.findUnique).toHaveBeenCalledWith({
                where: { id: 2 }
            });
            expect(result).toEqual(mockStates[1]);
        });

        it('should return null if state name not found', async () => {
            // Setup
            (cacheService.getArtifactStateIdByName as jest.Mock).mockResolvedValue(null);

            // Execute
            const result = await repository.getStateByName('Invalid');

            // Verify
            expect(result).toBeNull();
        });

        it('should throw error if database query fails', async () => {
            // Setup
            (cacheService.getArtifactStateIdByName as jest.Mock).mockResolvedValue(2);
            (prismaService.artifactState.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

            // Execute & Verify
            await expect(repository.getStateByName('In Progress')).rejects.toThrow('Error getting state by name');
        });
    });
});