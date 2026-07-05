use neofoodclub::math;
use neofoodclub::nfc::{NeoFoodClub, ProbabilityModel};
use serde::Serialize;
use wasm_bindgen::prelude::*;

/// Replaces the `std`/`used` portion of `computeLegacyProbabilities` (original
/// model) or the `prob`/`used` portion of `computeLogitProbabilities` (logit
/// model), depending on `use_logit`. `round_json` is the raw camelCase
/// RoundData JSON as fetched from cdn.neofood.club/rounds/{round}.json - no
/// field marshalling needed. Returns a flattened 25-element array (5 arenas x
/// [unused, p1, p2, p3, p4]).
#[wasm_bindgen(js_name = computeStdProbabilities)]
pub fn compute_std_probabilities(round_json: &str, use_logit: bool) -> Result<Vec<f64>, JsError> {
    let model = if use_logit {
        ProbabilityModel::MultinomialLogitModel
    } else {
        ProbabilityModel::OriginalModel
    };
    let nfc = NeoFoodClub::from_json(round_json, None, Some(model), None)
        .map_err(|e| JsError::new(&e.to_string()))?;
    Ok(nfc.probabilities().into_iter().flatten().collect())
}

/// Replaces `calculateArenaRatios(customOdds)`. `odds` is a flattened
/// 25-element array (5 arenas x [unused, o1, o2, o3, o4]), matching the app's
/// `OddsData` shape - already resolved to either current or custom odds by
/// the caller. Returns one ratio per arena.
#[wasm_bindgen(js_name = computeArenaRatios)]
pub fn compute_arena_ratios(odds: Vec<f64>) -> Result<Vec<f64>, JsError> {
    if odds.len() != 25 {
        return Err(JsError::new(
            "odds must have exactly 25 elements (5 arenas x 5 slots)",
        ));
    }
    let ratios = (0..5)
        .map(|arena| {
            let sum: f64 = (1..5).map(|pirate| 1.0 / odds[arena * 5 + pirate]).sum();
            1.0 / sum - 1.0
        })
        .collect();
    Ok(ratios)
}

#[derive(Serialize)]
struct ChanceOut {
    value: u32,
    probability: f64,
    cumulative: f64,
    tail: f64,
}

impl From<neofoodclub::chance::Chance> for ChanceOut {
    fn from(c: neofoodclub::chance::Chance) -> Self {
        ChanceOut {
            value: c.value,
            probability: c.probability,
            cumulative: c.cumulative,
            tail: c.tail,
        }
    }
}

#[derive(Serialize)]
struct PayoutTablesOut {
    odds: Vec<ChanceOut>,
    winnings: Vec<ChanceOut>,
}

/// Replaces `calculatePayoutTables(bets, probabilities, betOdds, betPayoffs)`.
/// `bet_indices` is a flattened n*5 array of pirate indices (0-4 per arena, 0
/// = no pick), matching the existing `Bet = Map<number, number[]>` shape one
/// bet at a time. `probabilities` is a flattened 25-element array (already
/// resolved to legacy/logit/custom by the caller, matching `usedProbabilities`
/// in the app). `bet_odds`/`bet_payoffs` are parallel n-length arrays. Returns
/// `{ odds, winnings }` where each is an array of
/// `{ value, probability, cumulative, tail }`.
#[wasm_bindgen(js_name = computePayoutTables)]
pub fn compute_payout_tables(
    bet_indices: Vec<u8>,
    probabilities: Vec<f64>,
    bet_odds: Vec<u32>,
    bet_payoffs: Vec<u32>,
) -> Result<JsValue, JsError> {
    if bet_indices.len() % 5 != 0 {
        return Err(JsError::new("bet_indices length must be a multiple of 5"));
    }
    let n = bet_indices.len() / 5;
    if bet_odds.len() != n || bet_payoffs.len() != n {
        return Err(JsError::new(
            "bet_odds and bet_payoffs must have one entry per bet",
        ));
    }
    if probabilities.len() != 25 {
        return Err(JsError::new(
            "probabilities must have exactly 25 elements (5 arenas x 5 slots)",
        ));
    }

    let bets: Vec<[u8; 5]> = bet_indices
        .chunks_exact(5)
        .map(|chunk| [chunk[0], chunk[1], chunk[2], chunk[3], chunk[4]])
        .collect();

    let mut probs = [[0.0; 5]; 5];
    for arena in 0..5 {
        for pirate in 0..5 {
            probs[arena][pirate] = probabilities[arena * 5 + pirate];
        }
    }

    let odds_table = math::build_chance_objects(&bets, &bet_odds, probs);
    let winnings_table = math::build_chance_objects(&bets, &bet_payoffs, probs);

    let out = PayoutTablesOut {
        odds: odds_table.into_iter().map(ChanceOut::from).collect(),
        winnings: winnings_table.into_iter().map(ChanceOut::from).collect(),
    };

    serde_wasm_bindgen::to_value(&out).map_err(|e| JsError::new(&e.to_string()))
}

/// Replaces `computePirateBinary(arenaIndex, pirateIndex)`. Note the argument
/// order is swapped relative to `neofoodclub::math::pirate_binary(index, arena)`.
#[wasm_bindgen(js_name = computePirateBinary)]
pub fn compute_pirate_binary(arena_index: u8, pirate_index: u8) -> u32 {
    math::pirate_binary(pirate_index, arena_index)
}

/// Replaces `computePiratesBinary`. `pirates` must have exactly 5 elements.
#[wasm_bindgen(js_name = computePiratesBinary)]
pub fn compute_pirates_binary(pirates: Vec<u8>) -> Result<u32, JsError> {
    let indices: [u8; 5] = pirates
        .try_into()
        .map_err(|_| JsError::new("expected exactly 5 elements"))?;
    Ok(math::pirates_binary(indices))
}

/// Replaces `computeBinaryToPirates`.
#[wasm_bindgen(js_name = computeBinaryToPirates)]
pub fn compute_binary_to_pirates(bin: u32) -> Vec<u8> {
    math::binary_to_indices(bin).to_vec()
}
