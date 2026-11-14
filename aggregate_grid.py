"""Étape 3 : agrège les hotspots nettoyés par mois et par case de grille (0,1° par défaut).

Entrée  : data/processed/hotspots_clean.csv
Sortie  : data/processed/monthly_grid.csv
Colonnes: month, lat_cell, lon_cell, n_aqua, n_terra, n_snpp, n_noaa20
(lat_cell/lon_cell = coin sud-ouest de la case)
"""
import argparse
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).parent
SRC = ROOT / "data" / "processed" / "hotspots_clean.csv"
OUT = ROOT / "data" / "processed" / "monthly_grid.csv"

COLS = {"Aqua": "n_aqua", "Terra": "n_terra", "SNPP": "n_snpp", "NOAA20": "n_noaa20"}


def aggregate(df: pd.DataFrame, res: float = 0.1) -> pd.DataFrame:
    df = df.copy()
    df["month"] = pd.to_datetime(df["date"]).dt.to_period("M").astype(str)
    # np.floor sur lat/res, arrondi pour éviter 6.199999 -> 6.1
    df["lat_cell"] = (np.floor(df["lat"] / res + 1e-9) * res).round(4)
    df["lon_cell"] = (np.floor(df["lon"] / res + 1e-9) * res).round(4)
    grid = df.groupby(["month", "lat_cell", "lon_cell", "satellite"]).size().unstack(fill_value=0)
    grid = grid.rename(columns=COLS).reindex(columns=list(COLS.values()), fill_value=0)
    return grid.reset_index()


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--res", type=float, default=0.1, help="taille de case en degrés")
    args = p.parse_args()
    if not SRC.exists():
        raise SystemExit("Lancer clean_data.py d'abord.")
    grid = aggregate(pd.read_csv(SRC, usecols=["date", "lat", "lon", "satellite"]), args.res)
    grid.to_csv(OUT, index=False)
    print(f"{len(grid):,} lignes (mois x case) -> {OUT}")
    print(grid[list(COLS.values())].sum().to_string())
