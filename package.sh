#!/bin/bash

# AI Roundtable - Build Script
# This script creates a clean distribution package

VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
DIST_NAME="ai-roundtable-v${VERSION}"
DIST_DIR="dist"
ZIP_FILE="${DIST_NAME}.zip"

echo "📦 Building AI Roundtable v${VERSION}..."

# Clean previous builds
rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}"

# Create temporary directory for packaging
TEMP_DIR="${DIST_DIR}/${DIST_NAME}"
mkdir -p "${TEMP_DIR}"

# Copy necessary files
echo "📋 Copying files..."
cp manifest.json "${TEMP_DIR}/"
cp background.js "${TEMP_DIR}/"
cp README.md "${TEMP_DIR}/"
cp LICENSE "${TEMP_DIR}/" 2>/dev/null || echo "⚠️  LICENSE file not found, skipping..."

# Copy directories
cp -r sidepanel "${TEMP_DIR}/"
cp -r content "${TEMP_DIR}/"
cp -r icons "${TEMP_DIR}/" 2>/dev/null || echo "⚠️  icons directory not found, skipping..."

# Remove development files from the package
echo "🧹 Cleaning development files..."
rm -f "${TEMP_DIR}/"*.md
rm -f "${TEMP_DIR}/CLAUDE.md"
rm -f "${TEMP_DIR}/DEVELOPMENT_LOG.md"
rm -f "${TEMP_DIR}/SOFTWARE_DESIGN.md"
rm -f "${TEMP_DIR}/TESTING.md"
rm -rf "${TEMP_DIR}/docs"
rm -rf "${TEMP_DIR}/.git"
rm -f "${TEMP_DIR}/.gitignore"
rm -f "${TEMP_DIR}/package.sh"
rm -f "${TEMP_DIR}/build.bat"

# Create ZIP file
echo "📫 Creating ZIP package..."
cd "${DIST_DIR}"
zip -r "${DIST_NAME}.zip" "${DIST_NAME}" > /dev/null
cd ..

# Cleanup
rm -rf "${TEMP_DIR}"

echo "✅ Package created successfully!"
echo "📦 Location: ${DIST_DIR}/${ZIP_FILE}"
echo ""
echo "📏 Package size: $(du -h "${DIST_DIR}/${ZIP_FILE}" | cut -f1)"
echo ""
echo "🚀 You can now distribute this file for users to install."
echo "   Installation: Load unpacked extension in Chrome with this ZIP file"
