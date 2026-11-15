"""Step 4 (continued): builds the harmonized series (VIIRS S-NPP equivalent) as in docs/FORMAT.md.

- Before 2012-02 : n_harmonized = quantile mapping (MODIS -> VIIRS), source = MODIS
- From 2012-02   : n_harmonized = real S-NPP count,                  source = VIIRS
Output: data/processed/harmonized_monthly.csv + docs/harmonization_check.png
"""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from calibrate import fit_quantile_mapping, load

ROOT = Path(__file__).parent
SRC = ROOT / "data" / "processed" / "monthly_grid.csv"
OUT = ROOT / "data" / "processed" / "harmonized_monthly.csv"
FIG = ROOT / "docs" / "harmonization_check.png"
SWITCH = "2012-02"
NOAA20_FROM = "2026-11"


def build() -> pd.DataFrame:
    train = load()  # 2012-02 -> 2025-12
    qm = fit_quantile_mapping(train)

    g = pd.read_csv(SRC)
    g["modis"] = g["n_aqua"] + g["n_terra"]
    g["year"] = g["month"].str[:4].astype(int)

    # Before Aqua (first month with n_aqua > 0), Terra observes alone: Terra-only -> VIIRS calibration
    first_aqua = g.loc[g["n_aqua"] > 0, "month"].min()
    print(f"First Aqua month: {first_aqua} (before: Terra-only calibration)")
    qm_terra = fit_quantile_mapping(train.assign(modis=train["n_terra"]))

    old = g[g["month"] < SWITCH].copy()
    old = old[old["modis"] > 0]
    exceeds = (old["modis"] > train["modis"].max()).mean() * 100
    print(f"Cell-months before {SWITCH} whose MODIS count exceeds the training maximum: {exceeds:.2f}%")
    old["n_raw"] = old["modis"]
    terra_only = old["month"] < first_aqua
    old["n_harmonized"] = np.where(
        terra_only, qm_terra(old.assign(modis=old["n_terra"])), qm(old)
    ).round(3)
    old["source"] = "MODIS"

    # S-NPP stopped delivering on 2026-11-02: from that month, NOAA-20 (corrected by the median
    # NOAA-20/S-NPP ratio measured on the 2018-05 -> 2025-12 overlap) takes over.
    nat = g.groupby("month")[["n_snpp", "n_noaa20"]].sum().loc["2018-05":"2025-12"]
    nat = nat[nat["n_snpp"] > 200]
    ratio_n20 = float((nat["n_noaa20"] / nat["n_snpp"]).median())
    print(f"NOAA-20/S-NPP ratio (median): {ratio_n20:.3f}; NOAA-20 used from {NOAA20_FROM}")

    new = g[g["month"] >= SWITCH].copy()
    use_n20 = new["month"] >= NOAA20_FROM
    new["n_raw"] = np.where(use_n20, new["n_noaa20"], new["n_snpp"])
    new["n_harmonized"] = np.where(use_n20, new["n_noaa20"] / ratio_n20, new["n_snpp"]).astype(float).round(3)
    new = new[new["n_raw"] > 0]
    new["source"] = "VIIRS"

    cols = ["month", "lat_cell", "lon_cell", "n_raw", "n_harmonized", "source"]
    return pd.concat([old[cols], new[cols]], ignore_index=True).sort_values(["month", "lat_cell", "lon_cell"])


def check_plot(h: pd.DataFrame, g: pd.DataFrame) -> pd.DataFrame:
    g = g.assign(year=g["month"].str[:4].astype(int))
    h = h.assign(year=h["month"].str[:4].astype(int))
    g, h = g[g.year <= 2025], h[h.year <= 2025]  # 2026 is incomplete: excluded from the yearly chart
    yearly = pd.DataFrame(
        {
            "Raw MODIS": (g["n_aqua"] + g["n_terra"]).groupby(g.year).sum(),
            "Raw VIIRS S-NPP": g["n_snpp"].groupby(g.year).sum().where(lambda s: s > 0),
            "Harmonized series": h["n_harmonized"].groupby(h.year).sum(),
        }
    )
    fig, ax = plt.subplots(figsize=(10, 4.5))
    ax.plot(yearly.index, yearly["Raw MODIS"], "o--", color="#d95f02", label="Raw MODIS")
    ax.plot(yearly.index, yearly["Raw VIIRS S-NPP"], "s--", color="#1b9e77", label="Raw VIIRS S-NPP")
    ax.plot(yearly.index, yearly["Harmonized series"], "-", lw=2.5, color="#222222", label="Harmonized series (VIIRS equiv.)")
    ax.axvline(2012, color="grey", ls=":")
    ax.set_ylabel("hotspots / year (Togo)")
    ax.set_title("FIREPULSE — the harmonized series removes the MODIS → VIIRS break")
    ax.legend()
    ax.grid(alpha=0.3)
    FIG.parent.mkdir(exist_ok=True)
    fig.tight_layout()
    fig.savefig(FIG, dpi=150)
    return yearly


if __name__ == "__main__":
    h = build()
    h.to_csv(OUT, index=False)
    print(f"{len(h):,} rows -> {OUT}")
    yearly = check_plot(h, pd.read_csv(SRC))
    print(yearly.round(0).to_string())
