# Mode System Architecture Design

## Overview

This document outlines the architecture for the Conductor Mode System - a pluggable framework for different AI-powered workflow modes (discovery, planning, design, build, test, polish, analyze).

**UPDATED**: This architecture now integrates zen tools as the analysis "engine" behind cross-cutting agents. See [zen-integration-architecture.md](./zen-integration-architecture.md) for detailed integration approach.

## Current State Analysis

### Existing Infrastructure

- **CLI Framework**: Cliffy-based command structure with placeholder mode commands
- **Configuration System**: Comprehensive config management with mode-specific settings
- **File Operations**: Robust file I/O with atomic writes and Git-friendly formatting
- **Markdown Handling**: YAML frontmatter support for structured documents
- **Project Templates**: Schema-based project.md generation and management
- **Logging**: Structured logging with multiple levels and file persistence

### Existing Mode Interface (types.ts)

```typescript
export interface Mode {
  name: string;
  description: string;
  initialize(): Promise<void>;
  execute(input: string): Promise<string>;
  cleanup(): Promise<void>;
}
```

## Architecture Goals

1. **Extensibility**: Easy addition of new modes without modifying core framework
2. **State Management**: Persistent context across mode sessions
3. **CLI Integration**: Seamless command routing and parameter handling
4. **Context Preservation**: Mode-specific state and user preferences
5. **Prompt Management**: Dynamic AI interaction templates per mode
6. **Error Handling**: Graceful failure and recovery mechanisms

## Core Architecture Components

### 1. Cross-Cutting Agent Architecture (zen-Integrated)

**NOTE**: This interface is now implemented primarily through zen tool adapters. See [zen-integration-architecture.md](./zen-integration-architecture.md) for implementation details.

```typescript
// Cross-cutting agents that work across all modes
// Default implementations delegate to zen tools via ZenAgentAdapter
export interface CrossCuttingAgent {
  name: string;
  description: string;
  supportedModes: string[];
  
  // Agent lifecycle
  initialize(context: ModeContext): Promise<void>;
  cleanup(): Promise<void>;
  
  // Core agent capabilities
  evaluateProposal(proposal: any, context: ModeContext): Promise<AgentFeedback>;
  contributeRequirements(context: ModeContext): Promise<RequirementContribution>;
  validateOutput(output: ModeResult, context: ModeContext): Promise<ValidationResult>;
  
  // Agent-specific analysis
  analyzeContext(context: ModeContext): Promise<ContextAnalysis>;
  generateRecommendations(analysis: ContextAnalysis): Promise<AgentRecommendation[]>;
}

export interface AgentFeedback {
  agentName: string;
  severity: 'info' | 'warning' | 'error';
  category: string;
  message: string;
  suggestions: string[];
  blocksExecution: boolean;
  metadata: Record<string, unknown>;
}

export interface RequirementContribution {
  agentName: string;
  requirements: Requirement[];
  constraints: Constraint[];
  recommendations: string[];
}

export interface AgentRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  actionItems: string[];
  rationale: string;
}

// Specific agent implementations (now zen-powered)
// Actual implementations use ZenAgentAdapter - see zen-integration-architecture.md
export class ZenComplexityWatchdogAgent implements CrossCuttingAgent {
  name = "zen-complexity-watchdog";
  description = "Engineering simplicity using zen analyze, codereview, and refactor tools";
  supportedModes = ["discovery", "planning", "design", "build", "analyze"];
  
  // Delegates to zen tools: codereview, refactor, analyze
  async evaluateComplexity(solution: any): Promise<ComplexityAnalysis>;
  async detectReinvention(proposal: any): Promise<ReinventionWarning[]>;
  async suggestSimplification(analysis: ComplexityAnalysis): Promise<SimplificationOptions>;
  async validateComplexityJustification(complexity: number, justification: string): Promise<boolean>;
}

export class ZenDiscoveryAgent implements CrossCuttingAgent {
  name = "zen-discovery";
  description = "Problem exploration using zen thinkdeep for Socratic questioning";
  supportedModes = ["discovery"];
  
  // Delegates to zen tools: thinkdeep for conversational problem exploration
  async generateNextQuestion(context: ConversationContext): Promise<SocraticQuestion>;
  async buildProblemUnderstanding(transcript: ConversationTranscript): Promise<ProblemInsights>;
  async reflectConversation(context: ConversationContext): Promise<DiscoveryReflection>;
  async validateDiscoveryCompleteness(insights: ProblemInsights): Promise<ReadinessAssessment>;
}

export class ZenSecurityAgent implements CrossCuttingAgent {
  name = "zen-security";
  description = "Security analysis using zen secaudit and thinkdeep tools";
  supportedModes = ["planning", "design", "build", "test", "analyze"];
  
  // Delegates to zen tools: secaudit, thinkdeep --security
  async performThreatModeling(architecture: any): Promise<ThreatModel>;
  async analyzeSecurityPatterns(code: any): Promise<SecurityAnalysis>;
  async contributeSecurityRequirements(context: ModeContext): Promise<SecurityRequirement[]>;
  async validateSecurityCompliance(output: any): Promise<SecurityValidationResult>;
}

// AgentRegistry now zen-aware - automatically detects zen availability
export interface AgentRegistry {
  agents: Map<string, CrossCuttingAgent>;
  zenAvailable: boolean;
  
  register(agent: CrossCuttingAgent): void;
  getAgent(name: string): CrossCuttingAgent | null;
  getAgentsForMode(modeName: string): CrossCuttingAgent[];
  evaluateWithAllAgents(proposal: any, context: ModeContext): Promise<AgentFeedback[]>;
  
  // zen integration methods
  detectZen(): Promise<boolean>;
  registerZenAgents(): void;
  registerFallbackAgents(): void;
  promptZenInstallation(): Promise<boolean>;
}
```

### 2. Mode Base Class Hierarchy

```typescript
// Enhanced base interface building on existing Mode interface
export interface ModeConfig {
  name: string;
  description: string;
  version: string;
  dependencies: string[];
  settings: Record<string, unknown>;
}

export interface ModeContext {
  projectPath: string;
  workspaceState: WorkspaceState;
  userPreferences: UserPreferences;
  sessionData: SessionData;
}

export interface ModeResult {
  success: boolean;
  output: string;
  artifacts: Artifact[];
  nextSuggestions?: string[];
  errors?: string[];
}

// Abstract base class extending the existing interface
export abstract class AbstractMode implements Mode {
  abstract name: string;
  abstract description: string;
  
  protected config: ModeConfig;
  protected context: ModeContext;
  protected logger: Logger;
  protected fileOps: FileOperations;
  protected promptManager: PromptManager;
  protected agentRegistry: AgentRegistry;
  protected crossCuttingAgents: CrossCuttingAgent[] = [];
  
  // Lifecycle methods (existing interface)
  abstract initialize(): Promise<void>;
  abstract execute(input: string): Promise<string>;
  abstract cleanup(): Promise<void>;
  
  // New enhanced methods
  abstract validateInput(input: string): ValidationResult;
  abstract getAvailableCommands(): ModeCommand[];
  abstract handleCommand(command: string, args: string[]): Promise<ModeResult>;
  abstract saveState(): Promise<void>;
  abstract loadState(): Promise<void>;
  
  // Agent integration methods (now zen-powered)
  async evaluateWithAgents(proposal: any): Promise<AgentFeedback[]> {
    const feedback: AgentFeedback[] = [];
    for (const agent of this.crossCuttingAgents) {
      // agents now delegate to zen tools via ZenAgentAdapter
      const agentFeedback = await agent.evaluateProposal(proposal, this.context);
      feedback.push(agentFeedback);
    }
    return feedback;
  }
  
  async incorporateAgentFeedback(feedback: AgentFeedback[]): Promise<void> {
    // Process and incorporate agent feedback into mode operations
    const blockers = feedback.filter(f => f.blocksExecution);
    if (blockers.length > 0) {
      throw new Error(`Execution blocked by agents: ${blockers.map(b => b.message).join(', ')}`);
    }
    
    // Log warnings and suggestions
    const warnings = feedback.filter(f => f.severity === 'warning');
    for (const warning of warnings) {
      this.logger.warn(`${warning.agentName}: ${warning.message}`, warning.metadata);
    }
  }
  
  async validateWithAgents(result: ModeResult): Promise<ValidationResult> {
    const validations: ValidationResult[] = [];
    for (const agent of this.crossCuttingAgents) {
      const validation = await agent.validateOutput(result, this.context);
      validations.push(validation);
    }
    
    return {
      isValid: validations.every(v => v.isValid),
      errors: validations.flatMap(v => v.errors || []),
      warnings: validations.flatMap(v => v.warnings || []),
      suggestions: validations.flatMap(v => v.suggestions || [])
    };
  }
  
  async getAgentRequirements(): Promise<RequirementContribution[]> {
    const contributions: RequirementContribution[] = [];
    for (const agent of this.crossCuttingAgents) {
      const contribution = await agent.contributeRequirements(this.context);
      contributions.push(contribution);
    }
    return contributions;
  }
}
```

### 2. Mode Registry and Factory System

```typescript
export interface ModeRegistryEntry {
  modeClass: new () => AbstractMode;
  config: ModeConfig;
  isEnabled: boolean;
  loadPriority: number;
}

export class ModeRegistry {
  private modes: Map<string, ModeRegistryEntry> = new Map();
  private instances: Map<string, AbstractMode> = new Map();
  
  // Registration and discovery
  register(entry: ModeRegistryEntry): void;
  discover(directory: string): Promise<ModeRegistryEntry[]>;
  getAvailable(): string[];
  isRegistered(name: string): boolean;
  
  // Mode lifecycle
  create(name: string, context: ModeContext): Promise<AbstractMode>;
  getInstance(name: string): AbstractMode | null;
  destroy(name: string): Promise<void>;
  
  // Validation and dependencies
  validateDependencies(name: string): ValidationResult;
  resolveDependencies(name: string): string[];
}

export class ModeFactory {
  constructor(private registry: ModeRegistry) {}
  
  async createMode(name: string, context: ModeContext): Promise<AbstractMode>;
  validateMode(mode: AbstractMode): ValidationResult;
  injectDependencies(mode: AbstractMode, context: ModeContext): void;
}
```

### 3. CLI Command Routing Integration

```typescript
export interface ModeCommand {
  name: string;
  description: string;
  arguments: ArgumentDefinition[];
  options: OptionDefinition[];
  handler: (args: string[], options: Record<string, unknown>) => Promise<ModeResult>;
}

export class ModeCommandRouter {
  private registry: ModeRegistry;
  private currentMode: AbstractMode | null = null;
  
  // Command routing
  async routeCommand(modeName: string, command: string, args: string[]): Promise<ModeResult>;
  parseCommand(input: string): ParsedCommand;
  validateCommand(command: ParsedCommand): ValidationResult;
  
  // Mode management
  async switchMode(newMode: string, context: ModeContext): Promise<void>;
  getCurrentMode(): AbstractMode | null;
  getModeCommands(modeName: string): ModeCommand[];
  
  // CLI integration
  registerWithCLI(cli: Command): void;
  generateHelpText(modeName: string): string;
}
```

### 4. Context Preservation and State Management

```typescript
export interface WorkspaceState {
  currentMode: string;
  modeHistory: string[];
  projectMetadata: ProjectSchema;
  globalState: Record<string, unknown>;
}

export interface SessionData {
  sessionId: string;
  startTime: Date;
  interactions: Interaction[];
  currentContext: Record<string, unknown>;
}

export interface UserPreferences {
  defaultMode: string;
  promptPreferences: Record<string, unknown>;
  outputFormat: string;
  autoSave: boolean;
}

export class StateManager {
  private fileOps: FileOperations;
  private statePath: string;
  
  // State persistence
  async saveWorkspaceState(state: WorkspaceState): Promise<void>;
  async loadWorkspaceState(): Promise<WorkspaceState>;
  async saveSessionData(sessionId: string, data: SessionData): Promise<void>;
  async loadSessionData(sessionId: string): Promise<SessionData>;
  
  // User preferences
  async saveUserPreferences(prefs: UserPreferences): Promise<void>;
  async loadUserPreferences(): Promise<UserPreferences>;
  
  // State validation and migration
  validateState(state: WorkspaceState): ValidationResult;
  migrateState(oldVersion: string, newVersion: string): Promise<void>;
  
  // Context management
  createModeContext(projectPath: string): Promise<ModeContext>;
  updateModeContext(context: ModeContext, updates: Partial<ModeContext>): ModeContext;
}
```

### 5. Prompt Management System

```typescript
export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  metadata: PromptMetadata;
}

export interface AgentPromptTemplate extends PromptTemplate {
  agentType: 'complexity' | 'security' | 'custom';
  evaluationCriteria: string[];
  integrationPoints: string[];
  supportedModes: string[];
}

export interface PromptMetadata {
  version: string;
  author: string;
  description: string;
  tags: string[];
  lastModified: Date;
}

export class PromptManager {
  private templates: Map<string, PromptTemplate> = new Map();
  private agentTemplates: Map<string, AgentPromptTemplate> = new Map();
  private fileOps: FileOperations;
  
  // Template management
  async loadTemplates(modeName: string): Promise<void>;
  async loadAgentTemplates(agentName: string): Promise<void>;
  registerTemplate(template: PromptTemplate): void;
  registerAgentTemplate(template: AgentPromptTemplate): void;
  getTemplate(id: string): PromptTemplate | null;
  getAgentTemplate(id: string): AgentPromptTemplate | null;
  
  // Prompt generation
  async generatePrompt(templateId: string, variables: Record<string, unknown>): Promise<string>;
  async generateSystemPrompt(modeName: string, context: ModeContext): Promise<string>;
  async generateUserPrompt(input: string, context: ModeContext): Promise<string>;
  async generateAgentPrompt(agentName: string, templateId: string, context: ModeContext): Promise<string>;
  
  // Agent-specific prompt generation
  async generateComplexityEvaluationPrompt(proposal: any, context: ModeContext): Promise<string>;
  async generateSecurityAnalysisPrompt(architecture: any, context: ModeContext): Promise<string>;
  async generateAgentFeedbackPrompt(feedback: AgentFeedback[], context: ModeContext): Promise<string>;
  
  // Context injection
  injectContext(template: string, context: ModeContext): string;
  injectAgentContext(template: AgentPromptTemplate, context: ModeContext, agentData: any): string;
  validateVariables(template: PromptTemplate, variables: Record<string, unknown>): ValidationResult;
}
```

## Interaction Flow Diagrams

### Mode Initialization Flow

```text
User Command → CLI Parser → ModeCommandRouter → ModeRegistry → ModeFactory
                                ↓
StateManager ← ModeContext ← AbstractMode ← Dependencies Injection
                                ↓
PromptManager ← Mode.initialize() → FileOperations → Ready State
```

### Command Execution Flow

```text
User Input → CLI Parser → ModeCommandRouter.routeCommand()
                               ↓
CurrentMode.validateInput() → CurrentMode.handleCommand()
                               ↓
AgentRegistry.evaluateWithAllAgents() → Agent Feedback Collection
                               ↓
CurrentMode.incorporateAgentFeedback() → PromptManager.generatePrompt()
                               ↓
AI Interaction → ModeResult → CurrentMode.validateWithAgents()
                               ↓
StateManager.saveState() → FileOperations.writeFile() → Response
```

### Mode Switching Flow

```text
Switch Command → ModeCommandRouter.switchMode()
                      ↓
CurrentMode.cleanup() → StateManager.saveState()
                      ↓
ModeRegistry.create() → NewMode.initialize() → Context Transfer
```

## Mode Implementation Plans

### Discovery Mode Implementation Plan

As the first concrete mode implementation, Discovery mode will serve as the reference implementation for problem exploration and understanding:

```typescript
export class DiscoveryMode extends AbstractMode {
  name = "discovery";
  description = "Explore and understand problems through conversational discovery";
  
  private zenDiscoveryAgent: ZenDiscoveryAgent;
  private conversationContext: ConversationContext;
  
  // Discovery-specific capabilities (problem-focused, not code-focused)
  async buildProblemUnderstanding(input: string): Promise<ProblemInsights>;
  async exploreUserNeeds(): Promise<UserNeedAnalysis>;
  async defineSuccessCriteria(): Promise<SuccessMetrics>;
  async identifyConstraints(): Promise<ConstraintAnalysis>;
  
  // zen-powered conversation management
  async generateNextQuestion(): Promise<SocraticQuestion> {
    return await this.zenDiscoveryAgent.generateNextQuestion(this.conversationContext);
  }
  
  async reflectOnConversation(): Promise<DiscoveryReflection> {
    return await this.zenDiscoveryAgent.reflectConversation(this.conversationContext);
  }
  
  // Agent integration in discovery
  async validateProblemComplexity(problem: ProblemInsights): Promise<ComplexityAssessment>;
  async getAgentPerspectives(problemSpace: string): Promise<AgentPerspective[]>;
  
  // Command handlers for problem discovery
  async handleExplore(problemSpace: string): Promise<ModeResult> {
    this.conversationContext.addUserInput(problemSpace);
    const nextQuestion = await this.generateNextQuestion();
    const reflection = await this.reflectOnConversation();
    
    return this.createModeResult({ nextQuestion, reflection });
  }
  
  async handleAnswer(response: string): Promise<ModeResult> {
    this.conversationContext.addUserResponse(response);
    const insights = await this.buildProblemUnderstanding(response);
    const nextQuestion = await this.generateNextQuestion();
    
    return this.createModeResult({ insights, nextQuestion });
  }
  
  async handleWhoFor(stakeholder: string): Promise<ModeResult>;
  async handleSuccess(criteria: string): Promise<ModeResult>;
  async handleConstraint(limitation: string): Promise<ModeResult>;
  
  // Conversation flow management with zen integration
  async guideDiscoveryConversation(userInput: string): Promise<ConversationStep> {
    this.conversationContext.addUserInput(userInput);
    const question = await this.generateNextQuestion();
    return { type: 'question', content: question.text, rationale: question.rationale };
  }
  
  async validateDiscoveryCompleteness(): Promise<ReadinessAssessment> {
    const insights = await this.zenDiscoveryAgent.buildProblemUnderstanding(
      this.conversationContext.getTranscript()
    );
    return await this.zenDiscoveryAgent.validateDiscoveryCompleteness(insights);
  }
}
```

**Key Discovery Mode Behaviors**:

- **Problem-first approach**: Always starts with understanding the problem, not jumping to solutions
- **zen-powered Socratic questioning**: Uses zen thinkdeep to generate diagnostic "why" questions for deeper understanding
- **Conversational flow management**: zen thinkdeep suggests next most valuable question based on conversation context
- **Concrete grounding**: Converts abstract ideas into specific, measurable examples through guided questioning
- **Patient exploration**: Doesn't rush to solutions or implementation details
- **Vision building**: Helps define what success looks like before exploring how to achieve it
- **zen-enhanced reflection**: Uses zen analyze to summarize conversation insights and identify gaps
- **Complexity awareness**: Complexity Watchdog prevents over-complex problem framings

**Discovery Artifacts**:

- Living project document (`.conductor/project.md`) with problem space, success criteria, and constraints
- zen-generated conversation transcript with question reasoning and reflection summaries
- Structured problem insights extracted from conversational exploration
- Stakeholder and user need mapping identified through Socratic questioning
- Success metrics and validation approaches derived from zen-guided discovery
- Question trees and reasoning chains for future reference in Planning mode

### Analyze Mode Implementation Plan

A new mode for technical codebase analysis and exploration:

```typescript
export class AnalyzeMode extends AbstractMode {
  name = "analyze";
  description = "Analyze and understand existing codebases, architectures, and technical systems";
  
  // Analysis-specific capabilities
  async analyzeCodebase(path?: string): Promise<CodebaseAnalysis>;
  async exploreArchitecture(): Promise<ArchitectureInsights>;
  async identifyPatterns(): Promise<PatternAnalysis>;
  async assessTechnicalDebt(): Promise<TechnicalDebtReport>;
  async mapDependencies(): Promise<DependencyGraph>;
  async evaluatePerformance(): Promise<PerformanceAnalysis>;
  
  // Agent-integrated analysis capabilities
  async performSecurityAudit(): Promise<SecurityAuditResult>;
  async analyzeComplexityPatterns(): Promise<ComplexityPatternAnalysis>;
  async getAgentRecommendations(): Promise<AgentRecommendation[]>;
  
  // Command handlers for technical analysis
  async handleAnalyze(target: string): Promise<ModeResult> {
    const analysis = await this.analyzeCodebase(target);
    const agentFeedback = await this.evaluateWithAgents({ target, analysis });
    const securityAudit = await this.performSecurityAudit();
    const complexityAnalysis = await this.analyzeComplexityPatterns();
    
    await this.incorporateAgentFeedback(agentFeedback);
    return this.createModeResult({ analysis, securityAudit, complexityAnalysis }, agentFeedback);
  }
  
  async handleExplore(component: string): Promise<ModeResult>;
  async handleMap(relationship: string): Promise<ModeResult>;
  async handleAssess(aspect: string): Promise<ModeResult>;
  
  // Deep technical exploration
  async generateTechnicalQuestions(): Promise<string[]>;
  async recommendImprovements(): Promise<ImprovementSuggestions>;
}
```

**Key Analyze Mode Behaviors**:

- **Technical focus**: Deep dive into code structure, patterns, and technical decisions
- **Systematic exploration**: Methodical analysis of different system aspects
- **Pattern recognition**: Identifies architectural patterns, anti-patterns, and opportunities
- **Improvement suggestions**: Provides actionable recommendations for technical enhancements
- **Dependency mapping**: Understands relationships and interconnections
- **Security-aware analysis**: Security Agent performs comprehensive security audits
- **Complexity assessment**: Complexity Watchdog identifies over-engineering patterns and simplification opportunities

**Analyze Artifacts**:

- Codebase analysis reports with findings and recommendations
- Security audit results with threat analysis and vulnerability assessments
- Complexity analysis with simplification recommendations
- Architecture diagrams and documentation with security and complexity annotations
- Technical debt assessment and remediation roadmap prioritized by security and complexity impact
- Performance analysis and optimization opportunities with security and complexity trade-offs

## Integration Points

### With Existing CLI System

- Extend current Cliffy command structure with dynamic mode commands
- Integrate with existing config validation and logging
- Preserve current help system and error handling patterns

### With File Operations

- Use FileOperations API for all mode state persistence
- Leverage atomic writes for critical state updates
- Utilize markdown handling for structured outputs

### With Configuration System

- Extend existing Config interface with mode-specific settings
- Use ConfigManager for mode preferences and defaults
- Support runtime configuration updates

## Security and Validation

### Input Validation

- Command argument validation per mode
- File path sanitization for mode operations
- User input sanitization for AI interactions

### State Validation

- Schema validation for serialized state
- Corruption detection and recovery
- Version compatibility checks

### Access Control

- Mode-specific permission systems
- File operation boundaries
- API key management per mode

## Testing Strategy

### Unit Testing

- Mock dependencies for isolated mode testing
- Validation logic testing with edge cases
- State serialization/deserialization testing

### Integration Testing

- CLI command routing end-to-end
- State persistence across mode sessions
- Cross-mode context preservation

### Performance Testing

- Mode initialization time
- Large codebase analysis performance
- Memory usage during long sessions

## Migration and Extensibility

### Adding New Modes

1. Extend AbstractMode class
2. Register with ModeRegistry
3. Define mode-specific commands
4. Create prompt templates
5. Add configuration schema

### Backward Compatibility

- Version compatibility matrix
- State migration strategies
- Graceful degradation for missing modes

## Implementation Phases

### Phase 1: Foundation + Discovery Mode (CURRENT - zen Integration)

**Scope**: Minimal viable CLI with zen integration proof-of-concept

**Key Components**:

- Core abstractions and interfaces (AbstractMode, ModeRegistry, ModeFactory)
- Basic Discovery mode implementation (conversational problem exploration)
- CLI integration foundation (basic commands: init, discover, status)
- Simple state management and context preservation
- **zen integration foundation**: ZenAgentAdapter base class
- **Proof-of-concept zen agent**: ZenDiscoveryAgent for Discovery mode using zen thinkdeep

**Agent Integration**: MODIFIED - Phase 1 includes zen adapter framework validation with Discovery Mode focus

### Phase 2: zen Agent Migration + Enhanced Features  

**Scope**: Complete zen adapter implementation replacing custom agents

**Key Components**:

- **Complete zen adapter framework**: ZenAgentAdapter with error handling and fallbacks
- **zen agent implementations**: ZenComplexityAgent, ZenSecurityAgent, ZenTestGenAgent
- **ZenAwareAgentRegistry**: Automatic zen detection and installation prompts
- Enhanced command execution flow with zen tool integration
- **Performance optimization**: Caching, parallel zen tool execution
- **Error handling**: Graceful zen tool failures with fallback agents
- Agent integration methods in AbstractMode (evaluateWithAgents, incorporateAgentFeedback)
- Analyze mode for technical codebase analysis with full zen integration
- **Installation automation**: zen tool installation and version management

### Phase 3: Planning Mode + Build Mode Foundation

**Scope**: Complete planning workflow and implementation capabilities with end-to-end validation

**Key Components**:

- Planning mode with aperture control (roadmap through task levels)
- Build mode with task execution and code generation
- Progress tracking and build artifacts
- Integration with git for commit workflows
- Basic quality gates (syntax checking, linting integration)
- Complete end-to-end workflow validation
- Advanced state management and cross-mode context preservation
- Conductor directory architecture redesign
- Multi-mode workflows with agent integration

### Phase 4: Production Readiness + Documentation

**Scope**: Production-ready CLI with comprehensive documentation

**Key Components**:

- Enhanced CLI experience and robust error handling
- CLAUDE.md optimization and reusable template creation
- Performance optimizations and security considerations
- Distribution packaging and comprehensive documentation

### Phase 5: Interactive Features + Claude Code Integration

**Scope**: Interactive capabilities and Claude Code command integration

**Key Components**:

- Interactive CLI sessions with conversational flows
- Claude Code command wrappers and MCP tool implementation
- Natural language command interface
- Cross-agent coordination and conflict resolution
- Enhanced conversation flows with context awareness

### Phase 6: Additional Modes + Advanced Features

**Scope**: Complete mode ecosystem and advanced AI capabilities

**Key Components**:

- Test mode with scenario generation and validation
- Design mode with mockup generation capabilities
- Polish mode with improvement suggestions
- Plugin system for external modes and custom agents
- Advanced AI interaction patterns with agent collaboration
- Machine learning-based agent improvement
- Cross-mode analytics and workflow optimization

### Phase 7: Web UI + Dashboard

**Scope**: Real-time dashboard and web interface capabilities

**Key Components**:

- Web-based dashboard with real-time monitoring
- Agent feedback visualization and interactive control
- UI integration points with agent feedback visualization
- Collaborative mode features with shared agent insights
- Advanced UI integration points
