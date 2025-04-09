# Database Module

This module provides database access and management for the AI-Assisted Software Engineering Platform, using Prisma ORM for type-safe database operations.

## Overview

The Database Module manages the connection to the PostgreSQL database, provides the Prisma service for type-safe database access, and defines the schema for all entities in the system. It serves as the foundation for all data persistence in the application.

## Data Model

The following entity-relationship diagram shows the database schema:

```mermaid
erDiagram
    User {
        int id PK
        string clerkId UK
        string email UK
        string firstName
        string lastName
        boolean isAdmin
        datetime createdAt
        datetime updatedAt
    }

    ProjectType {
        int id PK
        string name UK
        string description
        boolean isActive
        datetime created_at
        datetime updated_at
    }

    Project {
        int id PK
        string name
        datetime created_at
        datetime updated_at
        int userId FK
        int project_type_id FK
    }

    LifecyclePhase {
        int id PK
        string name
        int order
        int project_type_id FK
    }

    ArtifactType {
        int id PK
        string name
        string slug UK
        string syntax
        int lifecycle_phase_id FK
    }

    TypeDependency {
        int dependent_type_id PK,FK
        int dependency_type_id PK,FK
    }

    ArtifactState {
        int id PK
        string name
    }

    StateTransition {
        int id PK
        int from_state_id FK
        int to_state_id FK
    }

    Artifact {
        int id PK
        int project_id FK
        int artifact_type_id FK
        int current_version_id FK,UK
        int state_id FK
        string name
        datetime created_at
        datetime updated_at
    }

    ArtifactVersion {
        int id PK
        int artifact_id FK
        int version_number
        string content
        datetime created_at
    }

    ArtifactInteraction {
        int id PK
        int artifact_id FK
        int version_id FK
        string role
        string content
        int sequence_number
        datetime created_at
    }

    ReasoningSummary {
        int id PK
        int artifact_id FK
        string summary
        datetime last_updated
    }

    SummaryVersion {
        int summary_id PK,FK
        int version_id PK,FK
    }

    ReasoningPoint {
        int id PK
        int summary_id FK
        string category
        string point
        int importance_score
    }

    User ||--o{ Project : "has many"
    ProjectType ||--o{ Project : "has many"
    ProjectType ||--o{ LifecyclePhase : "has many"
    Project ||--o{ Artifact : "has many"

    LifecyclePhase ||--o{ ArtifactType : "has many"

    ArtifactType ||--o{ Artifact : "has many"
    ArtifactType ||--o{ TypeDependency : "dependent type"
    ArtifactType ||--o{ TypeDependency : "dependency type"

    ArtifactState ||--o{ Artifact : "has many"
    ArtifactState ||--o{ StateTransition : "from state"
    ArtifactState ||--o{ StateTransition : "to state"

    Artifact ||--o| ArtifactVersion : "current version"
    Artifact ||--o{ ArtifactVersion : "has versions"
    Artifact ||--o{ ArtifactInteraction : "has interactions"
    Artifact ||--o{ ReasoningSummary : "has summaries"

    ArtifactVersion ||--o{ ArtifactInteraction : "has interactions"
    ArtifactVersion ||--o{ SummaryVersion : "linked to summaries"

    ReasoningSummary ||--o{ ReasoningPoint : "has points"
    ReasoningSummary ||--o{ SummaryVersion : "linked to versions"
```

## Key Entities

### User Management

- **User**: System users with authentication via Clerk integration

### Project Structure

- **ProjectType**: Types of projects (Software Engineering, Product Design, etc.) that define the available lifecycle phases and artifact types for each project category
- **Project**: Top-level container for artifacts, associated with a specific project type
- **LifecyclePhase**: Development stages (Requirements, Design, etc.) specific to a project type
- **ArtifactType**: Categories for artifacts (Vision, Requirements, etc.) that belong to specific lifecycle phases within a project type
- **TypeDependency**: Dependencies between artifact types

### Artifact Management

- **Artifact**: Generic container for all project elements, associated with a specific project and artifact type
- **ArtifactVersion**: Version history for artifacts
- **ArtifactState**: Status tracking (To Do, In Progress, Approved)
- **StateTransition**: Valid state transitions

### Reasoning and Interaction

- **ArtifactInteraction**: Record of user and AI interactions
- **ReasoningSummary**: AI explanations for changes
- **ReasoningPoint**: Specific reasoning elements
- **SummaryVersion**: Links between summaries and versions

## Prisma Service

The `PrismaService` is the central component of the Database Module, extending Prisma's client functionality with additional methods for the application:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'testing'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'production') {
      // Helper method for testing - cleans database
      // Code for cleaning the database in test environments
    }
  }
}
```

## Usage

### Importing the Module

```typescript
import { Module } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

### Using the Prisma Service

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { Project } from '@prisma/client';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async findProjectById(id: number): Promise<Project | null> {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        artifacts: true,
        projectType: true,
      },
    });
  }

  async createProject(
    name: string,
    userId: number,
    projectTypeId: number,
  ): Promise<Project> {
    return this.prisma.project.create({
      data: {
        name,
        userId,
        projectTypeId,
      },
    });
  }
}
```

## Schema Management

The database schema is defined in `prisma/schema.prisma` and managed through Prisma migrations.

### Key Schema Features

- **Project Type Hierarchy**: The schema is organized around project types (e.g., Software Engineering, Product Design) which determine the available lifecycle phases and artifact types
- **Snake Case Mapping**: Database columns use snake_case with `@map` directives
- **Relations**: Fully defined relationships between entities
- **Indexes**: Strategic indexes for performance optimization
- **Constraints**: Unique constraints and foreign key relationships
- **Project Types**: Projects are organized by project types, which define appropriate lifecycle phases and available artifact types

## Database Operations

### Migrations

```bash
# Create a new migration after schema changes
$ npm run db:migrate:dev

# Apply migrations in production
$ npm run db:migrate:deploy
```

### Seeding

```bash
# Seed the database with initial data
$ npm run db:seed
```

The seed process creates:

1. Project types (Software Engineering, Product Design)
2. Lifecycle phases for each project type
3. Artifact types specific to each lifecycle phase
4. Dependencies between artifact types
5. Artifact states and transitions

### Database Reset

```bash
# Reset database (development/testing only)
$ npm run db:reset

# Reset and seed database
$ npm run db:reset:seed
```

### Prisma Studio

```bash
# Launch Prisma Studio (database browser)
$ npm run db:studio
```

## Environment Configuration

The database connection is configured through the `DATABASE_URL` environment variable:

```
DATABASE_URL="postgresql://username:password@localhost:5432/artifect?schema=public"
```

## Testing

For testing, a separate test database should be used:

```
# .env.test
DATABASE_URL="postgresql://username:password@localhost:5432/artifect_test?schema=public"
```

The PrismaService includes a `cleanDatabase` method specifically for testing purposes, which can be used to reset the database between tests:

```typescript
// In your test setup
beforeEach(async () => {
  await prismaService.cleanDatabase();
});
```

## Transaction Support

Prisma supports transactions for operations that need to be executed atomically:

```typescript
// Example transaction
await this.prisma.$transaction(async (tx) => {
  // Create artifact
  const artifact = await tx.artifact.create({
    data: {
      projectId: projectId,
      artifactTypeId: artifactTypeId,
      name: name,
      stateId: initialStateId,
    },
  });

  // Create first version
  const version = await tx.artifactVersion.create({
    data: {
      artifactId: artifact.id,
      versionNumber: 1,
      content: content,
    },
  });

  // Update artifact with current version
  return tx.artifact.update({
    where: { id: artifact.id },
    data: { currentVersionId: version.id },
  });
});
```

## Best Practices

1. **Use Repositories**: Don't use PrismaService directly in business logic; use repository pattern
2. **Type Safety**: Leverage Prisma's generated types for type-safe database access
3. **Transactions**: Use transactions for operations that need to be atomic
4. **Error Handling**: Handle Prisma-specific errors (like `P2025` for not found)
5. **Connection Management**: Let PrismaService handle connections via lifecycle hooks
6. **Separation of Concerns**: Keep database access logic separated from business logic
7. **Testing**: Use a separate test database and the `cleanDatabase` method
8. **Project Types**: Respect the project type hierarchy when creating and querying entities
9. **Cross-Project Type Validation**: Ensure artifacts belong to appropriate project types

## Project Type System

The database schema now supports a flexible project type system:

1. **Multiple Project Types**: The system can support different project methodologies (Software Engineering, Product Design, etc.)
2. **Type-Specific Phases**: Each project type has its own set of lifecycle phases
3. **Type-Specific Artifacts**: Artifact types are defined within the context of a project type's phases
4. **Validation**: The system prevents creating artifacts that aren't valid for a project's type
5. **Dependencies**: Artifact dependencies are enforced within each project type

## Future Improvements

- Implement database sharding for scaling
- Add support for read replicas
- Implement soft delete functionality
- Add audit logging for data changes
- Optimize indexes based on query patterns
- Implement database-level row-level security
- Add configurable project type templates
- Support for custom project type definitions
