# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Workflow Commands

```bash
# Development
deno task dev                    # Run with file watching and auto-reload
deno task build                  # Compile to executable in ./bin/conductor
deno task test                   # Run test suite
deno task test:watch             # Run tests with file watching

# Code Quality
deno task lint                   # Lint TypeScript code
deno task fmt                    # Format code (in-place)
deno task fmt:check              # Check formatting without changes
deno task quality                # Run format + lint + test in sequence

# Git Integration
deno task setup-hooks            # Configure git hooks for code quality
```

### Running Single Tests

```bash
# Run specific test file
deno test --allow-read --allow-write --allow-env tests/specific_test.ts

# Run tests matching pattern
deno test --allow-read --allow-write --allow-env tests/ --filter "test-name"
```

## Architecture Overview

### Core Framework

**Conductor** is a conversational AI CLI tool built with Deno and TypeScript, designed for problem exploration and solution development. The architecture follows a mode-based framework pattern enabling specialized AI agents to operate within distinct contexts.

### Key Architectural Components

#### 1. Mode System Architecture (`src/modes/`)

- **Core Interface**: Unified `Mode` interface in `src/lib/types.ts` provides comprehensive capabilities for all modes
- **Abstract Base**: `AbstractMode` class provides template method pattern implementation
- **State Management**: Persistent state across sessions with separate configuration vs runtime state
- **Lifecycle Hooks**: Optional `onBeforeExecute`, `onAfterExecute`, `onError` for sophisticated workflow control

#### 2. CLI Framework (`src/cli.ts`)

- Built on **Cliffy** command framework
- Extensible command structure with placeholder implementations
- Integration points for mode routing (future implementation)

#### 3. Core Services (`src/lib/`)

- **FileOperations** (`file-operations.ts`): Atomic file operations with validation and Git-friendly formatting
- **ConfigManager** (`config-manager.ts`): Configuration loading/persistence with environment variable support
- **Logger** (`logger.ts`): Structured logging with level-based output
- **ModeRegistry** (`mode-registry.ts`): Dynamic mode discovery and dependency resolution (in development)

#### 4. State Management

```text
.conductor/
├── modes/           # Mode-specific configuration and prompts
├── state/           # Persistent runtime state
├── config/          # Global configuration
├── artifacts/       # Mode-generated outputs
├── design/          # Architecture and design documents
└── ideas/           # Exploratory ideas and planning notes
```

### Design Patterns

- **Template Method**: `AbstractMode` handles common concerns while concrete modes override specific methods
- **Dependency Injection**: Modes receive `FileOperations` and `Logger` instances for testability
- **Factory Pattern**: Mode registry system for dynamic instantiation (planned)

### Current Implementation Status

**Phase 1 Focus**: Discovery Mode for conversational problem exploration (not technical codebase analysis)

- Human-centered problem discovery through Socratic questioning
- Problem space definition and stakeholder mapping
- Success criteria identification

**Future Modes**: Analyze Mode for technical codebase analysis and architecture exploration

## File Structure & Navigation

### Key Source Files

- `src/main.ts` - Application entry point
- `src/cli.ts` - CLI command structure and routing
- `src/lib/types.ts` - Core type definitions and Mode interface
- `src/modes/abstract-mode.ts` - Base mode implementation
- `src/lib/mod.ts` - Public API exports

### Configuration Files

- `deno.json` - Deno project configuration, tasks, and dependencies  
- `.conductor/` - Runtime workspace directory (created during initialization)

### Dependencies & Technology Stack

- **Runtime**: Deno with TypeScript
- **CLI Framework**: Cliffy (`@cliffy/command`, `@cliffy/prompt`, `@cliffy/table`)
- **Standard Library**: Deno std modules for file system, path, YAML, JSON operations
- **Testing**: Deno built-in test runner with `@std/assert`

## Code Conventions

### TypeScript Standards

- Strict TypeScript configuration enabled
- Interface-first design with comprehensive type definitions
- Async/await for all async operations
- Error handling with typed `ModeResult<T>` return types

### File Organization

- Feature-based organization within `src/lib/`
- Test files use `_test.ts` suffix in `tests/` directory
- Export public APIs through `src/lib/mod.ts`

### Mode Development

When implementing new modes:

1. Extend `AbstractMode` base class
2. Implement required abstract methods: `doInitialize`, `doExecute`, `doValidate`, `doCleanup`
3. Use dependency injection for `FileOperations` and `Logger`
4. Maintain separation between configuration (persistent settings) and state (runtime data)
5. Reference existing mode documentation in `src/modes/README.md`

### Integration with Existing Systems

- All file operations must use `FileOperations` API for consistency
- Leverage existing `ConfigManager` for configuration persistence
- Use structured logging through injected `Logger` instance
- Follow existing CLI command patterns when adding new commands

## Testing Strategy

### Test Execution

- All tests in `tests/` directory with `_test.ts` naming convention
- Comprehensive test coverage for core services and mode implementations
- Mock dependencies for isolated unit testing

### Required Permissions

Tests require specific Deno permissions:

- `--allow-read` - File system read access
- `--allow-write` - File system write access  
- `--allow-env` - Environment variable access

## Current Development Focus

Based on recent commits and file structure:

1. **Mode System Implementation** - Core architecture for extensible mode framework
2. **Discovery Mode Development** - First concrete mode implementation
3. **Configuration Management** - Settings and permissions system
4. **Test Coverage** - Comprehensive testing for all core components

Reference `src/modes/README.md` for detailed mode system documentation and implementation guidelines.

## TaskMaster AI Integration

This project uses **TaskMaster AI** for comprehensive task management and planning. TaskMaster provides structured task tracking with AI-powered analysis and planning capabilities.

### Key TaskMaster Files & Directories

#### Core TaskMaster Structure

```text
.taskmaster/
├── docs/
│   ├── PRD.md                    # Main Product Requirements Document
│   ├── research/                 # AI-generated research findings
│   └── archive/                  # Historical design documents
├── tasks/
│   └── tasks.json                # Primary task database (DO NOT EDIT MANUALLY)
├── config.json                   # TaskMaster configuration and model settings
├── state.json                    # TaskMaster runtime state
├── reports/                      # Complexity analysis reports
└── templates/                    # Task generation templates
```

#### Design & Architecture Documents

```text
.conductor/design/                # Current planning approach (transitioning from TaskMaster docs)
├── mode-system-architecture.md   # Core mode system design
├── discovery-mode-architecture.md # Discovery mode specifications
└── discovery-mode-phases-plan*.md # Phase-specific planning documents
```

**Important**: This project is transitioning from TaskMaster docs to Conductor-managed planning. **All current design and architecture documents are located in `.conductor/design/`**, while the main PRD remains at `.taskmaster/docs/PRD.md`.

### Task Organization & Structure

#### Tag-Based Organization

- **Primary Tag: "master"** - Current development focus and active tasks
- **Phase Tags** - Other development phases are organized with dedicated tags (e.g., "discovery", "planning", "implementation")
- Tasks within each tag represent different development phases or feature areas

#### Task Hierarchy

You should not need to read the tasks.json file directly - use taskmaster tools to read and manage the tasks.

```json
{
  "id": 1,                        // Main task ID
  "title": "Feature Description",
  "status": "in-progress",        // Task status (see below)
  "dependencies": [2, 3],         // Other task IDs this depends on
  "priority": "high",             // Priority level
  "subtasks": [
    {
      "id": 1,                    // Subtask ID (unique within parent)
      "title": "Subtask Description",
      "status": "done",           // Independent subtask status
      "dependencies": [2],        // Can reference other subtask IDs
      "details": "Implementation notes..."
    }
  ]
}
```

#### Task Status Values

- `pending` - Ready to work on (dependencies met)
- `in-progress` - Currently being worked on  
- `done` - Completed and verified
- `deferred` - Postponed to later phase
- `cancelled` - No longer needed
- `blocked` - Waiting on external dependencies

### TaskMaster Status Management (CRITICAL)

**When working on TaskMaster-managed tasks, Claude Code MUST:**

1. **Update Task Status When Starting Work** - Use `set_task_status` MCP tool

2. **Update Subtask Status and Progress** - Use `update_subtask` and `set_task_status` MCP tools

3. **Maintain Accurate Status Throughout Development**
   - Never leave tasks in incorrect status - this breaks project tracking
   - Use subtask updates to log progress, findings, and implementation notes
   - Mark parent tasks as "done" only when all subtasks are complete

### Dual Planning Systems

**TaskMaster Planning** - Use for project-level task management:

- Major features and development phases
- Cross-cutting concerns and infrastructure work
- Dependency tracking between major components
- Status reporting and project progress

**Claude Code TodoWrite** - Use for session-level planning:

- Internal Claude Code task breakdown and progress tracking
- Implementation steps within a single development session
- Quick notes and reminders during active development
- Does not replace TaskMaster status management

**Example Workflow:**

1. Use `get_task` MCP tool to understand requirements
2. Use `TodoWrite` for Claude Code session planning  
3. Use `set_task_status` to mark task as in-progress
4. Work through implementation using internal todos
5. Use `update_subtask` to log progress and findings
6. Use `set_task_status` to mark complete when done

### TaskMaster MCP Integration

**TaskMaster is available via MCP tools** (all `mcp__taskmaster-ai__*` functions). Key workflow tools:

- `get_task` / `get_tasks` - View task details and lists
- `next_task` - Find next available task
- `set_task_status` - Update task/subtask status
- `update_subtask` - Log implementation progress
- `add_task` - Create new tasks during development

Refer to MCP tool descriptions for complete parameter details and usage.

## Essential Development Practices

### Code Documentation Standards (REQUIRED)

- **ALWAYS** write comprehensive documentation for all code you create
- Include JSDoc comments for classes, methods, and complex functions
- Document design decisions and architectural choices in code comments
- Create README files for new modules or significant features
- Explain WHY not just WHAT in comments - capture intent and context
- Use clear, descriptive names for variables, functions, and classes

### Future Work Marking (MANDATORY)

- **ALWAYS** use TODOs and FIXMEs for incomplete or placeholder implementations
- Format: `TODO(#task-id): Description` or `FIXME: Problem description`
- Examples:

  ```typescript
  // TODO(#task-4.3): Implement dependency resolution when ModeRegistry is created
  // FIXME: Currently returns empty array - needs integration with mode registry
  protected getMissingDependencies(): string[] {
    // Placeholder implementation
    return [];
  }
  ```

- Include enough detail for future implementer to understand requirements
- Reference specific task IDs when the work relates to planned tasks
- Mark both technical debt and intentional gaps for future phases

## Quality Assurance Checklist

Before considering any development session complete, ensure:

### ✅ Task Management

- [ ] All parent tasks set to appropriate status ("in-progress" while working, "done" when complete)
- [ ] All subtasks properly updated with implementation notes and status changes
- [ ] No tasks left in incorrect status (this breaks project tracking)

### ✅ Code Quality

- [ ] All new code has comprehensive documentation (classes, methods, complex logic)
- [ ] Design decisions and architectural choices explained in comments
- [ ] Clear, descriptive naming conventions followed throughout

### ✅ Future Work Planning

- [ ] All placeholder implementations marked with TODO(#task-id) or FIXME
- [ ] Sufficient detail provided for future implementers
- [ ] References to specific task IDs where applicable
- [ ] Technical debt explicitly documented

### ✅ Testing & Validation

- [ ] Appropriate test coverage for new functionality
- [ ] Tests passing with proper cleanup
- [ ] No linting, formatting, or type checking errors
- [ ] Code follows existing project patterns and conventions

**CRITICAL**: Missing any of these items compromises project quality and continuity. Always complete this checklist before finishing a development session.
