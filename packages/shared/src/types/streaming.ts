export interface StreamingChunkDto {
    chunk: string;
    done?: boolean;
    artifact_content?: string;
    commentary?: string;
}