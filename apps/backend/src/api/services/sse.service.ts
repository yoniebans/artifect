// apps/backend/src/api/services/sse.service.ts

import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { StreamingChunkDto } from '../dto';

/**
 * Service for managing Server-Sent Events
 */
@Injectable()
export class SSEService {
    /**
     * Create a new SSE stream
     * @returns An Observable for the SSE stream
     */
    createSSEStream(): [Observable<StreamingChunkDto>, Subject<StreamingChunkDto>] {
        const subject = new Subject<StreamingChunkDto>();
        const observable = subject.asObservable();
        return [observable, subject];
    }

    /**
     * Send data to the SSE stream
     * @param subject The subject to send data to
     * @param data The data to send
     */
    sendToStream(subject: Subject<StreamingChunkDto>, data: StreamingChunkDto): void {
        subject.next(data);
    }

    /**
     * Complete the SSE stream
     * @param subject The subject to complete
     * @param data Optional final data to send before completing
     */
    completeStream(
        subject: Subject<StreamingChunkDto>,
        data?: StreamingChunkDto
    ): void {
        if (data) {
            subject.next(data);
        }
        subject.complete();
    }
}