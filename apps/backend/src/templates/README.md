# Template Management System

This module provides a template management system for the AI-Assisted Software Engineering Platform. It replaces the Python-based Jinja2 template system with a TypeScript-based Handlebars template system.

## Architecture

The template management system is responsible for loading and rendering templates, managing system prompts, and providing the necessary inputs for AI model interactions. Below is a C4 component diagram illustrating how the Templates Module integrates with the rest of the system:

```mermaid
C4Component
    title Templates Module - C4 Component Diagram

    Container_Boundary(backendBoundary, "Backend Container") {
        Component(aiAssistant, "AI Assistant Service", "NestJS Service", "Handles AI provider interactions")
        Component(workflowOrchestrator, "Workflow Orchestrator", "NestJS Service", "Coordinates business logic")
        Component(contextManager, "Context Manager", "NestJS Service", "Builds context for AI interactions")

        Container_Boundary(templatesBoundary, "Templates Module") {
            Component(templateManager, "Template Manager Service", "NestJS Service", "Manages and renders templates")
            Component(templateHelpers, "Template Helpers", "Utility Functions", "Extends Handlebars functionality")

            Component(systemPrompts, "System Prompts", "Handlebars Templates", "AI model instructions per phase")
            Component(artifactTemplates, "Artifact Templates", "Handlebars Templates", "User message templates")

            Component(templateInterface, "Template Manager Interface", "TypeScript Interface", "Defines template operations")
        }

        Component(cacheService, "Cache Service", "NestJS Service", "Provides cached artifact information")
    }

    SystemDb_Ext(fileSystem, "File System", "Stores template files")

    Rel(aiAssistant, templateManager, "Gets prompt templates from")
    Rel(workflowOrchestrator, aiAssistant, "Uses")
    Rel(aiAssistant, contextManager, "Gets context from")

    Rel(templateManager, systemPrompts, "Loads and renders")
    Rel(templateManager, artifactTemplates, "Loads and renders")
    Rel(templateManager, templateHelpers, "Uses")
    Rel(templateManager, templateInterface, "Implements")

    Rel(templateManager, cacheService, "Gets artifact formats from")
    Rel(templateManager, fileSystem, "Reads templates from")
```

## Overview

The template management system is responsible for:

- Loading and rendering templates
- Managing system prompts
- Providing the necessary inputs for AI model interactions
- Handling template context data

## Key Components

### TemplateManagerService

The main service responsible for template management, with the following capabilities:

- Loading templates and system prompts from the filesystem
- Rendering templates with context data
- Getting and rendering system prompts
- Providing artifact input for AI generation

### Template Types

Two main types of templates are supported:

1. **Artifact Templates**: Used for generating user messages

   - `artifact_new.hbs`: Template for creating new artifacts
   - `artifact_update.hbs`: Template for updating existing artifacts

2. **System Prompts**: Used for instructing the AI model
   - `requirements_agent.hbs`: Instructions for requirements engineering
   - `design_agent.hbs`: Instructions for design phases
   - `data_agent.hbs`: Instructions for data modeling

### Handlebars Helpers

Custom helper functions that extend Handlebars templating capabilities:

- Conditional helpers (`ifEquals`, `ifContains`, etc.)
- Data manipulation helpers (`join`, `slice`, etc.)
- Formatting helpers (`formatDate`, `uppercase`, etc.)

## Usage

### Module Integration

Include the `TemplatesModule` in your application:

```typescript
import { Module } from '@nestjs/common';
import { TemplatesModule } from './templates/templates.module';

@Module({
  imports: [TemplatesModule],
  // ...
})
export class AppModule {}
```

### Injecting the Template Manager

```typescript
import { Injectable } from '@nestjs/common';
import { TemplateManagerService } from './templates/services/template-manager.service';

@Injectable()
export class YourService {
  constructor(private templateManager: TemplateManagerService) {}

  async generateArtifact(context: Record<string, any>) {
    const templateInput = await this.templateManager.getArtifactInput(context);

    // Use the template input for AI generation
    // ...
  }
}
```

### Adding New Templates

1. Create a new Handlebars template file (`.hbs`) in the appropriate directory
2. The template will be automatically loaded by the `TemplateManagerService` on initialization

## Template Format

Templates use Handlebars syntax, with the following features:

- Variable interpolation: `{{variable}}`
- Conditionals: `{{#if condition}}...{{/if}}`
- Loops: `{{#each items}}...{{/each}}`
- Custom helpers: `{{#ifEquals a b}}...{{/ifEquals}}`

## Working with Context Data

Templates receive a context object with data such as:

- `project`: Project information
- `artifact`: Artifact information
- `user_message`: User input
- Various artifact content fields like `vision`, `functional_requirements`, etc.

## Testing

The module includes both unit and integration tests:

- Unit tests for testing the `TemplateManagerService` functionality
- Integration tests for testing the complete template system

Run tests with:

```bash
npm run test src/templates
```
