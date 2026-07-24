#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

mkdir -p extension/lib
cp node_modules/turndown/dist/turndown.js extension/lib/turndown.js
cp node_modules/turndown-plugin-gfm/dist/turndown-plugin-gfm.js extension/lib/turndown-plugin-gfm.js
cp src/converter.js extension/lib/converter.js

echo "Build complete: extension/lib"
