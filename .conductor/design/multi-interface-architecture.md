# Multi-Interface Architecture Design

## Executive Summary

This document outlines the architectural design for enabling Conductor to support three distinct interaction paradigms:

1. **CLI Mode**: Interactive terminal interface (current implementation)
2. **Agent-Driven**: AI agent orchestration via Claude Code MCP integration
3. **UI Orchestrated**: Rich web interface with real-time collaboration

The design introduces minimal abstractions that preserve current CLI development velocity while preventing major refactoring when adding agent and UI capabilities.

## Design Principles

### Core Philosophy

- **Transport Agnostic**: Modes remain oblivious to interaction channels
- **Minimal Disruption**: Current CLI development continues at full speed
- **Future-Proof**: All three paradigms supported with minimal refactoring
- **Incremental Adoption**: Add new interaction channels without touching existing code
- **Clean Separation**: Interaction logic separated from business logic

### Anti-Patterns to Avoid

- Over-engineering with premature event buses or REST APIs
- Coupling modes directly to specific I/O channels
- Web-specific validation logic in core business layer
- Complex middleware layers that slow development

## Architecture Overview

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CLI Interface │    │ Agent Interface │    │  UI Interface   │
│   (Terminal)    │    │ (Claude Code)   │    │  (WebSocket)    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │    InteractionPort        │
                    │    (Transport Layer)      │
                    └─────────────┬─────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │     Mode System           │
                    │  (Business Logic)         │
                    │                           │
                    │  ┌─────────────────────┐  │
                    │  │   AbstractMode      │  │
                    │  │                     │  │
                    │  │ ┌─────────────────┐ │  │
                    │  │ │ DiscoveryMode   │ │  │
                    │  │ │ PlanningMode    │ │  │
                    │  │ │ AnalyzeMode     │ │  │
                    │  │ └─────────────────┘ │  │
                    │  └─────────────────────┘  │
                    └───────────────────────────┘
```

## Core Components

### 1. Message System

**Central abstraction for all communication:**

```typescript
export interface Message {
  role: 'user' | 'ai' | 'system';
  content: string;          // markdown or plain text
  timestamp: Date;
  metadata?: Record<string, unknown>; // channel-specific data
}
```

**Benefits:**
- Unified format across all interaction channels
- Rich metadata support for UI-specific formatting
- Preserves conversation history in canonical form
- Enables streaming and partial message updates

### 2. InteractionPort Interface

**Transport-agnostic communication layer:**

```typescript
export interface InteractionPort {
  send(msg: Message): Promise<void>;
  onUserMessage(cb: (msg: Message) => Promise<void>): void;
  stream?(partial: Message): void;  // For real-time streaming
}
```

**Implementations:**
- **CliPort**: Renders markdown to stdout, converts stdin → Message
- **AgentPort**: Exposes imperative methods for programmatic control
- **UiPort**: WebSocket wrapper with rich metadata support

### 3. Command Abstraction

**Structured command handling independent of input source:**

```typescript
export interface CommandRequest {
  name: string;
  args: string[];
  options: Record<string, unknown>;
  raw?: string; // preserve original for history
}
```

**Benefits:**
- CLI parses user-typed text to CommandRequest
- UI builds commands directly from form inputs/buttons
- Agents synthesize commands programmatically
- Single command execution pipeline for all channels

### 4. Enhanced Mode Interface

**Updated mode system supporting multiple interaction paradigms:**

```typescript
// Current: execute(input: string): Promise<string>
// Future: execute(input: Message, io?: InteractionPort): Promise<ModeResult>

export interface ModeResult {
  success: boolean;
  messages: Message[];  // Instead of single output string
  artifacts: Artifact[];
  nextSuggestions?: string[];
  errors?: string[];
}
```

## Implementation Phases

### Phase 1: Foundation (High Priority)

**Core abstractions enabling multi-interface support:**

**Task 16**: Design InteractionPort interface and Message type
- Define core communication abstractions
- Create type definitions for Message and InteractionPort
- Establish metadata patterns for different channels

**Task 17**: Implement CliPort adapter
- Create CLI-specific InteractionPort implementation
- Convert stdin/stdout to Message format
- Preserve current CLI behavior and user experience

**Task 18**: Update AbstractMode.execute() signature
- Refactor execute() to use Message input and InteractionPort
- Change ModeResult to return Message[] instead of string
- Add setInteractionPort() for dependency injection
- Maintain backward compatibility

**Task 19**: Implement CommandRequest abstraction
- Create structured command DTO
- Update ModeCommandRouter to accept CommandRequest
- Decouple command parsing from execution

**Dependencies**: Must complete before Discovery Mode (Task 5)

### Phase 2: Agent Integration (Medium Priority)

**Enable Claude Code MCP integration:**

**Task 20**: Implement AgentPort adapter
- Create AgentPort for programmatic AI agent interaction
- Enable structured message exchange
- Support command synthesis and session management

**Task 21**: Add streaming response capabilities
- Implement token-level streaming in InteractionPort
- Enable progressive response rendering
- Support real-time conversational experiences

**Task 22**: Cross-channel session management
- Allow users to start in CLI and continue in agent/UI
- Implement session resolution and state synchronization
- Maintain consistent session state across channels

### Phase 3: UI Integration (Low Priority)

**Enable rich web interface capabilities:**

**Task 23**: Implement UiPort with WebSocket support
- Create UiPort for real-time web interface communication
- Implement bidirectional WebSocket messaging
- Support rich metadata for enhanced UI rendering

**Task 24**: Enhance Message metadata system
- Add UI-specific formatting capabilities
- Implement typed metadata fields for UI components
- Support conversation visualization and progress indicators

**Task 25**: Real-time collaboration features
- Enable multi-user discovery sessions
- Implement concurrent interaction handling
- Add conflict resolution for simultaneous edits

## Interface-Specific Behaviors

### CLI Mode (Current)

```text
User Types Command → CLI Parser → CommandRequest → Mode.execute()
                                                        ↓
Mode.execute() → ModeResult → CliPort.send() → Markdown Rendering → stdout
```

**Characteristics:**
- Interactive terminal sessions
- Markdown rendering with syntax highlighting
- Command history and auto-completion
- Progress indicators using text-based UI

### Agent-Driven Mode

```text
Agent Logic → CommandRequest → Mode.execute() → ModeResult → Structured Response
                                    ↓
                            AgentPort.send() → Programmatic Access → Agent Callback
```

**Characteristics:**
- Programmatic mode control and session management
- Structured message exchange for parsing and analysis
- Streaming responses for real-time feedback
- Integration with Claude Code MCP tools

### UI Orchestrated Mode

```text
Web UI Action → WebSocket → CommandRequest → Mode.execute() → ModeResult
                                                   ↓
Rich UI Components ← UiPort.send() ← WebSocket ← Message with UI Metadata
```

**Characteristics:**
- Real-time chat interface with rich formatting
- Visual progress indicators and interactive elements
- Multi-user collaboration with live updates
- Dashboard views with conversation analytics

## Session Management

### Cross-Channel Session Support

**Unified session architecture:**

```typescript
export interface SessionMetadata {
  sessionId: string;
  channel: 'cli' | 'agent' | 'ui';
  startTime: Date;
  lastActivity: Date;
  participants: string[];  // For multi-user UI sessions
}
```

**Directory Structure:**
```text
.conductor/sessions/
├── {SESSION_ID}/
│   ├── messages.json        # Canonical Message[] history
│   ├── metadata.json        # Session metadata
│   ├── state.json          # Mode-specific state
│   └── artifacts/          # Generated files
```

**Benefits:**
- Users can switch between CLI, agent, and UI seamlessly
- Session state persists across interaction channels
- Conversation history preserved in canonical format
- Multi-user collaboration with shared sessions

## State Management

### Channel-Aware Persistence

**Enhanced state management supporting multiple channels:**

```typescript
export interface ModeContext {
  sessionId: string;
  channel: 'cli' | 'agent' | 'ui';
  interactionPort: InteractionPort;
  // ... existing fields
}
```

**State Synchronization:**
- All state changes broadcast to active channels
- WebSocket connections receive real-time updates
- Agent integration gets structured state notifications
- CLI maintains current file-based persistence

## Error Handling and Fallbacks

### Graceful Degradation

**Multi-channel error handling:**

1. **CliPort**: Traditional error messages and recovery prompts
2. **AgentPort**: Structured error responses for programmatic handling
3. **UiPort**: Rich error displays with user-friendly recovery options

**Fallback Strategy:**
- If WebSocket connection fails, redirect to CLI mode
- If agent integration unavailable, provide manual alternatives
- Always maintain file-based state as source of truth

## Security and Validation

### Channel-Specific Security

**Input validation per interaction channel:**

1. **CLI**: Command-line argument sanitization and path validation
2. **Agent**: API key validation and rate limiting
3. **UI**: WebSocket authentication and CSRF protection

**State Validation:**
- Schema validation for all persisted state
- Cross-channel state consistency checks
- Version compatibility verification

## Testing Strategy

### Multi-Channel Testing

**Comprehensive testing across all interaction paradigms:**

1. **Unit Testing**: Mock InteractionPort for isolated mode testing
2. **Integration Testing**: End-to-end workflows across different channels
3. **Cross-Channel Testing**: Session continuity between CLI, agent, and UI
4. **Performance Testing**: Concurrent multi-user sessions and streaming

### Test Scenarios

**Critical test cases:**
- Start session in CLI, continue in web UI
- Agent-driven discovery with real-time UI monitoring
- Multi-user collaboration with conflict resolution
- Network interruption and reconnection handling

## Migration Strategy

### Incremental Implementation

**Week 1: Foundation**
- Add Message type and InteractionPort interface
- Implement CliPort maintaining current behavior
- Create backward-compatible execute() signature

**Week 2: CLI Integration**
- Refactor ModeResult and ModeCommandRouter
- Update Discovery Mode to use new architecture
- Smoke test all existing CLI functionality

**Future Sprints: New Channels**
- AgentPort for Claude Code MCP integration
- UiPort for WebSocket-based web interface
- Enhanced collaboration features

### Backward Compatibility

**Ensuring smooth transitions:**
- Current CLI behavior preserved exactly
- Existing configuration and state files remain valid
- No breaking changes to user-facing interfaces
- Gradual migration path for internal APIs

## Success Metrics

### Technical Metrics

- **Interface Independence**: Modes work identically across all channels
- **Session Continuity**: 100% state preservation during channel switches
- **Performance**: <100ms latency for real-time UI updates
- **Reliability**: 99.9% uptime for WebSocket connections

### User Experience Metrics

- **CLI Velocity**: No degradation in terminal interaction speed
- **Agent Integration**: Seamless Claude Code MCP operation
- **UI Adoption**: Positive feedback on web interface usability
- **Cross-Channel Usage**: Users successfully switch between interfaces

## Future Considerations

### Extensibility Points

**Additional interaction channels:**
- Voice interface integration
- Mobile app API support
- IDE plugin compatibility
- Third-party tool integrations

### Advanced Features

**Long-term enhancements:**
- Machine learning-based response optimization
- Predictive text and command suggestions
- Advanced collaboration analytics
- Cross-session insight correlation

## Conclusion

This multi-interface architecture provides a clean foundation for supporting CLI, agent-driven, and UI orchestrated interaction paradigms without disrupting current development velocity. By introducing minimal abstractions (InteractionPort, Message, CommandRequest), we enable all three paradigms with minimal refactoring while maintaining clean separation between interaction logic and business logic.

The phased implementation approach ensures the foundation is solid before adding complexity, and the incremental migration strategy preserves backward compatibility while enabling future innovation.