// src/api/decorators/swagger.decorators.ts

import { applyDecorators } from '@nestjs/common';
import {
    ApiOperation,
    ApiResponse,
    ApiBody,
    ApiParam,
    ApiHeader,
    ApiTags,
    ApiOkResponse,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiBadRequestResponse
} from '@nestjs/swagger';
import {
    ProjectCreateDto,
    ProjectSummaryDto,
    ProjectDto,
    ArtifactCreateDto,
    ArtifactDetailDto,
    ArtifactUpdateDto,
    ArtifactUpdateAIRequestDto,
    ArtifactEditorResponseDto,
    AIProviderDto
} from '../dto';

// Health Controller Decorators
export const ApiHealthCheck = () => {
    return applyDecorators(
        ApiTags('health'),
        ApiOperation({ summary: 'Get application health status' }),
        ApiOkResponse({
            description: 'Application is healthy',
            schema: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', example: '2025-03-07T12:00:00.000Z' }
                }
            }
        })
    );
};

// Project Controller Decorators
export const ApiCreateProject = () => {
    return applyDecorators(
        ApiTags('projects'),
        ApiOperation({ summary: 'Create a new project' }),
        ApiBody({ type: ProjectCreateDto }),
        ApiCreatedResponse({
            description: 'Project successfully created',
            type: ProjectSummaryDto
        }),
        ApiBadRequestResponse({ description: 'Invalid input data' })
    );
};

export const ApiListProjects = () => {
    return applyDecorators(
        ApiTags('projects'),
        ApiOperation({ summary: 'List all projects' }),
        ApiOkResponse({
            description: 'List of projects',
            type: [ProjectSummaryDto]
        })
    );
};

export const ApiViewProject = () => {
    return applyDecorators(
        ApiTags('projects'),
        ApiOperation({ summary: 'Get detailed project information' }),
        ApiParam({
            name: 'project_id',
            description: 'Project ID',
            type: 'string'
        }),
        ApiOkResponse({
            description: 'Project details',
            type: ProjectDto
        }),
        ApiNotFoundResponse({ description: 'Project not found' })
    );
};

// Artifact Controller Decorators
export const ApiCreateArtifact = () => {
    return applyDecorators(
        ApiTags('artifacts'),
        ApiOperation({ summary: 'Create a new artifact' }),
        ApiBody({ type: ArtifactCreateDto }),
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
        ApiCreatedResponse({
            description: 'Artifact successfully created',
            type: ArtifactEditorResponseDto
        }),
        ApiBadRequestResponse({ description: 'Invalid input data' }),
        ApiNotFoundResponse({ description: 'Project not found' })
    );
};

export const ApiUpdateArtifact = () => {
    return applyDecorators(
        ApiTags('artifacts'),
        ApiOperation({ summary: 'Update an artifact' }),
        ApiParam({
            name: 'artifact_id',
            description: 'Artifact ID',
            type: 'string'
        }),
        ApiBody({ type: ArtifactUpdateDto }),
        ApiOkResponse({
            description: 'Artifact successfully updated',
            type: ArtifactEditorResponseDto
        }),
        ApiNotFoundResponse({ description: 'Artifact not found' }),
        ApiBadRequestResponse({ description: 'Invalid input data' })
    );
};

export const ApiViewArtifact = () => {
    return applyDecorators(
        ApiTags('artifacts'),
        ApiOperation({ summary: 'Get artifact details' }),
        ApiParam({
            name: 'artifact_id',
            description: 'Artifact ID',
            type: 'string'
        }),
        ApiOkResponse({
            description: 'Artifact details',
            type: ArtifactEditorResponseDto
        }),
        ApiNotFoundResponse({ description: 'Artifact not found' })
    );
};

export const ApiInteractArtifact = () => {
    return applyDecorators(
        ApiTags('artifacts'),
        ApiOperation({ summary: 'Interact with an artifact using AI' }),
        ApiParam({
            name: 'artifact_id',
            description: 'Artifact ID',
            type: 'string'
        }),
        ApiBody({ type: ArtifactUpdateAIRequestDto }),
        ApiHeader({
            name: 'X-AI-Provider',
            description: 'AI provider to use (e.g., "anthropic", "anthropic-function-calling", "openai", "openai-function-calling")',
            required: false
        }),
        ApiHeader({
            name: 'X-AI-Model',
            description: 'AI model to use (e.g., "claude-3-opus", "gpt-4")',
            required: false
        }),
        ApiOkResponse({
            description: 'Artifact interaction successful',
            type: ArtifactEditorResponseDto
        }),
        ApiNotFoundResponse({ description: 'Artifact not found' }),
        ApiBadRequestResponse({ description: 'Invalid input data' })
    );
};

export const ApiUpdateArtifactState = () => {
    return applyDecorators(
        ApiTags('artifacts'),
        ApiOperation({ summary: 'Update artifact state' }),
        ApiParam({
            name: 'artifact_id',
            description: 'Artifact ID',
            type: 'string'
        }),
        ApiParam({
            name: 'state_id',
            description: 'New state ID',
            type: 'string'
        }),
        ApiOkResponse({
            description: 'Artifact state successfully updated',
            type: ArtifactEditorResponseDto
        }),
        ApiNotFoundResponse({ description: 'Artifact not found' }),
        ApiBadRequestResponse({ description: 'Invalid state transition' })
    );
};

// AI Provider Controller Decorators
export const ApiListAIProviders = () => {
    return applyDecorators(
        ApiTags('ai'),
        ApiOperation({ summary: 'List available AI providers and models' }),
        ApiOkResponse({
            description: 'List of AI providers',
            type: [AIProviderDto]
        })
    );
};