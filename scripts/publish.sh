#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

notes="${1:-}"

bash scripts/build.sh
npm test

rm -rf publish/extension
mkdir -p publish
cp -r extension publish/extension

version="$(jq -r '.version' publish/extension/manifest.json)"
zip_path="publish/confluence-md-${version}.zip"
(
  cd publish
  zip -r -q "confluence-md-${version}.zip" extension
)

published_at="$(TZ=Asia/Seoul date --iso-8601=seconds)"
jq -n \
  --arg version "$version" \
  --arg published_at "$published_at" \
  --arg zip "$zip_path" \
  --arg notes "$notes" \
  '{version: $version, published_at: $published_at, zip: $zip, notes: $notes}' \
  > publish/latest.json

echo "Published version: ${version}"
echo "Zip: ${zip_path}"
