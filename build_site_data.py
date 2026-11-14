"""Prépare les données du site web (docs/index.html, servi par GitHub Pages).

Entrées (data/processed/ si le pipeline a tourné, sinon data_public/) :
  harmonized_monthly.csv   série harmonisée par case et par mois (docs/FORMAT.md)
  hotspots_clean.csv(.gz)  hotspots individuels nettoyés
Sortie : docs/site/firepulse.json

Le site a besoin du détail par JOUR pour le calendrier hebdomadaire. On répartit donc chaque valeur
mensuelle harmonisée d'une case sur ses jours, au prorata des hotspots du capteur source ce jour-là :
    harm(case, jour) = n(case, jour) * n_harmonized(case, mois) / n_raw(case, mois)
C'est la même règle que anomalies.month_to_date. La somme sur un mois redonne exactement n_harmonized :
le site affiche donc les mêmes totaux que le pipeline.
Capteur source : MODIS avant 2012-02, VIIRS S-NPP ensuite, VIIRS NOAA-20 à partir de 2026-11 (harmonize.py).
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

from harmonize import NOAA20_FROM, SWITCH

ROOT = Path(__file__).parent
RES = 0.1
OUT = ROOT / "docs" / "site" / "firepulse.json"


def first_existing(*paths: Path) -> Path:
    for p in paths:
        if p.exists():
            return p
    raise SystemExit(f"Introuvable : {paths[0].name}. Lancer le pipeline ou récupérer data_public/.")


def build() -> dict:
    h = pd.read_csv(first_existing(ROOT / "data/processed/harmonized_monthly.csv", ROOT / "data_public/harmonized_monthly.csv"))
    hs = pd.read_csv(first_existing(ROOT / "data/processed/hotspots_clean.csv", ROOT / "data_public/hotspots_clean.csv.gz"),
                     usecols=["date", "lat", "lon", "sensor", "satellite"], parse_dates=["date"])
    last_day = hs["date"].max()
    hs["month"] = hs["date"].dt.to_period("M").astype(str)
    # capteur source de chaque mois, comme dans harmonize.py
    src = np.where(hs["month"] < SWITCH, hs["sensor"] == "MODIS", np.where(hs["month"] < NOAA20_FROM, hs["satellite"] == "SNPP", hs["satellite"] == "NOAA20"))
    hs = hs[src].copy()
    # même grille que aggregate_grid.py
    hs["lat_cell"] = (np.floor(hs["lat"] / RES + 1e-9) * RES).round(4)
    hs["lon_cell"] = (np.floor(hs["lon"] / RES + 1e-9) * RES).round(4)
    d = hs.groupby(["date", "month", "lat_cell", "lon_cell"]).size().rename("n").reset_index()
    d = d.merge(h[["month", "lat_cell", "lon_cell", "n_raw", "n_harmonized"]], on=["month", "lat_cell", "lon_cell"], how="left")
    orphan = d["n_raw"].isna().sum()
    d = d.dropna(subset=["n_raw"])
    d["harm"] = d["n"] * d["n_harmonized"] / d["n_raw"]

    # contrôle : les totaux mensuels du site doivent égaler ceux de la série harmonisée
    ecart = abs(d["harm"].sum() - h["n_harmonized"].sum()) / h["n_harmonized"].sum()
    print(f"{len(d):,} lignes (jour x case), {orphan} sans correspondance ; écart total avec la série : {100 * ecart:.3f} %")
    if ecart > 0.001:
        raise SystemExit("Les hotspots et la série harmonisée ne correspondent pas : relancer le pipeline complet.")

    d = d.sort_values(["date", "lat_cell", "lon_cell"])
    day = (d["date"] - pd.Timestamp("2000-01-01")).dt.days.to_numpy()
    return {
        "format": "firepulse-site-v1", "res": RES, "epoch": "2000-01-01",
        "first_day": int(day.min()), "last_day": int((last_day - pd.Timestamp("2000-01-01")).days),
        "switch": SWITCH, "noaa20_from": NOAA20_FROM, "aqua_from": "2002-09",
        "day_delta": np.diff(day, prepend=0).astype(int).tolist(),          # jours depuis 2000-01-01, en différences
        "iy": np.round(d["lat_cell"] / RES).astype(int).tolist(),           # lat_cell = iy * res (coin sud-ouest)
        "ix": np.round(d["lon_cell"] / RES).astype(int).tolist(),
        "raw": d["n"].astype(int).tolist(),
        "harm": d["harm"].round(2).tolist(),
    }


if __name__ == "__main__":
    out = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(f"-> {OUT} ({OUT.stat().st_size / 1e6:.1f} Mo)")
