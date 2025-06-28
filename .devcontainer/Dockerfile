FROM node:20

# Install basic development tools and configure locales
RUN apt update && apt install -y \
  less \
  git \
  procps \
  sudo \
  fzf \
  zsh \
  man-db \
  unzip \
  gnupg2 \
  gh \
  jq \
  curl \
  wget \
  locales \
  python3-pip \
  vim \
  && echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen \
  && locale-gen \
  && dpkg-reconfigure --frontend=noninteractive locales

# Install Deno
RUN curl -fsSL https://deno.land/install.sh | sh
RUN mv /root/.deno/bin/deno /usr/local/bin/deno

# Modify existing node user to be conductor
ARG USERNAME=conductor
ARG USER_UID=1000
ARG USER_GID=1000

# Rename node user to conductor and set zsh as shell
RUN usermod -l $USERNAME node && \
  usermod -d /home/$USERNAME -m $USERNAME && \
  usermod -s /bin/zsh $USERNAME && \
  groupmod -n $USERNAME node && \
  echo "$USERNAME ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME && \
  chmod 0440 /etc/sudoers.d/$USERNAME

# Persist bash history
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  && mkdir /commandhistory \
  && touch /commandhistory/.bash_history \
  && chown -R $USERNAME /commandhistory

# Set environment variables
ENV DEVCONTAINER=true
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

# Create workspace and config directories and set proper ownership
RUN mkdir -p /workspace /home/$USERNAME/.claude /home/$USERNAME/.cache/deno && \
  chown -R $USERNAME:$USERNAME /workspace /home/$USERNAME/.claude /home/$USERNAME/.cache

WORKDIR /workspace

# Install git-delta for better git diffs
RUN ARCH=$(dpkg --print-architecture) && \
  wget "https://github.com/dandavison/delta/releases/download/0.18.2/git-delta_0.18.2_${ARCH}.deb" && \
  dpkg -i "git-delta_0.18.2_${ARCH}.deb" && \
  rm "git-delta_0.18.2_${ARCH}.deb"

# Switch to conductor user
USER $USERNAME

# Install global packages
ENV NPM_CONFIG_PREFIX=/home/$USERNAME/.npm-global
ENV PATH=$PATH:/home/$USERNAME/.npm-global/bin

# Set the default shell to zsh
ENV SHELL=/bin/zsh

# Set up zsh with plugins
RUN sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v1.2.0/zsh-in-docker.sh)" -- \
  -p git \
  -p fzf \
  -a "source /usr/share/doc/fzf/examples/key-bindings.zsh" \
  -a "source /usr/share/doc/fzf/examples/completion.zsh" \
  -a "export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  -x

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Install Task Master AI
RUN npm install -g task-master-ai

# Install MCP dependencies for Task Master AI
RUN npm install -g @modelcontextprotocol/sdk fastmcp

# Install uv (Python package manager) as conductor user
USER $USERNAME
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/home/$USERNAME/.local/bin:$PATH"

# Switch back to root for any remaining setup
USER root

# Verify Deno installation and cache standard library
RUN deno --version

# Set up git configuration from host (will be mounted via remoteEnv)
RUN git config --global init.defaultBranch main

# Copy and source aliases
COPY --chown=conductor:conductor aliases.sh /home/conductor/.aliases

# Copy MCP setup script
COPY --chown=conductor:conductor setup-mcp-servers.sh /home/conductor/setup-mcp-servers.sh
RUN chmod +x /home/conductor/setup-mcp-servers.sh

RUN echo '# Source project aliases' >> /home/conductor/.bashrc && \
  echo 'if [ -f /home/conductor/.aliases ]; then' >> /home/conductor/.bashrc && \
  echo '  source /home/conductor/.aliases' >> /home/conductor/.bashrc && \
  echo 'fi' >> /home/conductor/.bashrc

RUN echo '# Source project aliases' >> /home/conductor/.zshrc && \
  echo 'if [ -f /home/conductor/.aliases ]; then' >> /home/conductor/.zshrc && \
  echo '  source /home/conductor/.aliases' >> /home/conductor/.zshrc && \
  echo 'fi' >> /home/conductor/.zshrc

# Switch to conductor user and run MCP setup
USER conductor
WORKDIR /home/conductor
ENV CLAUDE_CONFIG_DIR=/home/conductor/.claude
RUN mkdir -p /home/conductor/.claude && /home/conductor/setup-mcp-servers.sh