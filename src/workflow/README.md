# Workflow Orchestration Module

This module is responsible for coordinating the entire workflow process of the AI-Assisted Software Engineering Platform.

## Overview

The Workflow Orchestrator is the central coordinator that brings together all other modules to manage the lifecycle of projects and artifacts. It handles the creation and updating of artifacts, manages state transitions, coordinates AI interactions, and maintains version history.

## Key Components

### WorkflowOrchestratorService

The main service that implements the `WorkflowOrchestratorInterface`, providing the following functionality:

- **Project Management**: Creating, listing, and viewing projects
- **Artifact Management**: Creating, updating, and transitioning artifacts
- **AI Interaction**: Coordinating the generation of artifacts through AI models
- **Context Building**: Collecting the necessary context for artifact generation
- **State Management**: Handling artifact state transitions
- **Version Control**: Managing artifact versions

## Usage

### Module Integration

Include the `WorkflowOrchestratorModule` in your application module:

```typescript
import { Module } from '@nestjs/common';
import { WorkflowOrchestratorModule } from './workflow';

@Module({
  imports: [WorkflowOrchestratorModule],
  // ...
})
export class AppModule {}
```

### Basic Project Management

```typescript
import { Injectable } from '@nestjs/common';
import { WorkflowOrchestratorService } from './workflow';

@Injectable()
export class ProjectService {
  constructor(private workflowOrchestrator: WorkflowOrchestratorService) {}

  async createNewProject(name: string) {
    return this.workflowOrchestrator.createProject(name);
  }

  async getAllProjects() {
    return this.workflowOrchestrator.listProjects();
  }

  async getProjectDetails(id: number) {
    return this.workflowOrchestrator.viewProject(id);
  }
}
```

### Artifact Creation and Interaction

```typescript
import { Injectable } from '@nestjs/common';
import { WorkflowOrchestratorService } from './workflow';

@Injectable()
export class ArtifactService {
  constructor(private workflowOrchestrator: WorkflowOrchestratorService) {}

  async createNewArtifact(projectId: number, type: string, provider?: string) {
    return this.workflowOrchestrator.createArtifact(projectId, type, provider);
  }

  async getArtifactWithHistory(artifactId: number) {
    return this.workflowOrchestrator.getArtifactDetails(artifactId);
  }

  async sendUserMessage(
    artifactId: number,
    message: string,
    provider?: string,
  ) {
    return this.workflowOrchestrator.interactArtifact(
      artifactId,
      message,
      provider,
    );
  }

  async changeArtifactState(artifactId: number, newStateId: number) {
    return this.workflowOrchestrator.transitionArtifact(artifactId, newStateId);
  }
}
```

## Dependencies

The workflow orchestrator depends on several other modules:

- **Repositories Module**: For data access
- **Templates Module**: For template rendering
- **Context Manager Module**: For building context for AI interactions
- **AI Module**: For AI model integration

## Error Handling

The workflow orchestrator provides detailed error messages for various scenarios:

- **Not Found Errors**: When projects or artifacts don't exist
- **Validation Errors**: When required fields are missing or invalid
- **State Transition Errors**: When attempting invalid state transitions
- **Context Building Errors**: When required dependencies are missing for context

## API Response Structure

### Project Metadata

```typescript
{
  project_id: string;
  name: string;
  created_at: Date;
  updated_at: Date | null;
}
```

### Project Details

```typescript
{
  project_id: string;
  name: string;
  created_at: Date;
  updated_at: Date | null;
  artifacts: {
    [phase: string]: Array<{
      id: string | null;
      name: string;
      type: string;
      type_id: string;
      content: string | null;
      version_number: string | null;
      state_id: string | null;
      state_name: string | null;
      available_transitions: Array<{
        state_id: string;
        state_name: string;
      }>;
      dependent_type_id: string | null;
    }>;
  };
}
```

### Artifact Details

```typescript
{
  artifact: {
    artifact_id: string;
    artifact_type_id: string;
    artifact_type_name: string;
    artifact_version_number: string | null;
    artifact_version_content: string | null;
    name: string;
    state_id: string;
    state_name: string;
    available_transitions: Array<{
      state_id: string;
      state_name: string;
    }>;
    dependent_type_id: string | null;
  }
  chat_completion: {
    messages: Array<{
      role: string;
      content: string;
    }>;
  }
}
```
