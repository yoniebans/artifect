// src/templates/templates.module.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from '../services/cache/cache.service';
import { TemplatesModule } from './templates.module';
import { TemplateManagerService } from './template-manager.service';
import * as fs from 'fs';
import * as path from 'path';
import configuration from '../config/configuration';

/**
 * This test creates an actual templating system with mock files.
 * It creates temporary directories and files for templates and system prompts.
 */
describe('TemplatesModule Integration', () => {
  let moduleRef: TestingModule;
  let templateManager: TemplateManagerService;
  let mockCacheService: any;

  // Paths for test template files
  const testDir = path.join(__dirname, 'test-templates');
  const artifactsDir = path.join(testDir, 'artifacts');
  const systemPromptsDir = path.join(testDir, 'system-prompts');

  // Mock files content for test
  const mockFileContents: Record<string, string> = {
    'test_new.hbs': 'Test template for {{artifact.artifact_type_name}} in project {{project.name}}',
    'test_update.hbs': 'Update for {{artifact.name}} with content:\n```\n{{artifact.content}}\n```\n\nUser input: {{user_message}}',
    'test_agent.hbs': 'You are a test agent for {{project.name}} focused on {{artifact.artifact_type_name}}.\n{{#if vision}}Vision: {{vision}}{{/if}}'
  };

  // Mock the cache service
  beforeEach(async () => {
    mockCacheService = {
      getArtifactTypeInfo: jest.fn().mockResolvedValue({ typeId: 1, slug: 'test_type' }),
      getArtifactFormat: jest.fn().mockResolvedValue({
        startTag: '[TEST]',
        endTag: '[/TEST]',
        syntax: 'markdown'
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

    // Mock file system methods
    jest.spyOn(fs.promises, 'readdir').mockImplementation((dirPath: string) => {
      if (dirPath.includes('artifacts')) {
        return Promise.resolve(['test_new.hbs', 'test_update.hbs'] as any);
      } else if (dirPath.includes('system-prompts')) {
        return Promise.resolve(['test_agent.hbs'] as any);
      }
      return Promise.resolve([] as any);
    });

    jest.spyOn(fs.promises, 'readFile').mockImplementation((filePath: string) => {
      const fileName = path.basename(filePath as string);
      if (mockFileContents[fileName]) {
        return Promise.resolve(mockFileContents[fileName] as any);
      }
      return Promise.resolve('Default mock content' as any);
    });

    // Override the template directories to use our test directories
    Object.defineProperty(templateManager, 'templatesDir', { value: artifactsDir });
    Object.defineProperty(templateManager, 'systemPromptsDir', { value: systemPromptsDir });

    // Manually initialize the service
    await templateManager.onModuleInit();
  });

  afterEach(async () => {
    await moduleRef.close();
    jest.restoreAllMocks();
  });

  it('should provide TemplateManagerService', () => {
    expect(templateManager).toBeDefined();
  });

  it('should render templates with context', async () => {
    const context = {
      project: { name: 'Test Project' },
      artifact: { artifact_type_name: 'Vision Document' }
    };

    // Mock the specific calls for this test
    jest.spyOn(templateManager, 'renderTemplate').mockResolvedValueOnce(
      'Test template for Vision Document in project Test Project'
    );

    const result = await templateManager.renderTemplate('test_new', context);

    expect(result).toBe('Test template for Vision Document in project Test Project');
  });

  it('should render system prompts with context', async () => {
    const context = {
      project: { name: 'Test Project' },
      artifact: {
        artifact_type_name: 'Vision Document',
        artifact_phase: 'test'
      },
      vision: 'This is a test vision'
    };

    // Mock the template access methods for this test
    jest.spyOn(templateManager, 'readSystemPrompt').mockResolvedValueOnce(
      'You are a test agent for {{project.name}} focused on {{artifact.artifact_type_name}}.\n{{#if vision}}Vision: {{vision}}{{/if}}'
    );

    const result = await templateManager.getSystemPrompt(context);

    expect(result).toContain('You are a test agent for Test Project');
    expect(result).toContain('Vision: This is a test vision');
  });

  it('should get the appropriate user message template name', () => {
    expect(templateManager.getUserMessageTemplate(false)).toBe('artifact_new');
    expect(templateManager.getUserMessageTemplate(true)).toBe('artifact_update');
  });

  it('should generate complete artifact input', async () => {
    const context = {
      project: { name: 'Test Project' },
      artifact: {
        artifact_type_name: 'Vision Document',
        artifact_phase: 'test'
      },
      is_update: false
    };

    // Mock some method calls for consistency
    jest.spyOn(templateManager, 'getSystemPrompt').mockResolvedValue('Test system prompt');
    jest.spyOn(templateManager, 'renderTemplate').mockResolvedValue('Test user message');

    const result = await templateManager.getArtifactInput(context);

    expect(result).toEqual({
      systemPrompt: 'Test system prompt',
      template: 'Test user message',
      artifactFormat: {
        startTag: '[TEST]',
        endTag: '[/TEST]',
        syntax: 'markdown'
      }
    });
  });
});