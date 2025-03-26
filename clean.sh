#!/bin/bash
set -e

echo "🧹 Cleaning project..."

# Remove all node_modules folders recursively
echo "📦 Removing node_modules..."
find . -name "node_modules" -type d -exec rm -rf {} +

# Remove existing lock files (both root and subdirectories)
echo "🔒 Removing lock files..."
rm -f package-lock.json yarn.lock pnpm-lock.yaml
find . -name "package-lock.json" -exec rm -f {} \;
find . -name "yarn.lock" -exec rm -f {} \;
find . -name "pnpm-lock.yaml" -exec rm -f {} \;

# Remove build artifacts
echo "🏗️ Removing build artifacts..."
find . -name "dist" -type d -exec rm -rf {} +
find . -name ".next" -type d -exec rm -rf {} +
find . -name "build" -type d -exec rm -rf {} +
find . -name "out" -type d -exec rm -rf {} +

# Remove cache directories
echo "🗑️ Removing cache directories..."
find . -name ".turbo" -type d -exec rm -rf {} +
find . -name ".cache" -type d -exec rm -rf {} +
find . -name ".parcel-cache" -type d -exec rm -rf {} +
rm -rf .pnpm-store

# Remove test artifacts
echo "🧪 Removing test artifacts..."
find . -name "coverage" -type d -exec rm -rf {} +
find . -name ".nyc_output" -type d -exec rm -rf {} +

# Remove TypeScript artifacts
echo "📝 Removing TypeScript artifacts..."
find . -name "*.tsbuildinfo" -exec rm -f {} +

# Remove editor/IDE specific files
echo "💻 Removing editor/IDE temp files..."
find . -name ".DS_Store" -exec rm -f {} +

# Remove Next.js specific files
echo "🔄 Removing Next.js specific files..."
find . -name ".next" -type d -exec rm -rf {} +
find . -name ".vercel" -type d -exec rm -rf {} +

# Remove temp and log files
echo "📄 Removing temporary and log files..."
find . -name "*.log" -exec rm -f {} +
find . -name "npm-debug.log*" -exec rm -f {} +
find . -name "yarn-debug.log*" -exec rm -f {} +
find . -name "yarn-error.log*" -exec rm -f {} +
find . -name "pnpm-debug.log*" -exec rm -f {} +
find . -name "lerna-debug.log*" -exec rm -f {} +

# Don't delete .env files but remind the user
echo "⚠️ Note: .env files were not removed. Remove them manually if needed."

echo "✅ Cleanup complete!"