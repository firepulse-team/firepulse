"""Étape 2 : charge MODIS + VIIRS, filtre, uniformise, écrit data/processed/hotspots_clean.csv.

Colonnes de sortie : date, lat, lon, sensor, satellite, frp, daynight
- type == 0 uniquement (feux de végétation, sans sources statiques ni offshore)
- confiance : MODIS >= 30 ; VIIRS 'n' ou 'h' (on écarte 'l')
"""
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed" / "hotspots_clean.csv"

MODIS_MIN_CONF = 30
VIIRS_OK_CONF = {"n", "h"}


def load_sensor(folder: str) -> pd.DataFrame:
    files = sorted((RAW / folder).glob("*.csv"))
    if not files:
        raise SystemExit(f"Aucun fichier dans {RAW / folder} : lancer download_firms.py d'abord.")
    return pd.concat((pd.read_csv(f, dtype={"confidence": str}) for f in files), ignore_index=True)


def clean() -> pd.DataFrame:
    parts = []
    for folder in ["modis", "viirs-snpp", "viirs-jpss1"]:
        df = load_sensor(folder)
        df = df[df["type"] == 0]
        if folder == "modis":
            df = df[pd.to_numeric(df["confidence"]) >= MODIS_MIN_CONF]
            sensor = "MODIS"
        else:
            df = df[df["confidence"].isin(VIIRS_OK_CONF)]
            sensor = "VIIRS"
        parts.append(
            pd.DataFrame(
                {
                    "date": pd.to_datetime(df["acq_date"]),
                    "lat": df["latitude"],
                    "lon": df["longitude"],
                    "sensor": sensor,
                    "satellite": df["satellite"].replace({"N": "SNPP", "N20": "NOAA20"}),
                    "frp": df["frp"],
                    "daynight": df["daynight"],
                }
            )
        )
    out = pd.concat(parts, ignore_index=True).sort_values("date").reset_index(drop=True)
    return out


if __name__ == "__main__":
    df = clean()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT, index=False)
    print(f"{len(df):,} lignes -> {OUT}")
    print(df.groupby(["sensor", "satellite"]).size())
