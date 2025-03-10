// src/api/controllers/streaming.controller.ts

import {
    Controller,
    Param,
    Body,
    Headers,
    Sse,
    Post,
    NotFoundException,
    BadRequestException
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { WorkflowOrchestratorService } from '../../workflow/workflow-orchestrator.service';
import { ArtifactUpdateAIRequestDto, StreamingChunkDto } from '../dto';
import { SSEService } from '../services/sse.service';
import { ApiStreamingInteractArtifact } from '../decorators/streaming-swagger.decorator';

/**
 * Controller for streaming endpoints
 */
@Controller('stream')
export class StreamingController {
    constructor(
        private readonly workflowOrchestrator: WorkflowOrchestratorService,
        private readonly sseService: SSEService
    ) { }

    /**
     * Stream interaction with an artifact using AI
     * @param artifactId Artifact ID
     * @param updateRequest AI update request
     * @param aiProvider AI provider from header
     * @param aiModel AI model from header
     * @returns Observable stream of response chunks
     */
    @Post('artifact/:artifact_id/ai')
    @Sse()
    @ApiStreamingInteractArtifact()
    streamArtifactInteraction(
        @Param('artifact_id') artifactId: string,
        @Body() updateRequest: ArtifactUpdateAIRequestDto,
        @Headers('X-AI-Provider') aiProvider?: string,
        @Headers('X-AI-Model') aiModel?: string
    ): Observable<StreamingChunkDto> {
        const [observable, subject] = this.sseService.createSSEStream();

        // Start the streaming process asynchronously
        (async () => {
            try {
                const result = await this.workflowOrchestrator.streamInteractArtifact(
                    Number(artifactId),
                    updateRequest.messages[0].content,
                    // Callback for handling chunks
                    (chunk: string) => {
                        this.sseService.sendToStream(subject, { chunk });
                    },
                    aiProvider,
                    aiModel
                );

                // Send final message with complete content
                this.sseService.completeStream(subject, {
                    artifact_content: result.artifactContent,
                    commentary: result.commentary
                });
            } catch (error) {
                // Handle errors by sending error message through the stream
                if (error.message.includes('not found')) {
                    this.sseService.sendToStream(subject, {
                        chunk: `Error: ${error.message}`,
                        done: true
                    });
                    this.sseService.completeStream(subject);
                    // Note: We don't throw here anymore as the exception would be lost
                } else if (error.message.includes('does not support streaming')) {
                    this.sseService.sendToStream(subject, {
                        chunk: `Error: ${error.message}`,
                        done: true
                    });
                    this.sseService.completeStream(subject);
                    // Note: We don't throw here anymore as the exception would be lost
                } else {
                    this.sseService.sendToStream(subject, {
                        chunk: `Error: ${error.message}`,
                        done: true
                    });
                    this.sseService.completeStream(subject);
                    // Note: We don't throw here anymore as the exception would be lost
                }
            }
        })();

        return observable;
    }
}