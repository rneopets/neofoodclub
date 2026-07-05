# 🍔 NeoFoodClub

## Create and share Food Club bets on Neopets.


## Links
- [neofood.club website](https://neofood.club/)
- [neofoodclub.rs Github Repo](https://github.com/rneopets/neofoodclub.rs)

---

## Development setup

The pure-math core (probabilities, arena ratios, payout tables, pirate bit-packing)
is compiled to WebAssembly from the vendored [neofoodclub.rs](https://github.com/rneopets/neofoodclub.rs)
submodule at `wasm/`. One-time setup after cloning:

```sh
just wasm-setup   # rustup target add wasm32-unknown-unknown + git submodule init
npm install       # also builds the wasm module (see prestart/prebuild/pretest in package.json)
```

Requires a Rust toolchain and [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/).
`just wasm-build` (or `npm run build:wasm`) rebuilds the wasm module on its own.

---

## A Big Thank You To...

- NeoDAQ, the original website with Food Club data
- `au_travail`, who created the [original NeoFoodClub](http://neofoodclub.fr/)
- [u/KK20_CP](https://www.reddit.com/user/KK20_CP/) for maintaining [a fork of NeoFoodClub](https://foodclub.neocities.org/) *before we adopted it*
