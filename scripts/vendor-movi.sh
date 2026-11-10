#!/usr/bin/env bash
# Run from repository root, then commit static/vendor/movi-player/0.4.1/
# The published npm tarball is the source of the pinned player assets.
set -euo pipefail
VERSION=0.4.1
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/static/vendor/movi-player/$VERSION"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$DEST"
curl -fLsS --retry 3 --connect-timeout 12 --max-time 180 \
  "https://registry.npmjs.org/movi-player/-/movi-player-$VERSION.tgz" \
  -o "$TMP/movi-player.tgz"
tar xzf "$TMP/movi-player.tgz" -C "$TMP"
for asset in element.slim.global.js element.global.js movi.wasm; do
  test -s "$TMP/package/dist/$asset" || {
    echo "Missing published asset $asset" >&2; exit 1;
  }
  cp "$TMP/package/dist/$asset" "$DEST/$asset"
done
if [ -f "$TMP/package/LICENSE" ]; then cp "$TMP/package/LICENSE" "$DEST/LICENSE"; fi
printf '{"version":"%s"}\n' "$VERSION" > "$DEST/manifest.json"
echo "First-party assets installed: $DEST"
echo "Commit the directory and deploy on the same origin as preview.html."
