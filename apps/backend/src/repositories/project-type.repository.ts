// src/repositories/project-type.repository.ts

import { Injectable } from '@nestjs/common';
import { ProjectType, LifecyclePhase } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ProjectTypeRepositoryInterface, ProjectTypeWithPhases } from './interfaces/project-type.repository.interface';

@Injectable()
export class ProjectTypeRepository implements ProjectTypeRepositoryInterface {
    constructor(private prisma: PrismaService) { }

    /**
     * Find a project type by ID
     * @param id Project type ID
     * @returns Project type with phases or null if not found
     */
    async findById(id: number): Promise<ProjectTypeWithPhases | null> {
        const projectType = await this.prisma.projectType.findUnique({
            where: { id },
            include: {
                lifecyclePhases: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
        });

        if (!projectType) {
            return null;
        }

        return projectType as ProjectTypeWithPhases;
    }

    /**
     * Get all project types
     * @returns Array of project types with phases
     */
    async findAll(): Promise<ProjectTypeWithPhases[]> {
        const projectTypes = await this.prisma.projectType.findMany({
            include: {
                lifecyclePhases: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            },
            where: {
                isActive: true
            }
        });

        return projectTypes as ProjectTypeWithPhases[];
    }

    /**
     * Get the default project type
     * @returns Default project type or first available one
     * @throws Error if no project types are found
     */
    async getDefaultProjectType(): Promise<ProjectTypeWithPhases> {
        // Try to find a project type marked as default (we'll add this field later if needed)
        // For now, let's just return the first active project type
        const projectTypes = await this.findAll();

        if (projectTypes.length === 0) {
            throw new Error('No project types found. Please ensure database is properly seeded.');
        }

        return projectTypes[0];
    }

    /**
     * Get lifecycle phases for a project type
     * @param projectTypeId Project type ID
     * @returns Array of lifecycle phases
     */
    async getLifecyclePhases(projectTypeId: number): Promise<LifecyclePhase[]> {
        const projectType = await this.prisma.projectType.findUnique({
            where: { id: projectTypeId },
            include: {
                lifecyclePhases: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
        });

        if (!projectType) {
            return [];
        }

        return projectType.lifecyclePhases;
    }
}