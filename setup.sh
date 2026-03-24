#!/usr/bin/env bash
set -e

TEMPLATE_REPO="https://github.com/techreloaded-ar/airchetipo-workshop.git"
DEFAULT_DIR="airchetipo-workshop"

echo ""
echo "========================================="
echo "  AIRchetipo Workshop — Setup"
echo "========================================="
echo ""

# Check git is installed
if ! command -v git &> /dev/null; then
  echo "Error: git is not installed. Please install git first."
  exit 1
fi

# Read from /dev/tty so it works when piped via curl | bash
read -p "Project folder name [$DEFAULT_DIR]: " PROJECT_DIR < /dev/tty
PROJECT_DIR="${PROJECT_DIR:-$DEFAULT_DIR}"

if [ -d "$PROJECT_DIR" ]; then
  echo "Error: directory '$PROJECT_DIR' already exists."
  exit 1
fi

read -p "Your remote repository URL: " REMOTE_URL < /dev/tty

if [ -z "$REMOTE_URL" ]; then
  echo "Error: remote URL cannot be empty."
  exit 1
fi

echo ""
echo "Cloning template into '$PROJECT_DIR'..."
git clone "$TEMPLATE_REPO" "$PROJECT_DIR"

cd "$PROJECT_DIR"

echo "Replacing remote origin with: $REMOTE_URL"
git remote set-url origin "$REMOTE_URL"

echo "Pushing to new remote..."
git push -u origin main

echo ""
echo "Installing AIRchetipo skills..."
curl -fsSL https://raw.githubusercontent.com/techreloaded-ar/AIRchetipo/main/install.sh | bash

echo ""
echo "Done! Your project is ready in './$PROJECT_DIR'"
echo "Remote origin is now: $REMOTE_URL"
echo ""
echo "Next steps:"
echo "  cd $PROJECT_DIR"
echo "  npm install"
echo "  cp .env.example .env.local  # configure your env vars"
echo "  npm run dev"
echo ""
