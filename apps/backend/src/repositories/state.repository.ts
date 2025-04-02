import { Injectable } from '@nestjs/common';
import { ArtifactState, StateTransition, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../services/cache/cache.service';
import { StateRepositoryInterface } from './interfaces/state.repository.interface';

@Injectable()
export class StateRepository implements StateRepositoryInterface {
    constructor(
        private prisma: PrismaService,
        private cacheService: CacheService
    ) { }

    /**
     * Get the current state of an artifact
     * @param artifactId The ID of the artifact
     * @returns The current state or null if not found
     */
    async getCurrentState(artifactId: number): Promise<ArtifactState | null> {
        try {
            const artifact = await this.prisma.artifact.findUnique({
                where: { id: artifactId },
                include: { state: true }
            });

            return artifact?.state || null;
        } catch (error) {
            throw new Error(`Error retrieving current state: ${error.message}`);
        }
    }

    /**
     * Get all available state transitions for an artifact
     * @param artifactId The ID of the artifact
     * @returns Array of available states
     */
    async getAvailableTransitions(artifactId: number): Promise<ArtifactState[]> {
        try {
            const currentState = await this.getCurrentState(artifactId);
            if (!currentState) {
                return [];
            }

            const transitions = await this.prisma.stateTransition.findMany({
                where: { fromStateId: currentState.id },
                include: { toState: true }
            });

            return transitions.map(transition => transition.toState);
        } catch (error) {
            throw new Error(`Error retrieving available transitions: ${error.message}`);
        }
    }

    /**
     * Transition an artifact to a new state
     * @param artifactId The ID of the artifact
     * @param newStateId The ID of the new state
     * @returns A tuple containing a success flag and a message
     */
    async transitionState(artifactId: number, newStateId: number): Promise<[boolean, string]> {
        try {
            const artifact = await this.prisma.artifact.findUnique({
                where: { id: artifactId },
                include: { state: true }
            });

            if (!artifact) {
                return [false, `Artifact not found: ${artifactId}`];
            }

            const currentState = artifact.state;
            const newState = await this.prisma.artifactState.findUnique({
                where: { id: newStateId }
            });

            if (!newState) {
                return [false, `New state not found: ${newStateId}`];
            }

            // Check if transition is valid
            const transition = await this.prisma.stateTransition.findFirst({
                where: {
                    fromStateId: currentState.id,
                    toStateId: newState.id
                }
            });

            if (!transition) {
                return [false, `Invalid transition from ${currentState.name} to ${newState.name}`];
            }

            // Update the artifact state
            await this.prisma.artifact.update({
                where: { id: artifactId },
                data: { stateId: newStateId }
            });

            return [true, `Successfully transitioned from ${currentState.name} to ${newState.name}`];
        } catch (error) {
            throw new Error(`Error transitioning state: ${error.message}`);
        }
    }

    /**
     * Get all possible artifact states
     * @returns Array of all states
     */
    async getAllStates(): Promise<ArtifactState[]> {
        try {
            return await this.prisma.artifactState.findMany();
        } catch (error) {
            throw new Error(`Error retrieving all states: ${error.message}`);
        }
    }

    /**
     * Get all defined state transitions
     * @returns Array of all transitions
     */
    async getAllTransitions(): Promise<StateTransition[]> {
        try {
            return await this.prisma.stateTransition.findMany({
                include: {
                    fromState: true,
                    toState: true
                }
            });
        } catch (error) {
            throw new Error(`Error retrieving all transitions: ${error.message}`);
        }
    }

    /**
     * Check if a state transition is valid
     * @param fromState Source state name
     * @param toState Target state name
     * @returns true if transition is valid, false otherwise
     */
    async isValidStateTransition(fromState: string, toState: string): Promise<boolean> {
        try {
            const fromStateId = await this.cacheService.getArtifactStateIdByName(fromState);
            const toStateId = await this.cacheService.getArtifactStateIdByName(toState);

            if (!fromStateId || !toStateId) {
                return false;
            }

            const transition = await this.prisma.stateTransition.findFirst({
                where: {
                    fromStateId,
                    toStateId
                }
            });

            return !!transition;
        } catch (error) {
            throw new Error(`Error checking state transition: ${error.message}`);
        }
    }

    /**
     * Get state by name
     * @param stateName Name of the state
     * @returns State or null if not found
     */
    async getStateByName(stateName: string): Promise<ArtifactState | null> {
        try {
            const stateId = await this.cacheService.getArtifactStateIdByName(stateName);
            if (!stateId) {
                return null;
            }

            return await this.prisma.artifactState.findUnique({
                where: { id: stateId }
            });
        } catch (error) {
            throw new Error(`Error getting state by name: ${error.message}`);
        }
    }
}