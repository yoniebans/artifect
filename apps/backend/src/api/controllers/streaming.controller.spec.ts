// src/api/controllers/streaming.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { Observable, Subject } from 'rxjs';
import { StreamingController } from './streaming.controller';
import { WorkflowOrchestratorService } from '../../workflow/workflow-orchestrator.service';
import { SSEService } from '../services/sse.service';
import { ArtifactUpdateAIRequestDto, StreamingChunkDto } from '../dto';
import { User } from '@prisma/client';

describe('StreamingController', () => {
    let controller: StreamingController;
    let workflowOrchestrator: WorkflowOrchestratorService;
    let sseService: SSEService;
    let mockSubject: Subject<StreamingChunkDto>;
    let mockObservable: Observable<StreamingChunkDto>;
    // Create properly typed mock functions
    let mockStreamInteractArtifact: jest.Mock;
    let mockSendToStream: jest.Mock;
    let mockCompleteStream: jest.Mock;

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
        mockSubject = new Subject<StreamingChunkDto>();
        mockObservable = mockSubject.asObservable();

        // Initialize the mocks with proper Jest typing
        mockStreamInteractArtifact = jest.fn().mockResolvedValue({
            artifactContent: 'Final content',
            commentary: 'Final commentary',
        });

        mockSendToStream = jest.fn();
        mockCompleteStream = jest.fn();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [StreamingController],
            providers: [
                {
                    provide: WorkflowOrchestratorService,
                    useValue: {
                        streamInteractArtifact: mockStreamInteractArtifact,
                    },
                },
                {
                    provide: SSEService,
                    useValue: {
                        createSSEStream: jest.fn().mockReturnValue([mockObservable, mockSubject]),
                        sendToStream: mockSendToStream,
                        completeStream: mockCompleteStream,
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
                mockUser,
                'anthropic',
                'claude-3'
            );

            expect(result).toBe(mockObservable);
            expect(sseService.createSSEStream).toHaveBeenCalled();

            // Wait for the async process to complete
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockStreamInteractArtifact).toHaveBeenCalledWith(
                Number(artifactId),
                updateRequest.messages[0].content,
                expect.any(Function),
                'anthropic',
                'claude-3',
                mockUser.id
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

            // Now we can correctly use mockRejectedValueOnce
            mockStreamInteractArtifact.mockRejectedValueOnce(
                new Error('Artifact with id 999 not found')
            );

            // Call the method
            controller.streamArtifactInteraction(
                artifactId,
                updateRequest,
                mockUser
            );

            // Wait for the async process to complete
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify the interaction with the mock
            expect(mockStreamInteractArtifact).toHaveBeenCalledWith(
                Number(artifactId),
                updateRequest.messages[0].content,
                expect.any(Function),
                undefined,
                undefined,
                mockUser.id
            );

            // Verify error handling
            expect(mockSendToStream).toHaveBeenCalledWith(
                mockSubject,
                expect.objectContaining({
                    chunk: expect.stringContaining('not found'),
                    done: true
                })
            );
            expect(mockCompleteStream).toHaveBeenCalledWith(mockSubject);
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

            // Use our properly typed mock function
            mockStreamInteractArtifact.mockRejectedValueOnce(
                new Error('The selected AI provider does not support streaming')
            );

            // Call the method
            controller.streamArtifactInteraction(
                artifactId,
                updateRequest,
                mockUser
            );

            // Wait for the async process to complete
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify the interaction with the mock
            expect(mockStreamInteractArtifact).toHaveBeenCalledWith(
                Number(artifactId),
                updateRequest.messages[0].content,
                expect.any(Function),
                undefined,
                undefined,
                mockUser.id
            );

            // Verify error handling
            expect(mockSendToStream).toHaveBeenCalledWith(
                mockSubject,
                expect.objectContaining({
                    chunk: expect.stringContaining('does not support streaming'),
                    done: true
                })
            );
            expect(mockCompleteStream).toHaveBeenCalledWith(mockSubject);
        });
    });
});