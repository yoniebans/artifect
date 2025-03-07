# API Gateway

This module provides the RESTful API for the AI-Assisted Software Engineering Platform, implementing the endpoints required for client applications to interact with the system.

## Overview

The API Gateway serves as the central entry point for all client requests, routing them to the appropriate services and handling request/response transformations, validation, error handling, and more.

## Key Components

### Controllers

Controllers handle incoming HTTP requests and return responses to the client:

- **HealthController**: Provides a health check endpoint
- **ProjectController**: Manages project CRUD operations
- **ArtifactController**: Handles artifact creation, updates, and interactions
- **AIProviderController**: Provides information about available AI providers
- **StreamingController**: Handles real-time streaming responses for AI interactions

### DTOs (Data Transfer Objects)

DTOs define the structure of request and response data:

- **Project DTOs**: Structures for project creation, summaries, and detailed views
- **Artifact DTOs**: Structures for artifact operations, states, and AI interactions
- **AIProvider DTOs**: Structures for AI provider information
- **Streaming DTOs**: Structures for Server-Sent Events (SSE) streaming responses

### Services

- **SSEService**: Manages Server-Sent Events for real-time streaming of AI responses

### Interceptors

- **LoggingInterceptor**: Logs all API requests and responses

### Filters

- **HttpExceptionFilter**: Provides consistent error response formatting

## API Endpoints

### Health Check

- **GET /health**: Get application health status

### Projects

- **POST /project/new**: Create a new project
- **GET /project**: List all projects
- **GET /project/{project_id}**: Get detailed project information

### Artifacts

- **POST /artifact/new**: Create a new artifact
- **PUT /artifact/{artifact_id}**: Update an artifact
- **GET /artifact/{artifact_id}**: Get artifact details
- **PUT /artifact/{artifact_id}/ai**: Interact with an artifact using AI
- **PUT /artifact/{artifact_id}/state/{state_id}**: Change artifact state

### Streaming Endpoints

- **POST /stream/artifact/{artifact_id}/ai**: Stream interaction with an artifact using AI, with real-time updates delivered via Server-Sent Events (SSE)

### AI Providers

- **GET /ai-providers**: List available AI providers and models

## Headers

The API supports the following custom headers:

- **X-AI-Provider**: Specify the AI provider to use (e.g., "anthropic", "openai")
- **X-AI-Model**: Specify the AI model to use (e.g., "claude-3-opus-20240229", "gpt-4")

## Response Format

All responses follow a consistent format:

- Success responses return the requested data directly
- Error responses include:
  - `statusCode`: HTTP status code
  - `message`: Error description
  - `error`: Error type
  - `timestamp`: When the error occurred
  - `path`: Request path
  - `method`: HTTP method

### Streaming Response Format

Streaming endpoints use Server-Sent Events (SSE) format with the following structure:

- Each event contains a chunk of the response as a JSON object:
  - `chunk`: A piece of generated text
  - `done`: Boolean indicating if this is the final chunk (only in last event)
  - `artifact_content`: Complete artifact content (only in last event)
  - `commentary`: Complete commentary (only in last event)

Example streaming response:

```
data: {"chunk":"I'll "}
data: {"chunk":"help "}
data: {"chunk":"you "}
data: {"chunk":"design "}
data: {"chunk":"this "}
data: {"chunk":"feature."}
data: {"chunk":"", "done":true, "artifact_content":"# Feature Design\n\n...", "commentary":"I've created a design that..."}
```

## Using Streaming Endpoints

To consume streaming endpoints in a frontend application:

1. Make a POST request to the streaming endpoint with appropriate headers
2. Set `Accept: text/event-stream` header
3. Process the response as a stream of Server-Sent Events
4. Update the UI in real-time as chunks arrive
5. Handle the final event with complete content

```javascript
fetch('/api/stream/artifact/123/ai', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    'X-AI-Provider': 'anthropic',
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Design a new feature' }],
  }),
}).then((response) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  function processChunks() {
    reader.read().then(({ done, value }) => {
      if (done) return;

      const chunk = decoder.decode(value);
      // Process the chunk...

      processChunks(); // Continue reading
    });
  }

  processChunks();
});
```

## API Documentation

The API documentation is available at `/api` when the application is running, powered by Swagger/OpenAPI.

## Testing

The API Gateway includes integration tests that verify the correct functionality of all endpoints, including:

- Request validation
- Response format and content
- Error handling
- Authorization (when implemented)
- Streaming functionality

Run the tests with:

```bash
npm run test:integration
```

Or run specific API tests:

```bash
npm test -- api.integration.spec.ts
```

## Cross-Origin Resource Sharing (CORS)

CORS is enabled to allow frontend applications to connect to the API. The allowed origins can be configured through the `CORS_ORIGIN` environment variable.

## Error Handling

The API Gateway provides comprehensive error handling through:

1. Input validation using class-validator
2. Custom exception filters
3. Detailed error messages
4. Consistent error response format

### Streaming Error Handling

For streaming endpoints, errors are sent as special events in the stream:

```
data: {"chunk":"Error: Artifact with id 123 not found", "done":true}
```

The stream will then close, and the client should handle the error appropriately.

## Future Improvements

- Implement authentication and authorization
- Add rate limiting
- Implement request caching
- Add API versioning
- Implement client-specific API keys
- Enhance streaming capabilities with progress reporting
