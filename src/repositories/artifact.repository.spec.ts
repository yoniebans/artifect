import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ArtifactRepository } from './artifact.repository';
import { CacheService } from '../services/cache/cache.service';
import { Prisma } from '@prisma/client';

describe('ArtifactRepository', () => {
    let repository: ArtifactRepository;
    let prismaService: PrismaService;
    let cacheService: CacheService;

    // Mock data
    const mockArtifactType = {
        id: 1,
        name: 'Vision Document',
        slug: 'vision',
        syntax: 'markdown',
        lifecyclePhaseId: 1
    };

    const mockState = {
        id: 2,
        name: 'In Progress'
    };

    const mockArtifact = {
        id: 1,
        projectId: 1,
        artifactTypeId: 1,
        stateId: 2,
        name: 'Test Artifact',
        createdAt: new Date(),
        updatedAt: new Date(),
        currentVersionId: 1,
        artifactType: mockArtifactType,
        state: mockState,
        currentVersion: {
            id: 1,
            artifactId: 1,
            versionNumber: 1,
            content: 'Test content',
            createdAt: new Date()
        },
        project: {
            id: 1,
            name: 'Test Project',
            createdAt: new Date(),
            updatedAt: null
        }
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ArtifactRepository,
                {
                    provide: PrismaService,
                    useValue: {
                        artifact: {
                            create: jest.fn(),
                            findUnique: jest.fn(),
                            findMany: jest.fn(),
                            update: jest.fn(),
                            delete: jest.fn(),
                        },
                        artifactVersion: {
                            create: jest.fn(),
                            findMany: jest.fn(),
                            findFirst: jest.fn(),
                        },
                        artifactType: {
                            findUnique: jest.fn(),
                            findMany: jest.fn(),
                        },
                        artifactState: {
                            findUnique: jest.fn(),
                            findMany: jest.fn(),
                        },
                        lifecyclePhase: {
                            findMany: jest.fn(),
                        },
                        stateTransition: {
                            findFirst: jest.fn(),
                            findMany: jest.fn(),
                        },
                        artifactInteraction: {
                            create: jest.fn(),
                            findMany: jest.fn(),
                        },
                    },
                },
                {
                    provide: CacheService,
                    useValue: {
                        getLifecyclePhaseIdByName: jest.fn(),
                        getArtifactTypeInfo: jest.fn(),
                        getArtifactFormat: jest.fn(),
                        getArtifactStateIdByName: jest.fn(),
                        getStateTransitionId: jest.fn(),
                        initialize: jest.fn(),
                    },
                },
            ],
        }).compile();

        repository = module.get<ArtifactRepository>(ArtifactRepository);
        prismaService = module.get<PrismaService>(PrismaService);
        cacheService = module.get<CacheService>(CacheService);
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
    });

    describe('create', () => {
        it('should create an artifact with content', async () => {
            // Setup
            const createData = {
                projectId: 1,
                artifactTypeId: 1,
                name: 'New Artifact',
                content: 'Initial Content'
            };

            const artifactWithoutVersion = {
                id: 1,
                projectId: 1,
                artifactTypeId: 1,
                stateId: 2,
                name: 'New Artifact',
                createdAt: new Date(),
                updatedAt: new Date(),
                currentVersionId: null
            };

            const newVersion = {
                id: 1,
                artifactId: 1,
                versionNumber: 1,
                content: 'Initial Content',
                createdAt: new Date()
            };

            const finalArtifact = {
                ...artifactWithoutVersion,
                currentVersionId: 1
            };

            (cacheService.getArtifactStateIdByName as jest.Mock).mockResolvedValue(2);
            (prismaService.artifactType.findUnique as jest.Mock).mockResolvedValue(mockArtifactType);
            (prismaService.artifact.create as jest.Mock).mockResolvedValue(artifactWithoutVersion);
            (prismaService.artifactVersion.create as jest.Mock).mockResolvedValue(newVersion);
            (prismaService.artifact.update as jest.Mock).mockResolvedValue(finalArtifact);

            // Execute
            const result = await repository.create(createData);

            // Verify
            expect(prismaService.artifact.create).toHaveBeenCalledWith({
                data: {
                    projectId: createData.projectId,
                    artifactTypeId: createData.artifactTypeId,
                    name: createData.name,
                    stateId: 2
                }
            });

            expect(prismaService.artifactVersion.create).toHaveBeenCalledWith({
                data: {
                    artifactId: artifactWithoutVersion.id,
                    versionNumber: 1,
                    content: createData.content
                }
            });

            expect(prismaService.artifact.update).toHaveBeenCalledWith({
                where: { id: artifactWithoutVersion.id },
                data: { currentVersionId: newVersion.id }
            });

            expect(result).toEqual(finalArtifact);
        });

        it('should create an artifact without content', async () => {
            // Setup
            const createData = {
                projectId: 1,
                artifactTypeId: 1,
                name: 'New Artifact'
            };

            const newArtifact = {
                id: 1,
                projectId: 1,
                artifactTypeId: 1,
                stateId: 2,
                name: 'New Artifact',
                createdAt: new Date(),
                updatedAt: new Date(),
                currentVersionId: null
            };

            (cacheService.getArtifactStateIdByName as jest.Mock).mockResolvedValue(2);
            (prismaService.artifactType.findUnique as jest.Mock).mockResolvedValue(mockArtifactType);
            (prismaService.artifact.create as jest.Mock).mockResolvedValue(newArtifact);

            // Execute
            const result = await repository.create(createData);

            // Verify
            expect(prismaService.artifact.create).toHaveBeenCalledWith({
                data: {
                    projectId: createData.projectId,
                    artifactTypeId: createData.artifactTypeId,
                    name: createData.name,
                    stateId: 2
                }
            });

            expect(prismaService.artifactVersion.create).not.toHaveBeenCalled();
            expect(result).toEqual(newArtifact);
        });

        it('should throw error if artifact type not found', async () => {
            // Setup
            const createData = {
                projectId: 1,
                artifactTypeId: 999,
                name: 'New Artifact'
            };

            (prismaService.artifactType.findUnique as jest.Mock).mockResolvedValue(null);

            // Execute & Verify
            await expect(repository.create(createData)).rejects.toThrow('Invalid artifact type ID');
        });
    });

    describe('findById', () => {
        it('should find an artifact by ID', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(mockArtifact);

            // Execute
            const result = await repository.findById(1);

            // Verify
            expect(prismaService.artifact.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
                include: {
                    artifactType: true,
                    state: true,
                    currentVersion: true,
                    project: true
                }
            });
            expect(result).toEqual(mockArtifact);
        });

        it('should return null if artifact not found', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(null);

            // Execute
            const result = await repository.findById(999);

            // Verify
            expect(result).toBeNull();
        });
    });

    describe('update', () => {
        it('should update artifact name', async () => {
            // Setup
            const updateData = { name: 'Updated Name' };
            const updatedArtifact = { ...mockArtifact, name: 'Updated Name' };

            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(mockArtifact);
            (prismaService.artifact.update as jest.Mock).mockResolvedValue(updatedArtifact);

            // Execute
            const result = await repository.update(1, updateData);

            // Verify
            expect(prismaService.artifact.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { name: 'Updated Name' },
                include: {
                    artifactType: true,
                    state: true,
                    currentVersion: true
                }
            });
            expect(result).toEqual(updatedArtifact);
        });

        it('should create new version when content updated', async () => {
            // Setup
            const updateData = { content: 'New content' };
            const nextVersion = {
                id: 2,
                artifactId: 1,
                versionNumber: 2,
                content: 'New content',
                createdAt: new Date()
            };
            const updatedArtifact = {
                ...mockArtifact,
                currentVersionId: 2,
                currentVersion: nextVersion
            };

            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(mockArtifact);
            (prismaService.artifactVersion.findFirst as jest.Mock).mockResolvedValue(mockArtifact.currentVersion);
            (prismaService.artifactVersion.create as jest.Mock).mockResolvedValue(nextVersion);
            (prismaService.artifact.update as jest.Mock).mockResolvedValue(updatedArtifact);

            // Execute
            const result = await repository.update(1, updateData);

            // Verify
            expect(prismaService.artifactVersion.create).toHaveBeenCalledWith({
                data: {
                    artifactId: 1,
                    versionNumber: 2,
                    content: 'New content'
                }
            });

            expect(prismaService.artifact.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    currentVersion: {
                        connect: { id: 2 }
                    }
                },
                include: {
                    artifactType: true,
                    state: true,
                    currentVersion: true
                }
            });

            expect(result).toEqual(updatedArtifact);
        });

        it('should return null if artifact not found', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(null);

            // Execute
            const result = await repository.update(999, { name: 'Updated Name' });

            // Verify
            expect(result).toBeNull();
        });
    });

    describe('delete', () => {
        it('should delete an artifact', async () => {
            // Setup
            (prismaService.artifact.delete as jest.Mock).mockResolvedValue({});

            // Execute
            const result = await repository.delete(1);

            // Verify
            expect(prismaService.artifact.delete).toHaveBeenCalledWith({
                where: { id: 1 }
            });
            expect(result).toBe(true);
        });

        it('should return false if artifact not found', async () => {
            // Setup
            const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
                code: 'P2025',
                clientVersion: 'mock',
                meta: {}
            });

            (prismaService.artifact.delete as jest.Mock).mockRejectedValue(prismaError);

            // Execute
            const result = await repository.delete(999);

            // Verify
            expect(result).toBe(false);
        });
    });

    describe('getArtifactsByProjectId', () => {
        it('should get artifacts by project ID', async () => {
            // Setup
            const artifacts = [mockArtifact];
            (prismaService.artifact.findMany as jest.Mock).mockResolvedValue(artifacts);

            // Execute
            const result = await repository.getArtifactsByProjectId(1);

            // Verify
            expect(prismaService.artifact.findMany).toHaveBeenCalledWith({
                where: { projectId: 1 },
                include: {
                    artifactType: true,
                    state: true,
                    currentVersion: true
                }
            });
            expect(result).toEqual(artifacts);
        });
    });

    describe('getArtifactsByProjectIdAndPhase', () => {
        it('should get artifacts by project ID and phase', async () => {
            // Setup
            const artifacts = [mockArtifact];
            (cacheService.getLifecyclePhaseIdByName as jest.Mock).mockResolvedValue(1);
            (prismaService.artifact.findMany as jest.Mock).mockResolvedValue(artifacts);

            // Execute
            const result = await repository.getArtifactsByProjectIdAndPhase(1, 'Requirements');

            // Verify
            // Using any to skip type checking as we're testing the implementation
            expect(prismaService.artifact.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    projectId: 1,
                    artifactType: {
                        lifecyclePhase: { id: 1 }
                    }
                },
                include: expect.objectContaining({
                    currentVersion: true
                })
            }));
            expect(result).toEqual(artifacts);
        });

        it('should throw error if phase not found', async () => {
            // Setup
            (cacheService.getLifecyclePhaseIdByName as jest.Mock).mockResolvedValue(null);

            // Execute & Verify
            await expect(repository.getArtifactsByProjectIdAndPhase(1, 'Invalid')).rejects.toThrow('Invalid lifecycle phase');
        });
    });

    describe('createArtifactVersion', () => {
        it('should create a new version', async () => {
            // Setup
            const newContent = 'New version content';
            const newVersion = {
                id: 2,
                artifactId: 1,
                versionNumber: 2,
                content: newContent,
                createdAt: new Date()
            };

            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(mockArtifact);
            (prismaService.artifactVersion.findFirst as jest.Mock).mockResolvedValue(mockArtifact.currentVersion);
            (prismaService.artifactVersion.create as jest.Mock).mockResolvedValue(newVersion);
            (prismaService.artifact.update as jest.Mock).mockResolvedValue({
                ...mockArtifact,
                currentVersionId: 2
            });

            // Execute
            const result = await repository.createArtifactVersion(1, newContent);

            // Verify
            expect(prismaService.artifactVersion.create).toHaveBeenCalledWith({
                data: {
                    artifactId: 1,
                    versionNumber: 2,
                    content: newContent
                }
            });

            expect(prismaService.artifact.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { currentVersionId: 2 }
            });

            expect(result).toEqual(newVersion);
        });

        it('should throw error if artifact not found', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(null);

            // Execute & Verify
            await expect(repository.createArtifactVersion(999, 'Content')).rejects.toThrow('Artifact not found');
        });
    });

    describe('getArtifactVersions', () => {
        it('should get all versions for an artifact', async () => {
            // Setup
            const versions = [
                {
                    id: 1,
                    artifactId: 1,
                    versionNumber: 1,
                    content: 'Version 1',
                    createdAt: new Date()
                },
                {
                    id: 2,
                    artifactId: 1,
                    versionNumber: 2,
                    content: 'Version 2',
                    createdAt: new Date()
                }
            ];

            (prismaService.artifactVersion.findMany as jest.Mock).mockResolvedValue(versions);

            // Execute
            const result = await repository.getArtifactVersions(1);

            // Verify
            expect(prismaService.artifactVersion.findMany).toHaveBeenCalledWith({
                where: { artifactId: 1 },
                orderBy: { versionNumber: 'asc' }
            });
            expect(result).toEqual(versions);
        });
    });

    describe('updateArtifactState', () => {
        it('should update artifact state', async () => {
            // Setup
            const newState = {
                id: 3,
                name: 'Approved'
            };

            const updatedArtifact = {
                ...mockArtifact,
                stateId: 3,
                state: newState
            };

            (cacheService.getArtifactStateIdByName as jest.Mock).mockResolvedValue(3);
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(mockArtifact);
            (prismaService.artifactState.findUnique as jest.Mock)
                .mockResolvedValueOnce(mockState)  // Current state
                .mockResolvedValueOnce(newState);  // New state
            (repository.isValidStateTransition as jest.Mock) = jest.fn().mockResolvedValue(true);
            (prismaService.artifact.update as jest.Mock).mockResolvedValue(updatedArtifact);

            // Execute
            const result = await repository.updateArtifactState(1, 'Approved');

            // Verify
            expect(prismaService.artifact.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { stateId: 3 },
                include: {
                    artifactType: true,
                    state: true,
                    currentVersion: true
                }
            });
            expect(result).toEqual(updatedArtifact);
        });

        it('should throw error if state not found', async () => {
            // Setup
            (cacheService.getArtifactStateIdByName as jest.Mock).mockResolvedValue(null);

            // Execute & Verify
            await expect(repository.updateArtifactState(1, 'Invalid')).rejects.toThrow('State not found');
        });
    });

    describe('createInteraction', () => {
        it('should create an interaction', async () => {
            // Setup
            const interactionData = {
                artifactId: 1,
                role: 'user',
                content: 'Test interaction',
                sequenceNumber: 1
            };

            const createdInteraction = {
                id: 1,
                ...interactionData,
                versionId: null,
                createdAt: new Date()
            };

            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(mockArtifact);
            (prismaService.artifactInteraction.create as jest.Mock).mockResolvedValue(createdInteraction);

            // Execute
            const result = await repository.createInteraction(interactionData);

            // Verify
            expect(prismaService.artifactInteraction.create).toHaveBeenCalledWith({
                data: interactionData
            });
            expect(result).toEqual(createdInteraction);
        });

        it('should create an interaction with version ID', async () => {
            // Setup
            const interactionData = {
                artifactId: 1,
                versionId: 1,
                role: 'user',
                content: 'Test interaction',
                sequenceNumber: 1
            };

            const createdInteraction = {
                id: 1,
                ...interactionData,
                createdAt: new Date()
            };

            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(mockArtifact);
            (prismaService.artifactVersion.findFirst as jest.Mock).mockResolvedValue(mockArtifact.currentVersion);
            (prismaService.artifactInteraction.create as jest.Mock).mockResolvedValue(createdInteraction);

            // Execute
            const result = await repository.createInteraction(interactionData);

            // Verify
            expect(prismaService.artifactInteraction.create).toHaveBeenCalledWith({
                data: interactionData
            });
            expect(result).toEqual(createdInteraction);
        });

        it('should throw error if artifact not found', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(null);

            // Execute & Verify
            await expect(repository.createInteraction({
                artifactId: 999,
                role: 'user',
                content: 'Test',
                sequenceNumber: 1
            })).rejects.toThrow('Artifact with id 999 not found');
        });

        it('should throw error if version not found for artifact', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(mockArtifact);
            (prismaService.artifactVersion.findFirst as jest.Mock).mockResolvedValue(null);

            // Execute & Verify
            await expect(repository.createInteraction({
                artifactId: 1,
                versionId: 999,
                role: 'user',
                content: 'Test',
                sequenceNumber: 1
            })).rejects.toThrow('Version with id 999 not found for artifact 1');
        });
    });

    describe('getLastInteractions', () => {
        it('should get the last interactions for an artifact', async () => {
            // Setup
            const interactions = [
                {
                    id: 2,
                    artifactId: 1,
                    role: 'assistant',
                    content: 'Assistant response 1',
                    sequenceNumber: 2,
                    createdAt: new Date()
                },
                {
                    id: 1,
                    artifactId: 1,
                    role: 'user',
                    content: 'User message 1',
                    sequenceNumber: 1,
                    createdAt: new Date()
                }
            ];

            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(mockArtifact);
            (prismaService.artifactInteraction.findMany as jest.Mock).mockResolvedValue(interactions);

            // Execute
            const [result, nextSequence] = await repository.getLastInteractions(1, 1);

            // Verify
            expect(prismaService.artifactInteraction.findMany).toHaveBeenCalledWith({
                where: { artifactId: 1 },
                orderBy: { sequenceNumber: 'desc' },
                take: 2 // 1 pair = 2 interactions
            });
            expect(result).toEqual(interactions);
            expect(nextSequence).toBe(3);
        });

        it('should return empty array and sequence 1 if no interactions', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(mockArtifact);
            (prismaService.artifactInteraction.findMany as jest.Mock).mockResolvedValue([]);

            // Execute
            const [result, nextSequence] = await repository.getLastInteractions(1);

            // Verify
            expect(result).toEqual([]);
            expect(nextSequence).toBe(1);
        });

        it('should throw error if artifact not found', async () => {
            // Setup
            (prismaService.artifact.findUnique as jest.Mock).mockResolvedValue(null);

            // Execute & Verify
            await expect(repository.getLastInteractions(999)).rejects.toThrow('Artifact with id 999 not found');
        });
    });
});