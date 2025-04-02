// apps/backend/src/api/controllers/streaming.controller.ts

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
import { CurrentUser } from '../../auth/decorators/user.decorator';
import { User } from '@prisma/client';

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
     * @param user Current authenticated user
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
        @CurrentUser() user: User,
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
                        const chunkDto = new StreamingChunkDto();
                        chunkDto.chunk = chunk;
                        this.sseService.sendToStream(subject, chunkDto);
                    },
                    aiProvider,
                    aiModel,
                    user.id // Pass the user ID
                );

                // Send final message with complete content
                const finalChunkDto = new StreamingChunkDto();
                finalChunkDto.chunk = '';
                finalChunkDto.done = true;
                finalChunkDto.artifact_content = result.artifactContent;
                finalChunkDto.commentary = result.commentary;

                this.sseService.completeStream(subject, finalChunkDto);
            } catch (error) {
                // Handle errors by sending error message through the stream
                const errorChunkDto = new StreamingChunkDto();
                errorChunkDto.chunk = `Error: ${error.message}`;
                errorChunkDto.done = true;

                this.sseService.sendToStream(subject, errorChunkDto);
                this.sseService.completeStream(subject);
            }
        })();

        return observable;
    }
}