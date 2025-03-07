// src/api/decorators/streaming-swagger.decorator.ts

import { applyDecorators } from '@nestjs/common';
import {
    ApiOperation,
    ApiParam,
    ApiBody,
    ApiHeader,
    ApiTags,
    ApiResponse,
    ApiProduces
} from '@nestjs/swagger';
import { ArtifactUpdateAIRequestDto } from '../dto';

/**
 * Swagger decorator for the streaming artifact interaction endpoint
 */
export const ApiStreamingInteractArtifact = () => {
    return applyDecorators(
        ApiTags('artifacts'),
        ApiOperation({
            summary: 'Stream interaction with an artifact using AI',
            description: 'This endpoint uses Server-Sent Events (SSE) to stream the AI response in real-time'
        }),
        ApiParam({
            name: 'artifact_id',
            description: 'Artifact ID',
            type: 'string'
        }),
        ApiBody({ type: ArtifactUpdateAIRequestDto }),
        ApiHeader({
            name: 'X-AI-Provider',
            description: 'AI provider to use (e.g., "anthropic", "openai")',
            required: false
        }),
        ApiHeader({
            name: 'X-AI-Model',
            description: 'AI model to use (e.g., "claude-3-opus", "gpt-4")',
            required: false
        }),
        ApiProduces('text/event-stream'),
        ApiResponse({
            status: 200,
            description: 'Server-Sent Events stream of AI response chunks',
            schema: {
                type: 'object',
                properties: {
                    chunk: {
                        type: 'string',
                        description: 'A chunk of the AI response'
                    },
                    done: {
                        type: 'boolean',
                        description: 'Indicates if this is the final chunk'
                    },
                    artifact_content: {
                        type: 'string',
                        description: 'Full artifact content (only in final chunk)'
                    },
                    commentary: {
                        type: 'string',
                        description: 'Full commentary content (only in final chunk)'
                    }
                }
            }
        }),
        ApiResponse({
            status: 404,
            description: 'Artifact not found'
        }),
        ApiResponse({
            status: 400,
            description: 'Invalid request or AI provider does not support streaming'
        })
    );
};