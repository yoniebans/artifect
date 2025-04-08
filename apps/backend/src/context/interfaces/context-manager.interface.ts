import { ArtifactWithRelations } from '../types/artifact-with-relations';

/**
 * Structure for context data passed to templates and AI services
 */
export interface ContextData {
    project: {
        name: string;
        project_type_id?: number;
        project_type_name?: string;
        [key: string]: any;
    };
    artifact: {
        artifact_id: number;
        artifact_type_id: number;
        artifact_type_name: string;
        artifact_phase: string;
        [key: string]: any;
    };
    is_update: boolean;
    user_message?: string | null;

    // Dependency fields will be added dynamically
    // Common dependency fields include:
    vision?: string;
    functional_requirements?: string;
    non_functional_requirements?: string;
    use_cases?: string[];
    c4_context?: string;
    c4_container?: string;
    c4_components?: string[];

    // Allow additional fields for different project types
    [key: string]: any;
}

/**
 * Interface for context management service
 */
export interface ContextManagerInterface {
    /**
     * Get context for artifact generation or update
     * @param artifact The artifact object with relations
     * @param isUpdate Whether this is an update operation
     * @param userMessage Optional user message
     * @returns Context data for template rendering and AI generation
     */
    getContext(
        artifact: ArtifactWithRelations,
        isUpdate: boolean,
        userMessage?: string | null
    ): Promise<ContextData>;
}