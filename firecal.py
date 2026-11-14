"""Calculs du calendrier de brûlage à partir de la série harmonisée (docs/FORMAT.md).

Fonctions pures (pandas / numpy), utilisées par app.py. Aucune dépendance à Streamlit.
"""
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).parent
REAL = ROOT / "data" / "processed" / "harmonized_monthly.csv"
SAMPLE = ROOT / "sample" / "harmonized_monthly_sample.csv"
HOTSPOTS = ROOT / "data" / "processed" / "hotspots_clean.csv"
RES = 0.1


def load_series() -> tuple[pd.DataFrame, bool]:
    """Série harmonisée par case et par mois. Renvoie (table, est_un_echantillon)."""
    is_sample = not REAL.exists()
    df = pd.read_csv(SAMPLE if is_sample else REAL)
    df["year"] = df["month"].str[:4].astype(int)
    df["m"] = df["month"].str[5:7].astype(int)
    return df, is_sample


def in_bbox(df: pd.DataFrame, south: float, north: float, west: float, east: float) -> pd.DataFrame:
    """Cases dont le centre tombe dans le rectangle."""
    lat, lon = df["lat_cell"] + RES / 2, df["lon_cell"] + RES / 2
    return df[(lat >= south) & (lat <= north) & (lon >= west) & (lon <= east)]


def monthly(df: pd.DataFrame, first: str, last: str) -> pd.DataFrame:
    """Total par mois sur la zone, mois sans feu inclus (0). first/last au format YYYY-MM."""
    idx = pd.period_range(first, last, freq="M")
    g = df.groupby("month").agg(n=("n_harmonized", "sum"), raw=("n_raw", "sum"))
    g.index = pd.PeriodIndex(g.index, freq="M")
    g = g.reindex(idx, fill_value=0.0)
    src = df.groupby("month")["source"].agg(lambda s: s.mode().iat[0])
    src.index = pd.PeriodIndex(src.index, freq="M")
    out = pd.DataFrame({"year": idx.year, "m": idx.month, "n": g["n"].to_numpy(), "raw": g["raw"].to_numpy()})
    out["source"] = src.reindex(idx).to_numpy()
    out["source"] = out["source"].fillna(pd.Series(np.where(idx.year * 100 + idx.month < 201202, "MODIS", "VIIRS")))
    return out


def fire_year_start(mo: pd.DataFrame) -> int:
    """Premier mois de l'« année de feu » : celui qui suit le mois le plus calme (médiane la plus basse)."""
    med = mo.groupby("m")["n"].median().reindex(range(1, 13), fill_value=0)
    pair = {m: med[m] + med[m % 12 + 1] for m in range(1, 13)}  # deux mois consécutifs les plus calmes
    quiet = min(pair, key=pair.get)
    return (quiet % 12) + 1 if pair[quiet] < med.max() else 1


def add_fire_year(mo: pd.DataFrame, start: int) -> pd.DataFrame:
    """Ajoute fy (année de début de saison), pos (0..11) et le libellé « 2015/16 »."""
    mo = mo.copy()
    mo["fy"] = np.where(mo["m"] >= start, mo["year"], mo["year"] - 1)
    mo["pos"] = (mo["m"] - start) % 12
    mo["label"] = mo["fy"].astype(str) if start == 1 else mo["fy"].astype(str) + "/" + ((mo["fy"] + 1) % 100).astype(str).str.zfill(2)
    return mo


def climatology(mo: pd.DataFrame) -> pd.DataFrame:
    """Par mois de l'année : médiane, percentiles, part de l'activité annuelle, niveau."""
    q = mo.groupby("m")["n"]
    c = pd.DataFrame({"median": q.median(), "p25": q.quantile(0.25), "p75": q.quantile(0.75), "p90": q.quantile(0.90), "max": q.max(), "years": q.count()})
    c = c.reindex(range(1, 13)).fillna(0.0)
    peak, total = c["median"].max(), c["median"].sum()
    c["share"] = c["median"] / total if total > 0 else 0.0
    c["level"] = np.where(c["median"] >= 0.5 * peak, 2, np.where(c["median"] >= 0.1 * peak, 1, 0)) if peak > 0 else 0
    return c.reset_index()


def anomalies(mo: pd.DataFrame, clim: pd.DataFrame) -> pd.DataFrame:
    """Chaque mois comparé au même mois des autres années : % de la médiane, rang, catégorie (-3..3)."""
    mo = mo.copy()
    med = clim.set_index("m")["median"]
    floor = max(3.0, 0.02 * med.max())  # sous ce seuil, de petits nombres ne font pas une anomalie
    rank, cat = [], []
    for _, r in mo.iterrows():
        others = mo.loc[(mo["m"] == r["m"]) & ((mo["year"] != r["year"])), "n"].to_numpy()
        if len(others) < 5:
            rank.append(np.nan); cat.append(0); continue
        k = ((others < r["n"]).sum() + 0.5 * (others == r["n"]).sum()) / len(others)
        small = r["n"] < floor and np.median(others) < floor
        rank.append(k)
        cat.append(0 if small else 3 if k >= 0.98 else 2 if k >= 0.9 else 1 if k >= 0.75 else -3 if k <= 0.02 else -2 if k <= 0.1 else -1 if k <= 0.25 else 0)
    mo["median"] = mo["m"].map(med)
    mo["pct"] = np.where(mo["median"] > 0, 100 * mo["n"] / mo["median"], np.nan)
    mo["rank"], mo["cat"] = rank, cat
    return mo


def yearly(mo: pd.DataFrame) -> pd.DataFrame:
    """Total par année de feu ; seules les années de 12 mois sont marquées complètes."""
    y = mo.groupby(["fy", "label"]).agg(n=("n", "sum"), raw=("raw", "sum"), months=("n", "size"), source=("source", lambda s: s.mode().iat[0])).reset_index()
    y["complete"] = y["months"] == 12
    return y


def trend(x, y) -> dict | None:
    """Pente de Theil–Sen (en % de la médiane par an) et test de Mann–Kendall."""
    x, y = np.asarray(x, float), np.asarray(y, float)
    n = len(x)
    if n < 6:
        return None
    i, j = np.triu_indices(n, 1)
    slope = float(np.median((y[j] - y[i]) / (x[j] - x[i])))
    s = np.sign(y[j] - y[i]).sum()
    z = 0.0 if s == 0 else (s - np.sign(s)) / np.sqrt(n * (n - 1) * (2 * n + 5) / 18)
    from math import erf, sqrt
    p = 2 * (1 - 0.5 * (1 + erf(abs(z) / sqrt(2))))
    med = float(np.median(y))
    return {"slope": slope, "intercept": float(np.median(y - slope * x)), "pct": 100 * slope / med if med > 0 else np.nan, "p": float(p), "n": n}


def cell_frequency(df: pd.DataFrame, month: int | None, n_years: float) -> pd.DataFrame:
    """Hotspots harmonisés par case et par an (pour la carte), sur un mois de l'année ou sur l'année entière."""
    d = df if not month else df[df["m"] == month]
    g = d.groupby(["lat_cell", "lon_cell"])["n_harmonized"].sum().reset_index()
    g["per_year"] = g["n_harmonized"] / max(n_years, 1)
    return g
