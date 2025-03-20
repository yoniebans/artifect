import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ProjectRepository } from './project.repository';
import { Prisma } from '@prisma/client';

describe('ProjectRepository', () => {
    let repository: ProjectRepository;
    let prismaService: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectRepository,
                {
                    provide: PrismaService,
                    useValue: {
                        project: {
                            create: jest.fn(),
                            findUnique: jest.fn(),
                            findMany: jest.fn(),
                            findFirst: jest.fn(), // Add this missing method
                            update: jest.fn(),
                            delete: jest.fn(),
                        },
                        artifact: {
                            findMany: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();

        repository = module.get<ProjectRepository>(ProjectRepository);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
    });

    describe('create', () => {
        it('should create a project', async () => {
            const projectData = { name: 'Test Project', userId: 1 };
            const expectedProject = { id: 1, ...projectData, createdAt: new Date(), updatedAt: null };

            (prismaService.project.create as jest.Mock).mockResolvedValue(expectedProject);

            const result = await repository.create(projectData);

            expect(prismaService.project.create).toHaveBeenCalledWith({
                data: projectData,
            });
            expect(result).toEqual(expectedProject);
        });
    });

    describe('findById', () => {
        it('should find a project by id', async () => {
            const projectId = 1;
            const expectedProject = {
                id: projectId,
                name: 'Test Project',
                createdAt: new Date(),
                updatedAt: null
            };

            (prismaService.project.findUnique as jest.Mock).mockResolvedValue(expectedProject);

            const result = await repository.findById(projectId);

            expect(prismaService.project.findUnique).toHaveBeenCalledWith({
                where: { id: projectId },
            });
            expect(result).toEqual(expectedProject);
        });

        it('should return null if project not found', async () => {
            const projectId = 999;

            (prismaService.project.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await repository.findById(projectId);

            expect(prismaService.project.findUnique).toHaveBeenCalledWith({
                where: { id: projectId },
            });
            expect(result).toBeNull();
        });
    });

    describe('findAll', () => {
        it('should find all projects', async () => {
            const expectedProjects = [
                { id: 1, name: 'Project 1', createdAt: new Date(), updatedAt: null },
                { id: 2, name: 'Project 2', createdAt: new Date(), updatedAt: null },
            ];

            (prismaService.project.findMany as jest.Mock).mockResolvedValue(expectedProjects);

            const result = await repository.findAll();

            expect(prismaService.project.findMany).toHaveBeenCalled();
            expect(result).toEqual(expectedProjects);
        });
    });

    describe('update', () => {
        it('should update a project', async () => {
            const projectId = 1;
            const updateData = { name: 'Updated Project' };
            const expectedProject = {
                id: projectId,
                ...updateData,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            (prismaService.project.update as jest.Mock).mockResolvedValue(expectedProject);

            const result = await repository.update(projectId, updateData);

            expect(prismaService.project.update).toHaveBeenCalledWith({
                where: { id: projectId },
                data: updateData,
            });
            expect(result).toEqual(expectedProject);
        });

        it('should return null if project not found', async () => {
            const projectId = 999;
            const updateData = { name: 'Updated Project' };
            const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
                code: 'P2025',
                clientVersion: 'mock',
                meta: {}
            });

            (prismaService.project.update as jest.Mock).mockRejectedValue(prismaError);

            const result = await repository.update(projectId, updateData);

            expect(prismaService.project.update).toHaveBeenCalledWith({
                where: { id: projectId },
                data: updateData,
            });
            expect(result).toBeNull();
        });

        it('should throw error for other prisma errors', async () => {
            const projectId = 1;
            const updateData = { name: 'Updated Project' };
            const prismaError = new Prisma.PrismaClientKnownRequestError('Database error', {
                code: 'P2002', // Unique constraint failed
                clientVersion: 'mock',
                meta: {}
            });

            (prismaService.project.update as jest.Mock).mockRejectedValue(prismaError);

            await expect(repository.update(projectId, updateData)).rejects.toThrow();
        });
    });

    describe('delete', () => {
        it('should delete a project', async () => {
            const projectId = 1;

            (prismaService.project.delete as jest.Mock).mockResolvedValue({});

            const result = await repository.delete(projectId);

            expect(prismaService.project.delete).toHaveBeenCalledWith({
                where: { id: projectId },
            });
            expect(result).toBe(true);
        });

        it('should return false if project not found', async () => {
            const projectId = 999;
            const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
                code: 'P2025',
                clientVersion: 'mock',
                meta: {}
            });

            (prismaService.project.delete as jest.Mock).mockRejectedValue(prismaError);

            const result = await repository.delete(projectId);

            expect(prismaService.project.delete).toHaveBeenCalledWith({
                where: { id: projectId },
            });
            expect(result).toBe(false);
        });

        it('should throw error for other prisma errors', async () => {
            const projectId = 1;
            const prismaError = new Prisma.PrismaClientKnownRequestError('Database error', {
                code: 'P2010', // Query validation error
                clientVersion: 'mock',
                meta: {}
            });

            (prismaService.project.delete as jest.Mock).mockRejectedValue(prismaError);

            await expect(repository.delete(projectId)).rejects.toThrow();
        });
    });

    describe('getProjectMetadata', () => {
        it('should get project metadata with current phase', async () => {
            const projectId = 1;
            const now = new Date();
            const lifecyclePhase = { id: 1, name: 'Requirements', order: 1 };
            const artifactType = {
                id: 1,
                name: 'Vision Document',
                lifecyclePhaseId: 1,
                lifecyclePhase,
                slug: 'vision',
                syntax: 'markdown'
            };

            const mockProject = {
                id: projectId,
                name: 'Test Project',
                createdAt: now,
                updatedAt: null,
                artifacts: [
                    {
                        id: 1,
                        projectId,
                        artifactTypeId: 1,
                        stateId: 1,
                        name: 'Vision',
                        createdAt: now,
                        updatedAt: now,
                        currentVersionId: 1,
                        artifactType
                    }
                ]
            };

            (prismaService.project.findFirst as jest.Mock).mockResolvedValue(mockProject);

            const result = await repository.getProjectMetadata(projectId);

            expect(prismaService.project.findFirst).toHaveBeenCalledWith({
                where: { id: projectId },
                include: {
                    artifacts: {
                        orderBy: {
                            updatedAt: 'desc'
                        },
                        take: 1,
                        include: {
                            artifactType: {
                                include: {
                                    lifecyclePhase: true
                                }
                            }
                        }
                    }
                }
            });

            expect(result).toEqual({
                id: projectId,
                name: 'Test Project',
                currentPhaseId: 1,
                currentPhaseName: 'Requirements',
                lastUpdate: now
            });
        });

        it('should return null if project not found', async () => {
            const projectId = 999;

            (prismaService.project.findFirst as jest.Mock).mockResolvedValue(null);

            const result = await repository.getProjectMetadata(projectId);

            expect(result).toBeNull();
        });

        it('should handle project without artifacts', async () => {
            const projectId = 1;
            const now = new Date();

            const mockProject = {
                id: projectId,
                name: 'Test Project',
                createdAt: now,
                updatedAt: null,
                artifacts: []
            };

            (prismaService.project.findFirst as jest.Mock).mockResolvedValue(mockProject);

            const result = await repository.getProjectMetadata(projectId);

            expect(result).toEqual({
                id: projectId,
                name: 'Test Project',
                currentPhaseId: null,
                currentPhaseName: null,
                lastUpdate: null
            });
        });
    });

    describe('getPhaseArtifacts', () => {
        it('should get artifacts for a specific project and phase', async () => {
            const projectId = 1;
            const phaseId = 1;
            const now = new Date();

            const mockProject = {
                id: projectId,
                name: 'Test Project',
                createdAt: now,
                updatedAt: null
            };

            const mockArtifacts = [
                {
                    id: 1,
                    name: 'Vision Document',
                    artifactType: { id: 1, name: 'Vision Document' },
                    currentVersion: { content: 'Vision content' },
                    updatedAt: now
                },
                {
                    id: 2,
                    name: 'Requirements',
                    artifactType: { id: 2, name: 'Requirements Document' },
                    currentVersion: { content: 'Requirements content' },
                    updatedAt: now
                }
            ];

            (prismaService.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
            (prismaService.artifact.findMany as jest.Mock).mockResolvedValue(mockArtifacts);

            const result = await repository.getPhaseArtifacts(projectId, phaseId);

            expect(prismaService.project.findFirst).toHaveBeenCalledWith({
                where: { id: projectId }
            });

            expect(prismaService.artifact.findMany).toHaveBeenCalledWith({
                where: {
                    projectId,
                    artifactType: {
                        lifecyclePhaseId: phaseId
                    }
                },
                include: {
                    artifactType: true,
                    currentVersion: true
                },
                orderBy: {
                    updatedAt: 'desc'
                }
            });

            expect(result).toEqual([
                {
                    id: 1,
                    type: 'Vision Document',
                    content: 'Vision content'
                },
                {
                    id: 2,
                    type: 'Requirements Document',
                    content: 'Requirements content'
                }
            ]);
        });

        it('should handle artifacts without current version', async () => {
            const projectId = 1;
            const phaseId = 1;

            const mockProject = {
                id: projectId,
                name: 'Test Project'
            };

            const mockArtifacts = [
                {
                    id: 1,
                    name: 'Vision Document',
                    artifactType: { id: 1, name: 'Vision Document' },
                    currentVersion: null,
                    updatedAt: new Date()
                }
            ];

            (prismaService.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
            (prismaService.artifact.findMany as jest.Mock).mockResolvedValue(mockArtifacts);

            const result = await repository.getPhaseArtifacts(projectId, phaseId);

            expect(result).toEqual([
                {
                    id: 1,
                    type: 'Vision Document',
                    content: null
                }
            ]);
        });
    });
});