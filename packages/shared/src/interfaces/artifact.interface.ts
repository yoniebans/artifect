// packages/shared/src/interfaces/artifact.interface.ts

export interface IArtifact {
    artifact_id: string;
    artifact_type_id: string;
    artifact_type_name: string;
    name: string;
    state_id: string;
    state_name: string;
    artifact_version_number?: string;
    artifact_version_content?: string;
    dependent_type_id?: string | null;
    project_type_id?: string;  // Added project type ID
    project_type_name?: string; // Added project type name
    available_transitions: IStateTransition[];
}

export interface IStateTransition {
    state_id: string;
    state_name: string;
}

export interface IArtifactCreate {
    project_id: string;
    artifact_type_name: string;
}

export interface IArtifactUpdate {
    name?: string;
    content?: string;
}

export interface IMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface IChatCompletion {
    messages: IMessage[];
}

export interface IArtifactEditorResponse {
    artifact: IArtifact;
    chat_completion: IChatCompletion;
}