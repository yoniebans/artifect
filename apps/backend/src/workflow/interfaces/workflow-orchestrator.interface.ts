// src/workflow/interfaces/workflow-orchestrator.interface.ts

import { Artifact, ArtifactState, ArtifactVersion, Project } from '@prisma/client';
import { AIMessage } from '../../ai/interfaces/ai-provider.interface';

/**
 * Project metadata response
 */
export interface ProjectMetadata {
    project_id: string;
    name: string;
    created_at: Date;
    updated_at: Date | null;
    project_type_id?: string;
    project_type_name?: string;
}

/**
 * Project details including artifacts
 */
export interface ProjectDetails extends ProjectMetadata {
    artifacts: {
        [phase: string]: ArtifactItem[];
    };
}

/**
 * Artifact item in project view
 */
export interface ArtifactItem {
    id: string | null;
    name: string;
    type: string;
    type_id: string;
    content: string | null;
    version_number: string | null;
    state_id: string | null;
    state_name: string | null;
    available_transitions: StateTransition[];
    dependent_type_id: string | null;
}

/**
 * Artifact details with chat history
 */
export interface ArtifactDetails {
    artifact: {
        artifact_id: string;
        artifact_type_id: string;
        artifact_type_name: string;
        artifact_version_number: string | null;
        artifact_version_content: string | null;
        name: string;
        state_id: string;
        state_name: string;
        available_transitions: StateTransition[];
        dependent_type_id: string | null;
        project_type_id?: string;
        project_type_name?: string;
    };
    chat_completion: {
        messages: AIMessage[];
    };
}

/**
 * State transition information
 */
export interface StateTransition {
    state_id: string;
    state_name: string;
}

/**
 * Interface for the workflow orchestrator service
 */
export interface WorkflowOrchestratorInterface {
    /**
     * Create a new project
     * 
     * @param projectName Name of the project
     * @param userId ID of the user creating the project
     * @param projectTypeId Optional ID of the project type (default will be used if not provided)
     * @returns Project metadata
     */
    createProject(projectName: string, userId: number, projectTypeId?: number): Promise<ProjectMetadata>;

    /**
     * List all projects
     * 
     * @returns Array of project metadata
     */
    listProjects(): Promise<ProjectMetadata[]>;

    /**
     * List projects for a specific user
     * 
     * @param userId User ID
     * @returns Array of project metadata
     */
    listProjectsByUser(userId: number): Promise<ProjectMetadata[]>;

    /**
     * Get detailed view of a project with artifacts
     * 
     * @param projectId Project ID
     * @param userId User ID (for authorization)
     * @returns Project details with artifacts
     */
    viewProject(projectId: number, userId: number): Promise<ProjectDetails>;

    /**
     * Get detailed view of an artifact with chat history
     * 
     * @param artifactId Artifact ID
     * @param userId User ID (for authorization)
     * @returns Artifact details with chat history
     */
    getArtifactDetails(artifactId: number, userId?: number): Promise<ArtifactDetails>;

    /**
     * Create a new artifact
     * 
     * @param projectId Project ID
     * @param artifactTypeName Type of artifact to create
     * @param providerId Optional AI provider ID
     * @param model Optional AI model name
     * @param userId User ID (for authorization)
     * @returns Artifact details with initial AI message
     */
    createArtifact(
        projectId: number,
        artifactTypeName: string,
        providerId?: string,
        model?: string,
        userId?: number
    ): Promise<ArtifactDetails>;

    /**
     * Interact with an artifact (send user message to AI)
     * 
     * @param artifactId Artifact ID
     * @param userMessage User message
     * @param providerId Optional AI provider ID
     * @param model Optional AI model name
     * @param userId User ID (for authorization)
     * @returns Updated artifact details with AI response
     */
    interactArtifact(
        artifactId: number,
        userMessage: string,
        providerId?: string,
        model?: string,
        userId?: number
    ): Promise<ArtifactDetails>;

    /**
     * Stream interaction with an artifact using AI
     * 
     * @param artifactId Artifact ID
     * @param userMessage User message
     * @param onChunk Callback for each chunk of the streaming response
     * @param providerId Optional AI provider ID
     * @param model Optional AI model name
     * @param userId User ID (for authorization)
     * @returns Object containing the artifact content and commentary
     */
    streamInteractArtifact(
        artifactId: number,
        userMessage: string,
        onChunk: (chunk: string) => void,
        providerId?: string,
        model?: string,
        userId?: number
    ): Promise<{ artifactContent: string; commentary: string }>;

    /**
     * Update an artifact's properties
     * 
     * @param artifactId Artifact ID
     * @param name New name for the artifact
     * @param content New content for the artifact
     * @param userId User ID (for authorization)
     * @returns Updated artifact
     */
    updateArtifact(
        artifactId: number,
        name: string,
        content: string,
        userId?: number
    ): Promise<Artifact>;

    /**
     * Transition an artifact to a new state
     * 
     * @param artifactId Artifact ID
     * @param newStateId ID of the new state
     * @param userId User ID (for authorization)
     * @returns Artifact details after transition
     */
    transitionArtifact(
        artifactId: number,
        newStateId: number,
        userId?: number
    ): Promise<ArtifactDetails>;
}