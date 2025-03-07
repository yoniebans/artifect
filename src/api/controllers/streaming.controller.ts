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
        this.startStreamingProcess(
            Number(artifactId),
            updateRequest.messages[0].content,
            subject,
            aiProvider,
            aiModel
        );

        return observable;
    }

    /**
     * Process the streaming request asynchronously
     * @param artifactId Artifact ID
     * @param userMessage User message
     * @param subject Subject to send streaming updates to
     * @param providerId Optional AI provider ID
     * @param model Optional AI model
     */
    private async startStreamingProcess(
        artifactId: number,
        userMessage: string,
        subject: any,
        providerId?: string,
        model?: string
    ): Promise<void> {
        try {
            await this.workflowOrchestrator.streamInteractArtifact(
                artifactId,
                userMessage,
                // Callback for handling chunks
                (chunk: string) => {
                    this.sseService.sendToStream(subject, { chunk });
                },
                providerId,
                model
            ).then(result => {
                // Send final message with complete content
                this.sseService.completeStream(subject, {
                    artifact_content: result.artifactContent,
                    commentary: result.commentary
                });
            });
        } catch (error) {
            // Handle errors
            if (error.message.includes('not found')) {
                this.sseService.sendToStream(subject, {
                    chunk: `Error: ${error.message}`,
                    done: true
                });
                this.sseService.completeStream(subject);
                throw new NotFoundException(error.message);
            } else if (error.message.includes('does not support streaming')) {
                this.sseService.sendToStream(subject, {
                    chunk: `Error: ${error.message}`,
                    done: true
                });
                this.sseService.completeStream(subject);
                throw new BadRequestException(error.message);
            } else {
                this.sseService.sendToStream(subject, {
                    chunk: `Error: ${error.message}`,
                    done: true
                });
                this.sseService.completeStream(subject);
                throw new BadRequestException(error.message);
            }
        }
    }
}