"""Downloads 2026 through the FIRMS API (the country archives stop at the end of 2025).

Key: variable FIRMS_MAP_KEY (.env file at the root, ignored by git).
Output: data/raw/<folder>/<folder>_2026_Togo.csv, in the same format as the archives,
so clean_data.py picks them up automatically.

- SP (reprocessed, reliable) then NRT (near real time) when SP stops.
- NRT has no `type` column: type = 0 is assumed.
- Bounding-box query: only the 0.1° cells that contain points in the Togo archives are kept
  (avoids neighbouring countries without an external boundary file).
"""
import io
import os
import time
import urllib.request
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).parent
RAW = ROOT / "data" / "raw"
BBOX = "-0.15,6.1,1.8,11.2"  # west, south, east, north
YEAR_START = date(2026, 1, 1)
TODAY = date.today()
RES = 0.1

# output folder -> list of (API source, first day, last day)
PLAN = {
    "modis": [("MODIS_SP", date(2026, 1, 1), date(2026, 8, 31)), ("MODIS_NRT", date(2026, 9, 1), TODAY)],
    "viirs-snpp": [("VIIRS_SNPP_SP", date(2026, 1, 1), date(2026, 7, 31)), ("VIIRS_SNPP_NRT", date(2026, 8, 1), TODAY)],
    "viirs-jpss1": [("VIIRS_NOAA20_SP", date(2026, 1, 1), date(2026, 7, 31)), ("VIIRS_NOAA20_NRT", date(2026, 8, 1), TODAY)],
    "viirs-noaa21": [("VIIRS_NOAA21_SP", date(2026, 1, 1), date(2026, 7, 31)), ("VIIRS_NOAA21_NRT", date(2026, 8, 1), TODAY)],
}


def get_key() -> str:
    key = os.environ.get("FIRMS_MAP_KEY")
    env = ROOT / ".env"
    if not key and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("FIRMS_MAP_KEY="):
                key = line.split("=", 1)[1].strip()
    if not key:
        raise SystemExit("FIRMS_MAP_KEY missing: put it in .env (FIRMS_MAP_KEY=...).")
    return key


def fetch(key: str, source: str, start: date) -> pd.DataFrame:
    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/{source}/{BBOX}/5/{start.isoformat()}"
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                text = r.read().decode("utf-8")
            if text.startswith("latitude"):
                return pd.read_csv(io.StringIO(text), dtype={"confidence": str})
            if "latitude" not in text and len(text.strip()) < 200 and "Invalid" in text:
                raise SystemExit(f"Unexpected API response for {source} {start}: {text.strip()}")
            return pd.DataFrame()
        except OSError:
            time.sleep(2 * (attempt + 1))
    raise SystemExit(f"Network failure for {source} {start}")


def togo_cells() -> set:
    """0.1° cells containing at least one point of the Togo archives (all sensors, 2000-2025)."""
    cells = set()
    for f in RAW.glob("*/*_Togo.csv"):
        if "_2026_" in f.name:
            continue
        d = pd.read_csv(f, usecols=["latitude", "longitude"])
        la = np.floor(d.latitude / RES + 1e-9).astype(int)
        lo = np.floor(d.longitude / RES + 1e-9).astype(int)
        cells |= set(zip(la, lo))
    return cells


def main():
    key = get_key()
    cells = togo_cells()
    print(f"{len(cells)} cells of 0.1° in the Togo footprint")
    for folder, segments in PLAN.items():
        parts = []
        for source, d0, d1 in segments:
            d = d0
            while d <= d1:
                df = fetch(key, source, d)
                if len(df):
                    df = df[(df["acq_date"] >= d0.isoformat()) & (df["acq_date"] <= d1.isoformat())]
                    parts.append(df)
                d += timedelta(days=5)
            print(f"  {source}: {d0} -> {d1} ok")
        if not parts:
            print(f"{folder}: no data")
            continue
        df = pd.concat(parts, ignore_index=True)
        if "type" not in df.columns:
            df["type"] = 0
        df["type"] = df["type"].fillna(0).astype(int)
        la = np.floor(df.latitude / RES + 1e-9).astype(int)
        lo = np.floor(df.longitude / RES + 1e-9).astype(int)
        df = df[[(a, b) in cells for a, b in zip(la, lo)]].drop_duplicates()
        out = RAW / folder / f"{folder}_2026_Togo.csv"
        out.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(out, index=False)
        print(f"{folder}: {len(df):,} rows, {df.acq_date.min()} -> {df.acq_date.max()} -> {out.name}")


if __name__ == "__main__":
    main()
