# Mode System Documentation

## Overview

The Mode System provides a framework for implementing different operational modes in the Conductor project. It represents a fundamental architectural shift from monolithic operation to a modular, mode-based approach that allows specialized AI agents to operate within distinct contexts and capabilities.

## Key Architectural Decisions

### 1. **Unified Interface Design**

The system uses a single comprehensive `Mode` interface that provides both basic and advanced capabilities, avoiding interface fragmentation while maintaining a clean API.

### 2. **Dependency Injection Pattern**

All modes receive `FileOperations` and `Logger` instances through constructor injection, promoting testability and consistent integration with the existing codebase infrastructure.

### 3. **State-First Design**

Unlike traditional stateless operations, modes are designed with persistent state management as a core capability, enabling context preservation across sessions and complex multi-step workflows.

### 4. **Lifecycle-Aware Architecture**

The system provides optional lifecycle hooks (`onBeforeExecute`, `onAfterExecute`, `onError`) that allow modes to participate in the execution lifecycle without breaking the basic interface contract.

## Core Concepts

### Mode Hierarchy

- **Mode Interface**: Comprehensive interface providing all mode capabilities including lifecycle, state management, configuration, and execution
- **Abstract Mode**: Base implementation providing common functionality and patterns for concrete modes

### State Management Philosophy

Modes can maintain persistent state across executions, supporting:

- **Session State**: Temporary context for ongoing work
- **Persistent State**: Long-term storage for configuration and artifacts
- **Contextual State**: Execution-specific data and metadata

### Configuration vs. State

- **Configuration**: Mode settings, dependencies, and operational parameters (persisted in `config/`)
- **State**: Runtime data, user context, and execution artifacts (persisted in `state/`)

## Integration Strategy

### FileOperations Integration

The mode system leverages the existing `FileOperations` API for all persistence needs:

- Automatic directory creation through `createDirs` option
- Atomic writes for reliability
- Validation and error handling
- Git-friendly formatting

### CLI Integration Path

Modes are designed to integrate with the existing Cliffy CLI framework without breaking changes. Future CLI commands will route to appropriate modes while maintaining current functionality.

## Design Patterns

### Template Method Pattern

`AbstractMode` implements the Template Method pattern where concrete modes override specific methods (`doInitialize`, `doExecute`, `doValidate`, `doCleanup`) while the base class handles common concerns.

### Factory Pattern (Planned)

The mode registry system (Task 4.3) will implement factory patterns for dynamic mode discovery and instantiation with dependency resolution.

### Observer Pattern (Lifecycle Hooks)

Optional lifecycle hooks allow modes to observe and react to execution events without tight coupling.

## Planned Mode Types

### Discovery Mode (Phase 1)

**Purpose**: Conversational problem exploration through Socratic questioning
**Focus**: Human-centered problem discovery rather than technical analysis
**Artifacts**: Problem space definition, stakeholder mapping, success criteria

### Analyze Mode (Future)

**Purpose**: Technical codebase analysis and architecture exploration
**Focus**: Code structure, dependencies, technical debt assessment
**Artifacts**: Architecture diagrams, dependency maps, technical reports

## File Organization

```
.conductor/
├── modes/           # Mode-specific configuration and prompts
│   └── {mode-id}/
├── state/           # Persistent state storage
│   └── {mode-id}/
├── config/          # Global configuration
├── artifacts/       # Mode-generated outputs
│   └── {mode-id}/
├── design/          # Architecture and design documents
└── ideas/           # Exploratory ideas and planning notes
```

## Key Decisions and Rationales

### Why Use a Comprehensive Mode Interface?

A single interface eliminates complexity and reduces cognitive overhead. All modes get the same full capabilities without needing to choose between basic and enhanced variants.

### Why Dependency Injection Instead of Singletons?

Dependency injection improves testability, allows for different configurations per mode, and makes dependencies explicit rather than hidden.

### Why Separate State from Configuration?

State represents runtime data that changes frequently, while configuration represents more stable operational parameters. This separation allows for different persistence strategies and access patterns.

### Why Optional Lifecycle Hooks?

Making lifecycle hooks optional maintains interface compatibility while allowing sophisticated modes to participate in execution flow management when needed.

## Future Considerations

### Mode Registry and Discovery

Planned registry system will enable dynamic mode loading, dependency resolution, and version management without requiring code changes to the core system.

### Inter-Mode Communication

Future architecture may support modes communicating with each other through a message passing or event system for complex workflows.

### Performance and Scalability

The current design prioritizes correctness and maintainability over performance. Future optimizations may include caching, lazy loading, and concurrent execution where appropriate.

## References

- **Implementation**: See `src/modes/abstract-mode.ts` for the complete base class implementation
- **Type Definitions**: See `src/lib/types.ts` for all mode-related interfaces
- **Architecture Document**: See `.conductor/design/mode-system-architecture.md` for detailed design specifications
- **Tests**: See `tests/abstract-mode_test.ts` for usage examples and behavior verification
