# CLAUDE.md

## Important

- ALL instructions within this document MUST BE FOLLOWED, these are not optional unless explicitly stated.
- ASK FOR CLARIFICATION If you are uncertain of any of thing within the document.
- DO NOT edit more code than you have to.
- DO NOT WASTE TOKENS, be succinct and concise.
- For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially.

## Rules for Writing Code

### Simplicity

- **ALWAYS** use existing, proven, commonly-used open source libraries/modules and their functionality over re-inventing the wheel with your own code
- **ALWAYS** keep files, classes, functions/methods small, modular, with low complexity

### Dependencies

- Prefer latest stable versions of dependencies.
- **ALWAYS** Use context7 tools when you need the documentation on dependencies that your model wasn't trained on (E.g. upgrades since your training data cutoff date). This is especially important to resolve compatibility issues between dependencies or code that does not work right using dependencies that are versioned later than this date.

### Observability

- For new and chancing code, log extensively for debugging AI-generated code, tagging AI logging with "AI" (either in a log context or as a prefix in the log output)

### Documentation

- **ALWAYS** write clean, self-documenting code
- **ALWAYS** write clear documentation for code (file, class, method level), and within the code comments that explain complexity and intent, not redundant with the code itself
  - Capture assumptions and decisions in code comments

### Testing

- **ALWAYS** write clear, descriptive test names for better readability
- **ALWAYS** prefer running single tests over the whole test suite for performance
- Ensure that you test edge cases and error handling thoroughly
- Measure and improve test coverage with appropriate tests only after getting the code functionally correct
  - Ensure highest coverage for frequently used code and high-risk areas

## Development Workflow

- **ALWAYS** run type checking/linting after code changes
- **ALWAYS** format code before committing using project's formatter
- **ALWAYS** run relevant tests before pushing changes
- **NEVER** commit without running pre-commit checks
- **ALWAYS** use semantic commit messages (feat:, fix:, docs:, refactor:, test:, chore:)

## Performance & Optimization

### Token Efficiency

- **OPTIMIZE** prompts for clarity and brevity
- **BATCH** related operations in single requests
- **USE** structured outputs (JSON) for parsing efficiency
- **CACHE** common patterns and solutions locally

## Documentation Style

### README Files

**KEEP README FILES CONCISE AND SCANNABLE:**

- **Maximum 100 lines** for most projects
- **No excessive emojis** or decorative elements
- **Essential sections only**: Purpose, Quick Start, Key Commands
- **No verbose explanations** - let code and comments speak
- **Single quick start command** when possible
- **Brief feature lists** without detailed descriptions
- **Minimal project structure** - only if complex
- **Essential links only** - avoid resource dumps

## Claude Code Features

### Thinking Modes

- `think` - Standard mode (4,000 tokens)
- `think hard` - Enhanced analysis
- `think harder` - Deep computation
- `ultrathink` - Maximum analysis (31,999 tokens)

### Effective Usage

- **USE** thinking modes for complex architectural decisions
- **AVOID** over-thinking simple tasks
- **BALANCE** computation time with task complexity

## IMPORTANT Notes

- **YOU MUST** follow these guidelines exactly as written
- **ALWAYS** ask for clarification if requirements conflict
- **NEVER** use deprecated patterns or old import styles
- **ALWAYS** prioritize simplicity and type safety

