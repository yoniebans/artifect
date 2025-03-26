export interface StateTransition {
    state_id: string;
    state_name: string;
}

export interface Artifact {
    artifact_id: string;
    artifact_type_id: string;
    artifact_type_name: string;
    artifact_version_number: string;
    artifact_version_content: string;
    name: string;
    dependent_type_id: string | null;
    state_id: string;
    state_name: string;
    available_transitions: StateTransition[];
}

export interface ArtifactDetail extends Artifact {
    // Any additional properties for detailed view
}

export interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatCompletion {
    messages: Message[];
}

export interface ArtifactEditorResponse {
    artifact: ArtifactDetail;
    chat_completion: ChatCompletion;
}

export interface ArtifactCreateRequest {
    project_id: string;
    artifact_type_name: string;
}

export interface ArtifactUpdateRequest {
    name?: string;
    content?: string;
}

export interface ArtifactUpdateAIRequest {
    messages: Message[];
}