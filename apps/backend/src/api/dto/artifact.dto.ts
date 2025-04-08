// apps/backend/src/api/dto/artifact.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import {
    IArtifact,
    IStateTransition,
    IArtifactCreate,
    IArtifactUpdate,
    IMessage,
    IChatCompletion,
    IArtifactEditorResponse
} from '@artifect/shared';

export class StateTransitionDto implements IStateTransition {
    @IsString()
    state_id: string;

    @IsString()
    state_name: string;
}

export class ArtifactCreateDto implements IArtifactCreate {
    @IsString()
    @IsNotEmpty()
    project_id: string;

    @IsString()
    @IsNotEmpty()
    artifact_type_name: string;
}

export class ArtifactDto implements IArtifact {
    @IsString()
    @IsOptional()
    artifact_id: string;

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
    state_id: string;

    @IsString()
    @IsOptional()
    state_name: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StateTransitionDto)
    available_transitions: StateTransitionDto[];
}

export class ArtifactDetailDto extends ArtifactDto {
    @IsOptional()
    @IsString()
    artifact_version_number?: string;

    @IsOptional()
    @IsString()
    artifact_version_content?: string;

    @IsOptional()
    @IsString()
    project_type_id?: string;

    @IsOptional()
    @IsString()
    project_type_name?: string;
}

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

export class ArtifactUpdateDto implements IArtifactUpdate {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    content?: string;
}

export class MessageDto implements IMessage {
    @IsString()
    @IsNotEmpty()
    role: 'user' | 'assistant';

    @IsString()
    @IsNotEmpty()
    content: string;
}

export class ArtifactUpdateAIRequestDto {
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => MessageDto)
    messages: MessageDto[];
}

export class ChatCompletionDto implements IChatCompletion {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MessageDto)
    messages: MessageDto[];
}

export class ArtifactEditorResponseDto implements IArtifactEditorResponse {
    @ValidateNested()
    @Type(() => ArtifactDetailDto)
    artifact: ArtifactDetailDto;

    @ValidateNested()
    @Type(() => ChatCompletionDto)
    chat_completion: ChatCompletionDto;
}