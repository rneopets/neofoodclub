#!/bin/sh
# Some build platforms (e.g. Cloudflare Pages) run `npm run build` in a
# container with no Rust toolchain, so wasm-pack (needed below) isn't on
# PATH: "sh: 1: wasm-pack: not found". Bootstrap it on demand; local dev and
# CI already have wasm-pack installed and skip straight to the build.
set -e

WASM_SHA=$(git -C wasm/neofoodclub_rs rev-parse HEAD)
PKG_DIR=wasm/pkg
CACHE_URL="https://pub-fe0294c3912c4425b7e998411ef6e975.r2.dev/wasm-pkg-$WASM_SHA.tar.gz"

if [ -f "$PKG_DIR/.build-sha" ] && [ "$(cat "$PKG_DIR/.build-sha")" = "$WASM_SHA" ] && [ -f "$PKG_DIR/neofoodclub_wasm_bg.wasm" ]; then
  echo "wasm/pkg already built for $WASM_SHA, skipping"
  exit 0
fi

rm -rf "$PKG_DIR" && mkdir -p "$PKG_DIR"
if curl -fsSL -o /tmp/wasm-pkg-cache.tar.gz "$CACHE_URL"; then
  tar -xzf /tmp/wasm-pkg-cache.tar.gz -C "$PKG_DIR"
  echo "$WASM_SHA" > "$PKG_DIR/.build-sha"
  echo "Restored prebuilt wasm/pkg for $WASM_SHA from cache"
  exit 0
fi
echo "No cached wasm build found for $WASM_SHA, compiling from source"

if ! command -v wasm-pack >/dev/null 2>&1; then
  export RUSTUP_HOME="${RUSTUP_HOME:-/tmp/rustup}"
  export CARGO_HOME="${CARGO_HOME:-/tmp/cargo}"
  export PATH="$CARGO_HOME/bin:$PATH"

  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o /tmp/rustup-init.sh
  sh /tmp/rustup-init.sh -y --profile minimal --default-toolchain stable --target wasm32-unknown-unknown
  . "$CARGO_HOME/env"

  curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf -o /tmp/wasm-pack-init.sh
  sh /tmp/wasm-pack-init.sh
fi

wasm-pack build wasm/neofoodclub_rs/crates/wasm --target bundler --out-dir ../../../pkg --out-name neofoodclub_wasm
echo "$WASM_SHA" > "$PKG_DIR/.build-sha"

if [ -n "$WASM_CACHE_UPLOAD_TOKEN" ]; then
  tar -czf /tmp/wasm-pkg-cache.tar.gz -C "$PKG_DIR" .
  CLOUDFLARE_API_TOKEN="$WASM_CACHE_UPLOAD_TOKEN" npx wrangler r2 object put "neofoodclub-wasm-cache/wasm-pkg-$WASM_SHA.tar.gz" --file /tmp/wasm-pkg-cache.tar.gz --remote || echo "warning: failed to publish wasm cache to R2 (non-fatal)"
fi
