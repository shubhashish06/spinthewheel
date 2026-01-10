#!/bin/bash

# Script to push repository to GitHub
# Usage: ./git-push.sh <github-repo-url>

set -e

echo "🔍 Checking git status..."
git status

echo ""
echo "📝 Adding LICENSE file..."
git add LICENSE

echo ""
echo "📦 Adding all changes..."
git add .

echo ""
echo "💾 Committing changes..."
git commit -m "Complete implementation of Spin the Wheel signage game

- Multi-instance support with superadmin dashboard
- Weighted probability outcomes with 0-weight support
- Responsive wheel animation with precise landing
- Email and phone validation
- AWS deployment ready
- Comprehensive documentation" || echo "No changes to commit"

echo ""
if [ -z "$1" ]; then
  echo "❌ Error: Please provide GitHub repository URL"
  echo "Usage: ./git-push.sh https://github.com/username/repo.git"
  exit 1
fi

REPO_URL="$1"

echo "🔗 Setting up remote..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

echo ""
echo "📤 Pushing to GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "✅ Successfully pushed to GitHub!"
echo "🔗 Repository: $REPO_URL"
