import { Injectable } from '@nestjs/common';
import { Project, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ProjectRepositoryInterface } from './interfaces/project.repository.interface';

@Injectable()
export class ProjectRepository implements ProjectRepositoryInterface {
    constructor(private prisma: PrismaService) { }

    /**
     * Create a new project
     * @param data Project data
     * @returns Created project
     */
    async create(data: { name: string }): Promise<Project> {
        return this.prisma.project.create({
            data
        });
    }

    /**
     * Find a project by ID
     * @param id Project ID
     * @returns Project or null if not found
     */
    async findById(id: number): Promise<Project | null> {
        return this.prisma.project.findUnique({
            where: { id }
        });
    }

    /**
     * Get all projects
     * @returns Array of projects
     */
    async findAll(): Promise<Project[]> {
        return this.prisma.project.findMany();
    }

    /**
     * Update a project
     * @param id Project ID
     * @param data Updated project data
     * @returns Updated project or null if not found
     */
    async update(id: number, data: { name: string }): Promise<Project | null> {
        try {
            return await this.prisma.project.update({
                where: { id },
                data
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                // Record not found
                if (error.code === 'P2025') {
                    return null;
                }
            }
            throw error;
        }
    }

    /**
     * Delete a project
     * @param id Project ID
     * @returns true if deleted successfully, false otherwise
     */
    async delete(id: number): Promise<boolean> {
        try {
            await this.prisma.project.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                // Record not found
                if (error.code === 'P2025') {
                    return false;
                }
            }
            throw error;
        }
    }

    /**
     * Get project metadata including the current phase
     * @param projectId Project ID
     * @returns Project metadata or null if not found
     */
    async getProjectMetadata(projectId: number): Promise<{
        id: number;
        name: string;
        currentPhaseId: number | null;
        currentPhaseName: string | null;
        lastUpdate: Date | null;
    } | null> {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: {
                artifacts: {
                    orderBy: {
                        updatedAt: 'desc'
                    },
                    take: 1,
                    include: {
                        artifactType: {
                            include: {
                                lifecyclePhase: true
                            }
                        }
                    }
                }
            }
        });

        if (!project) return null;

        const latestArtifact = project.artifacts[0];

        return {
            id: project.id,
            name: project.name,
            currentPhaseId: latestArtifact?.artifactType?.lifecyclePhase?.id || null,
            currentPhaseName: latestArtifact?.artifactType?.lifecyclePhase?.name || null,
            lastUpdate: latestArtifact?.updatedAt || null
        };
    }

    /**
     * Get artifacts for a specific project and phase
     * @param projectId Project ID
     * @param phaseId Phase ID
     * @returns Array of artifacts with type and content
     */
    async getPhaseArtifacts(projectId: number, phaseId: number): Promise<{
        id: number;
        type: string;
        content: string | null;
    }[]> {
        const artifacts = await this.prisma.artifact.findMany({
            where: {
                projectId,
                artifactType: {
                    lifecyclePhaseId: phaseId
                }
            },
            include: {
                artifactType: true,
                currentVersion: true
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        return artifacts.map(artifact => ({
            id: artifact.id,
            type: artifact.artifactType.name,
            content: artifact.currentVersion?.content || null
        }));
    }
}