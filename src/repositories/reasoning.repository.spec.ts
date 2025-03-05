import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ReasoningRepository } from './reasoning.repository';
import { Prisma } from '@prisma/client';

describe('ReasoningRepository', () => {
    let repository: ReasoningRepository;
    let prismaService: PrismaService;

    // Mock data
    const mockDate = new Date();

    const mockArtifactVersion = {
        id: 1,
        artifactId: 2,
        versionNumber: 1,
        content: 'Test content',
        createdAt: mockDate
    };

    const mockReasoningSummary = {
        id: 1,
        artifactId: 2,
        summary: 'Test summary',
        lastUpdated: mockDate,
        reasoningPoints: [],
        summaryVersions: [
            {
                summaryId: 1,
                versionId: 1,
                version: mockArtifactVersion
            }
        ]
    };

    const mockReasoningPoint = {
        id: 1,
        summaryId: 1,
        category: 'Test category',
        point: 'Test point',
        importanceScore: 5
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReasoningRepository,
                {
                    provide: PrismaService,
                    useValue: {
                        reasoningSummary: {
                            create: jest.fn(),
                            findUnique: jest.fn(),
                            findMany: jest.fn(),
                            update: jest.fn(),
                            delete: jest.fn(),
                        },
                        reasoningPoint: {
                            create: jest.fn(),
                            findMany: jest.fn(),
                        },
                        artifactVersion: {
                            findUnique: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();

        repository = module.get<ReasoningRepository>(ReasoningRepository);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
    });

    describe('createReasoningSummary', () => {
        it('should create a reasoning summary', async () => {
            // Setup
            (prismaService.artifactVersion.findUnique as jest.Mock).mockResolvedValue(mockArtifactVersion);
            (prismaService.reasoningSummary.create as jest.Mock).mockResolvedValue(mockReasoningSummary);

            // Execute
            const result = await repository.createReasoningSummary(1, 1, 'Test summary');

            // Verify
            expect(prismaService.artifactVersion.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
                select: { artifactId: true }
            });

            expect(prismaService.reasoningSummary.create).toHaveBeenCalledWith({
                data: {
                    artifactId: 2,
                    summary: 'Test summary',
                    summaryVersions: {
                        create: {
                            versionId: 1
                        }
                    }
                }
            });

            expect(result).toEqual(mockReasoningSummary);
        });

        it('should throw error if artifact version not found', async () => {
            // Setup
            (prismaService.artifactVersion.findUnique as jest.Mock).mockResolvedValue(null);

            // Execute & Verify
            await expect(repository.createReasoningSummary(999, 1, 'Test summary')).rejects.toThrow('Artifact version with ID 999 not found');
        });
    });

    describe('getReasoningSummary', () => {
        it('should get a reasoning summary by ID', async () => {
            // Setup
            (prismaService.reasoningSummary.findUnique as jest.Mock).mockResolvedValue(mockReasoningSummary);

            // Execute
            const result = await repository.getReasoningSummary(1);

            // Verify
            expect(prismaService.reasoningSummary.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
                include: {
                    reasoningPoints: true,
                    summaryVersions: {
                        include: {
                            version: true
                        }
                    }
                }
            });
            expect(result).toEqual(mockReasoningSummary);
        });

        it('should return null if summary not found', async () => {
            // Setup
            (prismaService.reasoningSummary.findUnique as jest.Mock).mockResolvedValue(null);

            // Execute
            const result = await repository.getReasoningSummary(999);

            // Verify
            expect(result).toBeNull();
        });
    });

    describe('createReasoningPoint', () => {
        it('should create a reasoning point', async () => {
            // Setup
            (prismaService.reasoningSummary.findUnique as jest.Mock).mockResolvedValue(mockReasoningSummary);
            (prismaService.reasoningPoint.create as jest.Mock).mockResolvedValue(mockReasoningPoint);

            // Execute
            const result = await repository.createReasoningPoint(1, 'Test category', 'Test point', 5);

            // Verify
            expect(prismaService.reasoningSummary.findUnique).toHaveBeenCalledWith({
                where: { id: 1 }
            });
            expect(prismaService.reasoningPoint.create).toHaveBeenCalledWith({
                data: {
                    summaryId: 1,
                    category: 'Test category',
                    point: 'Test point',
                    importanceScore: 5
                }
            });
            expect(result).toEqual(mockReasoningPoint);
        });

        it('should throw error if summary not found', async () => {
            // Setup
            (prismaService.reasoningSummary.findUnique as jest.Mock).mockResolvedValue(null);

            // Execute & Verify
            await expect(repository.createReasoningPoint(999, 'Test category', 'Test point', 5)).rejects.toThrow('Reasoning summary with ID 999 not found');
        });
    });

    describe('getReasoningPoints', () => {
        it('should get reasoning points by summary ID', async () => {
            // Setup
            const reasoningPoints = [mockReasoningPoint];
            (prismaService.reasoningPoint.findMany as jest.Mock).mockResolvedValue(reasoningPoints);

            // Execute
            const result = await repository.getReasoningPoints(1);

            // Verify
            expect(prismaService.reasoningPoint.findMany).toHaveBeenCalledWith({
                where: { summaryId: 1 }
            });
            expect(result).toEqual(reasoningPoints);
        });
    });

    describe('updateReasoningSummary', () => {
        it('should update a reasoning summary', async () => {
            // Setup
            const newSummary = 'Updated summary';
            const updatedReasoningSummary = {
                ...mockReasoningSummary,
                summary: newSummary,
                lastUpdated: new Date()
            };

            (prismaService.reasoningSummary.findUnique as jest.Mock).mockResolvedValue(mockReasoningSummary);
            (prismaService.reasoningSummary.update as jest.Mock).mockResolvedValue(updatedReasoningSummary);

            // Execute
            const result = await repository.updateReasoningSummary(1, newSummary);

            // Verify
            expect(prismaService.reasoningSummary.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    summary: newSummary,
                    lastUpdated: expect.any(Date)
                }
            });
            expect(result).toEqual(updatedReasoningSummary);
        });

        it('should return null if summary not found', async () => {
            // Setup
            (prismaService.reasoningSummary.findUnique as jest.Mock).mockResolvedValue(null);

            // Execute
            const result = await repository.updateReasoningSummary(999, 'Updated summary');

            // Verify
            expect(result).toBeNull();
        });

        it('should handle Prisma not found error', async () => {
            // Setup
            // Mock direct error from Prisma update call
            (prismaService.reasoningSummary.findUnique as jest.Mock).mockResolvedValue(mockReasoningSummary);
            (prismaService.reasoningSummary.update as jest.Mock).mockImplementation(() => {
                const error: any = new Error('Record not found');
                error.code = 'P2025';
                error.name = 'PrismaClientKnownRequestError';
                error.clientVersion = 'mock';
                throw error;
            });

            // Execute
            const result = await repository.updateReasoningSummary(1, 'Updated summary');

            // Verify
            expect(result).toBeNull();
        });
    });

    describe('deleteReasoningEntry', () => {
        it('should delete a reasoning entry', async () => {
            // Setup
            (prismaService.reasoningSummary.findUnique as jest.Mock).mockResolvedValue(mockReasoningSummary);
            (prismaService.reasoningSummary.delete as jest.Mock).mockResolvedValue({});

            // Execute
            const result = await repository.deleteReasoningEntry(1);

            // Verify
            expect(prismaService.reasoningSummary.delete).toHaveBeenCalledWith({
                where: { id: 1 }
            });
            expect(result).toBe(true);
        });

        it('should return false if entry not found', async () => {
            // Setup
            (prismaService.reasoningSummary.findUnique as jest.Mock).mockResolvedValue(null);

            // Execute
            const result = await repository.deleteReasoningEntry(999);

            // Verify
            expect(result).toBe(false);
        });

        it('should handle Prisma not found error', async () => {
            // Setup
            // Mock direct error from Prisma delete call
            (prismaService.reasoningSummary.findUnique as jest.Mock).mockResolvedValue(mockReasoningSummary);
            (prismaService.reasoningSummary.delete as jest.Mock).mockImplementation(() => {
                const error: any = new Error('Record not found');
                error.code = 'P2025';
                error.name = 'PrismaClientKnownRequestError';
                error.clientVersion = 'mock';
                throw error;
            });

            // Execute
            const result = await repository.deleteReasoningEntry(1);

            // Verify
            expect(result).toBe(false);
        });
    });
});