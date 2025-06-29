# Conductor

A conversational AI CLI tool for problem exploration and solution development.

## Quick Start

```bash
# Development
deno task dev

# Build
deno task build

# Test
deno task test
```

## Features

- **Discovery Mode**: Conversational problem exploration
- **File-based State**: Git-friendly markdown persistence
- **Mode-based Architecture**: Extensible framework for different workflows

## Development

This project uses Deno with TypeScript. See `deno.json` for available tasks and dependencies.
<!-- TASKMASTER_EXPORT_START -->
> 🎯 **Taskmaster Export** - 2025-06-29 21:17:53 UTC
> 📋 Export: with subtasks • Status filter: none
> 🔗 Powered by [Task Master](https://task-master.dev?utm_source=github-readme&utm_medium=readme-export&utm_campaign=conductor&utm_content=task-export-link)

```text
╭─────────────────────────────────────────────────────────╮╭─────────────────────────────────────────────────────────╮
│                                                         ││                                                         │
│   Project Dashboard                                     ││   Dependency Status & Next Task                         │
│   Tasks Progress: █████░░░░░░░░░░░░░░░ 25%    ││   Dependency Metrics:                                   │
│   25%                                                   ││   • Tasks with no dependencies: 0                      │
│   Done: 2  In Progress: 1  Pending: 5  Blocked: 0     ││   • Tasks ready to work on: 1                          │
│   Deferred: 0  Cancelled: 0                             ││   • Tasks blocked by dependencies: 5                    │
│                                                         ││   • Most depended-on task: #3 (4 dependents)           │
│   Subtasks Progress: ███████████████░░░░░     ││   • Avg dependencies per task: 1.8                      │
│   75% 75%                                               ││                                                         │
│   Completed: 15/20  In Progress: 1  Pending: 4      ││   Next Task to Work On:                                 │
│   Blocked: 0  Deferred: 0  Cancelled: 0                 ││   ID: 4.6 - Implement Context Preservation and St...     │
│                                                         ││   Priority: high  Dependencies: Some                    │
│   Priority Breakdown:                                   ││   Complexity: ● 8                                       │
│   • High priority: 5                                   │╰─────────────────────────────────────────────────────────╯
│   • Medium priority: 2                                 │
│   • Low priority: 1                                     │
│                                                         │
╰─────────────────────────────────────────────────────────╯
┌───────────┬──────────────────────────────────────┬─────────────────┬──────────────┬───────────────────────┬───────────┐
│ ID        │ Title                                │ Status          │ Priority     │ Dependencies          │ Complexi… │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 1         │ Setup Core Project Infrastructure    │ ✓ done          │ high         │ None                  │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 1.1       │ └─ Initialize Deno project with deno │ ✓ done          │ -            │ None                  │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 1.2       │ └─ Setup directory structure and cor │ ✓ done          │ -            │ 1                     │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 1.3       │ └─ Initialize Git repository with ap │ ✓ done          │ -            │ 2                     │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 1.4       │ └─ Install and configure cliffy CLI  │ ✓ done          │ -            │ 1                     │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 1.5       │ └─ Implement configuration managemen │ ✓ done          │ -            │ 2, 4                  │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 1.6       │ └─ Setup logging infrastructure and  │ ✓ done          │ -            │ 1, 2                  │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 3         │ Build File-Based State Management Sy │ ✓ done          │ high         │ 1                     │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 3.1       │ └─ Create .conductor Directory Struc │ ✓ done          │ -            │ None                  │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 3.2       │ └─ Implement Markdown File Handling  │ ✓ done          │ -            │ 1                     │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 3.3       │ └─ Design and Implement project.md T │ ✓ done          │ -            │ 2                     │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 3.4       │ └─ Build Core File Operations API    │ ✓ done          │ -            │ 2                     │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 3.5       │ └─ Implement config.json Configurati │ ✓ done          │ -            │ 1                     │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 4         │ Develop Mode-Based Framework Foundat │ ► in-progress   │ high         │ 3                     │ ● 8       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 4.1       │ └─ Design Mode System Architecture   │ ✓ done          │ -            │ None                  │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 4.2       │ └─ Implement Mode Base Class and Int │ ✓ done          │ -            │ 1                     │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 4.3       │ └─ Create Mode Registry and Factory  │ ✓ done          │ -            │ 2                     │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 4.4       │ └─ Implement Discovery Mode          │ ✓ done          │ -            │ 2                     │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 4.5       │ └─ Build CLI Command Routing System  │ ► in-progress   │ -            │ 3, 4                  │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 4.6       │ └─ Implement Context Preservation an │ ○ pending       │ -            │ 2                     │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 4.7       │ └─ Create Mode-Specific Prompt Manag │ ○ pending       │ -            │ 2                     │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 5         │ Implement Discovery Mode             │ ○ pending       │ high         │ 4                     │ ● 9       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 11        │ Create Command Interface and Mode Sw │ ○ pending       │ high         │ 5                     │ ● 6       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 11.1       │ └─ Implement basic command parser st │ ○ pending       │ -            │ None                  │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 11.3       │ └─ Create simple help system         │ ○ pending       │ -            │ 11.1                  │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 12        │ Implement cross-mode change manageme │ ○ pending       │ medium       │ 3, 4, 5, 11           │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 13        │ Implement Topic Relationship System  │ ○ pending       │ medium       │ 3, 4, 5               │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 14        │ Implement Automatic Topic Similarity │ ○ pending       │ low          │ 3, 5, 13              │ N/A       │
└───────────┴──────────────────────────────────────┴─────────────────┴──────────────┴───────────────────────┴───────────┘
```

╭────────────────────────────────────────────── ⚡ RECOMMENDED NEXT TASK ⚡ ──────────────────────────────────────────────╮
│                                                                                                                         │
│  🔥 Next Task to Work On: #4.6 - Implement Context Preservation and State Management                                  │
│                                                                                                                         │
│  Priority: high   Status: ○ pending                                                                                     │
│  Dependencies: 4.2                                                                                                     │
│                                                                                                                         │
│  Description: Build state preservation mechanisms for maintaining context across mode operations     │
│                                                                                                                         │
│  Start working: task-master set-status --id=4.6 --status=in-progress                                                     │
│  View details: task-master show 4.6                                                                      │
│                                                                                                                         │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯

╭──────────────────────────────────────────────────────────────────────────────────────╮
│                                                                                      │
│   Suggested Next Steps:                                                              │
│                                                                                      │
│   1. Run task-master next to see what to work on next                                │
│   2. Run task-master expand --id=<id> to break down a task into subtasks             │
│   3. Run task-master set-status --id=<id> --status=done to mark a task as complete   │
│                                                                                      │
╰──────────────────────────────────────────────────────────────────────────────────────╯

> 📋 **End of Taskmaster Export** - Tasks are synced from your project using the `sync-readme` command.
<!-- TASKMASTER_EXPORT_END -->
