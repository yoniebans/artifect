// src/repositories/project.repository.ts

import { Injectable, ForbiddenException } from '@nestjs/common';
import { Project, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ProjectRepositoryInterface } from './interfaces/project.repository.interface';

@Injectable()
export class ProjectRepository implements ProjectRepositoryInterface {
    constructor(private prisma: PrismaService) { }

    /**
     * Create a new project
     * @param data Project data with user ID
     * @returns Created project
     */
    async create(data: { name: string, userId: number }): Promise<Project> {
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
     * Find a project by ID and verify user ownership
     * @param id Project ID
     * @param userId User ID for authorization
     * @returns Project or null if not found or not owned by user
     */
    async findByIdAndUserId(id: number, userId: number): Promise<Project | null> {
        return this.prisma.project.findFirst({
            where: {
                id,
                userId
            }
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
     * Get all projects for a specific user
     * @param userId User ID
     * @returns Array of projects
     */
    async findByUserId(userId: number): Promise<Project[]> {
        return this.prisma.project.findMany({
            where: { userId }
        });
    }

    /**
     * Update a project
     * @param id Project ID
     * @param data Updated project data
     * @param userId Optional user ID for authorization
     * @returns Updated project or null if not found
     */
    async update(id: number, data: { name: string }, userId?: number): Promise<Project | null> {
        try {
            // If userId is provided, verify ownership
            if (userId !== undefined) {
                const project = await this.findById(id);
                if (!project) return null;

                if (project.userId !== userId) {
                    throw new ForbiddenException('You do not have permission to update this project');
                }
            }

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
     * @param userId Optional user ID for authorization
     * @returns true if deleted successfully, false otherwise
     */
    async delete(id: number, userId?: number): Promise<boolean> {
        try {
            // If userId is provided, verify ownership
            if (userId !== undefined) {
                const project = await this.findById(id);
                if (!project) return false;

                if (project.userId !== userId) {
                    throw new ForbiddenException('You do not have permission to delete this project');
                }
            }

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
     * @param userId Optional user ID for authorization
     * @returns Project metadata or null if not found
     */
    async getProjectMetadata(projectId: number, userId?: number): Promise<{
        id: number;
        name: string;
        currentPhaseId: number | null;
        currentPhaseName: string | null;
        lastUpdate: Date | null;
    } | null> {
        let projectQuery: any = { id: projectId };

        // Add user filtering if userId is provided
        if (userId !== undefined) {
            projectQuery.userId = userId;
        }

        const project = await this.prisma.project.findFirst({
            where: projectQuery,
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
     * @param userId Optional user ID for authorization
     * @returns Array of artifacts with type and content
     */
    async getPhaseArtifacts(projectId: number, phaseId: number, userId?: number): Promise<{
        id: number;
        type: string;
        content: string | null;
    }[]> {
        let projectQuery: any = { id: projectId };

        // Add user filtering if userId is provided
        if (userId !== undefined) {
            projectQuery.userId = userId;
        }

        // First verify the project is accessible
        const project = await this.prisma.project.findFirst({
            where: projectQuery
        });

        if (!project) {
            return [];
        }

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

    /**
     * Check if a user owns a project
     * @param projectId Project ID
     * @param userId User ID
     * @returns Boolean indicating ownership
     */
    async isProjectOwner(projectId: number, userId: number): Promise<boolean> {
        const project = await this.prisma.project.findFirst({
            where: {
                id: projectId,
                userId: userId
            }
        });

        return !!project;
    }
}