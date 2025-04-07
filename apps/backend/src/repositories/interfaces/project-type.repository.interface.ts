// src/repositories/interfaces/project-type.repository.interface.ts

import { ProjectType, LifecyclePhase } from '@prisma/client';

/**
 * ProjectType with related lifecycle phases
 */
export type ProjectTypeWithPhases = ProjectType & {
    lifecyclePhases: LifecyclePhase[];
};

/**
 * Repository interface for ProjectType
 * Simplified version with read-only operations
 */
export interface ProjectTypeRepositoryInterface {
    /**
     * Find a project type by ID
     * @param id Project type ID
     * @returns Project type with phases or null if not found
     */
    findById(id: number): Promise<ProjectTypeWithPhases | null>;
    
    /**
     * Get all project types
     * @returns Array of project types with phases
     */
    findAll(): Promise<ProjectTypeWithPhases[]>;
    
    /**
     * Get the default project type
     * @returns Default project type or first available one
     */
    getDefaultProjectType(): Promise<ProjectTypeWithPhases>;
    
    /**
     * Get lifecycle phases for a project type
     * @param projectTypeId Project type ID
     * @returns Array of lifecycle phases
     */
    getLifecyclePhases(projectTypeId: number): Promise<LifecyclePhase[]>;
}