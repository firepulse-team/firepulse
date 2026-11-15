"""Prepares the data of the website (docs/index.html, served by GitHub Pages).

Inputs (data/processed/ if the pipeline has run, otherwise data_public/):
  harmonized_monthly.csv   harmonized series per cell and per month (docs/FORMAT.md)
  hotspots_clean.csv(.gz)  cleaned individual hotspots
Outputs: docs/site/firepulse.json, and docs/site/validation.json if data/processed/monthly_grid.csv exists

The site needs the detail per DAY for the weekly calendar. Each harmonized monthly value of a cell is
therefore spread over its days, in proportion to the hotspots of the source sensor on that day:
    harm(cell, day) = n(cell, day) * n_harmonized(cell, month) / n_raw(cell, month)
This is the same rule as anomalies.month_to_date. The sum over a month gives back n_harmonized exactly,
so the site shows the same totals as the pipeline.
Source sensor: MODIS before 2012-02, VIIRS S-NPP afterwards, VIIRS NOAA-20 from 2026-11 (harmonize.py).

Written with AI assistance (Claude, Anthropic); reviewed and tested by the FIREPULSE team.
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
    raise SystemExit(f"Not found: {paths[0].name}. Run the pipeline or fetch data_public/.")


def build() -> dict:
    h = pd.read_csv(first_existing(ROOT / "data/processed/harmonized_monthly.csv", ROOT / "data_public/harmonized_monthly.csv"))
    hs = pd.read_csv(first_existing(ROOT / "data/processed/hotspots_clean.csv", ROOT / "data_public/hotspots_clean.csv.gz"),
                     usecols=["date", "lat", "lon", "sensor", "satellite"], parse_dates=["date"])
    last_day = hs["date"].max()
    hs["month"] = hs["date"].dt.to_period("M").astype(str)
    # source sensor of each month, as in harmonize.py
    src = np.where(hs["month"] < SWITCH, hs["sensor"] == "MODIS", np.where(hs["month"] < NOAA20_FROM, hs["satellite"] == "SNPP", hs["satellite"] == "NOAA20"))
    hs = hs[src].copy()
    # same grid as aggregate_grid.py
    hs["lat_cell"] = (np.floor(hs["lat"] / RES + 1e-9) * RES).round(4)
    hs["lon_cell"] = (np.floor(hs["lon"] / RES + 1e-9) * RES).round(4)
    d = hs.groupby(["date", "month", "lat_cell", "lon_cell"]).size().rename("n").reset_index()
    d = d.merge(h[["month", "lat_cell", "lon_cell", "n_raw", "n_harmonized"]], on=["month", "lat_cell", "lon_cell"], how="left")
    orphan = d["n_raw"].isna().sum()
    d = d.dropna(subset=["n_raw"])
    d["harm"] = d["n"] * d["n_harmonized"] / d["n_raw"]

    # check: the monthly totals of the site must equal those of the harmonized series
    gap = abs(d["harm"].sum() - h["n_harmonized"].sum()) / h["n_harmonized"].sum()
    print(f"{len(d):,} rows (day x cell), {orphan} unmatched; total gap with the series: {100 * gap:.3f}%")
    if gap > 0.001:
        raise SystemExit("The hotspots and the harmonized series do not match: run the full pipeline again.")

    d = d.sort_values(["date", "lat_cell", "lon_cell"])
    day = (d["date"] - pd.Timestamp("2000-01-01")).dt.days.to_numpy()
    return {
        "format": "firepulse-site-v1", "res": RES, "epoch": "2000-01-01",
        "first_day": int(day.min()), "last_day": int((last_day - pd.Timestamp("2000-01-01")).days),
        "switch": SWITCH, "noaa20_from": NOAA20_FROM, "aqua_from": "2002-09",
        "day_delta": np.diff(day, prepend=0).astype(int).tolist(),          # days since 2000-01-01, as differences
        "iy": np.round(d["lat_cell"] / RES).astype(int).tolist(),           # lat_cell = iy * res (south-west corner)
        "ix": np.round(d["lon_cell"] / RES).astype(int).tolist(),
        "raw": d["n"].astype(int).tolist(),
        "harm": d["harm"].round(2).tolist(),
    }


def build_validation() -> dict | None:
    """National validation series, for the chart of the Method page.

    2013-2025: out of sample, one year left out at a time (validate.loyo_predictions).
    Following months, as long as S-NPP observes: forward test, model trained on the whole calibration
    period (up to 2025-12) and applied to months it never saw (near-real-time data).
    Needs data/processed/monthly_grid.csv (aggregate_grid.py). Returns None if the file is missing.
    """
    src = ROOT / "data/processed/monthly_grid.csv"
    if not src.exists():
        return None
    from calibrate import fit_quantile_mapping, load
    from validate import loyo_predictions
    cols = ["modis", "viirs", "pred"]
    nat = loyo_predictions().groupby("month")[cols].sum().sort_index()
    train = load()
    g = pd.read_csv(src)
    g["modis"], g["viirs"] = g["n_aqua"] + g["n_terra"], g["n_snpp"]
    g["year"], g["m"] = g["month"].str[:4].astype(int), g["month"].str[5:7].astype(int)
    fwd = g[(g["month"] > train["month"].max()) & (g["month"] < NOAA20_FROM)].copy()
    forward_from = None
    if len(fwd):
        fwd["pred"] = fit_quantile_mapping(train)(fwd)
        f = fwd.groupby("month")[cols].sum().sort_index()
        forward_from = f.index[0]
        print(f"forward test {f.index[0]} -> {f.index[-1]}: real {f.viirs.sum():.0f}, estimated {f.pred.sum():.0f} ({100 * (f.pred.sum() / f.viirs.sum() - 1):+.1f}%)")
        nat = pd.concat([nat, f])
    loyo = nat[nat.index < (forward_from or "9999")]
    return {"format": "firepulse-validation-v1", "month": nat.index.tolist(), "viirs": nat["viirs"].round(0).astype(int).tolist(),
            "pred": nat["pred"].round(1).tolist(), "modis": nat["modis"].round(0).astype(int).tolist(),
            "r": round(float(loyo["pred"].corr(loyo["viirs"])), 3), "forward_from": forward_from}


if __name__ == "__main__":
    out = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(f"-> {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")
    val = build_validation()
    if val is None:
        print("monthly_grid.csv is missing: docs/site/validation.json is not regenerated (run aggregate_grid.py).")
    else:
        (OUT.parent / "validation.json").write_text(json.dumps(val, separators=(",", ":")), encoding="utf-8")
        print(f"-> validation.json ({len(val['month'])} months, r = {val['r']})")
