import json
from pathlib import Path
from typing import Any

import polars as pl
from constants import NEGATIVE_FAS, POSITIVE_FAS

# fmt: off
columns = ["round", "arena", "pirate1", "pirate2", "pirate3", "pirate4", "fa1", "fa2", "fa3", "fa4", "pfa1", "pfa2", "pfa3", "pfa4", "nfa1", "nfa2", "nfa3", "nfa4", "opening_odds1", "opening_odds2", "opening_odds3", "opening_odds4", "closing_odds1", "closing_odds2", "closing_odds3", "closing_odds4", "winner"]
# fmt: on


def get_df_from_file(path: Path) -> pl.DataFrame:
    rows: list[Any] = []
    data = json.loads(path.read_text())
    winners = data["winners"]
    if winners is None or not all(winners):
        return pl.DataFrame(schema=columns)

    round = data["round"]
    for arena in range(5):
        pirates = data["pirates"][arena]
        # older rounds don't have fa data
        fas = [0] * len(pirates)
        positive_fas = [0] * len(pirates)
        negative_fas = [0] * len(pirates)
        if "foods" in data:
            foods = data["foods"][arena]
            positive_fas = [
                sum(POSITIVE_FAS[pirate][food] for food in foods) for pirate in pirates
            ]
            negative_fas = [
                -sum(NEGATIVE_FAS[pirate][food] for food in foods) for pirate in pirates
            ]
            fas = [sum(x) for x in zip(positive_fas, negative_fas)]
        pirate1, pirate2, pirate3, pirate4 = pirates
        fa1, fa2, fa3, fa4 = fas
        pfa1, pfa2, pfa3, pfa4 = positive_fas
        nfa1, nfa2, nfa3, nfa4 = negative_fas
        # fmt: off
        _, opening_odds1, opening_odds2, opening_odds3, opening_odds4 = data["openingOdds"][arena]
        _, closing_odds1, closing_odds2, closing_odds3, closing_odds4 = data["currentOdds"][arena]
        winner = winners[arena]
        rows.append([round, arena, pirate1, pirate2, pirate3, pirate4, fa1, fa2, fa3, fa4, pfa1, pfa2, pfa3, pfa4, nfa1, nfa2, nfa3, nfa4, opening_odds1, opening_odds2, opening_odds3, opening_odds4, closing_odds1, closing_odds2, closing_odds3, closing_odds4, winner])
        # fmt: on
    if rows:
        return pl.DataFrame(rows, schema=columns)
    return pl.DataFrame(schema=columns)


pathlist = list(Path("raw_json").glob("**/*.json"))
dfs: list[pl.DataFrame] = []
for path in pathlist:
    df = get_df_from_file(path)
    if df.height > 0:
        dfs.append(df)

if dfs:
    df = pl.concat(dfs)
    df = df.sort(["round", "arena"])
    df.write_csv("./output/history.csv")
else:
    pl.DataFrame(schema=columns).write_csv("./output/history.csv")
