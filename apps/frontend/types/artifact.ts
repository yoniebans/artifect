export interface Project {
    project_id: string;
    name: string;
    created_at: string;
    updated_at: string;
    phases: Phase[];
}

export interface Phase {
    name: string;
    phase_id: string;
    order: string;
    artifacts: Artifact[];
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
    available_transitions: { state_id: string; state_name: string }[];
}

export interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatCompletion {
    messages: Message[];
}