import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
    ArtifactFormat,
    ArtifactTypeInfo,
    CacheServiceInterface,
    ProjectTypeInfo
} from './cache.service.interface';

@Injectable()
export class CacheService implements CacheServiceInterface, OnModuleInit {
    private initialized = false;
    private artifactTypes: Map<string, ArtifactTypeInfo> = new Map();
    private artifactStates: Map<string, number> = new Map();
    private stateTransitions: Map<string, number> = new Map();
    private lifecyclePhases: Map<string, number> = new Map();
    private artifactFormats: Map<string, ArtifactFormat> = new Map();

    // Simplified project type caching
    private projectTypes: Map<number, ProjectTypeInfo> = new Map();
    private defaultProjectType: ProjectTypeInfo | null = null;
    private projectTypePhases: Map<number, number[]> = new Map();

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
        await this.loadProjectTypes();

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
     * Load project types from database
     */
    private async loadProjectTypes(): Promise<void> {
        const projectTypes = await this.prisma.projectType.findMany({
            where: { isActive: true },
            include: {
                lifecyclePhases: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
        });

        this.projectTypes.clear();
        this.projectTypePhases.clear();
        this.defaultProjectType = null;

        if (projectTypes.length > 0) {
            // Set the first one as default for now
            this.defaultProjectType = {
                id: projectTypes[0].id,
                name: projectTypes[0].name
            };

            // Cache all project types and their phases
            for (const projectType of projectTypes) {
                this.projectTypes.set(projectType.id, {
                    id: projectType.id,
                    name: projectType.name
                });

                // Cache phases for this project type
                this.projectTypePhases.set(
                    projectType.id,
                    projectType.lifecyclePhases.map(phase => phase.id)
                );
            }
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

    /**
     * Get project type by ID
     * @param id Project type ID
     * @returns Project type info or null if not found
     */
    async getProjectTypeById(id: number): Promise<ProjectTypeInfo | null> {
        await this.ensureInitialized();
        return this.projectTypes.get(id) || null;
    }

    /**
     * Get the default project type
     * @returns Default project type or null if none is set
     */
    async getDefaultProjectType(): Promise<ProjectTypeInfo | null> {
        await this.ensureInitialized();
        return this.defaultProjectType;
    }

    /**
     * Get all phases for a project type
     * @param projectTypeId Project type ID
     * @returns Array of phase IDs
     */
    async getProjectTypePhases(projectTypeId: number): Promise<number[]> {
        await this.ensureInitialized();
        return this.projectTypePhases.get(projectTypeId) || [];
    }
}