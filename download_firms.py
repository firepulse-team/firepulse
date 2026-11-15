"""
FIREPULSE - Download of NASA FIRMS hotspots (Country Yearly Summary)
MODIS (2000->) + VIIRS S-NPP (2012->) + VIIRS NOAA-20 (2018->), SP data (Standard Processing)

Usage:
    python download_firms.py                       # Togo, all years
    python download_firms.py --countries Togo Benin Ghana Burkina_Faso
    python download_firms.py --start 2010 --end 2025

Data: NASA FIRMS (https://firms.modaps.eosdis.nasa.gov)
"""
import argparse
import time
from pathlib import Path

import requests

BASE = "https://firms.modaps.eosdis.nasa.gov/data/country"
SENSORS = {
    "modis": 2000,        # Terra (2000) + Aqua (2002), 1 km
    "viirs-snpp": 2012,   # Suomi NPP, 375 m
    "viirs-jpss1": 2018,  # NOAA-20, 375 m
}


def download(url: str, dest: Path, tries: int = 3) -> str:
    if dest.exists() and dest.stat().st_size > 0:
        return "already there"
    for i in range(tries):
        try:
            r = requests.get(url, timeout=120)
            if r.status_code == 404:
                return "missing (404)"
            r.raise_for_status()
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(r.content)
            return f"ok ({len(r.content) / 1e6:.1f} MB)"
        except requests.RequestException as e:
            if i == tries - 1:
                return f"ERROR: {e}"
            time.sleep(3 * (i + 1))
    return "ERROR"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--countries", nargs="+", default=["Togo"],
                   help="Names as on FIRMS (spaces -> _), e.g. Burkina_Faso")
    p.add_argument("--start", type=int, default=2000)
    p.add_argument("--end", type=int, default=2025)
    p.add_argument("--folder", default="data/raw")
    a = p.parse_args()

    for country in a.countries:
        for sensor, first_year in SENSORS.items():
            for year in range(max(a.start, first_year), a.end + 1):
                name = f"{sensor}_{year}_{country}.csv"
                url = f"{BASE}/{sensor}/{year}/{name}"
                dest = Path(a.folder) / sensor / name
                print(f"{name:45s} {download(url, dest)}")


if __name__ == "__main__":
    main()
