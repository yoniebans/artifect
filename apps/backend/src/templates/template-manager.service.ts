// src/templates/template-manager.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Handlebars from 'handlebars';
import { promises as fs } from 'fs';
import * as path from 'path';
import { existsSync } from 'fs';
import { CacheService } from '../services/cache/cache.service';
import { TemplateManagerInterface, TemplateInput } from './interfaces/template-manager.interface';

@Injectable()
export class TemplateManagerService implements TemplateManagerInterface, OnModuleInit {
    private templatesDir: string;
    private systemPromptsDir: string;
    private templates: Map<string, HandlebarsTemplateDelegate> = new Map();
    private systemPrompts: Map<string, string> = new Map();

    constructor(
        private readonly configService: ConfigService,
        private readonly cacheService: CacheService,
    ) {
        // Set base directories
        const baseDir = path.resolve(__dirname, './');
        this.templatesDir = path.join(baseDir, 'artifacts');
        this.systemPromptsDir = path.join(baseDir, 'system-prompts');
    }

    /**
     * Initialize the template engine and load templates when the module is initialized
     */
    async onModuleInit() {
        await this.loadTemplates();
        await this.loadSystemPrompts();
        this.registerHelpers();
    }

    /**
     * Slugify a string for use in paths and cache keys
     */
    private slugify(text: string): string {
        return text.toLowerCase().replace(/\s+/g, '-');
    }

    /**
     * Load all templates from the templates directory
     */
    async loadTemplates(): Promise<void> {
        try {
            const files = await fs.readdir(this.templatesDir);
            for (const file of files) {
                if (file.endsWith('.hbs')) {
                    const templateName = path.basename(file, '.hbs');
                    const templatePath = path.join(this.templatesDir, file);
                    const templateContent = await fs.readFile(templatePath, 'utf8');
                    this.templates.set(templateName, Handlebars.compile(templateContent));
                }
            }
        } catch (error) {
            console.error(`Failed to load templates: ${error instanceof Error ? error.message : String(error)}`);
            throw new Error(`Failed to load templates: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Load all system prompts from project type directories
     */
    async loadSystemPrompts(): Promise<void> {
        try {
            // Check if the system prompts directory exists
            if (!existsSync(this.systemPromptsDir)) {
                await fs.mkdir(this.systemPromptsDir, { recursive: true });
                return; // No prompts to load yet
            }

            // Get all entries in the system prompts directory
            const entries = await fs.readdir(this.systemPromptsDir, { withFileTypes: true });

            // Process project type directories
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const projectTypeDir = path.join(this.systemPromptsDir, entry.name);
                    const projectTypeSlug = this.slugify(entry.name);

                    // Read all template files in this project type directory
                    const files = await fs.readdir(projectTypeDir);

                    for (const file of files) {
                        if (file.endsWith('.hbs')) {
                            const templateBaseName = path.basename(file, '.hbs');
                            const templatePath = path.join(projectTypeDir, file);
                            const templateContent = await fs.readFile(templatePath, 'utf8');

                            // Cache key format: project-type/template-name
                            const cacheKey = `${projectTypeSlug}/${templateBaseName}`;
                            this.systemPrompts.set(cacheKey, templateContent);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to load system prompts: ${error instanceof Error ? error.message : String(error)}`);
            throw new Error(`Failed to load system prompts: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Register Handlebars helpers
     */
    private registerHelpers(): void {
        // Add a helper to check if a value exists
        Handlebars.registerHelper('exists', function (value) {
            return value !== undefined && value !== null;
        });

        // Add a helper for conditional blocks
        Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
            return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
        });

        // Add additional helpers as needed
    }

    /**
     * Renders a template with the given context
     * @param templateName The name of the template without extension
     * @param context The context data for template rendering
     * @returns The rendered template
     */
    async renderTemplate(templateName: string, context: Record<string, any>): Promise<string> {
        const template = this.templates.get(templateName);

        if (!template) {
            try {
                // Attempt to load the template if it wasn't preloaded
                const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
                const templateContent = await fs.readFile(templatePath, 'utf8');
                const compiledTemplate = Handlebars.compile(templateContent);
                this.templates.set(templateName, compiledTemplate);
                return compiledTemplate(context);
            } catch (error) {
                throw new Error(`Template not found: ${templateName}.hbs`);
            }
        }

        return template(context);
    }

    /**
     * Gets and renders the appropriate system prompt based on context
     * @param context The context data for system prompt
     * @returns Rendered system prompt
     */
    async getSystemPrompt(context: Record<string, any>): Promise<string> {
        try {
            const phase = context.artifact?.artifact_phase;
            if (!phase) {
                throw new Error('No artifact phase specified in context');
            }

            const projectTypeId = context.project?.project_type_id;
            if (!projectTypeId) {
                throw new Error('No project type ID specified in context');
            }

            // Get project type info from cache
            const projectType = await this.cacheService.getProjectTypeById(projectTypeId);
            if (!projectType) {
                throw new Error(`Project type not found: ${projectTypeId}`);
            }

            // Build template name
            const projectTypeSlug = this.slugify(projectType.name);
            const phaseSlug = this.slugify(phase);
            const templateName = `${phaseSlug}-agent`;

            // Get template content
            const systemPromptContent = await this.readSystemPrompt(projectTypeSlug, templateName);

            // Compile and render the template
            const template = Handlebars.compile(systemPromptContent);
            return template(context);
        } catch (error) {
            throw new Error(`Failed to load or render system prompt template: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Reads the content of a system prompt file from the project type directory
     * @param projectTypeSlug The slugified project type name
     * @param templateName The name of the template file without extension
     * @returns The content of the template file
     */
    async readSystemPrompt(projectTypeSlug: string, templateName: string): Promise<string> {
        // Check if we have this template in cache
        const cacheKey = `${projectTypeSlug}/${templateName}`;
        if (this.systemPrompts.has(cacheKey)) {
            return this.systemPrompts.get(cacheKey) as string;
        }

        try {
            // Look for the template in the project type directory
            const templatePath = path.join(this.systemPromptsDir, projectTypeSlug, `${templateName}.hbs`);

            if (existsSync(templatePath)) {
                const templateContent = await fs.readFile(templatePath, 'utf8');
                this.systemPrompts.set(cacheKey, templateContent);
                return templateContent;
            }

            // No fallbacks - if template doesn't exist, throw an error
            throw new Error(`System prompt template not found for project type '${projectTypeSlug}' and template '${templateName}'`);
        } catch (error) {
            throw new Error(`System prompt file not found: ${projectTypeSlug}/${templateName}.hbs`);
        }
    }

    /**
     * Gets the appropriate user message template name based on whether it's an update
     * @param isUpdate Whether this is an update or new artifact
     * @returns The template name
     */
    getUserMessageTemplate(isUpdate: boolean): string {
        return isUpdate ? 'artifact_update' : 'artifact_new';
    }

    /**
     * Gets the complete input required for generating an artifact
     * @param context The context data for template rendering
     * @returns Object with system prompt, rendered template, and artifact format
     */
    async getArtifactInput(context: Record<string, any>): Promise<TemplateInput> {
        // Get the artifact type slug for format lookup
        const artifactTypeName = context.artifact?.artifact_type_name;
        if (!artifactTypeName) {
            throw new Error('No artifact type name specified in context');
        }

        const artifactTypeInfo = await this.cacheService.getArtifactTypeInfo(artifactTypeName);
        if (!artifactTypeInfo) {
            throw new Error(`Artifact type not found: ${artifactTypeName}`);
        }

        // Get and render the system prompt
        const systemPrompt = await this.getSystemPrompt(context);

        // Get the user message template name
        const userTemplateName = this.getUserMessageTemplate(context.is_update || false);

        // Render the user message template
        const userMessage = await this.renderTemplate(userTemplateName, context);

        // Get the artifact format
        const artifactFormat = await this.cacheService.getArtifactFormat(artifactTypeInfo.slug);

        return {
            systemPrompt,
            template: userMessage,
            artifactFormat
        };
    }
}