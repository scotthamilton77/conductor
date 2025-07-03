#!/bin/bash

# Alternative approach: Generate shell config snippets from host environment
# This would be used with initializeCommand to run on the host

# Output file that will be mounted into the container
OUTPUT_DIR=".devcontainer/home"
mkdir -p "$OUTPUT_DIR"

# Environment variables to export
ENV_VARS=(
    "ANTHROPIC_API_KEY"
    "PERPLEXITY_API_KEY" 
    "OPENAI_API_KEY"
    "GOOGLE_API_KEY"
    "XAI_API_KEY"
    "OPENROUTER_API_KEY"
    "MISTRAL_API_KEY"
)

# Generate .env_exports file
cat > "$OUTPUT_DIR/.env_exports" << 'EOF'
# Generated environment variables from host
# Source this file in your .bashrc or .zshrc

EOF

for var in "${ENV_VARS[@]}"; do
    if [ -n "${!var}" ]; then
        echo "export $var=\"${!var}\"" >> "$OUTPUT_DIR/.env_exports"
    fi
done

echo "Environment exports written to $OUTPUT_DIR/.env_exports"
echo "Add 'source ~/.env_exports' to your .bashrc/.zshrc in the container"