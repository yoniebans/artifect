// src/ai/response-parser.ts

import { AIModelResponse } from './interfaces/ai-provider.interface';
import { ArtifactFormat } from '../templates/interfaces/template-manager.interface';

/**
 * Extracts the artifact content and commentary from a raw AI response
 * 
 * @param response - Raw response from the AI model
 * @param artifactFormat - Format specifications for the artifact
 * @returns Structured response with artifact content and commentary
 */
export function extractContentAndCommentary(
    response: string,
    artifactFormat: ArtifactFormat
): AIModelResponse {
    const result: AIModelResponse = {
        rawResponse: response,
        artifactContent: '',
        commentary: ''
    };

    // Extract artifact content
    const startTag = artifactFormat.startTag;
    const endTag = artifactFormat.endTag;
    const startIndex = response.indexOf(startTag);
    const endIndex = response.lastIndexOf(endTag);

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        result.artifactContent = response.substring(
            startIndex + startTag.length,
            endIndex
        ).trim();
    }

    // Extract commentary if available
    if (artifactFormat.commentaryStartTag && artifactFormat.commentaryEndTag) {
        const commentaryStartTag = artifactFormat.commentaryStartTag;
        const commentaryEndTag = artifactFormat.commentaryEndTag;
        const commentaryStartIndex = response.indexOf(commentaryStartTag);
        const commentaryEndIndex = response.lastIndexOf(commentaryEndTag);

        if (
            commentaryStartIndex !== -1 &&
            commentaryEndIndex !== -1 &&
            commentaryEndIndex > commentaryStartIndex
        ) {
            result.commentary = response.substring(
                commentaryStartIndex + commentaryStartTag.length,
                commentaryEndIndex
            ).trim();
        } else {
            // If commentary tags aren't found, use any text outside the artifact tags as commentary
            if (startIndex !== -1 && endIndex !== -1) {
                const beforeArtifact = response.substring(0, startIndex).trim();
                const afterArtifact = response.substring(endIndex + endTag.length).trim();
                result.commentary = [beforeArtifact, afterArtifact].filter(Boolean).join('\n\n');
            } else {
                // If no artifact tags are found, consider the entire response as commentary
                result.commentary = response.trim();
            }
        }
    }

    return result;
}

/**
 * Checks if a response contains valid artifact content
 * 
 * @param response - The AI model response to check
 * @param artifactFormat - Format specifications for the artifact
 * @returns Whether the response contains valid artifact content
 */
export function hasValidArtifactContent(
    response: string,
    artifactFormat: ArtifactFormat
): boolean {
    const startTag = artifactFormat.startTag;
    const endTag = artifactFormat.endTag;
    const startIndex = response.indexOf(startTag);
    const endIndex = response.lastIndexOf(endTag);

    return startIndex !== -1 && endIndex !== -1 && endIndex > startIndex;
}

/**
 * Validates and formats the extracted artifact content and commentary
 * 
 * @param extractedResponse - Extracted response with artifact content and commentary
 * @param isUpdate - Whether this is an update to an existing artifact
 * @returns Validated and formatted response
 */
export function validateAndFormatResponse(
    extractedResponse: AIModelResponse,
    isUpdate: boolean
): AIModelResponse {
    const { rawResponse, artifactContent, commentary } = extractedResponse;

    // For updates, make sure we have artifact content
    if (isUpdate && (!artifactContent || artifactContent.trim() === '')) {
        throw new Error('Update response must contain artifact content');
    }

    return {
        rawResponse,
        artifactContent: artifactContent || '',
        commentary: commentary || ''
    };
}