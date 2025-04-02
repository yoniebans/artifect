import { ReasoningSummary, ReasoningPoint } from '@prisma/client';

export interface ReasoningRepositoryInterface {
    createReasoningSummary(
        artifactVersionId: number,
        reasoningEntryId: number,
        summary: string
    ): Promise<ReasoningSummary>;

    getReasoningSummary(summaryId: number): Promise<ReasoningSummary | null>;

    createReasoningPoint(
        summaryId: number,
        category: string,
        point: string,
        importanceScore: number
    ): Promise<ReasoningPoint>;

    getReasoningPoints(summaryId: number): Promise<ReasoningPoint[]>;

    updateReasoningSummary(summaryId: number, newSummary: string): Promise<ReasoningSummary | null>;

    deleteReasoningEntry(entryId: number): Promise<boolean>;
}