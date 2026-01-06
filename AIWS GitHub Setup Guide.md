# AIWS GitHub Setup Guide

## 1. Lokales Repository erstellen

# Erstelle Projektordner
mkdir aiws-platform
cd aiws-platform

# Initialisiere Git
git init

# Erstelle README.md (siehe nächster Abschnitt)

## 2. Projektstruktur erstellen

# Erstelle Ordnerstruktur
mkdir -p docs
mkdir -p specs
mkdir -p examples
mkdir -p prototypes

# Erstelle .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
*.log

# Build
dist/
build/
*.min.js

# Environment
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Temporary
tmp/
temp/
*.tmp
EOF

# Erstelle LICENSE
cat > LICENSE << 'EOF'
Copyright (c) 2025 Dennis Sven Mittmann

All rights reserved.

This software and associated documentation files (the "Software") are the 
proprietary property of Dennis Sven Mittmann. 

No part of this Software may be reproduced, distributed, or transmitted in 
any form or by any means, including photocopying, recording, or other 
electronic or mechanical methods, without the prior written permission of 
the copyright holder.

For permission requests, contact: [Your contact information]
EOF

## 3. Dateien committen

# Füge alle Dateien hinzu
git add .

# Erster Commit
git commit -m "Initial commit: AIWS Platform Specification v1.0

- Complete system specification
- AI-native optimizations (GraphMemDB, AIQ, AIBP)
- Visual development interface design
- Specialized AI agent architecture
- Performance benchmarks and comparisons

Co-authored-by: Dennis Sven Mittmann <your.email@example.com>"

## 4. GitHub Repository erstellen

# Option A: Via GitHub Website
# 1. Gehe zu https://github.com/new
# 2. Repository Name: "aiws-platform"
# 3. Description: "AIWS - AI Web Assembly System: Visual AI Development Platform"
# 4. Wähle "Private" oder "Public"
# 5. NICHT initialisieren mit README, .gitignore oder License (haben wir schon!)
# 6. Klicke "Create repository"

# Option B: Via GitHub CLI (wenn installiert)
gh repo create aiws-platform --private --source=. --remote=origin

## 5. Remote Repository verbinden und pushen

# Füge GitHub als Remote hinzu (ersetze USERNAME mit deinem GitHub Username)
git remote add origin https://github.com/USERNAME/aiws-platform.git

# Oder mit SSH (empfohlen wenn SSH-Keys eingerichtet):
# git remote add origin git@github.com:USERNAME/aiws-platform.git

# Main Branch umbenennen (falls nötig)
git branch -M main

# Push zum GitHub
git push -u origin main

## 6. Weitere Branches erstellen (optional)

# Development Branch
git checkout -b develop
git push -u origin develop

# Feature Branches
git checkout -b feature/graphmemdb
git push -u origin feature/graphmemdb

git checkout -b feature/aiq-compiler
git push -u origin feature/aiq-compiler

git checkout -b feature/browser-extension
git push -u origin feature/browser-extension

# Zurück zum Main Branch
git checkout main

## 7. GitHub Actions einrichten (optional)

mkdir -p .github/workflows

cat > .github/workflows/documentation.yml << 'EOF'
name: Documentation

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build documentation
        run: echo "Documentation build placeholder"
EOF

## 8. Projekt-Beschreibung auf GitHub hinzufügen

# Nach dem Push:
# 1. Gehe zu https://github.com/USERNAME/aiws-platform
# 2. Klicke "About" (Zahnrad-Symbol rechts)
# 3. Füge hinzu:
#    - Description: "AI-native web development platform with visual interface"
#    - Website: [deine Website falls vorhanden]
#    - Topics: ai, web-development, visual-programming, automation, 
#              low-code, ai-agents, graphdb, developer-tools

## 9. Weitere empfohlene Dateien

# CONTRIBUTING.md
cat > CONTRIBUTING.md << 'EOF'
# Contributing to AIWS

Thank you for your interest in contributing to AIWS!

## Development Status

This project is currently in the specification phase. 
We are not accepting external contributions at this time.

For inquiries about collaboration, please contact Dennis Sven Mittmann.
EOF

# CHANGELOG.md
cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to AIWS will be documented in this file.

## [1.0.0] - 2025-01-06

### Added
- Initial specification release
- Complete system architecture documentation
- AI-native optimization strategies (GraphMemDB, AIQ, AIBP)
- Visual development interface design
- Specialized AI agent architecture
- Performance benchmarks and comparisons

### Authors
- Dennis Sven Mittmann (Concept & Architecture)
- Claude (Anthropic) (Technical Specification)
EOF

# CODE_OF_CONDUCT.md (optional)
cat > CODE_OF_CONDUCT.md << 'EOF'
# Code of Conduct

## Our Pledge

We are committed to providing a welcoming and inspiring community for all.

## Scope

This Code of Conduct applies to all project spaces and public spaces 
when an individual is representing the project or its community.

## Contact

For any concerns, please contact: [Your contact email]
EOF

## 10. Committen und pushen

git add .
git commit -m "Add project documentation and contribution guidelines"
git push

## 11. GitHub Repository Settings empfohlen

# Nach dem Setup auf GitHub:
# 
# 1. Gehe zu Settings → General
#    - Features: Enable Wikis, Issues, Discussions
#    - Pull Requests: Enable "Allow squash merging"
#
# 2. Settings → Branches
#    - Füge Branch Protection für "main" hinzu:
#      ✓ Require pull request reviews
#      ✓ Require status checks to pass
#
# 3. Settings → Pages (optional)
#    - Enable GitHub Pages für Dokumentation
#    - Source: Deploy from branch "main", folder "/docs"

## 12. Clone zum Testen

# In einem anderen Verzeichnis:
cd ~/test
git clone https://github.com/USERNAME/aiws-platform.git
cd aiws-platform

# Prüfe ob alles da ist
ls -la

echo "✅ AIWS successfully backed up to GitHub!"