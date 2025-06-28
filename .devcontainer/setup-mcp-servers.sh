#!/bin/bash

# Script to add MCP servers from .devcontainer/mcpServers.json using claude mcp add

echo "Adding MCP servers..."

# Git server
claude mcp add git -s user -- uvx mcp-server-git

# Sequential thinking server
claude mcp add sequential-thinking -s user -- npx -y @modelcontextprotocol/server-sequential-thinking

# Memory server
claude mcp add memory -s user -- npx -y @modelcontextprotocol/server-memory

# Context7 server (SSE type)
claude mcp add --transport sse context7 -s user https://mcp.context7.com/sse

# Puppeteer server
claude mcp add puppeteer -s user -- npx -y @modelcontextprotocol/server-puppeteer

# Taskmaster AI server
claude mcp add taskmaster-ai -s user -- npx -y --package=task-master-ai task-master-ai

echo "MCP servers added successfully!"