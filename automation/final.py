from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import polars as pl
from constants import PIRATE_NAMES
from xlogit import MultinomialLogit

df = pl.read_csv("./output/history.csv")


# combine columns pirate1 through pirate4 into a single column containing a list of pirate choices
def convert_df(df_orig: pl.DataFrame) -> pl.DataFrame:
    # Create list columns from scalar columns using pl.concat_list
    df = df_orig.with_columns([
        pl.concat_list([
            pl.col("pirate1"),
            pl.col("pirate2"),
            pl.col("pirate3"),
            pl.col("pirate4"),
        ]).alias("pirates"),
        pl.concat_list([
            pl.col("fa1"),
            pl.col("fa2"),
            pl.col("fa3"),
            pl.col("fa4"),
        ]).alias("fas"),
        pl.concat_list([
            pl.col("pfa1"),
            pl.col("pfa2"),
            pl.col("pfa3"),
            pl.col("pfa4"),
        ]).alias("pfas"),
        pl.concat_list([
            pl.col("nfa1"),
            pl.col("nfa2"),
            pl.col("nfa3"),
            pl.col("nfa4"),
        ]).alias("nfas"),
        pl.concat_list([
            pl.col("opening_odds1"),
            pl.col("opening_odds2"),
            pl.col("opening_odds3"),
            pl.col("opening_odds4"),
        ]).alias("opening_odds"),
        pl.concat_list([
            pl.col("closing_odds1"),
            pl.col("closing_odds2"),
            pl.col("closing_odds3"),
            pl.col("closing_odds4"),
        ]).alias("closing_odds"),
        (pl.col("round") * 5 + pl.col("arena")).alias("match_id"),
    ]).drop([
        "pirate1",
        "pirate2",
        "pirate3",
        "pirate4",
        "fa1",
        "fa2",
        "fa3",
        "fa4",
        "pfa1",
        "pfa2",
        "pfa3",
        "pfa4",
        "nfa1",
        "nfa2",
        "nfa3",
        "nfa4",
        "opening_odds1",
        "opening_odds2",
        "opening_odds3",
        "opening_odds4",
        "closing_odds1",
        "closing_odds2",
        "closing_odds3",
        "closing_odds4",
    ])
    return df


df = convert_df(df)


# explode each row of df into four rows, so that the resulting df
# contains columns of round, arena, win (0 or 1), pirate, fa, opening_odds, closing_odds, match_id
def convert_to_long_format_with_win(df: pl.DataFrame):
    # positional effect is significant but sorta non-linear; this is taken from a model data
    # and we'll calculate each pirates "suscetibility to positional effects" by fitting a multiplier
    position_factor = [-0.1856, 0.0, 0.2848, 0.5554]

    # Use polars explode to efficiently expand list columns
    # Add row index to track position within each original row
    df = df.with_row_index("_row_idx")

    # Explode all list columns at once - polars will maintain alignment
    long_format = df.explode([
        "pirates",
        "fas",
        "pfas",
        "nfas",
        "opening_odds",
        "closing_odds",
    ])

    # Rename exploded columns to singular
    long_format = long_format.rename({
        "pirates": "pirate",
        "fas": "fa",
        "pfas": "pfa",
        "nfas": "nfa",
    })

    # Add position column (1-4) within each original row
    long_format = long_format.with_columns([
        (pl.int_range(pl.len()).over("_row_idx") % 4 + 1).alias("position")
    ])

    # Add position-based columns
    long_format = long_format.with_columns([
        pl.when(pl.col("position") == 1)
        .then(position_factor[0])
        .when(pl.col("position") == 2)
        .then(position_factor[1])
        .when(pl.col("position") == 3)
        .then(position_factor[2])
        .otherwise(position_factor[3])
        .alias("position_factor"),
        (pl.col("position") == 1).cast(pl.Int32).alias("is_pos1"),
        (pl.col("position") == 2).cast(pl.Int32).alias("is_pos2"),
        (pl.col("position") == 3).cast(pl.Int32).alias("is_pos3"),
        (pl.col("position") == 4).cast(pl.Int32).alias("is_pos4"),
    ])

    # Add win column if winner exists
    if "winner" in df.columns:
        winner_df = df.select(["_row_idx", "winner"])
        long_format = long_format.join(winner_df, on="_row_idx", how="left")
        long_format = long_format.with_columns([
            ((pl.col("winner") == pl.col("position")).cast(pl.Int32)).alias("win")
        ]).drop("winner")
    else:
        long_format = long_format.with_columns([pl.lit(0).cast(pl.Int32).alias("win")])

    # Drop temporary column and add log column
    long_format = long_format.drop("_row_idx")
    long_format = long_format.with_columns([
        (np.log(1.0 / pl.col("opening_odds"))).alias("log_opening_implied_winrate")
    ])

    return long_format


long_format = convert_to_long_format_with_win(df)

pirates_including_the_first = list(range(1, 21))
pirates_except_the_first = list(range(2, 21))
pirates_except_goob = [i for i in range(1, 21) if i != 15]

# For xlogit, we need to create interaction variables for each pirate
# First, create pirate dummy columns
pirate_dummy_exprs = []
for p in pirates_including_the_first:
    col_name = f"is_pirate_{p}"
    pirate_dummy_exprs.append((pl.col("pirate") == p).cast(pl.Int32).alias(col_name))

# Add pirate dummy columns first
long_format = long_format.with_columns(pirate_dummy_exprs)

# Now create interaction variables that reference the pirate dummy columns
interaction_exprs = []

# Create interaction variables for intercepts (ASC) - all pirates except Goob (15)
for p in pirates_except_goob:
    interaction_exprs.append(pl.col(f"is_pirate_{p}").alias(f"asc_{p}"))

# Create interaction variables for pfa
for p in pirates_including_the_first:
    interaction_exprs.append(
        (pl.col("pfa") * pl.col(f"is_pirate_{p}")).alias(f"pfa_{p}")
    )

# Create interaction variables for nfa
for p in pirates_including_the_first:
    interaction_exprs.append(
        (pl.col("nfa") * pl.col(f"is_pirate_{p}")).alias(f"nfa_{p}")
    )

# Create interaction variables for positional effects
for p in pirates_including_the_first:
    interaction_exprs.append(
        (pl.col("is_pos2") * pl.col(f"is_pirate_{p}")).alias(f"is_pos2_{p}")
    )
    interaction_exprs.append(
        (pl.col("is_pos3") * pl.col(f"is_pirate_{p}")).alias(f"is_pos3_{p}")
    )
    interaction_exprs.append(
        (pl.col("is_pos4") * pl.col(f"is_pirate_{p}")).alias(f"is_pos4_{p}")
    )

# Add interaction columns
long_format = long_format.with_columns(interaction_exprs)

# Build variable names list in the same order as pylogit specification
varnames = []
varnames_with_descriptions = []

# Intercepts (ASC) for all pirates except Goob
for p in pirates_except_goob:
    varnames.append(f"asc_{p}")
    varnames_with_descriptions.append(f"ASC_{p}_{PIRATE_NAMES[p]}")

# PFA for all pirates
for p in pirates_including_the_first:
    varnames.append(f"pfa_{p}")
    varnames_with_descriptions.append(f"PFA_{p}_{PIRATE_NAMES[p]}")

# NFA for all pirates
for p in pirates_including_the_first:
    varnames.append(f"nfa_{p}")
    varnames_with_descriptions.append(f"NFA_{p}_{PIRATE_NAMES[p]}")

# is_pos2 for all pirates
for p in pirates_including_the_first:
    varnames.append(f"is_pos2_{p}")
    varnames_with_descriptions.append(f"is_pos2_{p}_{PIRATE_NAMES[p]}")

# is_pos3 for all pirates
for p in pirates_including_the_first:
    varnames.append(f"is_pos3_{p}")
    varnames_with_descriptions.append(f"is_pos3_{p}_{PIRATE_NAMES[p]}")

# is_pos4 for all pirates
for p in pirates_including_the_first:
    varnames.append(f"is_pos4_{p}")
    varnames_with_descriptions.append(f"is_pos4_{p}_{PIRATE_NAMES[p]}")

# Fit the model using xlogit
# Use position (1-4) as the alternative since each match has exactly 4 positions
model = MultinomialLogit()
# Convert polars DataFrame columns to numpy arrays for xlogit
X = long_format.select(varnames).to_numpy()
y = long_format["win"].to_numpy()
ids = long_format["match_id"].to_numpy()
alts = long_format["position"].to_numpy()

model.fit(
    X=X,
    y=y,
    varnames=varnames,
    ids=ids,
    alts=alts,
    fit_intercept=False,  # We're handling intercepts manually via ASC variables
)
model.summary()


# Extract parameters as a Series-like object for compatibility with existing code
# Create a helper class to mimic pandas Series .iloc behavior
@dataclass
class IlocIndexer:
    coeff: np.ndarray[float]

    def __getitem__(self, idx: int) -> float:
        return self.coeff[idx]


@dataclass
class ParamsSeries:
    varnames: list[str]
    coeff: np.ndarray[float]
    iloc: IlocIndexer = field(init=False)

    def __post_init__(self) -> None:
        self.iloc = IlocIndexer(self.coeff)


params = ParamsSeries(varnames, model.coeff_)


def generate_javascript(params) -> str:
    sep = ",\n    "
    return f"""
export const LOGIT_INTERCEPTS = {{
    {sep.join([f"{i + 1}: {params.iloc[i]}" for i in range(14)])}{sep}15: 0.0{sep}{sep.join([f"{i + 2}: {params.iloc[i]}" for i in range(14, 19)])},
}};
export const LOGIT_PFA = {{
    {sep.join([f"{i - 18}: {params.iloc[i]}" for i in range(19, 39)])},
}};
export const LOGIT_NFA = {{
    {sep.join([f"{i - 38}: {params.iloc[i]}" for i in range(39, 59)])},
}};
export const LOGIT_IS_POS2 = {{
    {sep.join([f"{i - 58}: {params.iloc[i]}" for i in range(59, 79)])},
}};
export const LOGIT_IS_POS3 = {{
    {sep.join([f"{i - 78}: {params.iloc[i]}" for i in range(79, 99)])},
}};
export const LOGIT_IS_POS4 = {{
    {sep.join([f"{i - 98}: {params.iloc[i]}" for i in range(99, 119)])},
}};
""".lstrip()


def generate_typescript(params) -> str:
    sep = ",\n    "
    return f"""
export const LOGIT_INTERCEPTS: Map<number, number> = new Map([
    {sep.join([f"[{i + 1}, {params.iloc[i]}]" for i in range(14)])}{sep}[15, 0.0]{sep}{sep.join([f"[{i + 2}, {params.iloc[i]}]" for i in range(14, 19)])},
]);
export const LOGIT_PFA: Map<number, number> = new Map([
    {sep.join([f"[{i - 18}, {params.iloc[i]}]" for i in range(19, 39)])},
]);
export const LOGIT_NFA: Map<number, number> = new Map([
    {sep.join([f"[{i - 38}, {params.iloc[i]}]" for i in range(39, 59)])},
]);
export const LOGIT_IS_POS2: Map<number, number> = new Map([
    {sep.join([f"[{i - 58}, {params.iloc[i]}]" for i in range(59, 79)])},
]);
export const LOGIT_IS_POS3: Map<number, number> = new Map([
    {sep.join([f"[{i - 78}, {params.iloc[i]}]" for i in range(79, 99)])},
]);
export const LOGIT_IS_POS4: Map<number, number> = new Map([
    {sep.join([f"[{i - 98}, {params.iloc[i]}]" for i in range(99, 119)])},
]);
""".lstrip()


def generate_python(params) -> str:
    sep = ",\n    "
    return f"""
LOGIT_INTERCEPTS = [
    {sep.join([f"{params.iloc[i]}" for i in range(14)])}{sep}0.0{sep}{sep.join([f"{params.iloc[i]}" for i in range(14, 19)])},
]
LOGIT_PFA = [
    {sep.join([f"{params.iloc[i]}" for i in range(19, 39)])},
]
LOGIT_NFA = [
    {sep.join([f"{params.iloc[i]}" for i in range(39, 59)])},
]
LOGIT_IS_POS2 = [
    {sep.join([f"{params.iloc[i]}" for i in range(59, 79)])},
]
LOGIT_IS_POS3 = [
    {sep.join([f"{params.iloc[i]}" for i in range(79, 99)])},
]
LOGIT_IS_POS4 = [
    {sep.join([f"{params.iloc[i]}" for i in range(99, 119)])},
]
""".lstrip()


def generate_rust(params) -> str:
    sep = ",\n    "
    return f"""
static LOGIT_INTERCEPTS: [f64; 20] = [
    {sep.join([f"{params.iloc[i]}" for i in range(14)])}{sep}0.0{sep}{sep.join([f"{params.iloc[i]}" for i in range(14, 19)])},
];
static LOGIT_PFA: [f64; 20] = [
    {sep.join([f"{params.iloc[i]}" for i in range(19, 39)])},
];
static LOGIT_NFA: [f64; 20] = [
    {sep.join([f"{params.iloc[i]}" for i in range(39, 59)])},
];
static LOGIT_IS_POS2: [f64; 20] = [
    {sep.join([f"{params.iloc[i]}" for i in range(59, 79)])},
];
static LOGIT_IS_POS3: [f64; 20] = [
    {sep.join([f"{params.iloc[i]}" for i in range(79, 99)])},
];
static LOGIT_IS_POS4: [f64; 20] = [
    {sep.join([f"{params.iloc[i]}" for i in range(99, 119)])},
];
""".lstrip()


print("Writing output files...")
print("Creating javascript.js...")
Path("./output/javascript.js").write_text(
    generate_javascript(params),
)

print("Creating typescript.ts...")
Path("./output/typescript.ts").write_text(
    generate_typescript(per_pirate_fa_and_per_pirate_pos_mnl.params),
)
print("Creating rust.rs...")
Path("./output/rust.rs").write_text(
    generate_rust(params),
)
print("Creating python.py...")
Path("./output/python.py").write_text(
    generate_python(params),
)
