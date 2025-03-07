// src/api/controllers/project.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { WorkflowOrchestratorService } from '../../workflow/workflow-orchestrator.service';
import { ProjectCreateDto, ProjectSummaryDto, ProjectDto } from '../dto';

describe('ProjectController', () => {
    let controller: ProjectController;
    let workflowOrchestrator: WorkflowOrchestratorService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProjectController],
            providers: [
                {
                    provide: WorkflowOrchestratorService,
                    useValue: {
                        createProject: jest.fn(),
                        listProjects: jest.fn(),
                        viewProject: jest.fn(),
                    },
                },
            ],
        }).compile();

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
            const expectedProject: ProjectSummaryDto = {
                project_id: '1',
                name: 'Test Project',
                created_at: new Date(),
                updated_at: null,
            };

            jest.spyOn(workflowOrchestrator, 'createProject').mockResolvedValue(expectedProject);

            const result = await controller.createProject(projectCreateDto);

            expect(result).toEqual(expectedProject);
            expect(workflowOrchestrator.createProject).toHaveBeenCalledWith(projectCreateDto.name);
        });
    });

    describe('listProjects', () => {
        it('should return a list of projects', async () => {
            const expectedProjects: ProjectSummaryDto[] = [
                {
                    project_id: '1',
                    name: 'Project 1',
                    created_at: new Date(),
                    updated_at: null,
                },
                {
                    project_id: '2',
                    name: 'Project 2',
                    created_at: new Date(),
                    updated_at: null,
                },
            ];

            jest.spyOn(workflowOrchestrator, 'listProjects').mockResolvedValue(expectedProjects);

            const result = await controller.listProjects();

            expect(result).toEqual(expectedProjects);
            expect(workflowOrchestrator.listProjects).toHaveBeenCalled();
        });
    });

    describe('viewProject', () => {
        it('should return a project by ID', async () => {
            const projectId = '1';
            const mockProjectData = {
                project_id: projectId,
                name: 'Test Project',
                created_at: new Date(),
                updated_at: null,
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
                            dependent_type_id: null,
                            phase_id: '1',
                            order: '1',
                        },
                    ],
                },
            };

            jest.spyOn(workflowOrchestrator, 'viewProject').mockResolvedValue(mockProjectData);

            const result = await controller.viewProject(projectId);

            expect(result).toHaveProperty('project_id', projectId);
            expect(result).toHaveProperty('phases');
            expect(workflowOrchestrator.viewProject).toHaveBeenCalledWith(Number(projectId));
        });

        it('should handle not found error', async () => {
            const projectId = '999';

            jest.spyOn(workflowOrchestrator, 'viewProject').mockRejectedValue(
                new Error('Project with id 999 not found')
            );

            await expect(controller.viewProject(projectId)).rejects.toThrow(NotFoundException);
            expect(workflowOrchestrator.viewProject).toHaveBeenCalledWith(Number(projectId));
        });
    });
});