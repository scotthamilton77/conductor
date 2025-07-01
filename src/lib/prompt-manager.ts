/**
 * Prompt Management System for Mode-Specific AI Interactions
 *
 * Provides template loading, variable substitution, and response formatting
 * capabilities for modes to manage their AI interaction patterns.
 */

import { FileOperations } from "./file-operations.ts";
import { Logger } from "./types.ts";
import { createTemplateId, type ModeId, type TemplateId } from "./type-utils.ts";

/**
 * Prompt template configuration
 */
export interface PromptTemplate {
  id: TemplateId;
  template: string;
  description?: string;
  variables?: string[];
  format?: "text" | "markdown" | "json";
  version?: string;
}

/**
 * Response formatting configuration
 */
export interface ResponseFormat {
  type: "text" | "markdown" | "json" | "structured";
  template?: string;
  parser?: (response: string) => unknown;
}

/**
 * Prompt Manager for handling mode-specific prompts
 */
export class PromptManager {
  private templates: Map<TemplateId, PromptTemplate> = new Map();
  private readonly modeId: ModeId;

  constructor(
    modeId: ModeId,
    private readonly fileOps: FileOperations,
    private readonly logger: Logger,
  ) {
    this.modeId = modeId;
  }

  /**
   * Load prompt templates from file
   */
  async loadTemplates(): Promise<void> {
    try {
      // Try to load from source directory first (tool-specific templates)
      const srcPath = new URL(`../modes/${this.modeId}/prompts.json`, import.meta.url);
      let data: Record<string, unknown> | undefined;
      let loaded = false;

      try {
        const srcContent = await Deno.readTextFile(srcPath);
        data = JSON.parse(srcContent);
        loaded = true;
        this.logger.debug(`AI: Loaded prompt templates from source: ${srcPath}`);
      } catch {
        // Fall back to .conductor directory for project-specific prompts
        const promptPath = `modes/${this.modeId}/prompts.json`;
        if (await this.fileOps.exists(promptPath)) {
          const result = await this.fileOps.readFile(promptPath);
          data = JSON.parse(result.content);
          loaded = true;
          this.logger.debug(`AI: Loaded prompt templates from .conductor: ${promptPath}`);
        }
      }

      if (loaded && data) {
        // Support both simple string templates and full template objects
        if (data.templates && Array.isArray(data.templates)) {
          // Full template format
          for (const template of data.templates) {
            this.templates.set(template.id, template);
          }
        } else {
          // Simple key-value format (backward compatibility)
          for (const [key, value] of Object.entries(data)) {
            if (typeof value === "string") {
              try {
                const templateId = createTemplateId(key);
                this.templates.set(templateId, {
                  id: templateId,
                  template: value,
                  format: "text",
                });
              } catch (error) {
                this.logger.warn(`AI: Skipping invalid template ID: ${key}`);
              }
            }
          }
        }

        this.logger.debug(
          `AI: Loaded ${this.templates.size} prompt templates for mode ${this.modeId}`,
        );
      }
    } catch (error) {
      this.logger.warn(`AI: Failed to load prompt templates for mode ${this.modeId}:`, error);
      // Not a fatal error - modes can work with programmatic prompts
    }
  }

  /**
   * Save prompt templates to file
   */
  async saveTemplates(): Promise<void> {
    const promptPath = `modes/${this.modeId}/prompts.json`;
    const templates = Array.from(this.templates.values());

    const data = {
      version: "1.0.0",
      modeId: this.modeId,
      templates,
    };

    await this.fileOps.writeFile(
      promptPath,
      JSON.stringify(data, null, 2),
      { createDirs: true },
    );

    this.logger.debug(`AI: Saved ${templates.length} prompt templates for mode ${this.modeId}`);
  }

  /**
   * Get a prompt template by ID
   */
  getTemplate(id: string | TemplateId): PromptTemplate | undefined {
    const templateId = typeof id === "string" ? createTemplateId(id) : id;
    return this.templates.get(templateId);
  }

  /**
   * Set or update a prompt template
   */
  setTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Render a template with variable substitution
   */
  renderTemplate(templateId: string | TemplateId, variables?: Record<string, unknown>): string {
    const id = typeof templateId === "string" ? createTemplateId(templateId) : templateId;
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let rendered = template.template;

    // Perform variable substitution
    if (variables) {
      // Support multiple variable formats: {{var}}, ${var}, and {var}
      for (const [key, value] of Object.entries(variables)) {
        const patterns = [
          new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), // {{var}}
          new RegExp(`\\$\\{${key}\\}`, "g"), // ${var}
          new RegExp(`\\{${key}\\}`, "g"), // {var}
        ];

        const stringValue = this.formatValue(value);
        for (const pattern of patterns) {
          rendered = rendered.replace(pattern, stringValue);
        }
      }
    }

    return rendered;
  }

  /**
   * Format a response according to specified format
   */
  formatResponse(
    content: string,
    format: ResponseFormat = { type: "text" },
  ): unknown {
    switch (format.type) {
      case "markdown":
        return this.formatMarkdown(content, format.template);

      case "json":
        try {
          return JSON.parse(content);
        } catch {
          this.logger.warn("AI: Failed to parse JSON response, returning as text");
          return content;
        }

      case "structured":
        if (format.parser) {
          return format.parser(content);
        }
        return this.parseStructuredResponse(content);

      case "text":
      default:
        return format.template ? this.applyResponseTemplate(content, format.template) : content;
    }
  }

  /**
   * Get all template IDs
   */
  getTemplateIds(): TemplateId[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Clear all templates
   */
  clear(): void {
    this.templates.clear();
  }

  /**
   * Format a value for template substitution
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  /**
   * Format content as markdown
   */
  private formatMarkdown(content: string, template?: string): string {
    if (template) {
      return template.replace("{content}", content);
    }
    return content;
  }

  /**
   * Apply a response template
   */
  private applyResponseTemplate(content: string, template: string): string {
    return template.replace("{response}", content);
  }

  /**
   * Parse structured response (basic implementation)
   */
  private parseStructuredResponse(content: string): Record<string, unknown> {
    // Simple parsing for key: value pairs
    const result: Record<string, unknown> = {};
    const lines = content.split("\n");

    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        result[key.trim()] = value.trim();
      }
    }

    return result;
  }

  /**
   * Create a prompt builder for fluent template construction
   */
  createBuilder(templateId: string | TemplateId): PromptBuilder {
    const id = typeof templateId === "string" ? createTemplateId(templateId) : templateId;
    return new PromptBuilder(this, id);
  }
}

/**
 * Fluent builder for constructing prompts
 */
export class PromptBuilder {
  private variables: Record<string, unknown> = {};

  constructor(
    private manager: PromptManager,
    private templateId: TemplateId,
  ) {}

  /**
   * Set a variable value
   */
  with(key: string, value: unknown): this {
    this.variables[key] = value;
    return this;
  }

  /**
   * Set multiple variables
   */
  withAll(variables: Record<string, unknown>): this {
    Object.assign(this.variables, variables);
    return this;
  }

  /**
   * Build the final prompt
   */
  build(): string {
    return this.manager.renderTemplate(this.templateId, this.variables);
  }
}
