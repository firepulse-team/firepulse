"""Étape 4 (suite) : produit la série harmonisée (équivalent VIIRS S-NPP) selon docs/FORMAT.md.

- Avant 2012-02 : n_harmonized = quantile mapping (MODIS -> VIIRS), source = MODIS
- Dès 2012-02   : n_harmonized = comptage S-NPP réel,              source = VIIRS
Sortie : data/processed/harmonized_monthly.csv + docs/harmonization_check.png
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


def build() -> pd.DataFrame:
    train = load()  # 2012-02 -> 2025-12
    qm = fit_quantile_mapping(train)

    g = pd.read_csv(SRC)
    g["modis"] = g["n_aqua"] + g["n_terra"]
    g["year"] = g["month"].str[:4].astype(int)

    # Avant Aqua (premier mois avec n_aqua > 0), seul Terra observe : calibration Terra seul -> VIIRS
    first_aqua = g.loc[g["n_aqua"] > 0, "month"].min()
    print(f"Premier mois Aqua : {first_aqua} (avant : calibration Terra seul)")
    qm_terra = fit_quantile_mapping(train.assign(modis=train["n_terra"]))

    old = g[g["month"] < SWITCH].copy()
    old = old[old["modis"] > 0]
    exceeds = (old["modis"] > train["modis"].max()).mean() * 100
    print(f"Cases-mois avant {SWITCH} dont le comptage MODIS dépasse le max d'entraînement : {exceeds:.2f} %")
    old["n_raw"] = old["modis"]
    terra_only = old["month"] < first_aqua
    old["n_harmonized"] = np.where(
        terra_only, qm_terra(old.assign(modis=old["n_terra"])), qm(old)
    ).round(3)
    old["source"] = "MODIS"

    new = g[g["month"] >= SWITCH].copy()
    new = new[new["n_snpp"] > 0]
    new["n_raw"] = new["n_snpp"]
    new["n_harmonized"] = new["n_snpp"].astype(float)
    new["source"] = "VIIRS"

    cols = ["month", "lat_cell", "lon_cell", "n_raw", "n_harmonized", "source"]
    return pd.concat([old[cols], new[cols]], ignore_index=True).sort_values(["month", "lat_cell", "lon_cell"])


def check_plot(h: pd.DataFrame, g: pd.DataFrame) -> pd.DataFrame:
    g = g.assign(year=g["month"].str[:4].astype(int))
    h = h.assign(year=h["month"].str[:4].astype(int))
    yearly = pd.DataFrame(
        {
            "MODIS brut": (g["n_aqua"] + g["n_terra"]).groupby(g.year).sum(),
            "VIIRS S-NPP brut": g["n_snpp"].groupby(g.year).sum().where(lambda s: s > 0),
            "Série harmonisée": h["n_harmonized"].groupby(h.year).sum(),
        }
    )
    fig, ax = plt.subplots(figsize=(10, 4.5))
    ax.plot(yearly.index, yearly["MODIS brut"], "o--", color="#d95f02", label="MODIS brut")
    ax.plot(yearly.index, yearly["VIIRS S-NPP brut"], "s--", color="#1b9e77", label="VIIRS S-NPP brut")
    ax.plot(yearly.index, yearly["Série harmonisée"], "-", lw=2.5, color="#222222", label="Série harmonisée (équiv. VIIRS)")
    ax.axvline(2012, color="grey", ls=":")
    ax.set_ylabel("hotspots / an (Togo)")
    ax.set_title("FIREPULSE — la série harmonisée corrige la rupture MODIS → VIIRS")
    ax.legend()
    ax.grid(alpha=0.3)
    FIG.parent.mkdir(exist_ok=True)
    fig.tight_layout()
    fig.savefig(FIG, dpi=150)
    return yearly


if __name__ == "__main__":
    h = build()
    h.to_csv(OUT, index=False)
    print(f"{len(h):,} lignes -> {OUT}")
    yearly = check_plot(h, pd.read_csv(SRC))
    print(yearly.round(0).to_string())
