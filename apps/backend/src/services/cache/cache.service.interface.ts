// src/services/cache/cache.service.interface.ts

export interface ArtifactTypeInfo {
    typeId: number;
    slug: string;
}

export interface ProjectTypeInfo {
    id: number;
    name: string;
}

export interface ArtifactFormat {
    startTag: string;
    endTag: string;
    syntax: string;
    commentaryStartTag?: string;
    commentaryEndTag?: string;
}

export interface CacheServiceInterface {
    initialize(): Promise<void>;

    getLifecyclePhaseIdByName(name: string): Promise<number | null>;

    getArtifactTypeInfo(name: string): Promise<ArtifactTypeInfo | null>;

    getArtifactFormat(slug: string): Promise<ArtifactFormat>;

    getArtifactStateIdByName(name: string): Promise<number | null>;

    getStateTransitionId(fromState: string, toState: string): Promise<number | null>;

    // Simplified project type methods
    getProjectTypeById(id: number): Promise<ProjectTypeInfo | null>;

    getDefaultProjectType(): Promise<ProjectTypeInfo | null>;

    getProjectTypePhases(projectTypeId: number): Promise<number[]>;
}