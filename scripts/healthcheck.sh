#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

bash scripts/build.sh
node tests/converter.test.js
echo "Healthcheck PASS"
