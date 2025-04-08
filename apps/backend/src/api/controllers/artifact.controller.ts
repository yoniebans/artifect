// src/api/controllers/artifact.controller.ts

import {
    Controller,
    Get,
    Post,
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
    ArtifactEditorResponseDto,
    ArtifactDetailDto,
    StateTransitionDto,
    ChatCompletionDto,
    MessageDto
} from '../dto';
import {
    ApiCreateArtifact,
    ApiUpdateArtifact,
    ApiViewArtifact,
    ApiInteractArtifact,
    ApiUpdateArtifactState
} from '../decorators/swagger.decorator';
import { CurrentUser } from '../../auth/decorators/user.decorator';
import { User } from '@prisma/client';

/**
 * Controller for artifact-related endpoints
 */
@Controller('artifact')
export class ArtifactController {
    constructor(private readonly workflowOrchestrator: WorkflowOrchestratorService) { }

    /**
     * Create a new artifact
     * @param artifactData Artifact creation data
     * @param user Current authenticated user
     * @param aiProvider AI provider from header
     * @param aiModel AI model from header
     * @returns Artifact editor response
     */
    @Post('new')
    @ApiCreateArtifact()
    async createArtifact(
        @Body() artifactData: ArtifactCreateDto,
        @CurrentUser() user: User,
        @Headers('X-AI-Provider') aiProvider?: string,
        @Headers('X-AI-Model') aiModel?: string
    ): Promise<ArtifactEditorResponseDto> {
        try {
            const result = await this.workflowOrchestrator.createArtifact(
                Number(artifactData.project_id),
                artifactData.artifact_type_name,
                aiProvider,
                aiModel,
                user.id // Pass the user ID
            );

            // Create proper DTO instance
            return this.toArtifactEditorResponseDto(result);
        } catch (error) {
            if (error.message.includes('not found')) {
                throw new NotFoundException(error.message);
            } else if (error.message.includes('invalid artifact type') ||
                error.message.includes('not allowed in this project type')) {
                throw new BadRequestException(error.message);
            } else {
                throw new BadRequestException(error.message);
            }
        }
    }

    // Helper method to create DTO instance (add this to the ArtifactController class)
    private toArtifactEditorResponseDto(data: any): ArtifactEditorResponseDto {
        const responseDto = new ArtifactEditorResponseDto();

        // Create artifact detail DTO
        const artifactDto = new ArtifactDetailDto();
        artifactDto.artifact_id = data.artifact.artifact_id;
        artifactDto.artifact_type_id = data.artifact.artifact_type_id;
        artifactDto.artifact_type_name = data.artifact.artifact_type_name;
        artifactDto.name = data.artifact.name;
        artifactDto.state_id = data.artifact.state_id;
        artifactDto.state_name = data.artifact.state_name;
        artifactDto.artifact_version_number = data.artifact.artifact_version_number;
        artifactDto.artifact_version_content = data.artifact.artifact_version_content;
        artifactDto.dependent_type_id = data.artifact.dependent_type_id;

        // Add project type information
        artifactDto.project_type_id = data.artifact.project_type_id;
        artifactDto.project_type_name = data.artifact.project_type_name;

        // Create state transition DTOs
        artifactDto.available_transitions = (data.artifact.available_transitions || []).map((transition: any) => {
            const transitionDto = new StateTransitionDto();
            transitionDto.state_id = transition.state_id;
            transitionDto.state_name = transition.state_name;
            return transitionDto;
        });

        // Create chat completion DTO
        const chatCompletionDto = new ChatCompletionDto();
        chatCompletionDto.messages = (data.chat_completion?.messages || []).map((message: any) => {
            const messageDto = new MessageDto();
            messageDto.role = message.role;
            messageDto.content = message.content;
            return messageDto;
        });

        // Assign to response
        responseDto.artifact = artifactDto;
        responseDto.chat_completion = chatCompletionDto;

        return responseDto;
    }

    /**
     * Update an artifact
     * @param artifactId Artifact ID
     * @param updateData Update data
     * @param user Current authenticated user
     * @returns Updated artifact
     */
    @Put(':artifact_id')
    @ApiUpdateArtifact()
    async updateArtifact(
        @Param('artifact_id') artifactId: string,
        @Body() updateData: ArtifactUpdateDto,
        @CurrentUser() user: User
    ): Promise<ArtifactEditorResponseDto> {
        try {
            // Pass empty string instead of undefined for name/content if they're not provided
            const updatedArtifact = await this.workflowOrchestrator.updateArtifact(
                Number(artifactId),
                updateData.name || "", // Use empty string if name is undefined
                updateData.content || "", // Use empty string if content is undefined
                user.id // Pass the user ID
            );

            // Get the full artifact details with chat history
            const result = await this.workflowOrchestrator.getArtifactDetails(
                Number(artifactId),
                user.id // Pass the user ID
            );

            return this.toArtifactEditorResponseDto(result);
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
     * @param user Current authenticated user
     * @returns Artifact editor response
     */
    @Get(':artifact_id')
    @ApiViewArtifact()
    async viewArtifact(
        @Param('artifact_id') artifactId: string,
        @CurrentUser() user: User
    ): Promise<ArtifactEditorResponseDto> {
        try {
            const result = await this.workflowOrchestrator.getArtifactDetails(
                Number(artifactId),
                user.id // Pass the user ID
            );

            return this.toArtifactEditorResponseDto(result);
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
     * @param user Current authenticated user
     * @param aiProvider AI provider from header
     * @param aiModel AI model from header
     * @returns Artifact editor response
     */
    @Put(':artifact_id/ai')
    @ApiInteractArtifact()
    async interactArtifact(
        @Param('artifact_id') artifactId: string,
        @Body() updateRequest: ArtifactUpdateAIRequestDto,
        @CurrentUser() user: User,
        @Headers('X-AI-Provider') aiProvider?: string,
        @Headers('X-AI-Model') aiModel?: string
    ): Promise<ArtifactEditorResponseDto> {
        try {
            const result = await this.workflowOrchestrator.interactArtifact(
                Number(artifactId),
                updateRequest.messages[0].content,
                aiProvider,
                aiModel,
                user.id // Pass the user ID
            );

            return this.toArtifactEditorResponseDto(result);
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
     * @param user Current authenticated user
     * @returns Artifact editor response
     */
    @Put(':artifact_id/state/:state_id')
    @ApiUpdateArtifactState()
    async updateArtifactState(
        @Param('artifact_id') artifactId: string,
        @Param('state_id') stateId: string,
        @CurrentUser() user: User
    ): Promise<ArtifactEditorResponseDto> {
        try {
            const result = await this.workflowOrchestrator.transitionArtifact(
                Number(artifactId),
                Number(stateId),
                user.id // Pass the user ID
            );

            return this.toArtifactEditorResponseDto(result);
        } catch (error) {
            if (error.message.includes('not found')) {
                throw new NotFoundException(error.message);
            } else {
                throw new BadRequestException(error.message);
            }
        }
    }
}