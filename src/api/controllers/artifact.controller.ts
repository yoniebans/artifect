// src/api/controllers/artifact.controller.ts

import {
    Controller,
    Post,
    Get,
    Put,
    Body,
    Param,
    Headers,
    NotFoundException,
    BadRequestException
} from '@nestjs/common';
import { WorkflowOrchestratorService } from '../../workflow/workflow-orchestrator.service';
import {
    ArtifactCreateDto,
    ArtifactUpdateDto,
    ArtifactUpdateAIRequestDto,
    ArtifactEditorResponseDto
} from '../dto';
import {
    ApiCreateArtifact,
    ApiUpdateArtifact,
    ApiViewArtifact,
    ApiInteractArtifact,
    ApiUpdateArtifactState
} from '../decorators/swagger.decorator';

/**
 * Controller for artifact-related endpoints
 */
@Controller('artifact')
export class ArtifactController {
    constructor(private readonly workflowOrchestrator: WorkflowOrchestratorService) { }

    /**
     * Create a new artifact
     * @param artifactData Artifact creation data
     * @param aiProvider AI provider from header
     * @param aiModel AI model from header
     * @returns Artifact editor response
     */
    @Post('new')
    @ApiCreateArtifact()
    async createArtifact(
        @Body() artifactData: ArtifactCreateDto,
        @Headers('X-AI-Provider') aiProvider?: string,
        @Headers('X-AI-Model') aiModel?: string
    ): Promise<ArtifactEditorResponseDto> {
        try {
            const result = await this.workflowOrchestrator.createArtifact(
                Number(artifactData.project_id),
                artifactData.artifact_type_name,
                aiProvider,
                aiModel
            );

            return result as ArtifactEditorResponseDto;
        } catch (error) {
            if (error.message.includes('not found')) {
                throw new NotFoundException(error.message);
            } else {
                throw new BadRequestException(error.message);
            }
        }
    }

    /**
     * Update an artifact
     * @param artifactId Artifact ID
     * @param updateData Update data
     * @returns Updated artifact
     */
    @Put(':artifact_id')
    @ApiUpdateArtifact()
    async updateArtifact(
        @Param('artifact_id') artifactId: string,
        @Body() updateData: ArtifactUpdateDto
    ): Promise<ArtifactEditorResponseDto> {
        try {
            // Pass empty string instead of undefined for name/content if they're not provided
            const updatedArtifact = await this.workflowOrchestrator.updateArtifact(
                Number(artifactId),
                updateData.name || "", // Use empty string if name is undefined
                updateData.content || "" // Use empty string if content is undefined
            );

            // Since the workflow orchestrator returns just the artifact, we need to
            // get the full artifact details with chat history
            return this.workflowOrchestrator.getArtifactDetails(Number(artifactId)) as Promise<ArtifactEditorResponseDto>;
        } catch (error) {
            if (error.message.includes('not found')) {
                throw new NotFoundException(error.message);
            } else {
                throw new BadRequestException(error.message);
            }
        }
    }

    /**
     * Get artifact details
     * @param artifactId Artifact ID
     * @returns Artifact editor response
     */
    @Get(':artifact_id')
    @ApiViewArtifact()
    async viewArtifact(
        @Param('artifact_id') artifactId: string
    ): Promise<ArtifactEditorResponseDto> {
        try {
            return await this.workflowOrchestrator.getArtifactDetails(Number(artifactId)) as ArtifactEditorResponseDto;
        } catch (error) {
            if (error.message.includes('not found')) {
                throw new NotFoundException(error.message);
            } else {
                throw new BadRequestException(error.message);
            }
        }
    }

    /**
     * Interact with an artifact using AI
     * @param artifactId Artifact ID
     * @param updateRequest AI update request
     * @param aiProvider AI provider from header
     * @param aiModel AI model from header
     * @returns Artifact editor response
     */
    @Put(':artifact_id/ai')
    @ApiInteractArtifact()
    async interactArtifact(
        @Param('artifact_id') artifactId: string,
        @Body() updateRequest: ArtifactUpdateAIRequestDto,
        @Headers('X-AI-Provider') aiProvider?: string,
        @Headers('X-AI-Model') aiModel?: string
    ): Promise<ArtifactEditorResponseDto> {
        try {
            return await this.workflowOrchestrator.interactArtifact(
                Number(artifactId),
                updateRequest.messages[0].content,
                aiProvider,
                aiModel
            ) as ArtifactEditorResponseDto;
        } catch (error) {
            if (error.message.includes('not found')) {
                throw new NotFoundException(error.message);
            } else {
                throw new BadRequestException(error.message);
            }
        }
    }

    /**
     * Update artifact state
     * @param artifactId Artifact ID
     * @param stateId State ID
     * @returns Artifact editor response
     */
    @Put(':artifact_id/state/:state_id')
    @ApiUpdateArtifactState()
    async updateArtifactState(
        @Param('artifact_id') artifactId: string,
        @Param('state_id') stateId: string
    ): Promise<ArtifactEditorResponseDto> {
        try {
            return await this.workflowOrchestrator.transitionArtifact(
                Number(artifactId),
                Number(stateId)
            ) as ArtifactEditorResponseDto;
        } catch (error) {
            if (error.message.includes('not found')) {
                throw new NotFoundException(error.message);
            } else {
                throw new BadRequestException(error.message);
            }
        }
    }
}