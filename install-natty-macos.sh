#!/usr/bin/env bash
set -euo pipefail

# Put your GitHub repo here before sharing this installer.
REPO_URL="https://github.com/nt3y/lcu"
REPO_BRANCH="main"
INSTALL_DIR="$HOME/Natty"

print_step() {
  printf "\n==> %s\n" "$1"
}

ensure_homebrew() {
  if command -v brew >/dev/null 2>&1; then
    return
  fi

  print_step "Homebrew not found. Installing Homebrew first"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -x /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
}

ensure_git() {
  if command -v git >/dev/null 2>&1; then
    return
  fi

  print_step "Git not found. Installing git"
  brew install git
}

ensure_node() {
  if command -v node >/dev/null 2>&1; then
    print_step "Node.js already installed: $(node -v)"
    return
  fi

  print_step "Node.js not found. Installing Node.js"
  brew install node
  print_step "Installed Node.js: $(node -v)"
}

download_project() {
  if [[ "$REPO_URL" == "https://github.com/your-name/your-repo.git" ]]; then
    cat <<'EOF'
REPO_URL is still the placeholder value.
Edit install-natty-macos.sh and replace this line:
REPO_URL="https://github.com/your-name/your-repo.git"

With your real repo, for example:
REPO_URL="https://github.com/Natty/league-natty.git"
EOF
    exit 1
  fi

  if [[ -d "$INSTALL_DIR/.git" ]]; then
    print_step "Project already exists. Pulling latest changes"
    git -C "$INSTALL_DIR" fetch origin "$REPO_BRANCH"
    git -C "$INSTALL_DIR" checkout "$REPO_BRANCH"
    git -C "$INSTALL_DIR" pull --ff-only origin "$REPO_BRANCH"
    return
  fi

  print_step "Cloning project into $INSTALL_DIR"
  git clone --branch "$REPO_BRANCH" "$REPO_URL" "$INSTALL_DIR"
}

install_dependencies() {
  print_step "Installing app dependencies"
  cd "$INSTALL_DIR"
  npm install
}

start_app() {
  print_step "Starting Natty"
  cd "$INSTALL_DIR"
  nohup npm start > "$INSTALL_DIR/natty.log" 2>&1 &
  sleep 3
  print_step "Natty started. Opening browser"
  open "http://localhost:3147"
  cat <<EOF

Natty is now running.
Project folder: $INSTALL_DIR
Log file: $INSTALL_DIR/natty.log

If you need a custom League lockfile path, start it like this:
LEAGUE_LOCKFILE="/Applications/League of Legends.app/Contents/LoL/lockfile" npm start
EOF
}

ensure_homebrew
ensure_git
ensure_node
download_project
install_dependencies
start_app
