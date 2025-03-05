export interface ArtifactFormat {
    startTag: string;
    endTag: string;
    syntax: string;
    commentaryStartTag?: string;
    commentaryEndTag?: string;
}

export interface TemplateInput {
    systemPrompt: string;
    template: string;
    artifactFormat: ArtifactFormat;
}

export interface TemplateManagerInterface {
    /**
     * Renders a template with the given context
     * @param templateName The name of the template without extension
     * @param context The context data for template rendering
     * @returns The rendered template
     */
    renderTemplate(templateName: string, context: Record<string, any>): Promise<string>;

    /**
     * Gets and renders the appropriate system prompt based on context
     * @param context The context data for system prompt
     * @returns Rendered system prompt
     */
    getSystemPrompt(context: Record<string, any>): Promise<string>;

    /**
     * Gets the appropriate user message template name based on whether it's an update
     * @param isUpdate Whether this is an update or new artifact
     * @returns The template name
     */
    getUserMessageTemplate(isUpdate: boolean): string;

    /**
     * Gets the complete input required for generating an artifact
     * @param context The context data for template rendering
     * @returns Object with system prompt, rendered template, and artifact format
     */
    getArtifactInput(context: Record<string, any>): Promise<TemplateInput>;

    /**
     * Reads the content of a system prompt file
     * @param promptName The name of the prompt file without extension
     * @returns The content of the prompt file
     */
    readSystemPrompt(promptName: string): Promise<string>;
}