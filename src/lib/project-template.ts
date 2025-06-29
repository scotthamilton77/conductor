/**
 * Project Template System
 *
 * Handles project.md template generation and management with YAML frontmatter schema
 */

import { type MarkdownFile, MarkdownHandler, type ProjectFrontmatter } from "./markdown-handler.ts";

export interface ProjectTemplateOptions {
  name?: string;
  description?: string;
  version?: string;
  mode?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  bodyTemplate?: string;
}

export interface ProjectSchema extends ProjectFrontmatter {
  // Extend with additional fields specific to project template
  author?: string;
  repository?: string;
  license?: string;
  dependencies?: string[];
  phase?: string;
  status?: "active" | "inactive" | "archived" | "draft";
}

export class ProjectTemplate {
  private readonly markdownHandler: MarkdownHandler;

  constructor(markdownHandler?: MarkdownHandler) {
    this.markdownHandler = markdownHandler || new MarkdownHandler({
      defaultAttrs: {
        version: "1.0.0",
        created: new Date().toISOString(),
        status: "draft",
        phase: "discovery",
      },
    });
  }

  /**
   * Generate a new project.md file with template content
   */
  create(options: ProjectTemplateOptions = {}): MarkdownFile<ProjectSchema> {
    const timestamp = new Date().toISOString();

    const attrs: ProjectSchema = {
      name: options.name || "Untitled Project",
      description: options.description || "A new Conductor project",
      version: options.version || "1.0.0",
      created: timestamp,
      modified: timestamp,
      mode: options.mode || "discovery",
      tags: options.tags || [],
      status: "draft",
      phase: "discovery",
      ...options.customFields,
    };

    const body = options.bodyTemplate || this.getDefaultBodyTemplate(attrs);

    return this.markdownHandler.create<ProjectSchema>(body, attrs);
  }

  /**
   * Update an existing project with new metadata while preserving content
   */
  update(
    existingProject: MarkdownFile<ProjectSchema>,
    updates: Partial<ProjectSchema>,
    preserveBody: boolean = true,
  ): MarkdownFile<ProjectSchema> {
    const modifiedTimestamp = new Date().toISOString();

    // Always update the modified timestamp
    const updatedAttrs = {
      ...updates,
      modified: modifiedTimestamp,
    };

    let updatedProject = this.markdownHandler.updateAttributes(existingProject, updatedAttrs);

    // If not preserving body, apply default template
    if (!preserveBody || !existingProject.body.trim()) {
      const newBody = this.getDefaultBodyTemplate(updatedProject.attrs);
      updatedProject = this.markdownHandler.updateBody(updatedProject, newBody);
    }

    return updatedProject;
  }

  /**
   * Generate project.md template from existing directory structure
   */
  fromDirectory(
    dirPath: string,
    options: Partial<ProjectTemplateOptions> = {},
  ): MarkdownFile<ProjectSchema> {
    // Extract project name from directory path if not provided
    const projectName = options.name || this.extractProjectNameFromPath(dirPath);

    return this.create({
      ...options,
      name: projectName,
      description: options.description || `Project located at ${dirPath}`,
    });
  }

  /**
   * Validate project schema against requirements
   */
  validate(project: MarkdownFile<ProjectSchema>): { valid: boolean; errors: string[] } {
    return this.markdownHandler.validate(project, (attrs) => {
      const errors: string[] = [];

      // Required fields validation
      if (!attrs.name || attrs.name.trim().length === 0) {
        errors.push("Project name is required");
      }

      if (!attrs.version || !this.isValidVersion(attrs.version)) {
        errors.push("Valid version (semver format) is required");
      }

      if (attrs.mode && !this.isValidMode(attrs.mode)) {
        errors.push("Invalid mode specified");
      }

      if (attrs.status && !this.isValidStatus(attrs.status)) {
        errors.push("Invalid status specified");
      }

      // Throw errors if any found (caught by validate method)
      if (errors.length > 0) {
        throw new Error(errors.join(", "));
      }

      return true;
    });
  }

  /**
   * Convert project to different mode template
   */
  changeMode(
    project: MarkdownFile<ProjectSchema>,
    newMode: string,
    updateBody: boolean = true,
  ): MarkdownFile<ProjectSchema> {
    const updates: Partial<ProjectSchema> = {
      mode: newMode,
      phase: this.getModePhase(newMode),
    };

    const updatedProject = this.update(project, updates, !updateBody);

    if (updateBody) {
      const modeSpecificBody = this.getModeTemplate(newMode, updatedProject.attrs);
      return this.markdownHandler.updateBody(updatedProject, modeSpecificBody);
    }

    return updatedProject;
  }

  /**
   * Get available project templates
   */
  getAvailableTemplates(): Array<{ name: string; description: string; mode: string }> {
    return [
      { name: "discovery", description: "Problem exploration and research", mode: "discovery" },
      { name: "planning", description: "Solution planning and architecture", mode: "planning" },
      { name: "design", description: "Detailed design and prototyping", mode: "design" },
      { name: "build", description: "Implementation and development", mode: "build" },
      { name: "test", description: "Testing and validation", mode: "test" },
      { name: "polish", description: "Refinement and documentation", mode: "polish" },
    ];
  }

  /**
   * Generate default body template based on project attributes
   */
  private getDefaultBodyTemplate(attrs: ProjectSchema): string {
    const modeTemplate = this.getModeTemplate(attrs.mode || "discovery", attrs);

    return `# ${attrs.name}

${attrs.description || ""}

## Overview

This project is currently in **${attrs.mode || "discovery"}** mode.

${modeTemplate}

## Project Information

- **Version**: ${attrs.version}
- **Created**: ${attrs.created}
- **Status**: ${attrs.status}
${attrs.tags && attrs.tags.length > 0 ? `- **Tags**: ${attrs.tags.join(", ")}` : ""}

---

*This project file was generated by Conductor's project template system.*
`;
  }

  /**
   * Get mode-specific template content
   */
  private getModeTemplate(mode: string, attrs: ProjectSchema): string {
    const templates: Record<string, string> = {
      discovery: `## Discovery Phase

### Goals
- [ ] Understand the problem space
- [ ] Research existing solutions  
- [ ] Identify key requirements
- [ ] Document findings

### Questions to Explore
- What problem are we solving?
- Who are the stakeholders?
- What are the constraints?

### Research Notes
*Add your research findings here*`,

      planning: `## Planning Phase

### Architecture Overview
*Describe the overall solution architecture*

### Implementation Plan
- [ ] Phase 1: Core functionality
- [ ] Phase 2: Enhanced features
- [ ] Phase 3: Polish and optimization

### Resources Required
*List tools, dependencies, and resources needed*`,

      design: `## Design Phase

### Design Decisions
*Document key design choices and rationale*

### Prototypes
*Link to or describe prototypes and mockups*

### Technical Specifications
*Detailed technical requirements and specifications*`,

      build: `## Build Phase

### Development Tasks
- [ ] Set up development environment
- [ ] Implement core features
- [ ] Create tests
- [ ] Documentation

### Progress
*Track implementation progress here*`,

      test: `## Test Phase

### Test Strategy
*Describe testing approach and coverage*

### Test Cases
- [ ] Unit tests
- [ ] Integration tests  
- [ ] End-to-end tests
- [ ] Performance tests

### Results
*Record test results and coverage metrics*`,

      polish: `## Polish Phase

### Refinement Tasks
- [ ] Code review and cleanup
- [ ] Documentation updates
- [ ] Performance optimization
- [ ] User experience improvements

### Release Preparation
*Prepare for deployment and release*`,
    };

    return templates[mode] || templates.discovery;
  }

  /**
   * Extract project name from directory path
   */
  private extractProjectNameFromPath(dirPath: string): string {
    const parts = dirPath.split(/[/\\]/);
    return parts[parts.length - 1] || "Untitled Project";
  }

  /**
   * Get default phase for a mode
   */
  private getModePhase(mode: string): string {
    const modePhases: Record<string, string> = {
      discovery: "research",
      planning: "architecture",
      design: "prototyping",
      build: "implementation",
      test: "validation",
      polish: "refinement",
    };
    return modePhases[mode] || "initial";
  }

  /**
   * Validate version format (basic semver check)
   */
  private isValidVersion(version: string): boolean {
    const semverRegex = /^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/;
    return semverRegex.test(version);
  }

  /**
   * Validate mode against available modes
   */
  private isValidMode(mode: string): boolean {
    const validModes = ["discovery", "planning", "design", "build", "test", "polish"];
    return validModes.includes(mode);
  }

  /**
   * Validate status values
   */
  private isValidStatus(status: string): boolean {
    const validStatuses = ["active", "inactive", "archived", "draft"];
    return validStatuses.includes(status);
  }
}

// Default instance for common use cases
export const projectTemplate = new ProjectTemplate();
