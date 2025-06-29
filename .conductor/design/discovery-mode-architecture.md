# Discovery Mode Architecture Design

## Executive Summary

Discovery Mode is the first concrete implementation of the Conductor mode system, designed for problem exploration through conversational discovery. Unlike traditional requirements gathering, Discovery Mode employs Socratic questioning methods to guide users through progressive understanding of their problem space, stakeholder needs, and success criteria. This architecture document outlines the technical design for implementing Discovery Mode as a reference implementation for future modes.

## Design Principles

### Core Philosophy

Discovery Mode embodies a **problem-first, patient exploration** approach that:

1. **Starts with problems, not solutions** - Actively prevents premature solution jumping
2. **Uses Socratic questioning** - Guides users to discover insights rather than collecting requirements
3. **Grounds abstract ideas in concrete examples** - Converts vague concepts into specific scenarios
4. **Builds progressive understanding** - Reveals complexity gradually through structured dialogue
5. **Captures emergent insights** - Documents both explicit statements and discovered patterns

### Conversation Design Principles

- **Natural flow over rigid structure** - Questions adapt to user responses while maintaining direction
- **Empathy-driven interaction** - Validates emotions and frustrations to uncover true drivers
- **Story-based discovery** - Leverages narrative thinking for richer context extraction
- **Progressive disclosure** - Prevents cognitive overload through staged information gathering
- **Exit flexibility** - Multiple save points and clear transition criteria

## Technical Architecture

### Class Structure

```typescript
// src/modes/discovery/discovery-mode.ts
export class DiscoveryMode extends AbstractMode {
  name = "discovery";
  description = "Explore and understand problems through conversational discovery";
  
  private conversationManager: ConversationManager;
  private questionEngine: QuestionEngine;
  private insightAnalyzer: InsightAnalyzer;
  private artifactGenerator: DiscoveryArtifactGenerator;
  private stateManager: DiscoveryStateManager;
  
  // Core discovery capabilities
  async buildProblemUnderstanding(input: string): Promise<ProblemInsights>;
  async exploreUserNeeds(): Promise<UserNeedAnalysis>;
  async defineSuccessCriteria(): Promise<SuccessMetrics>;
  async identifyConstraints(): Promise<ConstraintAnalysis>;
  async mapStakeholders(): Promise<StakeholderMap>;
  
  // Conversation flow management
  async guideDiscoveryConversation(userInput: string): Promise<ConversationStep>;
  async generateProbingQuestions(context: ConversationContext): Promise<Question[]>;
  async validateDiscoveryCompleteness(): Promise<ReadinessAssessment>;
  
  // Command handlers
  async handleExplore(problemSpace: string): Promise<ModeResult>;
  async handleWhoFor(stakeholder: string): Promise<ModeResult>;
  async handleSuccess(criteria: string): Promise<ModeResult>;
  async handleConstraint(limitation: string): Promise<ModeResult>;
  async handleWhatIf(scenario: string): Promise<ModeResult>;
}
```

### Core Components

#### 1. Conversation Manager

Manages the overall flow and state of discovery conversations:

```typescript
export class ConversationManager {
  private conversationState: ConversationState;
  private transitionRules: TransitionRule[];
  private contextTracker: ContextTracker;
  
  // State management
  async initializeConversation(context?: PartialContext): Promise<void>;
  async processUserInput(input: string): Promise<ProcessedInput>;
  async determineNextAction(currentState: ConversationState): Promise<NextAction>;
  async transitionState(action: StateTransition): Promise<void>;
  
  // Context tracking
  async updateContext(input: ProcessedInput): Promise<void>;
  async detectThemes(conversationHistory: ConversationTurn[]): Promise<Theme[]>;
  async identifyGaps(): Promise<InformationGap[]>;
  
  // Flow control
  async handleTangent(tangentInput: string): Promise<TangentResult>;
  async summarizeProgress(): Promise<ProgressSummary>;
  async checkExitCriteria(): Promise<ExitReadiness>;
}
```

#### 2. Question Engine

Generates contextually appropriate Socratic questions:

```typescript
export class QuestionEngine {
  private questionTemplates: QuestionTemplateLibrary;
  private contextAnalyzer: ContextAnalyzer;
  private progressionStrategy: ProgressionStrategy;
  
  // Question generation
  async generateQuestion(
    category: SocraticCategory,
    context: ConversationContext
  ): Promise<Question>;
  
  async selectNextQuestionCategory(
    history: ConversationHistory
  ): Promise<SocraticCategory>;
  
  async personalizeQuestion(
    template: QuestionTemplate,
    context: ConversationContext
  ): Promise<string>;
  
  // Progressive disclosure
  async determineQuestionDepth(
    userEngagement: EngagementMetrics
  ): Promise<QuestionDepth>;
  
  async adaptComplexity(
    baseQuestion: Question,
    userProfile: UserProfile
  ): Promise<Question>;
}

// Question categories based on Socratic method
export enum SocraticCategory {
  CLARIFICATION = "clarification",
  ASSUMPTIONS = "assumptions", 
  EVIDENCE = "evidence",
  IMPLICATIONS = "implications",
  PERSPECTIVES = "perspectives",
  META_QUESTIONS = "meta_questions"
}
```

#### 3. Insight Analyzer

Extracts patterns and insights from conversation:

```typescript
export class InsightAnalyzer {
  private patternRecognizer: PatternRecognizer;
  private sentimentAnalyzer: SentimentAnalyzer;
  private assumptionDetector: AssumptionDetector;
  
  // Analysis capabilities
  async analyzeResponse(response: UserResponse): Promise<ResponseAnalysis>;
  async extractKeyInsights(conversation: Conversation): Promise<Insight[]>;
  async identifyAssumptions(statements: Statement[]): Promise<Assumption[]>;
  async detectEmotionalDrivers(responses: UserResponse[]): Promise<EmotionalDriver[]>;
  
  // Pattern recognition
  async findRecurringThemes(history: ConversationHistory): Promise<Theme[]>;
  async identifyStakeholderPatterns(mentions: StakeholderMention[]): Promise<StakeholderPattern[]>;
  async recognizeConstraintTypes(constraints: string[]): Promise<ConstraintClassification[]>;
  
  // Synthesis
  async synthesizeProblemStatement(insights: Insight[]): Promise<ProblemStatement>;
  async generateSuccessCriteria(goals: Goal[]): Promise<SuccessCriteria[]>;
}
```

#### 4. Discovery State Manager

Handles persistence and state transitions:

```typescript
export class DiscoveryStateManager {
  private fileOps: FileOperations;
  private stateValidator: StateValidator;
  
  // State persistence
  async saveConversationState(state: ConversationState): Promise<void>;
  async loadConversationState(): Promise<ConversationState | null>;
  async saveInsights(insights: Insight[]): Promise<void>;
  async loadPreviousInsights(): Promise<Insight[]>;
  
  // Session management
  async createSession(metadata: SessionMetadata): Promise<Session>;
  async resumeSession(sessionId: string): Promise<Session>;
  async mergeSessionInsights(sessions: Session[]): Promise<MergedInsights>;
  
  // State validation
  async validateStateTransition(from: State, to: State): Promise<boolean>;
  async checkStateConsistency(state: ConversationState): Promise<ValidationResult>;
}
```

### Conversation Flow Architecture

#### State Machine Design

Discovery conversations follow a flexible state machine that adapts based on user responses:

```typescript
export interface ConversationState {
  currentPhase: DiscoveryPhase;
  completedPhases: Set<DiscoveryPhase>;
  activeTopics: Topic[];
  identifiedStakeholders: Stakeholder[];
  discoveredConstraints: Constraint[];
  successCriteria: SuccessCriterion[];
  confidence: ConfidenceLevel;
  readiness: ReadinessIndicators;
}

export enum DiscoveryPhase {
  INITIAL_EXPLORATION = "initial_exploration",
  PROBLEM_DEFINITION = "problem_definition",
  STAKEHOLDER_MAPPING = "stakeholder_mapping", 
  NEED_EXPLORATION = "need_exploration",
  SUCCESS_DEFINITION = "success_definition",
  CONSTRAINT_IDENTIFICATION = "constraint_identification",
  VALIDATION = "validation",
  SYNTHESIS = "synthesis"
}
```

#### Conversation Flow Patterns

1. **Opening Flow**

   ```text
   Welcome → Context Setting → Broad Problem Inquiry → Initial Exploration
   ```

2. **Exploration Loops**

   ```text
   Question → Response → Analysis → Follow-up → Deeper Question → Insight Capture
   ```

3. **Transition Patterns**

   ```text
   Phase Completion → Summary → Bridge Question → New Phase Introduction
   ```

4. **Exit Patterns**

   ```text
   Completeness Check → Summary Generation → Next Steps Suggestion → Save State
   ```

### Question Generation System

#### Template Library Structure

```typescript
export interface QuestionTemplate {
  id: string;
  category: SocraticCategory;
  phase: DiscoveryPhase;
  template: string;
  variables: Variable[];
  followUpTemplates: string[];
  contextRequirements: ContextRequirement[];
  engagementLevel: EngagementLevel;
}

// Example templates by category
const CLARIFICATION_TEMPLATES = [
  {
    id: "clarify_problem_term",
    template: "When you say '{term}', what specifically does that mean in your context?",
    variables: ["term"],
    contextRequirements: ["problem_mentioned"]
  },
  {
    id: "clarify_impact",
    template: "You mentioned this affects {stakeholder}. Can you describe exactly how they experience this problem?",
    variables: ["stakeholder"],
    contextRequirements: ["stakeholder_identified"]
  }
];

const ASSUMPTION_TEMPLATES = [
  {
    id: "challenge_solution_assumption",
    template: "I notice you're thinking about {solution_approach}. What makes you believe that's the right direction?",
    variables: ["solution_approach"],
    contextRequirements: ["premature_solution_mentioned"]
  }
];
```

#### Dynamic Question Selection

```typescript
export class QuestionSelector {
  async selectNextQuestion(context: ConversationContext): Promise<Question> {
    // 1. Analyze conversation progress
    const progress = await this.analyzeProgress(context);
    
    // 2. Identify information gaps
    const gaps = await this.identifyGaps(context);
    
    // 3. Determine appropriate question category
    const category = await this.selectCategory(progress, gaps);
    
    // 4. Choose specific question template
    const template = await this.selectTemplate(category, context);
    
    // 5. Personalize with context
    return await this.personalizeQuestion(template, context);
  }
}
```

### Artifact Generation

Discovery Mode generates structured artifacts that capture both explicit information and emergent insights:

```typescript
export class DiscoveryArtifactGenerator {
  // Primary artifact: Living project document
  async generateProjectDocument(state: ConversationState): Promise<ProjectDocument>;
  
  // Supporting artifacts
  async generateConversationSummary(history: ConversationHistory): Promise<ConversationSummary>;
  async generateStakeholderMap(stakeholders: Stakeholder[]): Promise<StakeholderMap>;
  async generateConstraintAnalysis(constraints: Constraint[]): Promise<ConstraintAnalysis>;
  async generateSuccessMetrics(criteria: SuccessCriterion[]): Promise<SuccessMetrics>;
  
  // Insight artifacts
  async generateInsightReport(insights: Insight[]): Promise<InsightReport>;
  async generateAssumptionLog(assumptions: Assumption[]): Promise<AssumptionLog>;
  async generateValidationPlan(validationNeeds: ValidationNeed[]): Promise<ValidationPlan>;
}
```

### Integration Points

#### With AbstractMode Base Class

Discovery Mode extends AbstractMode and implements all required methods:

```typescript
export class DiscoveryMode extends AbstractMode {
  // Required lifecycle methods
  async initialize(): Promise<void> {
    await super.initialize();
    this.conversationManager = new ConversationManager(this.fileOps, this.logger);
    this.questionEngine = new QuestionEngine(this.promptManager);
    this.insightAnalyzer = new InsightAnalyzer();
    this.artifactGenerator = new DiscoveryArtifactGenerator(this.fileOps);
    await this.loadDiscoveryState();
  }
  
  async execute(input: string): Promise<string> {
    const result = await this.guideDiscoveryConversation(input);
    return this.formatResponse(result);
  }
  
  async cleanup(): Promise<void> {
    await this.saveDiscoveryState();
    await super.cleanup();
  }
  
  // Required abstract methods
  validateInput(input: string): ValidationResult {
    // Validate user input for discovery context
    return this.conversationManager.validateInput(input);
  }
  
  getAvailableCommands(): ModeCommand[] {
    return [
      {
        name: "explore",
        description: "Start exploring a problem space",
        handler: this.handleExplore.bind(this)
      },
      {
        name: "who-for", 
        description: "Identify stakeholders affected by the problem",
        handler: this.handleWhoFor.bind(this)
      },
      // ... other commands
    ];
  }
}
```

#### With File Operations

All state persistence uses the established FileOperations patterns:

```typescript
// State file structure
.conductor/
├── modes/
│   └── discovery/
│       ├── conversations/
│       │   ├── current-session.md
│       │   └── session-history.json
│       ├── insights/
│       │   ├── discovered-insights.md
│       │   └── assumptions.json
│       └── state/
│           └── conversation-state.json
```

#### With Prompt Management

Discovery Mode uses the PromptManager for AI interactions:

```typescript
async generateAIResponse(context: ConversationContext): Promise<string> {
  const systemPrompt = await this.promptManager.generateSystemPrompt(
    "discovery",
    context
  );
  
  const userPrompt = await this.promptManager.generateUserPrompt(
    context.lastUserInput,
    context
  );
  
  // Add discovery-specific context
  const enrichedPrompt = this.enrichPromptWithDiscoveryContext(
    userPrompt,
    context
  );
  
  return await this.aiService.complete(systemPrompt, enrichedPrompt);
}
```

## Implementation Strategy

### Phase 1: Core Foundation (Current)

**Minimal Viable Discovery Mode**:

1. Basic conversation flow with simple state management
2. Core question templates for primary Socratic categories
3. Simple insight extraction and problem statement generation
4. Basic project.md generation
5. Session persistence and resumption

**Deferred to Phase 2**:

- Agent integration (Complexity Watchdog, Security Agent)
- Advanced pattern recognition
- Multi-session insight synthesis
- Sophisticated emotion analysis

### Phase 2: Enhanced Capabilities

**Advanced Features**:

1. Agent integration for enriched discovery
2. Advanced pattern recognition and theme extraction
3. Emotional driver analysis
4. Multi-stakeholder perspective management
5. Sophisticated assumption detection and validation

### Key Implementation Files

```typescript
// File structure
src/
├── modes/
│   └── discovery/
│       ├── discovery-mode.ts           // Main mode implementation
│       ├── conversation-manager.ts     // Conversation flow control
│       ├── question-engine.ts          // Question generation
│       ├── insight-analyzer.ts         // Response analysis
│       ├── state-manager.ts            // State persistence
│       ├── artifact-generator.ts       // Document generation
│       ├── templates/
│       │   ├── questions.json          // Question template library
│       │   └── prompts.json            // AI prompt templates
│       └── types/
│           ├── conversation.ts         // Conversation types
│           ├── insights.ts             // Insight types
│           └── artifacts.ts            // Artifact types
```

## User Experience Design

### Conversation Interface

Discovery Mode presents a patient, curious interface that encourages exploration:

```text
🌱 Discovery Mode

I'd like to understand the challenge you're facing. There's no rush - we'll 
explore this together at your pace.

What's been on your mind lately that you'd like to explore?

> [User describes initial problem]

That sounds challenging. Tell me about a recent time when this problem really 
affected your work...
```

### Progress Indicators

Users see their discovery progress through visual cues:

```text
Discovery Progress:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Problem Understanding    ████████░░ 80%
Stakeholder Mapping      ██████░░░░ 60%  
Success Criteria         ████░░░░░░ 40%
Constraints Identified   ███████░░░ 70%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Key Insights Discovered: 5
👥 Stakeholders Identified: 3
🎯 Success Metrics Defined: 2
```

### Natural Transitions

Mode transitions feel organic and user-driven:

```text
Based on our exploration, I have a good understanding of your problem space:
- Core challenge: [summarized problem]
- Key stakeholders: [stakeholder list]
- Success looks like: [success criteria]

Would you like to:
1. Continue exploring specific aspects
2. Move to planning how to address this
3. Save our discoveries and continue later

What feels right for you?
```

## Testing Strategy

### Unit Testing Focus Areas

1. **Question Generation**: Verify appropriate question selection based on context
2. **State Transitions**: Ensure valid conversation flow transitions
3. **Insight Extraction**: Test pattern recognition and theme identification
4. **Artifact Generation**: Validate document structure and content accuracy

### Integration Testing

1. **Full Conversation Flows**: End-to-end discovery sessions
2. **State Persistence**: Save/resume functionality across sessions
3. **Mode Transitions**: Smooth handoff to other modes
4. **Error Recovery**: Graceful handling of unexpected inputs

### User Experience Testing

1. **Conversation Naturalness**: Validate flow feels organic
2. **Question Relevance**: Ensure questions make sense in context
3. **Progress Clarity**: Users understand their discovery status
4. **Exit Flexibility**: Multiple save/continue points work correctly

## Success Metrics

### Technical Metrics

- **Response Time**: < 2 seconds for question generation
- **State Persistence**: 100% reliable save/restore
- **Context Accuracy**: 95%+ relevant question selection
- **Artifact Quality**: Valid, complete project documents

### User Experience Metrics

- **Engagement Duration**: Average 15-30 minute sessions
- **Completion Rate**: 80%+ reach clear problem definition
- **Insight Discovery**: Average 5-10 key insights per session
- **User Satisfaction**: Positive feedback on conversation flow

### Discovery Effectiveness

- **Problem Clarity**: Users can articulate problem after session
- **Stakeholder Coverage**: All key stakeholders identified
- **Success Definition**: Clear, measurable criteria established
- **Assumption Surface**: Hidden assumptions made explicit

## Future Enhancements

### Phase 2 Additions

1. **Agent Integration**: Complexity and Security agents provide additional perspectives
2. **Advanced Analytics**: Deeper pattern recognition and insight correlation
3. **Multi-Session Synthesis**: Combine insights across multiple discovery sessions
4. **Team Discovery**: Collaborative discovery with multiple participants

### Long-term Vision

1. **Adaptive Questioning**: ML-based question selection optimization
2. **Domain Specialization**: Industry-specific discovery patterns
3. **Visual Discovery**: Diagram and sketch integration
4. **Voice Interaction**: Natural speech-based discovery sessions

## Conclusion

Discovery Mode establishes the foundation for Conductor's mode-based architecture while providing immediate value through structured problem exploration. By focusing on Socratic questioning and progressive understanding, it helps users move from vague problem statements to clear, actionable project definitions. The implementation balances sophisticated conversation design with practical technical constraints, creating a reference implementation for future modes while delivering a compelling user experience for problem discovery.
