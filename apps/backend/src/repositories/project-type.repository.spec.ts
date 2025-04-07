// src/repositories/project-type.repository.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ProjectTypeRepository } from './project-type.repository';
import { ProjectTypeWithPhases } from './interfaces/project-type.repository.interface';

describe('ProjectTypeRepository', () => {
    let repository: ProjectTypeRepository;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectTypeRepository,
                {
                    provide: PrismaService,
                    useValue: {
                        projectType: {
                            findUnique: jest.fn(),
                            findMany: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();

        repository = module.get<ProjectTypeRepository>(ProjectTypeRepository);
        prisma = module.get<PrismaService>(PrismaService);
    });

    describe('findById', () => {
        it('should return a project type with phases when found', async () => {
            const mockProjectType: ProjectTypeWithPhases = {
                id: 1,
                name: 'Software Development',
                description: 'Standard software development',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                lifecyclePhases: [
                    {
                        id: 1,
                        name: 'Requirements',
                        order: 1,
                        projectTypeId: 1
                    },
                    {
                        id: 2,
                        name: 'Design',
                        order: 2,
                        projectTypeId: 1
                    }
                ]
            };

            jest.spyOn(prisma.projectType, 'findUnique').mockResolvedValue(mockProjectType);

            const result = await repository.findById(1);
            expect(result).toEqual(mockProjectType);
            expect(prisma.projectType.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
                include: {
                    lifecyclePhases: {
                        orderBy: {
                            order: 'asc'
                        }
                    }
                }
            });
        });

        it('should return null when project type not found', async () => {
            jest.spyOn(prisma.projectType, 'findUnique').mockResolvedValue(null);

            const result = await repository.findById(999);
            expect(result).toBeNull();
        });
    });

    describe('findAll', () => {
        it('should return all active project types with phases', async () => {
            const mockProjectTypes: ProjectTypeWithPhases[] = [
                {
                    id: 1,
                    name: 'Software Development',
                    description: 'Standard software development',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    lifecyclePhases: [
                        {
                            id: 1,
                            name: 'Requirements',
                            order: 1,
                            projectTypeId: 1
                        },
                        {
                            id: 2,
                            name: 'Design',
                            order: 2,
                            projectTypeId: 1
                        }
                    ]
                },
                {
                    id: 2,
                    name: 'Product Design',
                    description: 'Product design process',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    lifecyclePhases: [
                        {
                            id: 3,
                            name: 'Research',
                            order: 1,
                            projectTypeId: 2
                        },
                        {
                            id: 4,
                            name: 'Prototyping',
                            order: 2,
                            projectTypeId: 2
                        }
                    ]
                }
            ];

            jest.spyOn(prisma.projectType, 'findMany').mockResolvedValue(mockProjectTypes);

            const result = await repository.findAll();
            expect(result).toEqual(mockProjectTypes);
            expect(prisma.projectType.findMany).toHaveBeenCalledWith({
                include: {
                    lifecyclePhases: {
                        orderBy: {
                            order: 'asc'
                        }
                    }
                },
                where: {
                    isActive: true
                }
            });
        });
    });

    describe('getDefaultProjectType', () => {
        it('should return the first project type when available', async () => {
            const mockProjectTypes: ProjectTypeWithPhases[] = [
                {
                    id: 1,
                    name: 'Software Development',
                    description: 'Standard software development',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    lifecyclePhases: [
                        {
                            id: 1,
                            name: 'Requirements',
                            order: 1,
                            projectTypeId: 1
                        }
                    ]
                }
            ];

            jest.spyOn(repository, 'findAll').mockResolvedValue(mockProjectTypes);

            const result = await repository.getDefaultProjectType();
            expect(result).toEqual(mockProjectTypes[0]);
        });

        it('should throw an error when no project types are found', async () => {
            jest.spyOn(repository, 'findAll').mockResolvedValue([]);

            await expect(repository.getDefaultProjectType()).rejects.toThrow(
                'No project types found. Please ensure database is properly seeded.'
            );
        });
    });

    describe('getLifecyclePhases', () => {
        it('should return phases for a project type', async () => {
            const phases = [
                {
                    id: 1,
                    name: 'Requirements',
                    order: 1,
                    projectTypeId: 1
                },
                {
                    id: 2,
                    name: 'Design',
                    order: 2,
                    projectTypeId: 1
                }
            ];

            const mockProjectType = {
                id: 1,
                name: 'Software Development',
                description: 'Standard software development',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                lifecyclePhases: phases
            };

            jest.spyOn(prisma.projectType, 'findUnique').mockResolvedValue(mockProjectType);

            const result = await repository.getLifecyclePhases(1);
            expect(result).toEqual(phases);
        });

        it('should return empty array when project type not found', async () => {
            jest.spyOn(prisma.projectType, 'findUnique').mockResolvedValue(null);

            const result = await repository.getLifecyclePhases(999);
            expect(result).toEqual([]);
        });
    });
});