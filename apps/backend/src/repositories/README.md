# Repository Layer

This directory contains the repository implementations for the AI-Assisted Software Engineering Platform.

## Overview

The repository layer provides an abstraction between the database and the business logic of the application. It implements the repository pattern to handle data access operations and encapsulates the logic required to access data sources.

## Repository Structure

| Repository            | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| `ProjectRepository`   | Handles project-related operations             |
| `ArtifactRepository`  | Manages artifacts, versions, types, and states |
| `StateRepository`     | Manages artifact state transitions             |
| `ReasoningRepository` | Handles reasoning summaries and points         |

## Usage

1. Import the `RepositoriesModule` in your module:

```typescript
import { Module } from '@nestjs/common';
import { RepositoriesModule } from './repositories/repositories.module';

@Module({
  imports: [RepositoriesModule],
  // ...
})
export class YourModule {}
```

2. Inject the repositories in your service:

```typescript
import { Injectable } from '@nestjs/common';
import { ProjectRepository } from './repositories/project.repository';

@Injectable()
export class YourService {
  constructor(private projectRepository: ProjectRepository) {}

  async getAllProjects() {
    return this.projectRepository.findAll();
  }
}
```

## Repository Interfaces

All repositories implement interfaces that define their contract:

- `BaseRepositoryInterface`: Common CRUD operations
- `ProjectRepositoryInterface`: Project-specific operations
- `ArtifactRepositoryInterface`: Artifact-specific operations
- `StateRepositoryInterface`: State management operations
- `ReasoningRepositoryInterface`: Reasoning data operations

## Testing

The repository layer includes unit tests for each repository and integration tests for the module.

To run the repository unit tests:

```bash
npm run test:repositories
```

To run the repository E2E tests (requires a database):

```bash
npm run test:repositories:e2e
```

## Dependencies

The repositories depend on:

- `PrismaService`: Database access via Prisma ORM
- `CacheService`: Caching frequently accessed data to reduce database queries

## Data Flow

```
Service Layer → Repository Layer → PrismaService → Database
                     ↓
                CacheService
```

## Transactional Operations

Some repository methods use transactions to ensure data consistency when performing multiple operations. For example:

- Creating an artifact with its first version
- Updating an artifact's state with validation

## Common Patterns

1. **Error Handling**: Repository methods catch database errors and translate them into application-specific errors or handle gracefully.

2. **Caching**: Frequently accessed data (like types, states) is cached to reduce database queries.

3. **Validation**: Before performing operations, repositories validate data to ensure integrity.

4. **Eager Loading**: Repositories use Prisma's include functionality to load related entities when needed.
