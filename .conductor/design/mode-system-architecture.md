# Mode System Architecture Design

## Overview

This document outlines the architecture for the Conductor Mode System - a pluggable framework for different AI-powered workflow modes (discovery, planning, design, build, test, polish).

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

### 1. Mode Base Class Hierarchy

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

export interface PromptMetadata {
  version: string;
  author: string;
  description: string;
  tags: string[];
  lastModified: Date;
}

export class PromptManager {
  private templates: Map<string, PromptTemplate> = new Map();
  private fileOps: FileOperations;
  
  // Template management
  async loadTemplates(modeName: string): Promise<void>;
  registerTemplate(template: PromptTemplate): void;
  getTemplate(id: string): PromptTemplate | null;
  
  // Prompt generation
  async generatePrompt(templateId: string, variables: Record<string, unknown>): Promise<string>;
  async generateSystemPrompt(modeName: string, context: ModeContext): Promise<string>;
  async generateUserPrompt(input: string, context: ModeContext): Promise<string>;
  
  // Context injection
  injectContext(template: string, context: ModeContext): string;
  validateVariables(template: PromptTemplate, variables: Record<string, unknown>): ValidationResult;
}
```

## Interaction Flow Diagrams

### Mode Initialization Flow
```
User Command → CLI Parser → ModeCommandRouter → ModeRegistry → ModeFactory
                                ↓
StateManager ← ModeContext ← AbstractMode ← Dependencies Injection
                                ↓
PromptManager ← Mode.initialize() → FileOperations → Ready State
```

### Command Execution Flow
```
User Input → CLI Parser → ModeCommandRouter.routeCommand()
                               ↓
CurrentMode.validateInput() → CurrentMode.handleCommand()
                               ↓
PromptManager.generatePrompt() → AI Interaction → ModeResult
                               ↓
StateManager.saveState() → FileOperations.writeFile() → Response
```

### Mode Switching Flow
```
Switch Command → ModeCommandRouter.switchMode()
                      ↓
CurrentMode.cleanup() → StateManager.saveState()
                      ↓
ModeRegistry.create() → NewMode.initialize() → Context Transfer
```

## Discovery Mode Implementation Plan

As the first concrete mode implementation, Discovery mode will serve as the reference implementation:

```typescript
export class DiscoveryMode extends AbstractMode {
  name = "discovery";
  description = "Explore and understand problems through AI-powered analysis";
  
  // Discovery-specific capabilities
  async analyzeCodebase(): Promise<AnalysisResult>;
  async exploreArchitecture(): Promise<ArchitectureInsights>;
  async identifyPatterns(): Promise<PatternAnalysis>;
  async generateQuestions(): Promise<string[]>;
  
  // Command handlers
  async handleAnalyze(target: string): Promise<ModeResult>;
  async handleExplore(aspect: string): Promise<ModeResult>;
  async handleQuestion(query: string): Promise<ModeResult>;
}
```

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

### Phase 1 (Current Task)
- Core abstractions and interfaces
- Mode registry and factory
- Basic Discovery mode implementation
- CLI integration foundation

### Phase 2 (Future)
- Advanced state management
- Prompt template system
- Multi-mode workflows
- Performance optimizations

### Phase 3 (Future)
- Plugin system for external modes
- Advanced AI interaction patterns
- Collaborative mode features
- UI integration points

This architecture provides a solid foundation for implementing the mode system while maintaining compatibility with the existing codebase and supporting future extensibility.