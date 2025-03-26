# AI Module

This module provides integration with AI services for the AI-Assisted Software Engineering Platform.

## Overview

The AI module connects the application with various AI providers (e.g., OpenAI, Anthropic) to generate artifacts based on templates and user inputs. It handles the communication with these services, processes responses, and formats the content appropriately.

## Directory Structure

```
src/ai/
├── interfaces/            # Common interfaces
├── openai/                # OpenAI provider implementations
├── anthropic/             # Anthropic provider implementations
├── ai-provider.factory.ts # Factory for creating providers
├── ai-assistant.service.ts # Main service for AI interactions
├── response-parser.ts     # Utilities for parsing AI responses
├── ai.config.ts           # Configuration
└── ai.module.ts           # NestJS module definition
```

## Components

### Core Interfaces

- **AIProviderInterface**: Defines the contract for all AI provider implementations
- **AIMessage**: Interface for AI conversation messages
- **AIModelResponse**: Interface for structured AI responses

### Providers

#### OpenAI

- **OpenAIProvider**: Basic implementation for OpenAI's GPT models using traditional prompting
- **OpenAIFunctionCallingProvider**: Enhanced implementation using OpenAI's function calling capabilities

#### Anthropic

- **AnthropicProvider**: Basic implementation for Anthropic's Claude models using traditional prompting
- **AnthropicFunctionCallingProvider**: Enhanced implementation using Anthropic's tool use capabilities

### Utilities

- **response-parser.ts**: Functions to extract content and commentary from AI responses

### Factory

- **AIProviderFactory**: Factory pattern for creating and managing AI providers

### Main Service

- **AIAssistantService**: Coordinates the AI interactions, including generating artifacts, handling updates, and logging

## Provider Implementation Approaches

The module offers two implementation approaches for each AI provider:

1. **Traditional Prompting**: Uses a standard text-based prompt with formatting instructions

   - Suitable for simpler use cases
   - More flexible as it works with any model version

2. **Function/Tool-based**: Uses the provider's function calling or tool use capabilities
   - Provides more structured output
   - Better separation of artifact content and commentary
   - Requires models that support these capabilities
   - Often results in higher quality outputs for structured tasks

## Configuration

AI providers are configured via environment variables:

```
# Default provider
DEFAULT_AI_PROVIDER=anthropic

# OpenAI configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_DEFAULT_MODEL=gpt-4

# Anthropic configuration
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_DEFAULT_MODEL=claude-3-opus-20240229
```

See `ai.config.ts` for all available configuration options and defaults.

## Usage

1. Import the AIModule in your application module:

```typescript
import { Module } from '@nestjs/common';
import { AIModule } from './ai';

@Module({
  imports: [AIModule],
  // ...
})
export class AppModule {}
```

2. Inject and use the AIAssistantService:

```typescript
import { Injectable } from '@nestjs/common';
import { AIAssistantService } from './ai';

@Injectable()
export class YourService {
  constructor(private aiAssistantService: AIAssistantService) {}

  async generateNewArtifact(context) {
    return this.aiAssistantService.kickoffArtifactInteraction(context);
  }

  async updateArtifact(context, userMessage) {
    return this.aiAssistantService.updateArtifact(context, userMessage);
  }
}
```

3. To use a specific provider, specify it when calling:

```typescript
// Use default OpenAI provider
await this.aiAssistantService.kickoffArtifactInteraction(context, 'openai');

// Use OpenAI with function calling
await this.aiAssistantService.kickoffArtifactInteraction(
  context,
  'openai-function-calling',
);

// Use Anthropic with tool use
await this.aiAssistantService.updateArtifact(
  context,
  userMessage,
  'anthropic-function-calling',
);
```

## Streaming Support

The AI module supports streaming responses for a better user experience:

```typescript
await this.aiAssistantService.generateStreamingArtifact(
  context,
  false,
  userMessage,
  (chunk) => {
    // Handle each chunk of the response
    console.log(chunk);
  },
  'anthropic', // Provider ID (optional)
);
```

## Testing

The AI module includes comprehensive test coverage for all components:

- **Provider Tests**: Each provider has dedicated test suites that verify:

  - API request/response handling
  - Error management
  - Conversation history handling
  - Response parsing
  - Streaming functionality

- **AIAssistantService Tests**: Verify the service correctly coordinates with providers and templates

- **AIProviderFactory Tests**: Ensure proper provider registration and selection

- **Response Parser Tests**: Validate the extraction and validation of content from AI responses

To run the tests:

```bash
# Run all tests
npm test

# Run only AI module tests
npm test -- src/ai

# Run only OpenAI provider tests
npm test -- src/ai/openai
```

## Extending

To add a new AI provider:

1. Create a new provider class that implements `AIProviderInterface`
2. Create corresponding spec file for testing
3. Add it to the appropriate subfolder or create a new one
4. Update the barrel file for the subfolder
5. Register it in the `AIProviderFactory`
6. Update the configuration validation schema in `ai.config.ts`
7. Update the `AIModule` to include the new provider

## Logging

All AI interactions are logged to the `_ai_logs` directory with timestamps and relevant context information. These logs can be useful for debugging, tracking, and improving the AI interactions.
