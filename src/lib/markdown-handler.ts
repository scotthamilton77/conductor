/**
 * Markdown File Handler with Frontmatter Support
 *
 * Provides markdown file processing with YAML frontmatter parsing and manipulation
 */

import { extract } from "@std/front-matter/yaml";
import { test } from "@std/front-matter";
import { stringify } from "@std/yaml";

export interface MarkdownFile<T = Record<string, unknown>> {
  attrs: T;
  body: string;
  frontMatter: string;
}

export interface MarkdownHandlerOptions {
  defaultAttrs?: Record<string, unknown>;
  preserveFormatting?: boolean;
}

export class MarkdownHandler {
  private readonly options: MarkdownHandlerOptions;

  constructor(options: MarkdownHandlerOptions = {}) {
    this.options = {
      preserveFormatting: true,
      ...options,
    };
  }

  /**
   * Parse markdown content with frontmatter
   */
  parse<T = Record<string, unknown>>(content: string): MarkdownFile<T> {
    if (!this.hasFrontmatter(content)) {
      return {
        attrs: (this.options.defaultAttrs || {}) as T,
        body: content,
        frontMatter: "",
      };
    }

    const { attrs, body, frontMatter } = extract<T>(content);
    return {
      attrs: { ...this.options.defaultAttrs, ...attrs } as T,
      body,
      frontMatter,
    };
  }

  /**
   * Serialize markdown file back to string
   */
  stringify<T = Record<string, unknown>>(data: MarkdownFile<T>): string {
    const { attrs, body } = data;

    // If no attributes, return just the body
    if (!attrs || Object.keys(attrs).length === 0) {
      return body;
    }

    // Generate YAML frontmatter
    const frontmatterYaml = stringify(attrs, {
      indent: 2,
      lineWidth: 80,
    }).trim();

    return `---\n${frontmatterYaml}\n---\n\n${body}`;
  }

  /**
   * Check if content has YAML frontmatter
   */
  hasFrontmatter(content: string): boolean {
    return test(content);
  }

  /**
   * Read markdown file from disk
   */
  async readFile<T = Record<string, unknown>>(filePath: string): Promise<MarkdownFile<T>> {
    try {
      const content = await Deno.readTextFile(filePath);
      return this.parse<T>(content);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        throw new Error(`Markdown file not found: ${filePath}`);
      }
      throw new Error(
        `Failed to read markdown file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Write markdown file to disk
   */
  async writeFile<T = Record<string, unknown>>(
    filePath: string,
    data: MarkdownFile<T>,
  ): Promise<void> {
    try {
      const content = this.stringify(data);
      await Deno.writeTextFile(filePath, content, {
        create: true,
        append: false,
      });
    } catch (error) {
      throw new Error(
        `Failed to write markdown file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update frontmatter attributes while preserving content
   */
  updateAttributes<T = Record<string, unknown>>(
    markdownFile: MarkdownFile<T>,
    updates: Partial<T>,
  ): MarkdownFile<T> {
    return {
      ...markdownFile,
      attrs: { ...markdownFile.attrs, ...updates },
    };
  }

  /**
   * Update body content while preserving frontmatter
   */
  updateBody<T = Record<string, unknown>>(
    markdownFile: MarkdownFile<T>,
    newBody: string,
  ): MarkdownFile<T> {
    return {
      ...markdownFile,
      body: newBody,
    };
  }

  /**
   * Create a new markdown file with default attributes
   */
  create<T = Record<string, unknown>>(
    body: string = "",
    attrs: T = {} as T,
  ): MarkdownFile<T> {
    return {
      attrs: { ...this.options.defaultAttrs, ...attrs } as T,
      body,
      frontMatter: "",
    };
  }

  /**
   * Validate frontmatter structure against schema
   */
  validate<T = Record<string, unknown>>(
    markdownFile: MarkdownFile<T>,
    validator: (attrs: T) => boolean,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    let valid = true;

    try {
      valid = validator(markdownFile.attrs);
      if (!valid) {
        errors.push("Frontmatter validation failed");
      }
    } catch (error) {
      valid = false;
      errors.push(error instanceof Error ? error.message : String(error));
    }

    return { valid, errors };
  }
}

// Default instance for common use cases
export const markdownHandler = new MarkdownHandler();

// Common frontmatter types
export interface ProjectFrontmatter {
  name: string;
  description?: string;
  version?: string;
  created?: string;
  modified?: string;
  mode?: string;
  tags?: string[];
}

export interface TaskFrontmatter {
  id: string;
  title: string;
  status: "pending" | "in-progress" | "completed" | "blocked";
  priority: "low" | "medium" | "high";
  created?: string;
  modified?: string;
  assignee?: string;
  dependencies?: string[];
}
