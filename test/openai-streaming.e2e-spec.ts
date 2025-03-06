// test/openai-streaming.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OpenAIProvider } from '../src/ai/openai.provider';
import configuration from '../src/config/configuration';
import aiConfiguration from '../src/ai/ai.config';

/**
 * This test demonstrates the streaming functionality by making a real request to OpenAI
 * and showing the streamed response chunks.
 * 
 * IMPORTANT: You must have a valid OPENAI_API_KEY in your .env file to run this test.
 * 
 * To run this test specifically:
 * npm run test:e2e -- openai-streaming
 */
describe('OpenAI Streaming (e2e)', () => {
    let app: INestApplication;
    let openaiProvider: OpenAIProvider;
    let configService: ConfigService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    load: [configuration, aiConfiguration],
                    isGlobal: true,
                }),
            ],
            providers: [OpenAIProvider],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        openaiProvider = moduleFixture.get<OpenAIProvider>(OpenAIProvider);
        configService = moduleFixture.get<ConfigService>(ConfigService);

        // Check if OpenAI API key is available
        const apiKey = configService.get<string>('OPENAI_API_KEY');
        if (!apiKey) {
            console.warn('\n⚠️ OPENAI_API_KEY not found in environment. This test will be skipped.');
        }
    });

    afterAll(async () => {
        await app.close();
    });

    it('should stream responses from OpenAI API', async () => {
        // Skip test if no API key is available
        const apiKey = configService.get<string>('OPENAI_API_KEY');
        if (!apiKey) {
            console.log('⏭️ Skipping test due to missing OPENAI_API_KEY');
            return;
        }

        // Prepare test parameters
        const systemPrompt = 'You are a helpful assistant that provides detailed responses';
        const userPrompt = 'Write a short paragraph about how AI is changing software development. Include at least 3 specific examples.';
        const artifactFormat = {
            startTag: '[CONTENT]',
            endTag: '[/CONTENT]',
            syntax: 'markdown',
        };

        // Collect chunks for verification
        const chunks: string[] = [];

        const chunkCallback = (chunk: string) => {
            chunks.push(chunk);
            // Just show each chunk as it arrives, without rewriting previous text
            process.stdout.write(`Chunk ${chunks.length}: "${chunk}"\n`);
        };

        console.log('\n🚀 Starting streaming test with OpenAI...');
        console.log('📤 Streaming response (simulating chat interface):');

        // Set a longer timeout since we're making an actual API call
        jest.setTimeout(30000);

        // Execute streaming response
        const response = await openaiProvider.generateStreamingResponse(
            systemPrompt,
            userPrompt,
            artifactFormat,
            false,
            [],
            'gpt-3.5-turbo', // Using a cheaper model for testing
            chunkCallback
        );

        // Add new line after streaming is complete
        console.log('\n\n✅ Streaming completed');
        console.log(`📊 Received ${chunks.length} chunks`);
        console.log(`📝 Full response length: ${response.length} characters`);

        // Display chunk statistics (optional)
        const avgChunkSize = Math.round(response.length / chunks.length);
        console.log(`📊 Average chunk size: ${avgChunkSize} characters`);

        // Log a few example chunks to show their content
        console.log('\n📋 Sample of individual chunks:');
        for (let i = 0; i < Math.min(5, chunks.length); i++) {
            console.log(`   Chunk ${i + 1}: "${chunks[i]}"`);
        }
        if (chunks.length > 5) {
            console.log(`   ... and ${chunks.length - 5} more chunks`);
        }

        // Verify we got a proper response
        expect(response.length).toBeGreaterThan(0);
        expect(chunks.length).toBeGreaterThan(1);

        // Verify that concatenating all chunks equals the full response
        const concatenatedChunks = chunks.join('');
        expect(concatenatedChunks).toEqual(response);

        // Simple content verification - should contain key terms related to AI in software development
        const hasRelevantTerms = /(AI|software|development|code|generation|testing)/.test(response);
        expect(hasRelevantTerms).toBe(true);
    });
});