// apps/backend/src/templates/templates.module.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from '../services/cache/cache.service';
import { TemplatesModule } from './templates.module';
import { TemplateManagerService } from './template-manager.service';
import * as path from 'path';
import configuration from '../config/configuration';

/**
 * This is a real integration test that interacts with the actual file system
 * to test that template loading works correctly with the new folder structure.
 */
describe('TemplatesModule Integration', () => {
  let moduleRef: TestingModule;
  let templateManager: TemplateManagerService;
  let mockCacheService: any;

  beforeEach(async () => {
    mockCacheService = {
      getArtifactTypeInfo: jest.fn().mockResolvedValue({ typeId: 1, slug: 'test_type' }),
      getArtifactFormat: jest.fn().mockResolvedValue({
        startTag: '[TEST]',
        endTag: '[/TEST]',
        syntax: 'markdown'
      }),
      getProjectTypeById: jest.fn().mockImplementation((id) => {
        if (id === 1) return Promise.resolve({ id: 1, name: 'Software Engineering' });
        return Promise.resolve(null);
      }),
      initialize: jest.fn().mockResolvedValue(undefined),
    };

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
        }),
        TemplatesModule,
      ],
    })
      .overrideProvider(CacheService)
      .useValue(mockCacheService)
      .compile();

    templateManager = moduleRef.get<TemplateManagerService>(TemplateManagerService);

    // Initialize the template manager to load real templates
    await templateManager.onModuleInit();
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('should provide TemplateManagerService', () => {
    expect(templateManager).toBeDefined();
  });

  it('should render artifact templates from the filesystem', async () => {
    const context = {
      project: { name: 'Test Project' },
      artifact: { artifact_type_name: 'Vision Document' }
    };

    const result = await templateManager.renderTemplate('artifact_new', context);

    // Verify it includes the expected text from the real template
    expect(result).toContain('Kick off dialogue regarding a new Vision Document for the project');
  });

  it('should render the requirements system prompt from software-engineering directory', async () => {
    const context = {
      project: {
        name: 'Test Project',
        project_type_id: 1
      },
      artifact: {
        artifact_type_name: 'Vision Document',
        artifact_phase: 'requirements'
      }
    };

    const result = await templateManager.getSystemPrompt(context);

    // Verify it includes text from the real requirements-agent.hbs
    expect(result).toContain('AI model specializing as a business analyst');
  });

  it('should render the design system prompt from software-engineering directory', async () => {
    const context = {
      project: {
        name: 'Test Project',
        project_type_id: 1
      },
      artifact: {
        artifact_type_name: 'C4 Context',
        artifact_phase: 'design'
      }
    };

    const result = await templateManager.getSystemPrompt(context);

    // Verify it includes text from the real design-agent.hbs
    expect(result).toContain('AI model specializing as a software architect');
  });

  it('should render the data system prompt from software-engineering directory', async () => {
    const context = {
      project: {
        name: 'Test Project',
        project_type_id: 1
      },
      artifact: {
        artifact_type_name: 'Data Model',
        artifact_phase: 'data'
      }
    };

    const result = await templateManager.getSystemPrompt(context);

    // Verify it includes text from the real data-agent.hbs
    expect(result).toContain('AI model specialized in Data Architecture');
  });

  it('should throw error when template for phase does not exist', async () => {
    const context = {
      project: {
        name: 'Test Project',
        project_type_id: 1
      },
      artifact: {
        artifact_type_name: 'Unknown Document',
        artifact_phase: 'nonexistent-phase'
      }
    };

    await expect(templateManager.getSystemPrompt(context)).rejects.toThrow(
      "Failed to load or render system prompt template: System prompt file not found: software-engineering/nonexistent-phase-agent.hbs"
    );
  });

  it('should throw error when project type does not exist', async () => {
    const context = {
      project: {
        name: 'Test Project',
        project_type_id: 999 // Nonexistent project type
      },
      artifact: {
        artifact_type_name: 'Vision Document',
        artifact_phase: 'requirements'
      }
    };

    // Already mocked to return null for non-1 IDs
    await expect(templateManager.getSystemPrompt(context)).rejects.toThrow(
      'Project type not found: 999'
    );
  });

  it('should generate complete artifact input from filesystem templates', async () => {
    const context = {
      project: {
        name: 'Test Project',
        project_type_id: 1
      },
      artifact: {
        artifact_type_name: 'Vision Document',
        artifact_phase: 'requirements'
      },
      is_update: false
    };

    const result = await templateManager.getArtifactInput(context);

    expect(result).toMatchObject({
      artifactFormat: {
        startTag: '[TEST]',
        endTag: '[/TEST]',
        syntax: 'markdown'
      }
    });

    // Verify systemPrompt comes from requirements-agent.hbs
    expect(result.systemPrompt).toContain('AI model specializing as a business analyst');

    // Verify template comes from artifact_new.hbs
    expect(result.template).toContain('Kick off dialogue regarding a new Vision Document');
  });
});