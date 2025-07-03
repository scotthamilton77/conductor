# Prompt Examples / Playground

## Things to try

- ask Claude code to dump its context into an MD file, then compact it, and ask again
- see if the model API takes conversation turn data OUTSIDE of the SYSTEM/ASSISTANT/USER types
  - what if we include what another agent said?

## Context Engineering

- Personas are still a thing: make the AI think/process and respond like the kind of expert you need it to be.
- Prompts are important, context is critical.
- Each user turn, we should have the agent first ask "what do I need to know to address this, that do I already know, and what is left?
  - If we had to hand this off to a subagent, what does that agent need to know?

## Other Resources

- [vscode copilot pompts](https://github.com/microsoft/vscode-copilot-chat/blob/main/src/extension/prompts/node/agent/agentInstructions.tsx)
