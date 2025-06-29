/**
 * Discovery Mode Implementation
 *
 * A stub implementation of Discovery Mode for framework validation.
 * Focuses on proving the mode system architecture works with a concrete implementation.
 */

import { AbstractMode } from "./abstract-mode.ts";
import { FileOperations } from "../lib/file-operations.ts";
import { type Logger, type ModeResult, type ModeState } from "../lib/types.ts";

/**
 * Conversation state for Discovery Mode
 */
interface DiscoveryState extends ModeState {
  currentQuestionIndex: number;
  responses: string[];
  insights: string[];
  problemStatement?: string;
  successCriteria?: string;
}

/**
 * Discovery Mode for conversational problem exploration
 *
 * This is a stub implementation focused on framework validation.
 * The full sophisticated Discovery Mode implementation will be handled in future tasks.
 */
export class DiscoveryMode extends AbstractMode {
  private readonly questions = [
    "What problem are you trying to solve?",
    "Who experiences this problem most frequently?",
    "Tell me about a recent time this was particularly frustrating.",
    "What would success look like if this problem were solved?",
    "What constraints or limitations should we keep in mind?",
  ];

  constructor(
    fileOps: FileOperations,
    logger: Logger,
  ) {
    super(
      "discovery",
      "Discovery Mode",
      "Conversational problem exploration through Socratic questioning",
      "1.0.0-stub",
      [],
      fileOps,
      logger,
    );
  }

  protected initializePrompts(): void {
    this.prompts.set(
      "welcome",
      "Welcome to Discovery Mode! I'll help you explore and understand your problem space through conversation.",
    );
    this.prompts.set("question_prefix", "Let's explore this together:");
    this.prompts.set(
      "insight_summary",
      "Based on our conversation, here are the key insights I've gathered:",
    );
  }

  protected async doInitialize(): Promise<void> {
    this.logger.info("AI: Initializing Discovery Mode stub");

    // Initialize discovery state
    const initialState: DiscoveryState = {
      id: `${this.id}-${Date.now()}`,
      modeId: this.id,
      timestamp: new Date(),
      data: {
        currentQuestionIndex: 0,
        responses: [],
        insights: [],
        startTime: new Date().toISOString(),
        version: this.version,
      },
      artifacts: [],
      currentQuestionIndex: 0,
      responses: [],
      insights: [],
    };

    await this.saveState(initialState);

    this.logger.info("AI: Discovery Mode stub initialized successfully");
  }

  protected async doExecute<T>(
    input: string,
    _context?: Record<string, unknown>,
  ): Promise<ModeResult<T>> {
    try {
      const loadedState = await this.loadState();
      if (!loadedState) {
        throw new Error("No state found - mode not properly initialized");
      }

      const state = loadedState as DiscoveryState;

      // Handle user response to previous question
      if (input && state.currentQuestionIndex > 0) {
        state.responses.push(input);
        this.generateInsight(input, state);
        await this.saveState(state);
      }

      // Check if conversation is complete
      if (state.currentQuestionIndex >= this.questions.length) {
        return await this.completeDiscovery(state) as ModeResult<T>;
      }

      // Ask next question
      const currentQuestion = this.questions[state.currentQuestionIndex];
      const response = this.formatQuestion(currentQuestion, state.currentQuestionIndex);

      // Advance to next question
      state.currentQuestionIndex++;
      await this.saveState(state);

      this.logger.info(
        `AI: Discovery Mode asked question ${state.currentQuestionIndex}/${this.questions.length}`,
      );
      return { success: true, data: response as T };
    } catch (error) {
      const message = `Discovery Mode execution failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error("AI: " + message);
      return { success: false, error: message };
    }
  }

  protected async doValidate(): Promise<ModeResult<boolean>> {
    try {
      const loadedState = await this.loadState();
      if (!loadedState) {
        return {
          success: false,
          error: "Discovery session has no state to validate",
        };
      }

      const state = loadedState as DiscoveryState;

      // Basic validation - ensure we have at least some responses
      const hasResponses = state.responses && state.responses.length > 0;
      const hasInsights = state.insights && state.insights.length > 0;

      const isValid = hasResponses || hasInsights;

      if (!isValid) {
        return {
          success: false,
          error: "Discovery session has no responses or insights to validate",
        };
      }

      this.logger.info("AI: Discovery Mode validation successful");
      return { success: true, data: true };
    } catch (error) {
      const message = `Discovery Mode validation failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error("AI: " + message);
      return { success: false, error: message };
    }
  }

  protected async doCleanup(): Promise<void> {
    // Generate final project.md artifact
    await this.generateProjectArtifact();

    this.logger.info("AI: Discovery Mode cleanup completed");
  }

  /**
   * Format a question for presentation to the user
   */
  private formatQuestion(question: string, index: number): string {
    const welcome = index === 0 ? this.prompts.get("welcome") + "\n\n" : "";
    const prefix = this.prompts.get("question_prefix");
    return `${welcome}${prefix} ${question}`;
  }

  /**
   * Generate insight from user response
   */
  private generateInsight(response: string, state: DiscoveryState): void {
    // Simple insight generation for stub implementation
    const questionIndex = state.currentQuestionIndex - 1;

    let insight = "";
    switch (questionIndex) {
      case 0: // Problem identification
        insight = `Problem identified: ${response.substring(0, 100)}${
          response.length > 100 ? "..." : ""
        }`;
        state.problemStatement = response;
        break;
      case 1: // Stakeholder identification
        insight = `Key stakeholders: ${response}`;
        break;
      case 2: // Pain point exploration
        insight = `Pain point example captured: ${response.substring(0, 80)}...`;
        break;
      case 3: // Success criteria
        insight = `Success criteria defined: ${response}`;
        state.successCriteria = response;
        break;
      case 4: // Constraints
        insight = `Constraints identified: ${response}`;
        break;
      default:
        insight = `Additional context: ${response.substring(0, 80)}...`;
    }

    state.insights.push(insight);
  }

  /**
   * Complete the discovery process and return summary
   */
  private async completeDiscovery(state: DiscoveryState): Promise<ModeResult<string>> {
    const summary = this.buildDiscoverySummary(state);

    // Update state with completion
    state.data = {
      ...state.data,
      completedAt: new Date().toISOString(),
      totalQuestions: this.questions.length,
      totalResponses: state.responses.length,
    };
    await this.saveState(state);

    this.logger.info("AI: Discovery Mode conversation completed");
    return { success: true, data: summary };
  }

  /**
   * Build summary of discovery session
   */
  private buildDiscoverySummary(state: DiscoveryState): string {
    const insightsList = state.insights.map((insight) => `• ${insight}`).join("\n");

    return `${this.prompts.get("insight_summary")}

${insightsList}

Discovery session complete! You can now transition to Planning Mode to map out your path forward, or continue exploring specific aspects of the problem space.

Framework validation: ✅ Mode lifecycle completed successfully
State management: ✅ Conversation history preserved
Artifact generation: ✅ Project document will be created`;
  }

  /**
   * Generate project.md artifact for framework validation
   */
  private async generateProjectArtifact(): Promise<void> {
    try {
      const loadedState = await this.loadState();
      if (!loadedState) {
        this.logger.warn("AI: No state found for artifact generation");
        return;
      }

      const state = loadedState as DiscoveryState;

      const projectContent = this.buildProjectDocument(state);

      // Write project.md with createDirs option (FileOperations already handles .conductor path)
      await this.fileOps.writeFile("project.md", projectContent, { createDirs: true });

      this.logger.info("AI: Generated project.md artifact successfully");
    } catch (error) {
      this.logger.error(
        `AI: Failed to generate project artifact: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  /**
   * Build project document content
   */
  private buildProjectDocument(state: DiscoveryState): string {
    const timestamp = new Date().toISOString();

    return `---
id: discovery-stub-session
stage: discovery
confidence: exploring
last_updated: ${timestamp}
mode_version: ${this.version}
---

# Discovery Session Results

## Problem Space

**Core Problem**: ${state.problemStatement || "Not fully defined yet"}

**Key Insights**:
${state.insights.map((insight) => `- ${insight}`).join("\n")}

## Success Criteria

${state.successCriteria || "To be defined in continued sessions"}

## Session Metadata

- **Questions Asked**: ${state.currentQuestionIndex}/${this.questions.length}
- **Responses Collected**: ${state.responses.length}
- **Started**: ${state.data?.startTime}
- **Completed**: ${state.data?.completedAt}

## Next Steps

This was a framework validation session using Discovery Mode stub implementation.
For full problem exploration, use the complete Discovery Mode implementation.

---
*Generated by Conductor Discovery Mode v${this.version}*
`;
  }
}
