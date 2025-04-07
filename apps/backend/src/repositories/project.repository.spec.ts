// src/repositories/project.repository.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ProjectRepository } from './project.repository';
import { CacheService } from '../services/cache/cache.service';
import { ProjectTypeRepository } from './project-type.repository';
import { Prisma } from '@prisma/client';

describe('ProjectRepository', () => {
    let repository: ProjectRepository;
    let prismaService: PrismaService;
    let cacheService: CacheService;
    let projectTypeRepository: ProjectTypeRepository;

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
                            findFirst: jest.fn(),
                            update: jest.fn(),
                            delete: jest.fn(),
                        },
                        artifact: {
                            findMany: jest.fn(),
                        },
                    },
                },
                {
                    provide: CacheService,
                    useValue: {
                        getProjectTypePhases: jest.fn(),
                    },
                },
                {
                    provide: ProjectTypeRepository,
                    useValue: {
                        getDefaultProjectType: jest.fn(),
                    },
                },
            ],
        }).compile();

        repository = module.get<ProjectRepository>(ProjectRepository);
        prismaService = module.get<PrismaService>(PrismaService);
        cacheService = module.get<CacheService>(CacheService);
        projectTypeRepository = module.get<ProjectTypeRepository>(ProjectTypeRepository);
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
    });

    describe('create', () => {
        it('should create a project with provided project type ID', async () => {
            const projectData = { name: 'Test Project', userId: 1, projectTypeId: 2 };
            const expectedProject = { 
                id: 1, 
                ...projectData, 
                createdAt: new Date(), 
                updatedAt: null,
                projectType: {
                    id: 2,
                    name: 'Software Development',
                    description: 'Software development projects',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            };

            (prismaService.project.create as jest.Mock).mockResolvedValue(expectedProject);

            const result = await repository.create(projectData);

            expect(prismaService.project.create).toHaveBeenCalledWith({
                data: projectData,
                include: {
                    projectType: true
                }
            });
            expect(result).toEqual(expectedProject);
        });

        it('should use default project type when no project type ID is provided', async () => {
            const projectData = { name: 'Test Project', userId: 1 };
            const defaultProjectType = { 
                id: 2, 
                name: 'Software Development',
                description: 'Software development projects',
                isActive: true,
                lifecyclePhases: []
            };
            
            (projectTypeRepository.getDefaultProjectType as jest.Mock).mockResolvedValue(defaultProjectType);
            
            const expectedProject = { 
                id: 1, 
                name: projectData.name, 
                userId: projectData.userId,
                projectTypeId: defaultProjectType.id,
                createdAt: new Date(), 
                updatedAt: null,
                projectType: {
                    id: 2,
                    name: 'Software Development',
                    description: 'Software development projects',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            };

            (prismaService.project.create as jest.Mock).mockResolvedValue(expectedProject);

            const result = await repository.create(projectData);

            expect(projectTypeRepository.getDefaultProjectType).toHaveBeenCalled();
            expect(prismaService.project.create).toHaveBeenCalledWith({
                data: {
                    name: projectData.name,
                    userId: projectData.userId,
                    projectTypeId: defaultProjectType.id
                },
                include: {
                    projectType: true
                }
            });
            expect(result).toEqual(expectedProject);
        });

        it('should throw error when default project type cannot be found', async () => {
            const projectData = { name: 'Test Project', userId: 1 };
            
            (projectTypeRepository.getDefaultProjectType as jest.Mock).mockRejectedValue(
                new Error('No project types found')
            );

            await expect(repository.create(projectData)).rejects.toThrow(
                'Failed to get default project type: No project types found'
            );
        });
    });

    describe('findById', () => {
        it('should find a project by id with project type', async () => {
            const projectId = 1;
            const expectedProject = {
                id: projectId,
                name: 'Test Project',
                userId: 1,
                projectTypeId: 2,
                createdAt: new Date(),
                updatedAt: null,
                projectType: {
                    id: 2,
                    name: 'Software Development',
                    description: 'Software development projects',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            };

            (prismaService.project.findUnique as jest.Mock).mockResolvedValue(expectedProject);

            const result = await repository.findById(projectId);

            expect(prismaService.project.findUnique).toHaveBeenCalledWith({
                where: { id: projectId },
                include: {
                    projectType: true
                }
            });
            expect(result).toEqual(expectedProject);
        });

        it('should return null if project not found', async () => {
            const projectId = 999;

            (prismaService.project.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await repository.findById(projectId);

            expect(prismaService.project.findUnique).toHaveBeenCalledWith({
                where: { id: projectId },
                include: {
                    projectType: true
                }
            });
            expect(result).toBeNull();
        });
    });

    describe('update', () => {
        it('should update a project with project type ID', async () => {
            const projectId = 1;
            const updateData = { 
                name: 'Updated Project',
                projectTypeId: 3
            };
            const expectedProject = {
                id: projectId,
                name: updateData.name,
                userId: 1,
                projectTypeId: updateData.projectTypeId,
                createdAt: new Date(),
                updatedAt: new Date(),
                projectType: {
                    id: 3,
                    name: 'Product Development',
                    description: 'Product development projects',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            };

            (prismaService.project.update as jest.Mock).mockResolvedValue(expectedProject);

            const result = await repository.update(projectId, updateData);

            expect(prismaService.project.update).toHaveBeenCalledWith({
                where: { id: projectId },
                data: updateData,
                include: {
                    projectType: true
                }
            });
            expect(result).toEqual(expectedProject);
        });

        it('should check user ownership when userId is provided', async () => {
            const projectId = 1;
            const userId = 1;
            const updateData = { name: 'Updated Project' };
            
            // First, it will check for project ownership
            const existingProject = {
                id: projectId,
                name: 'Original Project',
                userId: userId,
                projectTypeId: 2,
                createdAt: new Date(),
                updatedAt: null,
                projectType: { id: 2, name: 'Software Development' }
            };
            
            (prismaService.project.findUnique as jest.Mock).mockResolvedValue(existingProject);
            
            // Then it will update the project
            const updatedProject = {
                ...existingProject,
                name: updateData.name,
                updatedAt: new Date()
            };
            
            (prismaService.project.update as jest.Mock).mockResolvedValue(updatedProject);

            const result = await repository.update(projectId, updateData, userId);

            expect(prismaService.project.findUnique).toHaveBeenCalledWith({
                where: { id: projectId },
                include: {
                    projectType: true
                }
            });
            expect(prismaService.project.update).toHaveBeenCalledWith({
                where: { id: projectId },
                data: updateData,
                include: {
                    projectType: true
                }
            });
            expect(result).toEqual(updatedProject);
        });

        it('should throw ForbiddenException when user does not own the project', async () => {
            const projectId = 1;
            const userId = 2; // Different from project owner
            const updateData = { name: 'Updated Project' };
            
            // Project owned by user 1, not user 2
            const existingProject = {
                id: projectId,
                name: 'Original Project',
                userId: 1,
                projectTypeId: 2,
                createdAt: new Date(),
                updatedAt: null,
                projectType: { id: 2, name: 'Software Development' }
            };
            
            (prismaService.project.findUnique as jest.Mock).mockResolvedValue(existingProject);
            
            await expect(repository.update(projectId, updateData, userId)).rejects.toThrow(
                'You do not have permission to update this project'
            );
        });
    });

    describe('getPhaseArtifacts', () => {
        it('should get artifacts for a specific project and phase if phase is valid for project type', async () => {
            const projectId = 1;
            const phaseId = 1;
            
            // Mock project info
            const project = {
                id: projectId,
                name: 'Test Project',
                userId: 1,
                projectTypeId: 2,
                createdAt: new Date(),
                updatedAt: null
            };
            
            (prismaService.project.findFirst as jest.Mock).mockResolvedValue(project);
            
            // Mock phase validation - phase is valid for this project type
            (cacheService.getProjectTypePhases as jest.Mock).mockResolvedValue([1, 2]);
            
            // Mock artifacts query result
            const mockArtifacts = [
                {
                    id: 1,
                    name: 'Vision Document',
                    artifactType: { id: 1, name: 'Vision Document' },
                    currentVersion: { content: 'Vision content' },
                    updatedAt: new Date()
                },
                {
                    id: 2,
                    name: 'Requirements',
                    artifactType: { id: 2, name: 'Requirements Document' },
                    currentVersion: { content: 'Requirements content' },
                    updatedAt: new Date()
                }
            ];

            (prismaService.artifact.findMany as jest.Mock).mockResolvedValue(mockArtifacts);

            const result = await repository.getPhaseArtifacts(projectId, phaseId);

            expect(prismaService.project.findFirst).toHaveBeenCalledWith({
                where: { id: projectId }
            });
            expect(cacheService.getProjectTypePhases).toHaveBeenCalledWith(2);
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

        it('should return empty array if phase is not valid for project type', async () => {
            const projectId = 1;
            const phaseId = 3;
            
            // Mock project info
            const project = {
                id: projectId,
                name: 'Test Project',
                userId: 1,
                projectTypeId: 2,
                createdAt: new Date(),
                updatedAt: null
            };
            
            (prismaService.project.findFirst as jest.Mock).mockResolvedValue(project);
            
            // Mock phase validation - phase is NOT valid for this project type
            (cacheService.getProjectTypePhases as jest.Mock).mockResolvedValue([1, 2]);
            
            const result = await repository.getPhaseArtifacts(projectId, phaseId);

            expect(prismaService.project.findFirst).toHaveBeenCalledWith({
                where: { id: projectId }
            });
            expect(cacheService.getProjectTypePhases).toHaveBeenCalledWith(2);
            expect(prismaService.artifact.findMany).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });
    });

    describe('findByProjectType', () => {
        it('should find projects by project type ID', async () => {
            const projectTypeId = 2;
            
            const mockProjects = [
                {
                    id: 1,
                    name: 'Project 1',
                    userId: 1,
                    projectTypeId: 2,
                    createdAt: new Date(),
                    updatedAt: null,
                    projectType: {
                        id: 2,
                        name: 'Software Development',
                        description: 'Software development projects',
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                },
                {
                    id: 3,
                    name: 'Project 3',
                    userId: 2,
                    projectTypeId: 2,
                    createdAt: new Date(),
                    updatedAt: null,
                    projectType: {
                        id: 2,
                        name: 'Software Development',
                        description: 'Software development projects',
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                }
            ];

            (prismaService.project.findMany as jest.Mock).mockResolvedValue(mockProjects);

            const result = await repository.findByProjectType(projectTypeId);

            expect(result).toEqual(mockProjects);
            expect(prismaService.project.findMany).toHaveBeenCalledWith({
                where: { projectTypeId },
                include: {
                    projectType: true
                }
            });
        });
    });

    describe('findByUserIdAndProjectType', () => {
        it('should find projects by user ID and project type ID', async () => {
            const userId = 1;
            const projectTypeId = 2;
            
            const mockProjects = [
                {
                    id: 1,
                    name: 'Project 1',
                    userId: 1,
                    projectTypeId: 2,
                    createdAt: new Date(),
                    updatedAt: null,
                    projectType: {
                        id: 2,
                        name: 'Software Development',
                        description: 'Software development projects',
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                }
            ];

            (prismaService.project.findMany as jest.Mock).mockResolvedValue(mockProjects);

            const result = await repository.findByUserIdAndProjectType(userId, projectTypeId);

            expect(result).toEqual(mockProjects);
            expect(prismaService.project.findMany).toHaveBeenCalledWith({
                where: {
                    userId,
                    projectTypeId
                },
                include: {
                    projectType: true
                }
            });
        });
    });
});