"""Anomalies vs médiane historique, sur la série harmonisée. Fonctions réutilisables par la web app.

  monthly_series(h, bbox)        -> série mensuelle (somme de n_harmonized) pour une zone
  anomalies(series)              -> tableau mois par mois : valeur, médiane, ratio, écart, percentile
  month_to_date(hotspots, h, .)  -> comparaison du mois EN COURS (partiel) à la même fenêtre de jours

Médiane de référence = même mois calendaire sur 2001-2025 (années complètes).
bbox = (lat_min, lat_max, lon_min, lon_max) ou None pour tout le Togo.

CLI : python anomalies.py  -> data/processed/anomalies_togo_monthly.csv + résumé du mois en cours.
"""
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).parent
PROC = ROOT / "data" / "processed"
BASE_YEARS = (2001, 2025)
RES = 0.1


def _in_bbox(df, lat, lon, bbox):
    if bbox is None:
        return np.ones(len(df), dtype=bool)
    la0, la1, lo0, lo1 = bbox
    return ((df[lat] >= la0) & (df[lat] <= la1) & (df[lon] >= lo0) & (df[lon] <= lo1)).to_numpy()


def monthly_series(h: pd.DataFrame, bbox=None) -> pd.Series:
    """Somme de n_harmonized par mois (0 pour les mois sans feu), index = 'YYYY-MM'."""
    # une case est dans la zone si son centre l'est
    d = h.assign(clat=h.lat_cell + RES / 2, clon=h.lon_cell + RES / 2)
    d = d[_in_bbox(d, "clat", "clon", bbox)]
    s = d.groupby("month")["n_harmonized"].sum()
    full = pd.period_range(h["month"].min(), h["month"].max(), freq="M").astype(str)
    return s.reindex(full, fill_value=0.0).rename("value")


def _percentile(history: np.ndarray, v: float) -> float:
    """Rang percentile (0-100) de v parmi history, ex aequo comptés pour moitié."""
    if len(history) == 0:
        return np.nan
    return 100.0 * ((history < v).sum() + 0.5 * (history == v).sum()) / len(history)


def anomalies(series: pd.Series, base_years=BASE_YEARS) -> pd.DataFrame:
    df = series.rename("value").reset_index().rename(columns={"index": "month"})
    df["year"] = df["month"].str[:4].astype(int)
    df["m"] = df["month"].str[5:7].astype(int)
    base = df[df.year.between(*base_years)]
    med = base.groupby("m")["value"].median()
    df["median"] = df["m"].map(med)
    df["diff"] = df["value"] - df["median"]
    df["ratio"] = np.where(df["median"] > 0, df["value"] / df["median"], np.nan)
    hist = {m: g["value"].to_numpy() for m, g in base.groupby("m")}
    df["percentile"] = [_percentile(hist[m], v) for m, v in zip(df["m"], df["value"])]
    return df[["month", "year", "m", "value", "median", "diff", "ratio", "percentile"]].round(3)


def month_to_date(hotspots: pd.DataFrame, h: pd.DataFrame, bbox=None, base_years=BASE_YEARS) -> dict:
    """Compare le mois en cours (partiel) à la MÊME fenêtre de jours chez les années passées.

    Équivalent VIIRS : S-NPP dès 2012 ; avant, comptage MODIS de la fenêtre x facteur
    (n_harmonized / n_raw du mois complet, même zone). Année en cours : NOAA-20 / 1,004.
    """
    hs = hotspots[_in_bbox(hotspots, "lat", "lon", bbox)].copy()
    hs["date"] = pd.to_datetime(hs["date"])
    last = hs["date"].max()
    y_now, m, d_end = last.year, last.month, last.day

    d = h.assign(clat=h.lat_cell + RES / 2, clon=h.lon_cell + RES / 2)
    d = d[_in_bbox(d, "clat", "clon", bbox)]
    monthly = d.groupby("month")[["n_raw", "n_harmonized"]].sum()

    def window(year, mask):
        lo, hi = pd.Timestamp(year, m, 1), pd.Timestamp(year, m, d_end)
        return int(((hs.date >= lo) & (hs.date <= hi) & mask).sum())

    values = {}
    for y in range(base_years[0], base_years[1] + 1):
        if y >= 2012:
            values[y] = float(window(y, hs.satellite == "SNPP"))
        else:
            key = f"{y}-{m:02d}"
            raw, harm = (monthly.loc[key, "n_raw"], monthly.loc[key, "n_harmonized"]) if key in monthly.index else (0, 0)
            f = harm / raw if raw > 0 else 0.0
            values[y] = window(y, hs.sensor == "MODIS") * f
    current = window(y_now, hs.satellite == "NOAA20") / 1.004
    hist = np.array(list(values.values()))
    med = float(np.median(hist))
    return {
        "periode": f"{y_now}-{m:02d}-01 -> {last.date()}",
        "valeur": round(current, 1),
        "mediane": round(med, 1),
        "ratio": round(current / med, 2) if med > 0 else None,
        "percentile": round(_percentile(hist, current), 1),
        "annees_reference": f"{base_years[0]}-{base_years[1]}",
    }


if __name__ == "__main__":
    h = pd.read_csv(PROC / "harmonized_monthly.csv")
    a = anomalies(monthly_series(h))
    a.to_csv(PROC / "anomalies_togo_monthly.csv", index=False)
    print(f"{len(a)} mois -> anomalies_togo_monthly.csv")
    print("\nDerniers mois complets (Togo) :")
    print(a[a.month.between("2025-09", "2026-10")].to_string(index=False))
    hs = pd.read_csv(PROC / "hotspots_clean.csv", usecols=["date", "lat", "lon", "sensor", "satellite"])
    print("\nMois en cours vs même fenêtre de jours :")
    for k, v in month_to_date(hs, h).items():
        print(f"  {k}: {v}")
