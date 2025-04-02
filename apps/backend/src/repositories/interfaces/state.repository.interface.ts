// src/repositories/interfaces/state.repository.interface.ts
import { ArtifactState, StateTransition } from '@prisma/client';

export interface StateRepositoryInterface {
    getCurrentState(artifactId: number): Promise<ArtifactState | null>;

    getAvailableTransitions(artifactId: number): Promise<ArtifactState[]>;

    transitionState(artifactId: number, newStateId: number): Promise<[boolean, string]>;

    getAllStates(): Promise<ArtifactState[]>;

    getAllTransitions(): Promise<StateTransition[]>;
}