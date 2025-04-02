import { Injectable } from '@nestjs/common';
import { ReasoningSummary, ReasoningPoint, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ReasoningRepositoryInterface } from './interfaces/reasoning.repository.interface';

@Injectable()
export class ReasoningRepository implements ReasoningRepositoryInterface {
    constructor(private prisma: PrismaService) { }

    /**
     * Create a new reasoning summary and associate it with an artifact version
     * @param artifactVersionId The ID of the artifact version
     * @param reasoningEntryId The ID of the reasoning entry (note: this parameter is kept for interface compatibility)
     * @param summary The summary text
     * @returns The created reasoning summary
     */
    async createReasoningSummary(
        artifactVersionId: number,
        reasoningEntryId: number, // This parameter isn't used in the Prisma model
        summary: string
    ): Promise<ReasoningSummary> {
        try {
            // First, get the artifact ID from the artifact version
            const artifactVersion = await this.prisma.artifactVersion.findUnique({
                where: { id: artifactVersionId },
                select: { artifactId: true }
            });

            if (!artifactVersion) {
                throw new Error(`Artifact version with ID ${artifactVersionId} not found`);
            }

            // Create the reasoning summary
            const reasoningSummary = await this.prisma.reasoningSummary.create({
                data: {
                    artifactId: artifactVersion.artifactId,
                    summary: summary,
                    // Create the link between summary and version
                    summaryVersions: {
                        create: {
                            versionId: artifactVersionId
                        }
                    }
                }
            });

            return reasoningSummary;
        } catch (error) {
            throw new Error(`Failed to create reasoning summary: ${error.message}`);
        }
    }

    /**
     * Get a reasoning summary by ID
     * @param summaryId The ID of the summary
     * @returns The reasoning summary or null if not found
     */
    async getReasoningSummary(summaryId: number): Promise<ReasoningSummary | null> {
        return this.prisma.reasoningSummary.findUnique({
            where: { id: summaryId },
            include: {
                reasoningPoints: true,
                summaryVersions: {
                    include: {
                        version: true
                    }
                }
            }
        });
    }

    /**
     * Create a new reasoning point associated with a summary
     * @param summaryId The ID of the summary
     * @param category The category of the point
     * @param point The point text
     * @param importanceScore The importance score (1-10)
     * @returns The created reasoning point
     */
    async createReasoningPoint(
        summaryId: number,
        category: string,
        point: string,
        importanceScore: number
    ): Promise<ReasoningPoint> {
        try {
            // Check if the summary exists
            const summary = await this.prisma.reasoningSummary.findUnique({
                where: { id: summaryId }
            });

            if (!summary) {
                throw new Error(`Reasoning summary with ID ${summaryId} not found`);
            }

            // Create the reasoning point
            return this.prisma.reasoningPoint.create({
                data: {
                    summaryId,
                    category,
                    point,
                    importanceScore
                }
            });
        } catch (error) {
            throw new Error(`Failed to create reasoning point: ${error.message}`);
        }
    }

    /**
     * Get all reasoning points for a summary
     * @param summaryId The ID of the summary
     * @returns Array of reasoning points
     */
    async getReasoningPoints(summaryId: number): Promise<ReasoningPoint[]> {
        return this.prisma.reasoningPoint.findMany({
            where: { summaryId }
        });
    }

    /**
     * Update a reasoning summary
     * @param summaryId The ID of the summary
     * @param newSummary The new summary text
     * @returns The updated summary or null if not found
     */
    async updateReasoningSummary(summaryId: number, newSummary: string): Promise<ReasoningSummary | null> {
        try {
            // Check if the summary exists
            const existingSummary = await this.prisma.reasoningSummary.findUnique({
                where: { id: summaryId }
            });

            if (!existingSummary) {
                return null;
            }

            // Update the summary
            return this.prisma.reasoningSummary.update({
                where: { id: summaryId },
                data: {
                    summary: newSummary,
                    lastUpdated: new Date()
                }
            });
        } catch (error: any) {
            // Check for Prisma error by code property
            if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
                return null;
            }
            throw new Error(`Failed to update reasoning summary: ${error.message}`);
        }
    }

    /**
     * Delete a reasoning entry (summary)
     * @param entryId The ID of the entry (summary)
     * @returns true if deleted successfully, false otherwise
     */
    async deleteReasoningEntry(entryId: number): Promise<boolean> {
        try {
            // Check if the entry exists
            const existingSummary = await this.prisma.reasoningSummary.findUnique({
                where: { id: entryId }
            });

            if (!existingSummary) {
                return false;
            }

            // Delete the summary
            await this.prisma.reasoningSummary.delete({
                where: { id: entryId }
            });

            return true;
        } catch (error: any) {
            // Check for Prisma error by code property
            if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
                return false;
            }
            throw new Error(`Failed to delete reasoning entry: ${error.message}`);
        }
    }
}