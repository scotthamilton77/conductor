# Primer for claude code conversations

Prime claude code conversation with context on the workspace.  $ARGUMENTS:

- [none] - read only the basics
- ${anyTopic} - find and read additional files whose filename implies a relationship to the specified topic

## Instructions

Read the following files to understand what we're working on:

All from under the project root:

- **ALWAYS** read the requirements: `.taskmaster/docs/PRD.md`
- **CONDITIONALLY** find files that may ber topically related to the $ARGUMENTS in the following folders:
  - `.taskmaster/tasks/**`
  - `.taskmaster/docs/**`
  - `.conductor/design/**`
  - `.conductor/ideas/**`

## Report Back to User

Tell the user which file(s) you read, but don't summarize the contents unless/until asked.

## Outcome

You have primed your context with relevant materials about the project and additional topics the user specified.
