#!/bin/bash

# Script to copy specific environment variables to shell configuration files
# This runs inside the container during postCreateCommand

# Define which environment variables to persist
ENV_VARS_TO_COPY=(
    "ANTHROPIC_API_KEY"
    "PERPLEXITY_API_KEY"
    "OPENAI_API_KEY"
    "GOOGLE_API_KEY"
    "XAI_API_KEY"
    "OPENROUTER_API_KEY"
    "MISTRAL_API_KEY"
)

# Function to append environment variable exports to a file
append_env_vars() {
    local target_file="$1"
    
    # Add a marker comment if not already present
    if ! grep -q "# Devcontainer environment variables" "$target_file" 2>/dev/null; then
        echo "" >> "$target_file"
        echo "# Devcontainer environment variables" >> "$target_file"
    fi
    
    # Export each environment variable if it exists
    for var in "${ENV_VARS_TO_COPY[@]}"; do
        if [ -n "${!var}" ]; then
            # Remove any existing export of this variable to avoid duplicates
            sed -i "/^export $var=/d" "$target_file"
            # Add the export
            echo "export $var=\"${!var}\"" >> "$target_file"
        fi
    done
}

# Ensure the files exist
touch ~/.bashrc ~/.zshrc

# Append environment variables to both files
append_env_vars ~/.bashrc
append_env_vars ~/.zshrc

echo "Environment variables copied to shell configuration files"