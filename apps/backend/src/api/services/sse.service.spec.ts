// src/api/services/sse.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SSEService } from './sse.service';
import { StreamingChunkDto } from '../dto';

describe('SSEService', () => {
    let sseService: SSEService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SSEService],
        }).compile();

        sseService = module.get<SSEService>(SSEService);
    });

    it('should be defined', () => {
        expect(sseService).toBeDefined();
    });

    it('should create an SSE stream', () => {
        const [observable, subject] = sseService.createSSEStream();
        expect(observable).toBeDefined();
        expect(subject).toBeDefined();
    });

    it('should send data to the stream', (done) => {
        const [observable, subject] = sseService.createSSEStream();
        const testData = new StreamingChunkDto();
        testData.chunk = 'Test chunk';

        observable.subscribe({
            next: (data) => {
                expect(data).toEqual(testData);
                done();
            },
        });

        sseService.sendToStream(subject, testData);
    });

    it('should complete the stream with final data', (done) => {
        const [observable, subject] = sseService.createSSEStream();
        let finalData: StreamingChunkDto | null = null;

        observable.subscribe({
            next: (data) => {
                finalData = data;
            },
            complete: () => {
                expect(finalData).toEqual({
                    chunk: '',
                    done: true,
                    artifact_content: 'Final content',
                    commentary: 'Final commentary'
                });
                done();
            },
        });

        // Fix: Include all required properties in the DTO
        const completeData = new StreamingChunkDto();
        completeData.chunk = '';
        completeData.done = true;
        completeData.artifact_content = 'Final content';
        completeData.commentary = 'Final commentary';

        sseService.completeStream(subject, completeData);
    });
});