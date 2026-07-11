#!/bin/sh
# Some build platforms (e.g. Cloudflare Pages) run `npm run build` in a
# container with no Rust toolchain, so wasm-pack (needed below) isn't on
# PATH: "sh: 1: wasm-pack: not found". Bootstrap it on demand; local dev and
# CI already have wasm-pack installed and skip straight to the build.
set -e

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
