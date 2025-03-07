// src/api/dto/dto-validation.spec.ts

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
    ProjectCreateDto,
    ArtifactCreateDto,
    ArtifactUpdateDto,
    ArtifactUpdateAIRequestDto,
    MessageDto,
    StreamingChunkDto
} from './index';

describe('DTO Validation', () => {
    describe('ProjectCreateDto', () => {
        it('should validate a valid DTO', async () => {
            const dto = plainToInstance(ProjectCreateDto, { name: 'Test Project' });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should fail on empty name', async () => {
            const dto = plainToInstance(ProjectCreateDto, { name: '' });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isNotEmpty');
        });

        it('should fail on missing name', async () => {
            const dto = plainToInstance(ProjectCreateDto, {});
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isNotEmpty');
        });
    });

    describe('ArtifactCreateDto', () => {
        it('should validate a valid DTO', async () => {
            const dto = plainToInstance(ArtifactCreateDto, {
                project_id: '1',
                artifact_type_name: 'Vision Document'
            });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should fail on missing fields', async () => {
            const dto = plainToInstance(ArtifactCreateDto, {});
            const errors = await validate(dto);
            expect(errors.length).toBe(2);
        });
    });

    describe('ArtifactUpdateDto', () => {
        it('should validate a valid DTO with both fields', async () => {
            const dto = plainToInstance(ArtifactUpdateDto, {
                name: 'Updated Name',
                content: 'Updated Content'
            });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should validate a valid DTO with only name', async () => {
            const dto = plainToInstance(ArtifactUpdateDto, { name: 'Updated Name' });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should validate a valid DTO with only content', async () => {
            const dto = plainToInstance(ArtifactUpdateDto, { content: 'Updated Content' });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should validate an empty object', async () => {
            const dto = plainToInstance(ArtifactUpdateDto, {});
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });
    });

    describe('MessageDto', () => {
        it('should validate a valid message', async () => {
            const dto = plainToInstance(MessageDto, { role: 'user', content: 'Test message' });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should fail on missing role', async () => {
            const dto = plainToInstance(MessageDto, { content: 'Test message' });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail on missing content', async () => {
            const dto = plainToInstance(MessageDto, { role: 'user' });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });
    });

    describe('ArtifactUpdateAIRequestDto', () => {
        it('should validate a valid request', async () => {
            const dto = plainToInstance(ArtifactUpdateAIRequestDto, {
                messages: [{ role: 'user', content: 'Test message' }]
            });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should fail on empty messages array', async () => {
            const dto = plainToInstance(ArtifactUpdateAIRequestDto, { messages: [] });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail on missing messages', async () => {
            const dto = plainToInstance(ArtifactUpdateAIRequestDto, {});
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });
    });

    describe('StreamingChunkDto', () => {
        it('should validate a valid chunk', async () => {
            const dto = plainToInstance(StreamingChunkDto, { chunk: 'Test chunk' });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should validate a completed chunk with all fields', async () => {
            const dto = plainToInstance(StreamingChunkDto, {
                chunk: 'Test chunk',
                done: true,
                artifact_content: 'Final content',
                commentary: 'Final commentary'
            });
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should fail on missing chunk', async () => {
            const dto = plainToInstance(StreamingChunkDto, { done: true });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });
    });
});