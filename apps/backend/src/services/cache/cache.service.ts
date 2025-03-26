import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ArtifactFormat, ArtifactTypeInfo, CacheServiceInterface } from './cache.service.interface';

@Injectable()
export class CacheService implements CacheServiceInterface, OnModuleInit {
    private initialized = false;
    private artifactTypes: Map<string, ArtifactTypeInfo> = new Map();
    private artifactStates: Map<string, number> = new Map();
    private stateTransitions: Map<string, number> = new Map();
    private lifecyclePhases: Map<string, number> = new Map();
    private artifactFormats: Map<string, ArtifactFormat> = new Map();

    constructor(private prisma: PrismaService) { }

    /**
     * Initialize the cache when the module is initialized
     */
    async onModuleInit() {
        await this.initialize();
    }

    /**
     * Load all cache data from the database
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        await this.loadArtifactTypes();
        await this.loadArtifactStates();
        await this.loadStateTransitions();
        await this.loadLifecyclePhases();
        await this.loadArtifactFormats();

        this.initialized = true;
    }

    /**
     * Ensure cache is initialized
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    /**
     * Load artifact types from database
     */
    private async loadArtifactTypes(): Promise<void> {
        const types = await this.prisma.artifactType.findMany();
        this.artifactTypes.clear();

        for (const type of types) {
            this.artifactTypes.set(type.name, {
                typeId: type.id,
                slug: type.slug
            });
        }
    }

    /**
     * Load artifact formats from database
     */
    private async loadArtifactFormats(): Promise<void> {
        const types = await this.prisma.artifactType.findMany();
        this.artifactFormats.clear();

        for (const type of types) {
            this.artifactFormats.set(type.slug, {
                startTag: `[${type.slug.toUpperCase()}]`,
                endTag: `[/${type.slug.toUpperCase()}]`,
                syntax: type.syntax,
                commentaryStartTag: "[COMMENTARY]",
                commentaryEndTag: "[/COMMENTARY]"
            });
        }
    }

    /**
     * Load artifact states from database
     */
    private async loadArtifactStates(): Promise<void> {
        const states = await this.prisma.artifactState.findMany();
        this.artifactStates.clear();

        for (const state of states) {
            this.artifactStates.set(state.name, state.id);
        }
    }

    /**
     * Load state transitions from database
     */
    private async loadStateTransitions(): Promise<void> {
        const transitions = await this.prisma.stateTransition.findMany();
        this.stateTransitions.clear();

        for (const transition of transitions) {
            this.stateTransitions.set(
                `${transition.fromStateId}:${transition.toStateId}`,
                transition.id
            );
        }
    }

    /**
     * Load lifecycle phases from database
     */
    private async loadLifecyclePhases(): Promise<void> {
        const phases = await this.prisma.lifecyclePhase.findMany();
        this.lifecyclePhases.clear();

        for (const phase of phases) {
            this.lifecyclePhases.set(phase.name, phase.id);
        }
    }

    /**
     * Get lifecycle phase ID by name
     * @param name Phase name
     * @returns Phase ID or null if not found
     */
    async getLifecyclePhaseIdByName(name: string): Promise<number | null> {
        await this.ensureInitialized();
        return this.lifecyclePhases.get(name) || null;
    }

    /**
     * Get artifact type info by name
     * @param name Type name
     * @returns Type info or null if not found
     */
    async getArtifactTypeInfo(name: string): Promise<ArtifactTypeInfo | null> {
        await this.ensureInitialized();
        return this.artifactTypes.get(name) || null;
    }

    /**
     * Get artifact format by slug
     * @param slug Type slug
     * @returns Artifact format
     */
    async getArtifactFormat(slug: string): Promise<ArtifactFormat> {
        await this.ensureInitialized();
        return (
            this.artifactFormats.get(slug) || {
                startTag: "[ARTIFACT]",
                endTag: "[/ARTIFACT]",
                syntax: "markdown",
                commentaryStartTag: "[COMMENTARY]",
                commentaryEndTag: "[/COMMENTARY]"
            }
        );
    }

    /**
     * Get artifact state ID by name
     * @param name State name
     * @returns State ID or null if not found
     */
    async getArtifactStateIdByName(name: string): Promise<number | null> {
        await this.ensureInitialized();
        return this.artifactStates.get(name) || null;
    }

    /**
     * Get state transition ID for a transition
     * @param fromState Source state name
     * @param toState Target state name
     * @returns Transition ID or null if not found
     */
    async getStateTransitionId(fromState: string, toState: string): Promise<number | null> {
        await this.ensureInitialized();

        const fromId = await this.getArtifactStateIdByName(fromState);
        const toId = await this.getArtifactStateIdByName(toState);

        if (!fromId || !toId) return null;

        return this.stateTransitions.get(`${fromId}:${toId}`) || null;
    }
}