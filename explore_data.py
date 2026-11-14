"""Exploration des archives FIRMS (Togo) : volumes, confiance, type, saisonnalité, chevauchement."""
from pathlib import Path

import pandas as pd

RAW = Path(__file__).parent / "data" / "raw"


def load(sensor: str) -> pd.DataFrame:
    files = sorted((RAW / sensor).glob("*.csv"))
    df = pd.concat((pd.read_csv(f, dtype={"acq_time": str, "confidence": str}) for f in files), ignore_index=True)
    df["acq_date"] = pd.to_datetime(df["acq_date"])
    df["year"] = df["acq_date"].dt.year
    df["month"] = df["acq_date"].dt.month
    return df


data = {s: load(s) for s in ["modis", "viirs-snpp", "viirs-jpss1"]}

for s, df in data.items():
    print(f"\n===== {s} : {len(df):,} lignes, {df.acq_date.min().date()} -> {df.acq_date.max().date()}")
    print("satellites :", df["satellite"].value_counts().to_dict())
    print("type       :", df["type"].value_counts().to_dict())
    print("daynight   :", df["daynight"].value_counts().to_dict())
    print("confidence :", df["confidence"].value_counts().head(6).to_dict())
    print("lat", df.latitude.min(), df.latitude.max(), "| lon", df.longitude.min(), df.longitude.max())
    print("valeurs manquantes :", int(df.isna().sum().sum()))
    print("doublons exacts    :", int(df.duplicated().sum()))
    print("par année :", df.groupby("year").size().to_dict())

print("\n===== MODIS par satellite et année (Aqua vs Terra)")
print(data["modis"].groupby(["year", "satellite"]).size().unstack().to_string())

print("\n===== Saisonnalité (moyenne mensuelle 2018-2025)")
season = pd.DataFrame(
    {s: df[df.year.between(2018, 2025)].groupby("month").size() / 8 for s, df in data.items()}
).round(0)
print(season.to_string())

print("\n===== Ratio VIIRS S-NPP / MODIS par année (chevauchement)")
m = data["modis"].groupby("year").size()
v = data["viirs-snpp"].groupby("year").size()
print((v / m).dropna().round(1).to_string())

print("\n===== Ratio VIIRS S-NPP / MODIS Aqua par année")
aq = data["modis"][data["modis"].satellite == "Aqua"].groupby("year").size()
print((v / aq).dropna().round(1).to_string())
