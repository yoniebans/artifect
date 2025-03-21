// src/api/controllers/project.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { WorkflowOrchestratorService } from '../../workflow/workflow-orchestrator.service';
import { ProjectCreateDto } from '../dto';
import { User } from '@prisma/client';
import { AuthService } from '../../auth/auth.service';

describe('ProjectController', () => {
    let controller: ProjectController;
    let workflowOrchestrator: WorkflowOrchestratorService;

    // Mock user for testing
    const mockUser: User = {
        id: 1,
        clerkId: 'test_clerk_id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProjectController],
            providers: [
                {
                    provide: WorkflowOrchestratorService,
                    useValue: {
                        createProject: jest.fn(),
                        listProjects: jest.fn(),
                        listProjectsByUser: jest.fn(),
                        viewProject: jest.fn(),
                    },
                },
                {
                    provide: AuthService,
                    useValue: {
                        validateToken: jest.fn(),
                        isAdmin: jest.fn().mockResolvedValue(false),
                    },
                },
            ],
        })
            .overrideGuard('AdminGuard')
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ProjectController>(ProjectController);
        workflowOrchestrator = module.get<WorkflowOrchestratorService>(WorkflowOrchestratorService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('createProject', () => {
        it('should create a new project', async () => {
            const projectCreateDto: ProjectCreateDto = { name: 'Test Project' };
            const expectedProject = {
                project_id: '1',
                name: 'Test Project',
                created_at: new Date(),
                updated_at: undefined,
            };

            // Use type assertion for mock implementation
            jest.spyOn(workflowOrchestrator, 'createProject').mockResolvedValue(expectedProject as any);

            const result = await controller.createProject(projectCreateDto, mockUser);

            expect(result).toEqual(expectedProject);
            expect(workflowOrchestrator.createProject).toHaveBeenCalledWith(
                projectCreateDto.name,
                mockUser.id
            );
        });
    });

    describe('listProjects', () => {
        it('should return a list of projects', async () => {
            const expectedProjects = [
                {
                    project_id: '1',
                    name: 'Project 1',
                    created_at: new Date(),
                    updated_at: undefined,
                },
                {
                    project_id: '2',
                    name: 'Project 2',
                    created_at: new Date(),
                    updated_at: undefined,
                },
            ];

            // Use type assertion for mock implementation
            jest.spyOn(workflowOrchestrator, 'listProjectsByUser').mockResolvedValue(expectedProjects as any);

            const result = await controller.listProjects(mockUser);

            expect(result).toEqual(expectedProjects);
            expect(workflowOrchestrator.listProjectsByUser).toHaveBeenCalledWith(mockUser.id);
        });
    });

    describe('viewProject', () => {
        it('should return a project by ID', async () => {
            const projectId = '1';
            const mockProjectData = {
                project_id: projectId,
                name: 'Test Project',
                created_at: new Date(),
                updated_at: undefined,
                artifacts: {
                    'Requirements': [
                        {
                            id: '1',
                            name: 'Test Artifact',
                            type: 'Vision Document',
                            type_id: '1',
                            content: 'Test content',
                            version_number: '1',
                            state_id: '1',
                            state_name: 'In Progress',
                            available_transitions: [
                                {
                                    state_id: '2',
                                    state_name: 'Approved',
                                },
                            ],
                            dependent_type_id: undefined,
                            phase_id: '1',
                            order: '1',
                        },
                    ],
                },
            };

            // Use type assertion for mock implementation
            jest.spyOn(workflowOrchestrator, 'viewProject').mockResolvedValue(mockProjectData as any);

            const result = await controller.viewProject(projectId, mockUser);

            expect(result).toHaveProperty('project_id', projectId);
            expect(result).toHaveProperty('phases');
            expect(workflowOrchestrator.viewProject).toHaveBeenCalledWith(Number(projectId), mockUser.id);
        });

        it('should handle not found error', async () => {
            const projectId = '999';

            jest.spyOn(workflowOrchestrator, 'viewProject').mockRejectedValue(
                new Error('Project with id 999 not found')
            );

            await expect(controller.viewProject(projectId, mockUser)).rejects.toThrow(NotFoundException);
            expect(workflowOrchestrator.viewProject).toHaveBeenCalledWith(Number(projectId), mockUser.id);
        });
    });
});