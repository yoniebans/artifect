// src/api/services/sse.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import { SSEService } from './sse.service';
import { StreamingChunkDto } from '../dto';

describe('SSEService', () => {
    let service: SSEService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SSEService],
        }).compile();

        service = module.get<SSEService>(SSEService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createSSEStream', () => {
        it('should create an observable and subject', () => {
            const [observable, subject] = service.createSSEStream();

            expect(observable).toBeDefined();
            expect(subject).toBeDefined();
            expect(subject.next).toBeDefined();
            expect(subject.complete).toBeDefined();
        });
    });

    describe('sendToStream', () => {
        it('should send data to the stream', async () => {
            const [observable, subject] = service.createSSEStream();
            const chunkData: StreamingChunkDto = { chunk: 'Test chunk' };

            // Create a promise that will resolve with the first value from the observable
            const dataPromise = firstValueFrom(observable);

            // Send data to the stream
            service.sendToStream(subject, chunkData);

            // Wait for the data to be emitted
            const result = await dataPromise;

            expect(result).toEqual(chunkData);
        });
    });

    describe('completeStream', () => {
        it('should complete the stream', (done) => {
            const [observable, subject] = service.createSSEStream();

            // Subscribe to the observable to detect completion
            observable.subscribe({
                complete: () => {
                    // This will be called when the stream is completed
                    done();
                },
            });

            // Complete the stream
            service.completeStream(subject);
        });

        it('should send final data before completing the stream', async () => {
            const [observable, subject] = service.createSSEStream();
            const finalData = {
                artifact_content: 'Final content',
                commentary: 'Final commentary',
            };

            // Get values from the observable
            const values: StreamingChunkDto[] = [];
            observable.subscribe({
                next: (value) => {
                    values.push(value);
                },
                complete: () => {
                    // Check that the final data was sent
                    expect(values.length).toBe(1);
                    expect(values[0]).toEqual({
                        chunk: '',
                        done: true,
                        ...finalData,
                    });
                },
            });

            // Complete the stream with final data
            service.completeStream(subject, finalData);
        });
    });
});