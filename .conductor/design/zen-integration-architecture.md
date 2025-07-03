# Zen Integration Architecture for Conductor

## Executive Summary

This document outlines the architectural pivot for Conductor to leverage zen tools as the "engine" behind our cross-cutting agents, rather than building custom analysis capabilities from scratch. This approach preserves Conductor's unique value proposition (mode-based UX, context preservation, human strategic control) while dramatically accelerating delivery and reducing maintenance burden.

## Strategic Decision Rationale

### What Conductor Uniquely Provides
- **Mode-based workflow UX**: Discovery → Planning → Design → Build → Test → Polish → Analyze
- **Persistent project memory**: File-backed state across sessions and modes
- **Context preservation**: Seamless handoffs between modes with accumulated knowledge
- **Human strategic control**: Escalation triggers, quality gates, and decision points
- **Workflow orchestration**: Multi-mode coordination and progression logic

### What zen Already Excels At
- **Specialized analysis**: `thinkdeep`, `analyze`, `codereview`, `secaudit`, `debug`, `testgen`, `refactor`
- **Tactical AI capabilities**: Deep technical analysis with proven prompt engineering
- **Maintenance**: Continuously updated by external team, free bug fixes and improvements
- **Sophistication**: Complex analysis patterns and heuristics already implemented

### The Architectural Sweet Spot
**Conductor owns the workflow, zen owns the analysis**

- Conductor provides the mode-based experience and long-term project context
- zen provides sophisticated, specialized analysis capabilities
- Thin adapter layer maps between Conductor's `CrossCuttingAgent` interface and zen tools
- Fallback mechanisms for environments without zen installation

## Architecture Overview

### Agent Integration Pattern

```typescript
// Core interface (unchanged)
export interface CrossCuttingAgent {
  name: string;
  description: string;
  supportedModes: string[];
  
  evaluateProposal(proposal: any, context: ModeContext): Promise<AgentFeedback>;
  contributeRequirements(context: ModeContext): Promise<RequirementContribution>;
  validateOutput(output: ModeResult, context: ModeContext): Promise<ValidationResult>;
}

// New zen adapter base class
export abstract class ZenAgentAdapter implements CrossCuttingAgent {
  abstract name: string;
  abstract description: string;
  abstract supportedModes: string[];
  abstract zenToolName: string;
  
  protected async runZenTool(args: string[], input?: string): Promise<ZenToolResult> {
    // Execute zen tool via CLI or library
    // Handle errors and timeouts
    // Parse JSON output
  }
  
  protected abstract mapZenOutput(zenResult: ZenToolResult): AgentFeedback;
  
  async evaluateProposal(proposal: any, context: ModeContext): Promise<AgentFeedback> {
    try {
      const zenResult = await this.runZenTool(this.buildZenArgs(proposal, context), proposal.content);
      return this.mapZenOutput(zenResult);
    } catch (error) {
      return this.handleZenError(error);
    }
  }
  
  protected abstract buildZenArgs(proposal: any, context: ModeContext): string[];
  protected abstract handleZenError(error: Error): AgentFeedback;
}

// Concrete zen agent implementations
export class ZenComplexityAgent extends ZenAgentAdapter {
  name = "zen-complexity-watchdog";
  description = "Engineering simplicity using zen codereview and refactor tools";
  supportedModes = ["discovery", "planning", "design", "build", "analyze"];
  zenToolName = "codereview";
  
  protected buildZenArgs(proposal: any, context: ModeContext): string[] {
    return ["codereview", "--complexity", "--output-format=json"];
  }
  
  protected mapZenOutput(zenResult: ZenToolResult): AgentFeedback {
    // Transform zen codereview output to AgentFeedback format
    return {
      agentName: this.name,
      severity: this.mapSeverity(zenResult.findings),
      category: "complexity",
      message: this.extractMessage(zenResult),
      suggestions: this.extractSuggestions(zenResult),
      blocksExecution: this.shouldBlock(zenResult),
      metadata: { zenTool: this.zenToolName, rawOutput: zenResult }
    };
  }
}

export class ZenDiscoveryAgent extends ZenAgentAdapter {
  name = "zen-discovery";
  description = "Problem exploration using zen thinkdeep for Socratic questioning";
  supportedModes = ["discovery"];
  zenToolName = "thinkdeep";
  
  protected buildZenArgs(proposal: any, context: ModeContext): string[] {
    return ["thinkdeep", "--focus=problem-exploration", "--output-format=json"];
  }
  
  async generateNextQuestion(context: ConversationContext): Promise<SocraticQuestion> {
    const prompt = this.buildQuestionPrompt(context);
    const zenResult = await this.runZenTool(
      ["thinkdeep", "--socratic-mode", "--single-question"],
      prompt
    );
    return this.mapToSocraticQuestion(zenResult);
  }
  
  async buildProblemUnderstanding(transcript: ConversationTranscript): Promise<ProblemInsights> {
    const zenResult = await this.runZenTool(
      ["analyze", "--extract-insights", "--problem-space"],
      transcript.getContent()
    );
    return this.mapToProblemInsights(zenResult);
  }
  
  async reflectConversation(context: ConversationContext): Promise<DiscoveryReflection> {
    const prompt = this.buildReflectionPrompt(context);
    const zenResult = await this.runZenTool(
      ["analyze", "--reflect", "--discovery-gaps"],
      prompt
    );
    return this.mapToDiscoveryReflection(zenResult);
  }
  
  protected buildQuestionPrompt(context: ConversationContext): string {
    return `Given this conversation context, generate the next most diagnostic Socratic question:\n\n${context.getRecentHistory()}\n\nFocus on deepening problem understanding, not jumping to solutions.`;
  }
  
  protected buildReflectionPrompt(context: ConversationContext): string {
    return `Analyze this discovery conversation and identify:\n1. Key insights discovered\n2. Remaining gaps in understanding\n3. Stakeholders mentioned\n4. Success criteria emerging\n\nConversation:\n${context.getFullTranscript()}`;
  }
  
  protected mapToSocraticQuestion(zenResult: ZenToolResult): SocraticQuestion {
    return {
      text: zenResult.findings.question,
      rationale: zenResult.findings.rationale,
      category: zenResult.findings.category || 'exploration',
      followUpSuggestions: zenResult.findings.followUps || []
    };
  }
  
  protected mapToProblemInsights(zenResult: ZenToolResult): ProblemInsights {
    return {
      problemStatement: zenResult.findings.problemStatement,
      stakeholders: zenResult.findings.stakeholders || [],
      constraints: zenResult.findings.constraints || [],
      assumptions: zenResult.findings.assumptions || [],
      successCriteria: zenResult.findings.successCriteria || [],
      openQuestions: zenResult.findings.openQuestions || []
    };
  }
  
  protected mapToDiscoveryReflection(zenResult: ZenToolResult): DiscoveryReflection {
    return {
      keyInsights: zenResult.findings.insights || [],
      identifiedGaps: zenResult.findings.gaps || [],
      stakeholdersFound: zenResult.findings.stakeholders || [],
      emergingCriteria: zenResult.findings.criteria || [],
      recommendedQuestions: zenResult.findings.nextQuestions || [],
      readinessScore: zenResult.findings.readiness || 0
    };
  }
}

export class ZenSecurityAgent extends ZenAgentAdapter {
  name = "zen-security";
  description = "Security analysis using zen secaudit and thinkdeep tools";
  supportedModes = ["planning", "design", "build", "test", "analyze"];
  zenToolName = "secaudit";
  
  protected buildZenArgs(proposal: any, context: ModeContext): string[] {
    return ["secaudit", "--comprehensive", "--output-format=json"];
  }
  
  async performThreatModeling(architecture: any, context: ModeContext): Promise<ThreatModel> {
    const zenResult = await this.runZenTool(
      ["thinkdeep", "--security-focus", "--threat-modeling"],
      JSON.stringify(architecture)
    );
    return this.mapToThreatModel(zenResult);
  }
}

export class ZenTestGenAgent extends ZenAgentAdapter {
  name = "zen-test-generator";
  description = "Test generation and validation using zen testgen tool";
  supportedModes = ["build", "test", "analyze"];
  zenToolName = "testgen";
  
  async generateTestScenarios(code: any, context: ModeContext): Promise<TestScenario[]> {
    const zenResult = await this.runZenTool(
      ["testgen", "--comprehensive", "--edge-cases"],
      code
    );
    return this.mapToTestScenarios(zenResult);
  }
}
```

### Agent Registry with Zen Detection

```typescript
export class ZenAwareAgentRegistry implements AgentRegistry {
  private agents: Map<string, CrossCuttingAgent> = new Map();
  private zenAvailable: boolean = false;
  private fallbackAgents: Map<string, CrossCuttingAgent> = new Map();
  
  async initialize(): Promise<void> {
    this.zenAvailable = await this.detectZen();
    
    if (this.zenAvailable) {
      this.registerZenAgents();
    } else {
      this.registerFallbackAgents();
      this.logger.warn("zen tools not detected - using limited fallback agents");
    }
  }
  
  private async detectZen(): Promise<boolean> {
    try {
      const result = await this.runCommand("zen", ["--version"]);
      return result.success;
    } catch {
      return false;
    }
  }
  
  private registerZenAgents(): void {
    this.register(new ZenComplexityAgent());
    this.register(new ZenSecurityAgent());
    this.register(new ZenTestGenAgent());
    // ... other zen agents
  }
  
  private registerFallbackAgents(): void {
    this.register(new BasicComplexityAgent()); // Simple rule-based fallback
    this.register(new BasicSecurityAgent());   // Basic security checks
    // ... minimal fallback implementations
  }
  
  async promptZenInstallation(): Promise<boolean> {
    const response = await this.promptUser(
      "zen tools not found. Install now for enhanced analysis capabilities? (y/N)"
    );
    
    if (response.toLowerCase() === 'y') {
      return await this.installZen();
    }
    return false;
  }
}
```

### Mode Integration Points

```typescript
// Discovery mode with zen-powered insights
export class DiscoveryMode extends AbstractMode {
  private zenDiscoveryAgent: ZenDiscoveryAgent;
  private conversationContext: ConversationContext;
  
  async buildProblemUnderstanding(input: string): Promise<ProblemInsights> {
    // Update conversation context with new input
    this.conversationContext.addUserInput(input);
    
    // Use zen to extract insights from conversation so far
    const insights = await this.zenDiscoveryAgent.buildProblemUnderstanding(
      this.conversationContext.getTranscript()
    );
    
    // Get additional agent perspectives if available
    const agentFeedback = await this.evaluateWithAgents({ 
      type: "problem-analysis",
      content: input,
      insights: insights,
      context: this.context 
    });
    
    return this.synthesizeProblemInsights(insights, agentFeedback);
  }
  
  async guideDiscoveryConversation(userInput: string): Promise<ConversationStep> {
    // Add user input to conversation context
    this.conversationContext.addUserInput(userInput);
    
    // Generate next question using zen thinkdeep
    const nextQuestion = await this.zenDiscoveryAgent.generateNextQuestion(
      this.conversationContext
    );
    
    // Reflect on conversation progress
    const reflection = await this.zenDiscoveryAgent.reflectConversation(
      this.conversationContext
    );
    
    return {
      type: 'question',
      question: nextQuestion,
      reflection: reflection,
      readinessScore: reflection.readinessScore
    };
  }
  
  async validateDiscoveryCompleteness(): Promise<ReadinessAssessment> {
    // Get current problem insights
    const insights = await this.zenDiscoveryAgent.buildProblemUnderstanding(
      this.conversationContext.getTranscript()
    );
    
    // Use zen to assess discovery completeness
    return await this.zenDiscoveryAgent.validateDiscoveryCompleteness(insights);
  }
  
  async validateProblemComplexity(problem: ProblemInsights): Promise<ComplexityAssessment> {
    // zen complexity agent evaluates if problem framing is over-complex
    const complexityFeedback = await this.agentRegistry
      .getAgent("zen-complexity-watchdog")
      ?.evaluateProposal({ type: "problem-complexity", problem }, this.context);
    
    return this.mapToComplexityAssessment(complexityFeedback);
  }
}

// Analyze mode leveraging zen's full toolkit
export class AnalyzeMode extends AbstractMode {
  async analyzeCodebase(path?: string): Promise<CodebaseAnalysis> {
    // Orchestrate multiple zen tools for comprehensive analysis
    const [
      complexityAnalysis,
      securityAudit,
      refactoringSuggestions,
      testCoverage
    ] = await Promise.all([
      this.zenComplexityAgent.analyzeCodebase(path),
      this.zenSecurityAgent.performSecurityAudit(path),
      this.zenRefactorAgent.suggestImprovements(path),
      this.zenTestGenAgent.analyzeCoverage(path)
    ]);
    
    return this.synthesizeAnalysis({
      complexity: complexityAnalysis,
      security: securityAudit,
      refactoring: refactoringSuggestions,
      testing: testCoverage
    });
  }
  
  async getAgentRecommendations(): Promise<AgentRecommendation[]> {
    const recommendations: AgentRecommendation[] = [];
    
    for (const agent of this.crossCuttingAgents) {
      if (agent instanceof ZenAgentAdapter) {
        const agentRecs = await agent.generateRecommendations(this.context);
        recommendations.push(...agentRecs);
      }
    }
    
    return this.prioritizeRecommendations(recommendations);
  }
}
```

## Integration Strategy

### Phase 1: Proof of Concept (Week 1-2)
**Goal**: Validate zen integration approach with Discovery Mode focus

**Deliverables**:
- `ZenAgentAdapter` base class with error handling
- `ZenDiscoveryAgent` implementation for Discovery mode conversational exploration
- zen detection and fallback mechanism
- Basic integration test showing zen thinkdeep → SocraticQuestion flow

**Success Criteria**:
- Can execute `zen thinkdeep` from Conductor and generate next diagnostic questions
- Conversation flow management with zen-powered question generation
- Graceful fallback when zen not installed
- Discovery Mode enhanced with zen-driven Socratic questioning

### Phase 2: Core Agent Migration (Week 3-4)
**Goal**: Replace planned custom agents with zen adapters

**Deliverables**:
- `ZenComplexityAgent` replacing custom complexity analysis
- `ZenTestGenAgent` for test generation capabilities
- Enhanced `ZenAwareAgentRegistry` with installation prompts
- Updated CLI to detect and suggest zen installation

**Success Criteria**:
- All planned cross-cutting agents have zen implementations
- Installation flow works end-to-end
- Performance acceptable (< 2s for typical analysis)

### Phase 3: Advanced Integration (Week 5-6)
**Goal**: Deep zen integration across all modes

**Deliverables**:
- zen integration in Discovery mode for problem analysis
- Multi-tool orchestration in Analyze mode
- zen-powered Build mode quality gates
- Performance optimizations (caching, parallel execution)

**Success Criteria**:
- zen tools used across all relevant modes
- Quality gates prevent poor commits
- User experience seamless regardless of zen availability

## Implementation Details

### zen Tool Integration Matrix

| Conductor Agent | Primary zen Tool | Secondary zen Tools | Fallback Strategy |
|----------------|------------------|-------------------|------------------|
| DiscoveryAgent | `thinkdeep` | `analyze` | Basic question templates |
| ComplexityWatchdog | `codereview` | `refactor`, `analyze` | Rule-based heuristics |
| SecurityAgent | `secaudit` | `thinkdeep --security` | Basic pattern matching |
| TestGenAgent | `testgen` | `debug`, `analyze` | Template-based generation |
| QualityAgent | `codereview` | `precommit` | Linting integration |
| ArchitectureAgent | `analyze` | `thinkdeep --architecture` | Pattern recognition |

### Performance Considerations

**CLI Execution Overhead**:
- Typical zen tool execution: 500ms-2s
- Batch multiple analyses where possible
- Cache results for repeated analyses
- Consider zen daemon mode for long sessions

**Memory and Disk Usage**:
- zen tools operate on file system directly
- Minimal memory overhead for Conductor
- Temporary files cleaned up automatically

**Error Handling**:
- zen tool crashes don't affect Conductor stability
- Timeout protection (30s default)
- Graceful degradation to fallback agents

### Configuration Management

```typescript
export interface ZenIntegrationConfig {
  enabled: boolean;
  zenPath?: string;           // Custom zen installation path
  timeout: number;            // Tool execution timeout (ms)
  cacheResults: boolean;      // Cache analysis results
  fallbackOnError: boolean;   // Use fallback agents on zen errors
  installPrompt: boolean;     // Prompt for zen installation
  toolConfig: {
    [toolName: string]: {
      defaultArgs: string[];
      timeout?: number;
      enabled: boolean;
    }
  };
}

// Example config
const defaultZenConfig: ZenIntegrationConfig = {
  enabled: true,
  timeout: 30000,
  cacheResults: true,
  fallbackOnError: true,
  installPrompt: true,
  toolConfig: {
    codereview: {
      defaultArgs: ["--comprehensive", "--output-format=json"],
      enabled: true
    },
    secaudit: {
      defaultArgs: ["--owasp", "--output-format=json"],
      timeout: 60000,
      enabled: true
    },
    testgen: {
      defaultArgs: ["--edge-cases", "--coverage"],
      enabled: true
    }
  }
};
```

### Error Handling and Fallbacks

```typescript
export class ZenAgentAdapter {
  protected async runZenTool(args: string[], input?: string): Promise<ZenToolResult> {
    try {
      // Attempt zen tool execution
      const result = await this.executeZenTool(args, input);
      return this.parseZenOutput(result);
    } catch (error) {
      this.logger.warn(`zen tool ${this.zenToolName} failed: ${error.message}`);
      
      if (this.config.fallbackOnError) {
        return await this.executeFallback(args, input);
      }
      
      throw new ZenToolError(`${this.zenToolName} execution failed`, error);
    }
  }
  
  protected abstract executeFallback(args: string[], input?: string): Promise<ZenToolResult>;
}

// Fallback implementation for Discovery Mode
export class BasicDiscoveryAgent implements CrossCuttingAgent {
  name = "basic-discovery";
  description = "Template-based question generation fallback";
  supportedModes = ["discovery"];
  
  async generateNextQuestion(context: ConversationContext): Promise<SocraticQuestion> {
    const questionTemplates = [
      "What specific problem are you trying to solve?",
      "Who would benefit if this problem were solved?",
      "What does success look like to you?",
      "What constraints or limitations do you need to consider?",
      "What assumptions are you making about this problem?"
    ];
    
    const randomQuestion = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
    
    return {
      text: randomQuestion,
      rationale: "Template-based fallback question",
      category: 'exploration',
      followUpSuggestions: []
    };
  }
}

export class ZenComplexityAgent extends ZenAgentAdapter {
  protected async executeFallback(args: string[], input?: string): Promise<ZenToolResult> {
    // Simple complexity heuristics as fallback
    const lineCount = input?.split('\n').length || 0;
    const complexity = this.calculateBasicComplexity(input);
    
    return {
      findings: [{
        severity: complexity > 10 ? 'warning' : 'info',
        message: `Basic complexity analysis: ${complexity} (${lineCount} lines)`,
        suggestions: complexity > 10 ? ['Consider breaking into smaller functions'] : []
      }],
      metadata: { fallback: true, tool: 'basic-complexity' }
    };
  }
}
```

## Testing Strategy

### Unit Testing
- Mock zen tool execution for isolated agent testing
- Test error handling and fallback scenarios
- Validate output mapping between zen and Conductor formats

### Integration Testing
- End-to-end zen tool execution with real projects
- Performance testing with various project sizes
- Cross-platform compatibility (Windows, macOS, Linux)

### User Acceptance Testing
- Installation flow validation
- Mode switching with zen integration
- Quality gate effectiveness

## Migration Path

### Immediate (This Week)
1. Create `ZenAgentAdapter` base class
2. Implement `ZenDiscoveryAgent` for Discovery mode conversational exploration
3. Add zen detection to agent registry
4. Test integration with Discovery mode conversation flows

### Short Term (Next 2 Weeks)
1. Enhance `ZenDiscoveryAgent` with multi-tool orchestration (thinkdeep + analyze)
2. Implement `ZenSecurityAgent` and `ZenComplexityAgent` for other modes
3. Add installation prompts and error handling
4. Performance optimization and caching
5. Documentation updates

### Medium Term (Next Month)
1. Deep integration across all modes
2. Advanced orchestration patterns
3. Custom extension points for project-specific needs
4. Community feedback and iteration

## Success Metrics

### Technical Metrics
- **Time to first analysis**: < 5 seconds from mode entry
- **Analysis quality**: Matches or exceeds planned custom agents
- **Reliability**: 99%+ successful executions with graceful fallbacks
- **Performance**: Agent evaluation < 2s for typical codebases

### User Experience Metrics
- **Installation success rate**: > 95% successful zen installations
- **Mode transition smoothness**: No user-visible delays or errors
- **Quality gate effectiveness**: Catches 90%+ of intended issues
- **Developer satisfaction**: Positive feedback on analysis quality

### Maintenance Metrics
- **Code complexity**: 50% reduction vs. custom agent implementation
- **Bug rate**: Lower bug rate due to zen tool maturity
- **Feature velocity**: Faster feature delivery due to focus on UX
- **Maintenance burden**: Reduced ongoing maintenance requirements

## Risk Mitigation

### Technical Risks
- **zen tool changes**: Version pinning and adapter isolation
- **Performance issues**: Caching, timeouts, and optimization
- **Integration complexity**: Gradual rollout and thorough testing

### Business Risks
- **External dependency**: Fallback agents and version control
- **zen unavailability**: Offline mode and alternative tooling
- **Community changes**: Multiple provider support in adapter layer

## Future Considerations

### Extension Points
- Plugin system for additional zen tools
- Custom agent logic where zen has gaps
- Integration with other analysis tools (Semgrep, SonarQube)

### Advanced Features
- zen tool orchestration optimization
- Machine learning on zen outputs for project-specific tuning
- Real-time analysis streaming for large codebases

This architecture positions Conductor to leverage the best of both worlds: sophisticated analysis from mature zen tools and unique workflow value from Conductor's mode-based approach.