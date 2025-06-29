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

### Type System and Strongly-Typed IDs

Discovery Mode uses a comprehensive type-safe ID system to prevent confusion and enable robust relationships between entities:

```typescript
// Strongly-typed ID system
type TopicId = string & { readonly brand: unique symbol };
type SessionId = string & { readonly brand: unique symbol };
type QuestionId = string & { readonly brand: unique symbol };
type InsightId = string & { readonly brand: unique symbol };
type StakeholderId = string & { readonly brand: unique symbol };
type EntityId = string & { readonly brand: unique symbol };
type ArtifactId = string & { readonly brand: unique symbol };
type RevisionId = string & { readonly brand: unique symbol };

// ID creation utilities
function createTopicId(value: string): TopicId {
  return value as TopicId;
}

function createSessionId(value: string): SessionId {
  return value as SessionId;
}

// Additional ID types as needed...

// Cross-phase topic support
enum ProjectPhase {
  DISCOVERY = "discovery",
  PLANNING = "planning", 
  DESIGN = "design",
  BUILD = "build",
  TEST = "test",
  POLISH = "polish",
  ANALYZE = "analyze"
}

enum TopicPriority {
  CRITICAL = "critical",
  HIGH = "high", 
  MEDIUM = "medium",
  LOW = "low",
  ARCHIVED = "archived"
}

enum TopicRelationship {
  REDUNDANT_WITH = "redundant_with",
  RELATES_TO = "relates_to", 
  BLOCKED_BY = "blocked_by",
  ANSWERS = "answers",
  INVALIDATES = "invalidates",
  SPAWNED_FROM = "spawned_from",
  MERGED_INTO = "merged_into"
}
```

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

### Questions Todo List System

Discovery Mode employs a sophisticated question management system that prevents overwhelming users with multiple questions while maintaining conversational flow. This system is inspired by Claude Code's todo functionality but adapted for Socratic questioning.

#### Question Queue Management

```typescript
interface QuestionTodo {
  questionId: QuestionId;
  question: Question;
  priority: QuestionPriority;
  status: QuestionStatus;
  category: SocraticCategory;
  dependencies?: QuestionId[]; // Questions that should be asked first
  context: QuestionContext;
  userDeferredReason?: string;
  createdAt: Date;
}

enum QuestionStatus {
  PENDING = "pending",
  ASKED = "asked", 
  ANSWERED = "answered",
  DEFERRED = "deferred",
  OBSOLETE = "obsolete"
}

enum QuestionPriority {
  CRITICAL = "critical",  // Must be answered for progress
  HIGH = "high",         // Important for understanding
  MEDIUM = "medium",     // Valuable but not essential
  LOW = "low"           // Nice to know
}

class QuestionTodoManager {
  private questionQueue: Map<QuestionId, QuestionTodo> = new Map();
  private currentQuestion: QuestionTodo | null = null;
  
  // Queue management
  async queueQuestion(question: Question, priority: QuestionPriority, context: QuestionContext): Promise<QuestionId>;
  async getNextQuestion(): Promise<QuestionTodo | null>;
  async markQuestionAnswered(questionId: QuestionId): Promise<void>;
  async deferQuestion(questionId: QuestionId, reason?: string): Promise<void>;
  
  // User interface
  async showPendingQuestions(): Promise<QuestionSummary[]>;
  async prioritizeQuestion(questionId: QuestionId): Promise<void>;
  async removeObsoleteQuestions(context: ConversationContext): Promise<void>;
  
  // Flow control
  async shouldAskNextQuestion(userResponse: string): Promise<boolean>;
  async generateFollowUpQuestions(response: ProcessedInput): Promise<Question[]>;
}
```

#### Conversational Flow with Question Management

The system maintains natural conversation flow while managing question queues internally:

```typescript
class ConversationFlow {
  async processUserInput(input: string): Promise<ConversationResponse> {
    // 1. Process user response to current question
    const processedInput = await this.analyzeResponse(input);
    
    // 2. Mark current question as answered
    if (this.questionManager.currentQuestion) {
      await this.questionManager.markQuestionAnswered(
        this.questionManager.currentQuestion.questionId
      );
    }
    
    // 3. Extract insights and generate follow-up questions
    const insights = await this.insightAnalyzer.extractInsights(processedInput);
    const followUps = await this.questionManager.generateFollowUpQuestions(processedInput);
    
    // 4. Queue new questions without asking immediately
    for (const question of followUps) {
      await this.questionManager.queueQuestion(question, question.priority, context);
    }
    
    // 5. Determine next action based on user cues
    return await this.generateResponse(processedInput, insights);
  }
  
  async generateResponse(input: ProcessedInput, insights: Insight[]): Promise<string> {
    // Check if user indicated they want to continue, change topics, etc.
    const userIntent = await this.detectUserIntent(input);
    
    if (userIntent.wantsToContinue) {
      const nextQuestion = await this.questionManager.getNextQuestion();
      if (nextQuestion) {
        return this.formatQuestionResponse(insights, nextQuestion);
      }
    }
    
    // Otherwise, acknowledge insights and ask if they're ready for next question
    return this.formatAcknowledgmentResponse(insights);
  }
  
  private formatQuestionResponse(insights: Insight[], question: QuestionTodo): string {
    return `${this.acknowledgeInsights(insights)}

${question.question.text}`;
  }
  
  private formatAcknowledgmentResponse(insights: Insight[]): string {
    return `${this.acknowledgeInsights(insights)}

Are you ready for my next question?`;
  }
}
```

#### User Experience Flow

```text
User: "We're having trouble with our inventory system during peak hours"

AI: That sounds challenging. Can you walk me through what happens when 
    inventory runs out during peak hours?

User: [Provides detailed response about customer impact and staff confusion]

AI: I can see this affects both customers and staff significantly. 
    Are you ready for my next question?

User: Yes

AI: Who else in your organization feels the impact when this happens?

[Natural flow continues...]
```

The system queues related questions internally (about specific peak times, frequency, current workarounds, etc.) but presents them one at a time based on user readiness and conversation flow.

### Discovery Sub-modes

Discovery Mode supports different interaction styles to match user preferences and context:

```typescript
enum DiscoverySubMode {
  GUIDED = "guided",        // AI proactively suggests options and directions
  RESPONSIVE = "responsive", // AI waits for user direction and explicit requests
  COLLABORATIVE = "collaborative" // Adaptive - offers help when user seems uncertain
}

interface DiscoveryModeConfig {
  subMode: DiscoverySubMode;
  suggestionTriggers?: SuggestionTriggers;
  questionDepth: QuestionDepth;
  adaptiveThresholds?: AdaptiveThresholds;
}

interface SuggestionTriggers {
  onSilence: boolean;      // Offer suggestions after user pause
  onUncertainty: boolean;  // When user expresses confusion or "I don't know"
  onCompletion: boolean;   // After fully answering questions
  onTopicShift: boolean;   // When user tries to change subjects
}

class SubModeManager {
  async adaptInteractionStyle(subMode: DiscoverySubMode, context: ConversationContext): Promise<void>;
  async detectUserUncertainty(response: string): Promise<boolean>;
  async generateContextualSuggestions(context: ConversationContext): Promise<string[]>;
  async switchSubMode(newMode: DiscoverySubMode): Promise<void>;
}
```

#### Sub-mode Behaviors

**Guided Sub-mode**:

```text
That really helps me understand the urgency. Are you ready for my next question?

Or would you prefer to:
- Explore who else is affected by this problem
- Define what success would look like
- Continue with inventory scenarios
```

**Responsive Sub-mode**:

```text
That really helps me understand the urgency. Are you ready for my next question?

[Waits for user direction, only offers suggestions if explicitly asked]
```

**Collaborative Sub-mode** (adaptive):

```text
That really helps me understand the urgency. Are you ready for my next question?

[If user shows engagement: continues naturally]
[If user hesitates or seems uncertain: offers gentle guidance]
[If user explicitly asks for options: provides suggestions]
```

### Conversation Flow Architecture

#### State Machine Design

Discovery conversations follow a flexible state machine that adapts based on user responses:

```typescript
// Topic-centric conversation state
export interface ConversationState {
  // Topic management
  activeTopics: Map<TopicId, TopicState>;
  currentFocus: TopicId | null;
  
  // Global discovery state (cross-topic)
  overallConfidence: ConfidenceLevel;
  globalReadiness: ReadinessIndicators;
  
  // Session management
  conversationHistory: ConversationTurn[];
  sessionMetadata: SessionMetadata;
}

export interface TopicState {
  topicId: TopicId;
  title: string;
  priority: TopicPriority;
  
  // Cross-phase support - topics can exist in multiple project phases
  activeInPhases: Set<ProjectPhase>;
  
  // Discovery-specific progress (when active in Discovery phase)
  discoveryStage: DiscoveryStage;
  completedStages: Set<DiscoveryStage>;
  
  // Topic-specific discoveries
  stakeholders: Stakeholder[];
  constraints: Constraint[];
  successCriteria: SuccessCriterion[];
  insights: Insight[];
  
  // Topic state
  confidence: ConfidenceLevel;
  readiness: ReadinessIndicators;
  questionQueue: Map<QuestionId, QuestionTodo>;
  lastActivity: Date;
  
  // Future: Topic relationships (Phase 2+)
  relationships?: Map<TopicId, TopicRelationship>;
}

// Discovery stages within topics (not to be confused with project phases)
export enum DiscoveryStage {
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

#### Non-Immutable Stage Navigation

Discovery stages within topics are **non-immutable** - users can freely navigate backward to revise earlier discoveries as new insights emerge. This flexibility is essential for authentic discovery processes where understanding evolves.

```typescript
interface StageNavigationManager {
  // Backward navigation within topics
  async jumpToStage(topicId: TopicId, targetStage: DiscoveryStage): Promise<StageTransition>;
  async reopenStage(topicId: TopicId, stage: DiscoveryStage, reason: string): Promise<void>;
  
  // Change tracking
  async trackStageRevision(revision: StageRevision): Promise<void>;
  async getStageHistory(topicId: TopicId, stage: DiscoveryStage): Promise<StageRevision[]>;
  
  // Impact assessment
  async assessRevisionImpact(revision: StageRevision): Promise<ImpactAssessment>;
  async suggestRelatedUpdates(revision: StageRevision): Promise<UpdateSuggestion[]>;
}

interface StageRevision {
  revisionId: RevisionId;
  topicId: TopicId;
  stageId: DiscoveryStage;
  timestamp: Date;
  changes: Change[];
  reason: string;
  impactedArtifacts: ArtifactId[];
  userInitiated: boolean;
}

interface ImpactAssessment {
  affectedStages: DiscoveryStage[];
  impactedTopics: TopicId[];
  outdatedArtifacts: ArtifactId[];
  conflictingInsights: InsightId[];
  recommendedActions: RecommendedAction[];
}

class StageRevisionHandler {
  async handleStageJump(topicId: TopicId, fromStage: DiscoveryStage, toStage: DiscoveryStage): Promise<void> {
    // 1. Preserve current state
    await this.preserveCurrentState(topicId, fromStage);
    
    // 2. Load target stage context
    const targetContext = await this.loadStageContext(topicId, toStage);
    
    // 3. Transition conversation state
    await this.transitionToStage(topicId, toStage, targetContext);
    
    // 4. Update user interface
    await this.updateNavigationIndicators(topicId, fromStage, toStage);
  }
  
  async processStageRevision(revision: StageRevision): Promise<void> {
    // 1. Apply changes to stage data
    await this.applyRevisionChanges(revision);
    
    // 2. Assess downstream impact
    const impact = await this.assessRevisionImpact(revision);
    
    // 3. Update affected artifacts
    await this.updateAffectedArtifacts(impact);
    
    // 4. Track revision for future reference
    await this.trackRevision(revision);
  }
}
```

#### Stage Navigation User Experience

```text
🌱 Discovery Mode - Problem Definition Stage

Current Topic: Inventory Management Issues
Progress: ████████░░ 80% complete

You mentioned earlier that "customers get frustrated." I'd like to 
understand that better. What specific behaviors do you see?

> User: Actually, I realize I wasn't clear about who the main stakeholders are. 
         Can we go back to that?

Navigation Options:
← Back to Stakeholder Mapping
↻ Restart Problem Definition  
→ Continue to Success Criteria
📋 View All Stages
🔄 Switch Topics

[User selects "Back to Stakeholder Mapping"]

🌱 Discovery Mode - Stakeholder Mapping Stage (Revisited)

Topic: Inventory Management Issues

Let's revisit who's affected by this inventory problem. You've identified:
- Customers (get frustrated during stockouts)
- Staff (confusion during peak hours)

What other stakeholders should we consider?
```

#### Change Impact Management

When users revise earlier discoveries, the system tracks impacts and suggests updates:

```typescript
class ChangeImpactTracker {
  async analyzeRevisionImpact(revision: PhaseRevision): Promise<void> {
    const impactedElements = await this.findImpactedElements(revision);
    
    // Assess artifact consistency
    const artifactImpacts = await this.assessArtifactImpacts(impactedElements);
    
    // Check for insight conflicts
    const conflictingInsights = await this.findConflictingInsights(revision);
    
    // Generate user-friendly update suggestions
    const suggestions = await this.generateUpdateSuggestions(
      artifactImpacts, 
      conflictingInsights
    );
    
    await this.presentUpdateOptions(suggestions);
  }
  
  private async presentUpdateOptions(suggestions: UpdateSuggestion[]): Promise<void> {
    if (suggestions.length > 0) {
      // Show user what might need updating
      await this.showImpactSummary(suggestions);
      
      // Let user choose which updates to apply
      await this.offerSelectiveUpdates(suggestions);
    }
  }
}
```

**Phase 1 Scope**: Within-Discovery-mode phase jumping and basic change tracking
**Deferred to Phase 3**: Cross-mode change propagation (Discovery → Planning → Build) via Task #12

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

### Information Capture and Storage Architecture

Discovery Mode implements a comprehensive 3-phase approach to information capture, organization, and retrieval that evolves from immediate capture to advanced semantic search.

#### Phase 1: Real-time Capture and Basic Organization

The foundation phase focuses on structured data capture during conversations with immediate organization for basic retrieval:

```typescript
// Multi-layered capture during conversation
interface ConversationCapture {
  rawTranscript: ConversationTurn[];
  extractedEntities: Entity[];     // People, problems, constraints, etc.
  taggedInsights: TaggedInsight[]; // Manually/auto-tagged key discoveries
  relationshipMap: Relationship[]; // How entities connect
  contextMetadata: ContextMetadata;
}

interface DiscoveryKnowledgeBase {
  topics: Map<TopicId, TopicGraph>;
  entities: Map<EntityId, EntityRecord>;
  relationships: Relationship[];
  insights: Insight[];
  patterns: DiscoveredPattern[];
  sessions: Map<SessionId, SessionRecord>;
}

class DiscoveryKnowledgeCapture {
  // Real-time extraction during conversation
  async captureUserResponse(response: string, context: ConversationContext): Promise<CaptureResult> {
    const entities = await this.extractEntities(response);
    const insights = await this.identifyInsights(response, context);
    const relationships = await this.inferRelationships(entities, context);
    
    // Update knowledge base immediately
    await this.updateKnowledgeBase({entities, insights, relationships});
    
    // Make searchable in real-time
    await this.updateBasicIndex({entities, insights, relationships});
    
    return {entities, insights, relationships};
  }
  
  // Structured storage
  async updateKnowledgeBase(info: CapturedInformation): Promise<void> {
    await this.fileOps.atomicWrite('.conductor/modes/discovery/knowledge/entities.json', 
      JSON.stringify(this.knowledgeBase.entities, null, 2));
    await this.fileOps.atomicWrite('.conductor/modes/discovery/knowledge/insights.json',
      JSON.stringify(this.knowledgeBase.insights, null, 2));
  }
}
```

**Phase 1 File Structure**:

```text
.conductor/modes/discovery/
├── sessions/
│   ├── session-2024-12-29.md           # Raw conversation transcript
│   └── session-2024-12-29.json         # Structured session data
├── knowledge/
│   ├── entities.json                   # All discovered entities
│   ├── insights.json                   # Key insights with metadata
│   ├── relationships.json              # Entity relationships
│   └── topics/
│       ├── inventory-management.md     # Topic-specific insights
│       └── stakeholder-concerns.md
├── artifacts/
│   ├── project-documents/              # Generated project.md files
│   └── summaries/                      # Conversation summaries
└── state/
    └── current-knowledge-base.json     # Complete knowledge graph
```

#### Phase 2: Basic Search and Retrieval

Adds simple but effective search capabilities for immediate productivity:

```typescript
interface BasicSearchCapabilities {
  // Text-based search
  searchByText(query: string): Promise<SearchResult[]>;
  searchByDateRange(start: Date, end: Date): Promise<SearchResult[]>;
  
  // Entity-based search
  searchByEntityType(entityType: EntityType): Promise<EntityRecord[]>;
  searchByStakeholder(stakeholderId: StakeholderId): Promise<SearchResult[]>;
  
  // Topic-based search
  searchByTopic(topicId: TopicId): Promise<TopicSearchResult>;
  findRelatedTopics(topicId: TopicId): Promise<TopicId[]>;
  
  // Insight search
  searchInsightsByTag(tags: string[]): Promise<Insight[]>;
  findInsightsByConfidence(minConfidence: number): Promise<Insight[]>;
}

class BasicSearchEngine {
  private textIndex: Map<string, Set<string>> = new Map(); // word -> document IDs
  private entityIndex: Map<EntityType, EntityRecord[]> = new Map();
  private topicIndex: Map<TopicId, TopicSearchData> = new Map();
  
  async buildSearchIndex(): Promise<void> {
    // Build text index from all documents
    for (const [sessionId, session] of this.knowledgeBase.sessions) {
      const words = this.tokenizeText(session.transcript);
      for (const word of words) {
        if (!this.textIndex.has(word)) {
          this.textIndex.set(word, new Set());
        }
        this.textIndex.get(word)!.add(sessionId);
      }
    }
    
    // Build entity and topic indexes
    await this.indexEntities();
    await this.indexTopics();
  }
  
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // Text search
    if (query.text) {
      results.push(...await this.searchText(query.text));
    }
    
    // Entity search
    if (query.entityType) {
      results.push(...await this.searchEntities(query.entityType));
    }
    
    // Topic search
    if (query.topicId) {
      results.push(...await this.searchTopic(query.topicId));
    }
    
    return this.rankAndDeduplicateResults(results);
  }
}
```

#### Phase 3: Advanced Indexing and Semantic Search

Future enhancement for sophisticated information retrieval:

```typescript
interface AdvancedSearchCapabilities {
  // Semantic search
  semanticSearch(query: string): Promise<SemanticSearchResult[]>;
  findSimilarInsights(insight: Insight): Promise<Insight[]>;
  
  // AI-powered querying
  askQuestion(question: string): Promise<AnswerWithSources>;
  explainConcept(concept: string): Promise<ConceptExplanation>;
  
  // Pattern recognition
  findRecurringPatterns(criteria: PatternCriteria): Promise<Pattern[]>;
  identifyKnowledgeGaps(): Promise<KnowledgeGap[]>;
  suggestExplorationAreas(): Promise<ExplorationSuggestion[]>;
  
  // Cross-topic analysis
  analyzeTopicRelationships(): Promise<TopicRelationshipGraph>;
  findConflictingInsights(): Promise<ConflictAnalysis[]>;
}

// Deferred to Phase 3
class SemanticSearchEngine {
  async generateEmbeddings(content: string): Promise<number[]>;
  async findSimilarContent(embedding: number[], threshold: number): Promise<ContentMatch[]>;
  async buildSemanticIndex(): Promise<void>;
}
```

**Implementation Timeline**:

- **Phase 1** (Current): Real-time capture with basic file organization
- **Phase 2** (Next): Simple text and entity search capabilities  
- **Phase 3** (Future): Advanced semantic search and AI-powered analysis

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

### Topic Management and Resumption Interface

A core Phase 1 requirement, Discovery Mode provides comprehensive topic visibility and seamless resumption capabilities to support multiple parallel discovery threads:

```typescript
interface TopicManagementInterface {
  // Topic visibility
  async listActiveTopics(): Promise<TopicSummary[]>;
  async showTopicDetails(topicId: TopicId): Promise<TopicDetails>;
  async getTopicTimeline(topicId: TopicId): Promise<Timeline>;
  
  // Topic resumption
  async resumeTopic(topicId: TopicId): Promise<ConversationContext>;
  async switchToTopic(topicId: TopicId): Promise<void>;
  async createNewTopic(title: string, initialContext?: string): Promise<TopicId>;
  
  // Topic search and navigation
  async searchTopicHistory(query: string): Promise<SearchResult[]>;
  async findRelatedTopics(topicId: TopicId): Promise<TopicId[]>;
  async archiveTopic(topicId: TopicId, reason?: string): Promise<void>;
}

interface TopicSummary {
  topicId: TopicId;
  title: string;
  priority: TopicPriority;
  lastActivity: Date;
  discoveryProgress: ProgressIndicator;
  unreadInsights: number;
  nextAction?: string;  // "awaiting your input", "needs clarification", etc.
  activeStages: DiscoveryStage[];
  totalStakeholders: number;
  keyConstraints: string[];
}

interface TopicDetails extends TopicSummary {
  fullConversationHistory: ConversationTurn[];
  allInsights: Insight[];
  questionQueue: QuestionTodo[];
  stakeholderDetails: Stakeholder[];
  constraintDetails: Constraint[];
  successCriteriaDetails: SuccessCriterion[];
  relatedArtifacts: ArtifactId[];
}

class TopicManager {
  async createTopicSummary(topicState: TopicState): Promise<TopicSummary> {
    const progress = this.calculateDiscoveryProgress(topicState);
    const nextAction = await this.determineNextAction(topicState);
    const unreadInsights = this.countUnreadInsights(topicState);
    
    return {
      topicId: topicState.topicId,
      title: topicState.title,
      priority: topicState.priority,
      lastActivity: topicState.lastActivity,
      discoveryProgress: progress,
      unreadInsights,
      nextAction,
      activeStages: Array.from(topicState.completedStages),
      totalStakeholders: topicState.stakeholders.length,
      keyConstraints: topicState.constraints.map(c => c.description).slice(0, 3)
    };
  }
  
  async resumeTopicConversation(topicId: TopicId): Promise<ConversationContext> {
    const topicState = await this.loadTopicState(topicId);
    const lastConversationTurn = this.getLastConversationTurn(topicState);
    const pendingQuestions = this.getPendingQuestions(topicState);
    
    // Restore conversation context
    const context: ConversationContext = {
      currentTopic: topicState,
      conversationHistory: topicState.conversationHistory || [],
      lastUserInput: lastConversationTurn?.userInput,
      pendingQuestions,
      discoveryProgress: this.calculateProgress(topicState),
      nextSuggestedAction: await this.suggestNextAction(topicState)
    };
    
    return context;
  }
}
```

#### Topic Dashboard User Experience

Users see clear topic overview with actionable resumption options:

```text
🌱 Discovery Mode - Your Active Topics

📋 Active Topics (3):

┌─ 🔥 CRITICAL: Authentication Security (2 hours ago)
│  Discovery Progress: ████████░░ 80% | 3 new insights since last visit
│  Current Stage: Constraint Identification
│  Next Action: Review security requirements with stakeholders
│  Stakeholders: 4 identified | Key Constraints: Compliance, Budget, Timeline
│
├─ ⭐ HIGH: User Onboarding Flow (yesterday) 
│  Discovery Progress: ██████░░░░ 60% | Ready for your input
│  Current Stage: Success Definition
│  Next Action: "Tell me about first-time user goals"
│  Stakeholders: 2 identified | Key Constraints: Technical complexity
│
└─ 📋 MEDIUM: Database Migration Strategy (3 days ago)
   Discovery Progress: ███░░░░░░░ 30% | Paused - awaiting constraints
   Current Stage: Problem Definition
   Next Action: Explore performance requirements
   Stakeholders: 1 identified | Key Constraints: None yet defined

Commands:
- Type topic name or number to resume (e.g., "Authentication" or "1")
- "new topic [title]" to start new discussion
- "search [query]" to find past insights
- "archive [topic]" to close completed topics

What would you like to explore?
```

#### Topic Resumption Flow

Seamless context restoration when returning to topics:

```text
> User: Authentication

🌱 Resuming Topic: Authentication Security

Last we discussed the OAuth integration concerns with your security team.
You mentioned compliance requirements were still being clarified.

📊 Progress Summary:
✅ Problem Definition: OAuth complexity affecting user experience
✅ Stakeholder Mapping: Security team, Dev team, Compliance, End users  
✅ Need Exploration: Balance security with user experience
🔄 Current: Constraint Identification (80% complete)

💡 Key Insights Since Last Session:
- Security team prefers SAML over OAuth for enterprise features
- Compliance requires 2FA for admin accounts
- Dev team concerned about implementation timeline

🎯 Where we left off:
You were going to check with compliance about specific requirements 
for user session management. 

Did you have a chance to follow up on that, or would you like to 
explore a different aspect of the authentication challenge?
```

This interface ensures users never lose context when managing multiple discovery topics and can seamlessly switch between different problem explorations.

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

### Phases

- **Phase 1**: Basic conversation → persistent insights
- **Phase 2**: Linear questioning → adaptive Socratic dialogue  
- **Phase 3**: Single session → multi-topic knowledge building
- **Phase 4**: Functional system → production-ready experience

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
