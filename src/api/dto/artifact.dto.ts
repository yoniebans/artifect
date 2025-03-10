// src/api/dto/artifact.dto.ts

import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for state transitions (available states)
 */
export class StateTransitionDto {
    @IsString()
    state_id: string;

    @IsString()
    state_name: string;
}

/**
 * DTO for creating a new artifact
 */
export class ArtifactCreateDto {
    @IsString()
    @IsNotEmpty()
    project_id: string;

    @IsString()
    @IsNotEmpty()
    artifact_type_name: string;
}

/**
 * DTO for basic artifact information
 */
export class ArtifactDto {
    @IsString()
    @IsOptional()
    artifact_id: string | null;  // Allow null values

    @IsString()
    artifact_type_id: string;

    @IsString()
    artifact_type_name: string;

    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    dependent_type_id?: string | null;

    @IsString()
    @IsOptional()
    state_id: string | null;  // Allow null values

    @IsString()
    @IsOptional()
    state_name: string | null;  // Allow null values

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StateTransitionDto)
    available_transitions: StateTransitionDto[];
}

/**
 * DTO for detailed artifact information including content
 */
export class ArtifactDetailDto extends ArtifactDto {
    @IsOptional()
    @IsString()
    artifact_version_number?: string | null;

    @IsOptional()
    @IsString()
    artifact_version_content?: string | null;
}

/**
 * DTO for a phase of artifacts (e.g., Requirements, Design)
 */
export class ArtifactPhaseDto {
    @IsString()
    name: string;

    @IsString()
    phase_id: string;

    @IsString()
    order: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ArtifactDetailDto)
    artifacts: ArtifactDetailDto[];
}

/**
 * DTO for updating an artifact with AI assistance
 */
export class ArtifactUpdateAIDto {
    @IsString()
    @IsNotEmpty()
    user_message: string;
}

/**
 * DTO for manually updating an artifact
 */
export class ArtifactUpdateDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    content?: string;
}

/**
 * DTO for a chat message
 */
export class MessageDto {
    @IsString()
    @IsNotEmpty()
    role: string;

    @IsString()
    @IsNotEmpty()
    content: string;
}

/**
 * DTO for AI request with messages
 */
export class ArtifactUpdateAIRequestDto {
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => MessageDto)
    messages: MessageDto[];
}

/**
 * DTO for chat completion response
 */
export class ChatCompletionDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MessageDto)
    messages: MessageDto[];
}

/**
 * DTO for artifact editor response
 */
export class ArtifactEditorResponseDto {
    @ValidateNested()
    @Type(() => ArtifactDetailDto)
    artifact: ArtifactDetailDto;

    @ValidateNested()
    @Type(() => ChatCompletionDto)
    chat_completion: ChatCompletionDto;
}