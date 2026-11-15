"""Calculs du calendrier de brûlage pour la web app (app.py). Aucune dépendance à Streamlit.

Les anomalies (médiane, ratio, percentile) viennent de anomalies.py, pour que l'app affiche
exactement les mêmes chiffres que le pipeline. Ce module ajoute ce qui est propre au calendrier :
année de feu, niveaux calme / actif / critique, totaux annuels, tendance.

Written with AI assistance (Claude, Anthropic); reviewed and tested by the FIREPULSE team.
"""
from math import erf, sqrt
from pathlib import Path

import numpy as np
import pandas as pd

import anomalies as an

ROOT = Path(__file__).parent
RES = an.RES
BASE = an.BASE_YEARS
# Ordre de recherche : pipeline local, puis données prêtes à l'emploi du dépôt, puis échantillon factice
SERIES = [("processed", ROOT / "data" / "processed" / "harmonized_monthly.csv"),
          ("public", ROOT / "data_public" / "harmonized_monthly.csv"),
          ("sample", ROOT / "sample" / "harmonized_monthly_sample.csv")]
HOTSPOTS = [ROOT / "data" / "processed" / "hotspots_clean.csv", ROOT / "data_public" / "hotspots_clean.csv.gz"]


def load_series() -> tuple[pd.DataFrame, str]:
    """Série harmonisée par case et par mois. Renvoie (table, origine) ; origine = processed / public / sample."""
    origin, path = next((o, p) for o, p in SERIES if p.exists())
    df = pd.read_csv(path)
    df["year"] = df["month"].str[:4].astype(int)
    df["m"] = df["month"].str[5:7].astype(int)
    return df, origin


def hotspots_path() -> Path | None:
    return next((p for p in HOTSPOTS if p.exists()), None)


def in_bbox(df: pd.DataFrame, south: float, north: float, west: float, east: float) -> pd.DataFrame:
    """Cases dont le centre tombe dans le rectangle."""
    lat, lon = df["lat_cell"] + RES / 2, df["lon_cell"] + RES / 2
    return df[(lat >= south) & (lat <= north) & (lon >= west) & (lon <= east)]


def monthly(df: pd.DataFrame, box: tuple, last_partial: bool) -> pd.DataFrame:
    """Un mois par ligne pour la zone : valeur harmonisée, médiane 2001-2025, % de la médiane, rang, catégorie.

    box = (sud, nord, ouest, est). last_partial : le dernier mois de la série est incomplet.
    """
    a = an.anomalies(an.monthly_series(df, bbox=box))
    sub = in_bbox(df, *box)
    extra = sub.groupby("month").agg(raw=("n_raw", "sum"), source=("source", lambda s: s.mode().iat[0]))
    mo = a.rename(columns={"value": "n"}).merge(extra, left_on="month", right_index=True, how="left")
    mo["raw"] = mo["raw"].fillna(0)
    mo["source"] = mo["source"].fillna(pd.Series(np.where(mo["month"] < "2012-02", "MODIS", "VIIRS"), index=mo.index))
    mo["pct"] = 100 * mo["ratio"]
    mo["rank"] = mo["percentile"] / 100
    mo["partial"] = False
    if last_partial:
        mo.loc[mo.index[-1], "partial"] = True
    floor = max(3.0, 0.02 * mo["median"].max())  # sous ce seuil, de petits nombres ne font pas une anomalie
    small = (mo["n"] < floor) & (mo["median"] < floor)
    k = mo["rank"]
    cat = np.select([k >= 0.98, k >= 0.9, k >= 0.75, k <= 0.02, k <= 0.1, k <= 0.25], [3, 2, 1, -3, -2, -1], 0)
    mo["cat"] = np.where(small | mo["partial"] | k.isna(), 0, cat)
    return mo.reset_index(drop=True)


def climatology(mo: pd.DataFrame) -> pd.DataFrame:
    """Par mois de l'année, sur les années de référence : médiane, percentiles, part annuelle, niveau (0, 1, 2)."""
    q = mo[mo["year"].between(*BASE)].groupby("m")["n"]
    c = pd.DataFrame({"median": q.median(), "p25": q.quantile(0.25), "p75": q.quantile(0.75), "p90": q.quantile(0.90), "max": q.max(), "years": q.count()})
    c = c.reindex(range(1, 13)).fillna(0.0)
    peak, total = c["median"].max(), c["median"].sum()
    c["share"] = c["median"] / total if total > 0 else 0.0
    c["level"] = np.where(c["median"] >= 0.5 * peak, 2, np.where(c["median"] >= 0.1 * peak, 1, 0)) if peak > 0 else 0
    return c.reset_index()


def fire_year_start(clim: pd.DataFrame) -> int:
    """Premier mois de l'« année de feu » : celui qui suit les deux mois consécutifs les plus calmes."""
    med = clim.set_index("m")["median"]
    pair = {m: med[m] + med[m % 12 + 1] for m in range(1, 13)}
    quiet = min(pair, key=pair.get)
    return (quiet + 1) % 12 + 1 if med.max() > 0 else 1


def add_fire_year(mo: pd.DataFrame, start: int) -> pd.DataFrame:
    """Ajoute fy (année de début de saison), pos (0..11) et le libellé « 2015/16 »."""
    mo = mo.copy()
    mo["fy"] = np.where(mo["m"] >= start, mo["year"], mo["year"] - 1)
    mo["pos"] = (mo["m"] - start) % 12
    mo["label"] = mo["fy"].astype(str) if start == 1 else mo["fy"].astype(str) + "/" + ((mo["fy"] + 1) % 100).astype(str).str.zfill(2)
    return mo


def yearly(mo: pd.DataFrame) -> pd.DataFrame:
    """Total par année de feu. Complète = 12 mois entiers (pas de mois partiel, pas de janvier 2012 mixte exclu)."""
    full = mo[~mo["partial"]]
    y = full.groupby(["fy", "label"]).agg(n=("n", "sum"), raw=("raw", "sum"), months=("n", "size"), source=("source", lambda s: s.mode().iat[0])).reset_index()
    y["complete"] = (y["months"] == 12) & (y["fy"] >= BASE[0])
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
    p = 2 * (1 - 0.5 * (1 + erf(abs(z) / sqrt(2))))
    med = float(np.median(y))
    return {"slope": slope, "intercept": float(np.median(y - slope * x)), "pct": 100 * slope / med if med > 0 else np.nan, "p": float(p), "n": n}


def cell_frequency(sub: pd.DataFrame, month: int | None) -> pd.DataFrame:
    """Hotspots harmonisés par case et par an sur les années de référence (pour la carte)."""
    d = sub[sub["year"].between(*BASE)]
    d = d if not month else d[d["m"] == month]
    g = d.groupby(["lat_cell", "lon_cell"])["n_harmonized"].sum().reset_index()
    g["per_year"] = g["n_harmonized"] / (BASE[1] - BASE[0] + 1)
    return g
