// src/api/controllers/streaming.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { StreamingController } from './streaming.controller';
import { WorkflowOrchestratorService } from '../../workflow/workflow-orchestrator.service';
import { SSEService } from '../services/sse.service';
import { ArtifactUpdateAIRequestDto, StreamingChunkDto } from '../dto';

describe('StreamingController', () => {
    let controller: StreamingController;
    let workflowOrchestrator: WorkflowOrchestratorService;
    let sseService: SSEService;
    let mockSubject: Subject<StreamingChunkDto>;
    let mockObservable: Observable<StreamingChunkDto>;

    beforeEach(async () => {
        mockSubject = new Subject<StreamingChunkDto>();
        mockObservable = mockSubject.asObservable();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [StreamingController],
            providers: [
                {
                    provide: WorkflowOrchestratorService,
                    useValue: {
                        streamInteractArtifact: jest.fn().mockResolvedValue({
                            artifactContent: 'Final content',
                            commentary: 'Final commentary',
                        }),
                    },
                },
                {
                    provide: SSEService,
                    useValue: {
                        createSSEStream: jest.fn().mockReturnValue([mockObservable, mockSubject]),
                        sendToStream: jest.fn(),
                        completeStream: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<StreamingController>(StreamingController);
        workflowOrchestrator = module.get<WorkflowOrchestratorService>(WorkflowOrchestratorService);
        sseService = module.get<SSEService>(SSEService);
    });

    afterEach(() => {
        jest.clearAllMocks();
        mockSubject.complete();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('streamArtifactInteraction', () => {
        it('should return an observable for streaming', async () => {
            const artifactId = '1';
            const updateRequest: ArtifactUpdateAIRequestDto = {
                messages: [
                    {
                        role: 'user',
                        content: 'Test message',
                    },
                ],
            };

            const result = controller.streamArtifactInteraction(
                artifactId,
                updateRequest,
                'anthropic',
                'claude-3'
            );

            expect(result).toBe(mockObservable);
            expect(sseService.createSSEStream).toHaveBeenCalled();

            // Wait for the async process to complete
            await new Promise(process.nextTick);

            expect(workflowOrchestrator.streamInteractArtifact).toHaveBeenCalledWith(
                Number(artifactId),
                updateRequest.messages[0].content,
                expect.any(Function),
                'anthropic',
                'claude-3'
            );
        });

        it('should handle artifact not found error', async () => {
            const artifactId = '999';
            const updateRequest: ArtifactUpdateAIRequestDto = {
                messages: [
                    {
                        role: 'user',
                        content: 'Test message',
                    },
                ],
            };

            jest.spyOn(workflowOrchestrator, 'streamInteractArtifact').mockRejectedValue(
                new Error('Artifact with id 999 not found')
            );

            // Need to mock implementation of Controller method to capture exception
            jest.spyOn(controller as any, 'startStreamingProcess').mockImplementation(async () => {
                try {
                    await workflowOrchestrator.streamInteractArtifact(
                        Number(artifactId),
                        updateRequest.messages[0].content,
                        jest.fn(),
                        undefined,
                        undefined
                    );
                } catch (error) {
                    expect(sseService.sendToStream).toHaveBeenCalledWith(
                        mockSubject,
                        expect.objectContaining({
                            chunk: expect.stringContaining('not found'),
                            done: true,
                        })
                    );
                    expect(sseService.completeStream).toHaveBeenCalled();
                    throw new NotFoundException(error.message);
                }
            });

            controller.streamArtifactInteraction(artifactId, updateRequest);

            // Wait for the async process to complete
            await expect(controller['startStreamingProcess'](
                Number(artifactId),
                updateRequest.messages[0].content,
                mockSubject
            )).rejects.toThrow(NotFoundException);
        });

        it('should handle streaming not supported error', async () => {
            const artifactId = '1';
            const updateRequest: ArtifactUpdateAIRequestDto = {
                messages: [
                    {
                        role: 'user',
                        content: 'Test message',
                    },
                ],
            };

            jest.spyOn(workflowOrchestrator, 'streamInteractArtifact').mockRejectedValue(
                new Error('The selected AI provider does not support streaming')
            );

            // Need to mock implementation of Controller method to capture exception
            jest.spyOn(controller as any, 'startStreamingProcess').mockImplementation(async () => {
                try {
                    await workflowOrchestrator.streamInteractArtifact(
                        Number(artifactId),
                        updateRequest.messages[0].content,
                        jest.fn(),
                        undefined,
                        undefined
                    );
                } catch (error) {
                    expect(sseService.sendToStream).toHaveBeenCalledWith(
                        mockSubject,
                        expect.objectContaining({
                            chunk: expect.stringContaining('does not support streaming'),
                            done: true,
                        })
                    );
                    expect(sseService.completeStream).toHaveBeenCalled();
                    throw new BadRequestException(error.message);
                }
            });

            controller.streamArtifactInteraction(artifactId, updateRequest);

            // Wait for the async process to complete
            await expect(controller['startStreamingProcess'](
                Number(artifactId),
                updateRequest.messages[0].content,
                mockSubject
            )).rejects.toThrow(BadRequestException);
        });
    });
});