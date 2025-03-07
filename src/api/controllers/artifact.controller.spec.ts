// src/api/controllers/artifact.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ArtifactController } from './artifact.controller';
import { WorkflowOrchestratorService } from '../../workflow/workflow-orchestrator.service';
import {
    ArtifactCreateDto,
    ArtifactUpdateDto,
    ArtifactUpdateAIRequestDto,
    ArtifactEditorResponseDto
} from '../dto';

describe('ArtifactController', () => {
    let controller: ArtifactController;
    let workflowOrchestrator: WorkflowOrchestratorService;

    const mockArtifactResponse: ArtifactEditorResponseDto = {
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
            dependent_type_id: null,
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

            jest.spyOn(workflowOrchestrator, 'createArtifact').mockResolvedValue(mockArtifactResponse);

            const result = await controller.createArtifact(artifactCreateDto, 'anthropic', 'claude-3');

            expect(result).toEqual(mockArtifactResponse);
            expect(workflowOrchestrator.createArtifact).toHaveBeenCalledWith(
                Number(artifactCreateDto.project_id),
                artifactCreateDto.artifact_type_name,
                'anthropic',
                'claude-3'
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

            await expect(controller.createArtifact(artifactCreateDto)).rejects.toThrow(NotFoundException);
        });

        it('should handle bad request error', async () => {
            const artifactCreateDto: ArtifactCreateDto = {
                project_id: '1',
                artifact_type_name: 'Invalid Type',
            };

            jest.spyOn(workflowOrchestrator, 'createArtifact').mockRejectedValue(
                new Error('Invalid artifact type: Invalid Type')
            );

            await expect(controller.createArtifact(artifactCreateDto)).rejects.toThrow(BadRequestException);
        });
    });

    describe('updateArtifact', () => {
        it('should update an artifact', async () => {
            const artifactId = '1';
            const updateDto: ArtifactUpdateDto = {
                name: 'Updated Artifact',
                content: 'Updated content',
            };

            jest.spyOn(workflowOrchestrator, 'updateArtifact').mockResolvedValue(mockArtifactResponse.artifact);
            jest.spyOn(workflowOrchestrator, 'getArtifactDetails').mockResolvedValue(mockArtifactResponse);

            const result = await controller.updateArtifact(artifactId, updateDto);

            expect(result).toEqual(mockArtifactResponse);
            expect(workflowOrchestrator.updateArtifact).toHaveBeenCalledWith(
                Number(artifactId),
                updateDto.name,
                updateDto.content
            );
            expect(workflowOrchestrator.getArtifactDetails).toHaveBeenCalledWith(Number(artifactId));
        });
    });

    describe('viewArtifact', () => {
        it('should return an artifact by ID', async () => {
            const artifactId = '1';

            jest.spyOn(workflowOrchestrator, 'getArtifactDetails').mockResolvedValue(mockArtifactResponse);

            const result = await controller.viewArtifact(artifactId);

            expect(result).toEqual(mockArtifactResponse);
            expect(workflowOrchestrator.getArtifactDetails).toHaveBeenCalledWith(Number(artifactId));
        });

        it('should handle not found error', async () => {
            const artifactId = '999';

            jest.spyOn(workflowOrchestrator, 'getArtifactDetails').mockRejectedValue(
                new Error('Artifact with id 999 not found')
            );

            await expect(controller.viewArtifact(artifactId)).rejects.toThrow(NotFoundException);
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

            jest.spyOn(workflowOrchestrator, 'interactArtifact').mockResolvedValue(mockArtifactResponse);

            const result = await controller.interactArtifact(
                artifactId,
                updateRequest,
                'anthropic',
                'claude-3'
            );

            expect(result).toEqual(mockArtifactResponse);
            expect(workflowOrchestrator.interactArtifact).toHaveBeenCalledWith(
                Number(artifactId),
                updateRequest.messages[0].content,
                'anthropic',
                'claude-3'
            );
        });
    });

    describe('updateArtifactState', () => {
        it('should update an artifact state', async () => {
            const artifactId = '1';
            const stateId = '2';

            jest.spyOn(workflowOrchestrator, 'transitionArtifact').mockResolvedValue(mockArtifactResponse);

            const result = await controller.updateArtifactState(artifactId, stateId);

            expect(result).toEqual(mockArtifactResponse);
            expect(workflowOrchestrator.transitionArtifact).toHaveBeenCalledWith(
                Number(artifactId),
                Number(stateId)
            );
        });

        it('should handle state transition error', async () => {
            const artifactId = '1';
            const stateId = '99';

            jest.spyOn(workflowOrchestrator, 'transitionArtifact').mockRejectedValue(
                new Error('Invalid state transition')
            );

            await expect(controller.updateArtifactState(artifactId, stateId)).rejects.toThrow(BadRequestException);
        });
    });
});