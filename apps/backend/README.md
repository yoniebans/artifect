# Artifect Backend

This is a NestJS implementation of the Artifect Backend with Prisma ORM.

## Architecture

The Artifect backend follows a modular architecture using NestJS modules, with clear separation of concerns. Below is a C4 component diagram illustrating the system architecture:

```mermaid
C4Component
    title Artifect Backend System - C4 Component Diagram

    Container(frontendApp, "Frontend", "Next.js", "Provides the user interface for project and artifact management")

    System_Ext(clerkAuth, "Clerk", "Authentication service")
    System_Ext(anthropicAPI, "Anthropic API", "LLM provider for Claude models")
    System_Ext(openaiAPI, "OpenAI API", "LLM provider for GPT models")
    SystemDb_Ext(postgresDB, "PostgreSQL", "Stores projects, artifacts, and user data")

    Container_Boundary(backendBoundary, "Backend") {
        Component(apiModule, "API Module", "NestJS Module", "Handles HTTP requests and responses")
        Component(authModule, "Auth Module", "NestJS Module", "Manages authentication and user access")
        Component(workflowModule, "Workflow Orchestrator", "NestJS Module", "Coordinates business logic")
        Component(contextModule, "Context Manager", "NestJS Module", "Builds context for AI interactions")
        Component(aiModule, "AI Module", "NestJS Module", "Handles AI provider integrations")
        Component(repoModule, "Repositories Module", "NestJS Module", "Data access layer")
        Component(templatesModule, "Templates Module", "NestJS Module", "Manages AI prompts")
        Component(cacheModule, "Cache Module", "NestJS Module", "Caches database lookups")
        Component(prismaService, "Prisma Service", "Database Client", "ORM for database access")
    }

    Rel(frontendApp, apiModule, "Makes API calls to", "REST, SSE")
    Rel(apiModule, workflowModule, "Delegates requests to")
    Rel(apiModule, authModule, "Authenticates via")
    Rel(authModule, clerkAuth, "Verifies tokens with")
    Rel(workflowModule, contextModule, "Builds context using")
    Rel(workflowModule, aiModule, "Generates content via")
    Rel(workflowModule, repoModule, "Persists data using")
    Rel(contextModule, repoModule, "Retrieves dependencies via")
    Rel(aiModule, anthropicAPI, "Makes requests to")
    Rel(aiModule, openaiAPI, "Makes requests to")
    Rel(aiModule, templatesModule, "Gets prompt templates from")
    Rel(repoModule, cacheModule, "Uses for lookups")
    Rel(repoModule, prismaService, "Executes queries via")
    Rel(cacheModule, prismaService, "Caches results from")
    Rel(prismaService, postgresDB, "Connects to")
```

### Key Components

- **API Module**: Handles HTTP requests and responses, including controllers for health checks, projects, artifacts, streaming, and user management.
- **Auth Module**: Manages authentication and authorization using Clerk as the identity provider.
- **Workflow Orchestrator**: Central coordinator for business logic, orchestrating interactions between repositories, context manager, and AI assistant.
- **Context Manager**: Builds context for AI interactions based on artifact relationships.
- **AI Module**: Handles integration with AI providers (Anthropic and OpenAI), including response parsing.
- **Repositories Module**: Data access layer abstracting database operations for projects, artifacts, states, and users.
- **Templates Module**: Manages Handlebars templates for AI prompts.
- **Cache Module**: Caches database lookups for improved performance.
- **Prisma Service**: ORM for database access, connecting to PostgreSQL.

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- PostgreSQL database

## Installation

```bash
# Install dependencies
$ npm install

# Generate Prisma client
$ npx prisma generate
```

## Database Setup

1. Make sure your PostgreSQL database is running
2. Set the correct DATABASE_URL in the .env file
3. Run migrations to create the database schema:

```bash
# Apply migrations
$ npm run db:migrate:dev

# Seed the database with initial data
$ npm run db:seed
```

## Running the Application

```bash
# Development mode
$ npm run start:dev

# Production mode
$ npm run build
$ npm run start:prod
```

## Database Management

```bash
# Generate Prisma client after schema changes
$ npm run db:generate

# Create migrations after schema changes
$ npm run db:migrate:dev

# Deploy migrations in production
$ npm run db:migrate:deploy

# Seed the database
$ npm run db:seed

# Open Prisma Studio (web-based database explorer)
$ npm run db:studio
```

## Project Structure

- `prisma/`: Database schema and migrations
  - `schema.prisma`: Prisma schema definition
  - `migrations/`: Auto-generated migration files
  - `seed.ts`: Database seeding script
- `src/`: Source code
  - `ai/`: AI provider integrations and service
  - `api/`: API controllers and DTOs
  - `auth/`: Authentication services and guards
  - `config/`: Configuration files
  - `context/`: Context manager for AI interactions
  - `database/`: Prisma service and database utilities
  - `repositories/`: Data access layer
  - `services/`: Shared services including cache
  - `templates/`: Handlebars templates for AI prompts
  - `workflow/`: Workflow orchestration service
  - `app.module.ts`: Main application module
  - `main.ts`: Application entry point

## Database Schema

The database schema includes the following models:

- `Project`: Top-level container for artifacts
- `Artifact`: Generic container for all project elements
- `ArtifactVersion`: Version history for artifacts
- `ArtifactType`: Categories for artifacts (Vision, Requirements, etc.)
- `LifecyclePhase`: Development stages (Requirements, Design, etc.)
- `ArtifactState`: Status tracking (To Do, In Progress, Approved)
- `StateTransition`: Valid state transitions
- `ArtifactInteraction`: Record of user and AI interactions
- `ReasoningSummary`: AI explanations for changes
- `ReasoningPoint`: Specific reasoning elements

## Environment Variables

Create a `.env` file in the project root with the following variables:

```
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
PORT=3000
NODE_ENV=development

# Authentication
CLERK_API_KEY=your_clerk_api_key
CLERK_JWT_AUDIENCE=your_jwt_audience

# AI Providers
DEFAULT_AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_DEFAULT_MODEL=claude-3-opus-20240229
OPENAI_API_KEY=your_openai_api_key (optional)
OPENAI_DEFAULT_MODEL=gpt-4 (optional)
```

## Running Tests

To run the tests we've created, add or edit the following scripts in your package.json:

```json
"scripts": {
  // ... existing scripts
  "test:db": "jest src/database --runInBand",
  "test:config": "jest src/config --runInBand",
  "test:app": "jest src/app --runInBand",
  "test:all": "jest --runInBand",
  "test:e2e": "jest --config ./test/jest-e2e.json --runInBand",
  // ... other scripts
}
```

The `--runInBand` flag ensures tests run sequentially, which is important for database tests.

You can run the tests with:

```bash
# Run all unit tests
npm run test:all

# Run just database tests
npm run test:db

# Run just config tests
npm run test:config

# Run just app tests
npm run test:app

# Run end-to-end tests
npm run test:e2e
```

These test suites verify:

1. The database connection works through PrismaService
2. Configuration and validation are working correctly
3. The App service/controller are functioning
4. Basic e2e test verifies the system works end-to-end
