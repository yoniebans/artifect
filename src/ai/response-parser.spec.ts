// src/ai/response-parser.spec.ts

import { extractContentAndCommentary, hasValidArtifactContent, validateAndFormatResponse } from './response-parser';
import { ArtifactFormat } from '../templates/interfaces/template-manager.interface';
import { AIModelResponse } from './interfaces/ai-provider.interface';

describe('Response Parser Utils', () => {
    // Test data
    const mockArtifactFormat: ArtifactFormat = {
        startTag: '[TEST]',
        endTag: '[/TEST]',
        syntax: 'markdown',
        commentaryStartTag: '[COMMENTARY]',
        commentaryEndTag: '[/COMMENTARY]'
    };

    describe('extractContentAndCommentary', () => {
        it('should extract artifact content when tags are present', () => {
            const response = 'Here is the content:\n[TEST]Test content[/TEST]';
            const result = extractContentAndCommentary(response, mockArtifactFormat);

            expect(result.artifactContent).toBe('Test content');
            expect(result.rawResponse).toBe(response);
        });

        it('should extract commentary when commentary tags are present', () => {
            const response = 'Here is the content:\n[TEST]Test content[/TEST]\n\n[COMMENTARY]This is a comment[/COMMENTARY]';
            const result = extractContentAndCommentary(response, mockArtifactFormat);

            expect(result.artifactContent).toBe('Test content');
            expect(result.commentary).toBe('This is a comment');
        });

        it('should treat text outside artifact tags as commentary when no commentary tags', () => {
            const response = 'This is a comment\n[TEST]Test content[/TEST]\nMore commentary here';
            const result = extractContentAndCommentary(response, mockArtifactFormat);

            expect(result.artifactContent).toBe('Test content');
            expect(result.commentary).toBe('This is a comment\n\nMore commentary here');
        });

        it('should handle responses with no artifact tags', () => {
            const response = 'This is just commentary with no artifact content';
            const result = extractContentAndCommentary(response, mockArtifactFormat);

            expect(result.artifactContent).toBe('');
            expect(result.commentary).toBe('This is just commentary with no artifact content');
        });

        it('should handle empty responses', () => {
            const response = '';
            const result = extractContentAndCommentary(response, mockArtifactFormat);

            expect(result.artifactContent).toBe('');
            expect(result.commentary).toBe('');
        });

        it('should handle responses with multiple artifact tag pairs', () => {
            const response = '[TEST]First content[/TEST]\n\n[TEST]Second content[/TEST]';
            const result = extractContentAndCommentary(response, mockArtifactFormat);

            // Should extract the content between the first start tag and the last end tag
            expect(result.artifactContent).toBe('First content[/TEST]\n\n[TEST]Second content');
        });
    });

    describe('hasValidArtifactContent', () => {
        it('should return true when artifact tags are present and valid', () => {
            const response = 'Here is the content:\n[TEST]Test content[/TEST]';
            const result = hasValidArtifactContent(response, mockArtifactFormat);

            expect(result).toBe(true);
        });

        it('should return false when no artifact tags are present', () => {
            const response = 'This is just commentary with no artifact content';
            const result = hasValidArtifactContent(response, mockArtifactFormat);

            expect(result).toBe(false);
        });

        it('should return false when only start tag is present', () => {
            const response = 'Here is the content:\n[TEST]Test content';
            const result = hasValidArtifactContent(response, mockArtifactFormat);

            expect(result).toBe(false);
        });

        it('should return false when only end tag is present', () => {
            const response = 'Here is the content:\nTest content[/TEST]';
            const result = hasValidArtifactContent(response, mockArtifactFormat);

            expect(result).toBe(false);
        });

        it('should return false when end tag comes before start tag', () => {
            const response = 'Here is the content:\n[/TEST]Test content[TEST]';
            const result = hasValidArtifactContent(response, mockArtifactFormat);

            expect(result).toBe(false);
        });
    });

    describe('validateAndFormatResponse', () => {
        it('should pass through valid responses', () => {
            const extractedResponse: AIModelResponse = {
                rawResponse: 'raw response',
                artifactContent: 'artifact content',
                commentary: 'commentary'
            };

            const result = validateAndFormatResponse(extractedResponse, false);

            expect(result).toEqual(extractedResponse);
        });

        it('should throw error for update responses with no artifact content', () => {
            const extractedResponse: AIModelResponse = {
                rawResponse: 'raw response',
                artifactContent: '',
                commentary: 'commentary'
            };

            expect(() => validateAndFormatResponse(extractedResponse, true)).toThrow();
        });

        it('should handle responses with missing fields', () => {
            const extractedResponse: AIModelResponse = {
                rawResponse: 'raw response'
            };

            const result = validateAndFormatResponse(extractedResponse, false);

            expect(result).toEqual({
                rawResponse: 'raw response',
                artifactContent: '',
                commentary: ''
            });
        });
    });
});