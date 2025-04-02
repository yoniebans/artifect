// packages/shared/src/interfaces/streaming.interface.ts
export interface IStreamingChunk {
    chunk: string;
    done?: boolean;
    artifact_content?: string;
    commentary?: string;
}