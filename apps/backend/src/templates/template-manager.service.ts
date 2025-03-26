// src/templates/template-manager.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Handlebars from 'handlebars';
import { promises as fs } from 'fs';
import * as path from 'path';
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
        // Set base directories - could be configurable in the future
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
     * Load all system prompts from the system prompts directory
     */
    async loadSystemPrompts(): Promise<void> {
        try {
            const files = await fs.readdir(this.systemPromptsDir);
            for (const file of files) {
                if (file.endsWith('.hbs')) {
                    const promptName = path.basename(file, '.hbs');
                    const promptPath = path.join(this.systemPromptsDir, file);
                    const promptContent = await fs.readFile(promptPath, 'utf8');
                    this.systemPrompts.set(promptName, promptContent);
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
            const phase = context.artifact?.artifact_phase?.toLowerCase() || 'requirements';

            // The system prompt template is named after the phase (e.g., requirements_agent)
            const systemPromptTemplate = `${phase}_agent`;

            // Get the template content and compile it
            const systemPromptContent = await this.readSystemPrompt(systemPromptTemplate);
            const template = Handlebars.compile(systemPromptContent);

            // Render the system prompt template with the full context
            return template(context);
        } catch (error) {
            throw new Error(`Failed to load or render system prompt template: ${error instanceof Error ? error.message : String(error)}`);
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

    /**
     * Reads the content of a system prompt file
     * @param promptName The name of the prompt file without extension
     * @returns The content of the prompt file
     */
    async readSystemPrompt(promptName: string): Promise<string> {
        // First check if we already have this prompt in memory
        if (this.systemPrompts.has(promptName)) {
            return this.systemPrompts.get(promptName) as string;
        }

        try {
            const promptPath = path.join(this.systemPromptsDir, `${promptName}.hbs`);
            const promptContent = await fs.readFile(promptPath, 'utf8');

            // Store in memory for future use
            this.systemPrompts.set(promptName, promptContent);

            return promptContent;
        } catch (error) {
            throw new Error(`System prompt file not found: ${promptName}.hbs`);
        }
    }
}