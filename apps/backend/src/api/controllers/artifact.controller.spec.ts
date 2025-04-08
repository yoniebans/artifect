// src/api/controllers/artifact.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ArtifactController } from './artifact.controller';
import { WorkflowOrchestratorService } from '../../workflow/workflow-orchestrator.service';
import {
    ArtifactCreateDto,
    ArtifactUpdateDto,
    ArtifactUpdateAIRequestDto
} from '../dto';
import { User } from '@prisma/client';

describe('ArtifactController', () => {
    let controller: ArtifactController;
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

    const mockArtifactResponse = {
        artifact: {
            artifact_id: '1',
            artifact_type_id: '1',
            artifact_type_name: 'Vision Document',
            artifact_version_number: '1',
            artifact_version_content: 'Test content',
            name: 'Test Artifact',
            state_id: '1',
            state_name: 'In Progress',
            available_transitions: [
                {
                    state_id: '2',
                    state_name: 'Approved',
                },
            ],
            dependent_type_id: undefined,
            project_type_id: '1',
            project_type_name: 'Software Engineering',
        },
        chat_completion: {
            messages: [
                {
                    role: 'assistant',
                    content: 'Test message',
                },
            ],
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ArtifactController],
            providers: [
                {
                    provide: WorkflowOrchestratorService,
                    useValue: {
                        createArtifact: jest.fn(),
                        updateArtifact: jest.fn(),
                        getArtifactDetails: jest.fn(),
                        interactArtifact: jest.fn(),
                        transitionArtifact: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<ArtifactController>(ArtifactController);
        workflowOrchestrator = module.get<WorkflowOrchestratorService>(WorkflowOrchestratorService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('createArtifact', () => {
        it('should create a new artifact', async () => {
            const artifactCreateDto: ArtifactCreateDto = {
                project_id: '1',
                artifact_type_name: 'Vision Document',
            };

            // Use type assertion to handle differences between interfaces
            jest.spyOn(workflowOrchestrator, 'createArtifact').mockResolvedValue(mockArtifactResponse as any);

            const result = await controller.createArtifact(artifactCreateDto, mockUser, 'anthropic', 'claude-3');

            expect(result).toEqual(mockArtifactResponse);
            expect(result.artifact).toHaveProperty('project_type_id', '1');
            expect(result.artifact).toHaveProperty('project_type_name', 'Software Engineering');
            expect(workflowOrchestrator.createArtifact).toHaveBeenCalledWith(
                Number(artifactCreateDto.project_id),
                artifactCreateDto.artifact_type_name,
                'anthropic',
                'claude-3',
                mockUser.id
            );
        });

        it('should handle not found error', async () => {
            const artifactCreateDto: ArtifactCreateDto = {
                project_id: '999',
                artifact_type_name: 'Vision Document',
            };

            jest.spyOn(workflowOrchestrator, 'createArtifact').mockRejectedValue(
                new Error('Project with id 999 not found')
            );

            await expect(controller.createArtifact(artifactCreateDto, mockUser)).rejects.toThrow(NotFoundException);
        });

        it('should handle invalid artifact type error', async () => {
            const artifactCreateDto: ArtifactCreateDto = {
                project_id: '1',
                artifact_type_name: 'Invalid Type',
            };

            jest.spyOn(workflowOrchestrator, 'createArtifact').mockRejectedValue(
                new Error('Invalid artifact type: Invalid Type')
            );

            await expect(controller.createArtifact(artifactCreateDto, mockUser)).rejects.toThrow(BadRequestException);
        });

        it('should handle project type constraint error', async () => {
            const artifactCreateDto: ArtifactCreateDto = {
                project_id: '1',
                artifact_type_name: 'Market Analysis', // Not allowed in Software Engineering
            };

            jest.spyOn(workflowOrchestrator, 'createArtifact').mockRejectedValue(
                new Error('Artifact type "Market Analysis" is not allowed in this project type')
            );

            await expect(controller.createArtifact(artifactCreateDto, mockUser)).rejects.toThrow(BadRequestException);
        });
    });

    describe('updateArtifact', () => {
        it('should update an artifact', async () => {
            const artifactId = '1';
            const updateDto: ArtifactUpdateDto = {
                name: 'Updated Artifact',
                content: 'Updated content',
            };

            // Mock the basic artifact update first
            const mockUpdatedArtifact = { id: 1, name: 'Updated Artifact' };
            jest.spyOn(workflowOrchestrator, 'updateArtifact').mockResolvedValue(mockUpdatedArtifact as any);

            // Then separately mock getting the full details
            jest.spyOn(workflowOrchestrator, 'getArtifactDetails').mockResolvedValue(mockArtifactResponse as any);

            const result = await controller.updateArtifact(artifactId, updateDto, mockUser);

            expect(result).toEqual(mockArtifactResponse);
            expect(result.artifact).toHaveProperty('project_type_id', '1');
            expect(result.artifact).toHaveProperty('project_type_name', 'Software Engineering');
            expect(workflowOrchestrator.updateArtifact).toHaveBeenCalledWith(
                Number(artifactId),
                updateDto.name,
                updateDto.content,
                mockUser.id
            );
            expect(workflowOrchestrator.getArtifactDetails).toHaveBeenCalledWith(Number(artifactId), mockUser.id);
        });
    });

    describe('viewArtifact', () => {
        it('should return an artifact by ID with project type info', async () => {
            const artifactId = '1';

            // Mock the getArtifactDetails method
            jest.spyOn(workflowOrchestrator, 'getArtifactDetails').mockResolvedValue(mockArtifactResponse as any);

            const result = await controller.viewArtifact(artifactId, mockUser);

            expect(result).toEqual(mockArtifactResponse);
            expect(result.artifact).toHaveProperty('project_type_id', '1');
            expect(result.artifact).toHaveProperty('project_type_name', 'Software Engineering');
            expect(workflowOrchestrator.getArtifactDetails).toHaveBeenCalledWith(Number(artifactId), mockUser.id);
        });

        it('should handle not found error', async () => {
            const artifactId = '999';

            jest.spyOn(workflowOrchestrator, 'getArtifactDetails').mockRejectedValue(
                new Error('Artifact with id 999 not found')
            );

            await expect(controller.viewArtifact(artifactId, mockUser)).rejects.toThrow(NotFoundException);
        });
    });

    describe('interactArtifact', () => {
        it('should interact with an artifact using AI', async () => {
            const artifactId = '1';
            const updateRequest: ArtifactUpdateAIRequestDto = {
                messages: [
                    {
                        role: 'user',
                        content: 'Test message',
                    },
                ],
            };

            // Mock the interactArtifact method
            jest.spyOn(workflowOrchestrator, 'interactArtifact').mockResolvedValue(mockArtifactResponse as any);

            const result = await controller.interactArtifact(
                artifactId,
                updateRequest,
                mockUser,
                'anthropic',
                'claude-3'
            );

            expect(result).toEqual(mockArtifactResponse);
            expect(result.artifact).toHaveProperty('project_type_id', '1');
            expect(result.artifact).toHaveProperty('project_type_name', 'Software Engineering');
            expect(workflowOrchestrator.interactArtifact).toHaveBeenCalledWith(
                Number(artifactId),
                updateRequest.messages[0].content,
                'anthropic',
                'claude-3',
                mockUser.id
            );
        });
    });

    describe('updateArtifactState', () => {
        it('should update an artifact state', async () => {
            const artifactId = '1';
            const stateId = '2';

            // Mock the transitionArtifact method
            jest.spyOn(workflowOrchestrator, 'transitionArtifact').mockResolvedValue(mockArtifactResponse as any);

            const result = await controller.updateArtifactState(artifactId, stateId, mockUser);

            expect(result).toEqual(mockArtifactResponse);
            expect(result.artifact).toHaveProperty('project_type_id', '1');
            expect(result.artifact).toHaveProperty('project_type_name', 'Software Engineering');
            expect(workflowOrchestrator.transitionArtifact).toHaveBeenCalledWith(
                Number(artifactId),
                Number(stateId),
                mockUser.id
            );
        });

        it('should handle state transition error', async () => {
            const artifactId = '1';
            const stateId = '99';

            jest.spyOn(workflowOrchestrator, 'transitionArtifact').mockRejectedValue(
                new Error('Invalid state transition')
            );

            await expect(controller.updateArtifactState(artifactId, stateId, mockUser)).rejects.toThrow(BadRequestException);
        });
    });
});