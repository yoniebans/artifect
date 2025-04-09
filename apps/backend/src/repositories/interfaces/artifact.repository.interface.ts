import {
    Artifact,
    ArtifactVersion,
    ArtifactState,
    ArtifactType,
    LifecyclePhase,
    ArtifactInteraction
} from '@prisma/client';
import { BaseRepositoryInterface } from './base.repository.interface';

export interface ArtifactCreateDTO {
    projectId: number;
    artifactTypeId: number;
    name: string;
    content?: string;
}

export interface ArtifactUpdateDTO {
    name?: string;
    content?: string;
}

export interface ArtifactRepositoryInterface extends BaseRepositoryInterface<
    Artifact,
    number,
    ArtifactCreateDTO,
    ArtifactUpdateDTO
> {
    getArtifactsByProjectId(projectId: number): Promise<Artifact[]>;

    getArtifactsByProjectIdAndPhase(projectId: number, phase: string): Promise<Artifact[]>;

    getAvailableTransitions(artifact: Artifact): Promise<ArtifactState[]>;

    getArtifactStateByName(state: string): Promise<ArtifactState | null>;

    updateArtifactState(artifactId: number, newState: string): Promise<Artifact | null>;

    updateArtifactStateWithId(artifactId: number, newStateId: number): Promise<Artifact | null>;

    createArtifactVersion(artifactId: number, content: string): Promise<ArtifactVersion>;

    getArtifactVersions(artifactId: number): Promise<ArtifactVersion[]>;

    getNextVersionNumber(artifactId: number): Promise<number>;

    getArtifactTypes(): Promise<ArtifactType[]>;

    getArtifactTypesByPhase(phase: string): Promise<ArtifactType[]>;

    getArtifactTypeByName(artifactType: string): Promise<ArtifactType | null>;

    getArtifactType(typeId: number): Promise<ArtifactType | null>;

    getArtifactStates(): Promise<ArtifactState[]>;

    getArtifactState(stateId: number): Promise<ArtifactState | null>;

    getLifecyclePhases(): Promise<LifecyclePhase[]>;

    getArtifactTypeDependencies(artifactTypeSlug: string): Promise<ArtifactType[]>;

    isValidStateTransition(fromState: string, toState: string): Promise<boolean>;

    getArtifactsByType(artifact: Artifact, artifactType: string): Promise<Artifact[]>;

    createInteraction(data: {
        artifactId: number;
        versionId?: number;
        role: string;
        content: string;
        sequenceNumber: number;
    }): Promise<ArtifactInteraction>;

    getLastInteractions(artifactId: number, limit?: number): Promise<[ArtifactInteraction[], number]>;
}