"""
FIREPULSE - Telechargement des hotspots NASA FIRMS (Country Yearly Summary)
MODIS (2000->) + VIIRS S-NPP (2012->) + VIIRS NOAA-20 (2018->), donnees SP (Standard Processing)

Usage :
    python download_firms.py                       # Togo, toutes les annees
    python download_firms.py --pays Togo Benin Ghana Burkina_Faso
    python download_firms.py --debut 2010 --fin 2025

Data: NASA FIRMS (https://firms.modaps.eosdis.nasa.gov)
"""
import argparse
import time
from pathlib import Path

import requests

BASE = "https://firms.modaps.eosdis.nasa.gov/data/country"
CAPTEURS = {
    "modis": 2000,        # Terra (2000) + Aqua (2002), 1 km
    "viirs-snpp": 2012,   # Suomi NPP, 375 m
    "viirs-jpss1": 2018,  # NOAA-20, 375 m
}


def telecharger(url: str, dest: Path, essais: int = 3) -> str:
    if dest.exists() and dest.stat().st_size > 0:
        return "deja la"
    for i in range(essais):
        try:
            r = requests.get(url, timeout=120)
            if r.status_code == 404:
                return "absent (404)"
            r.raise_for_status()
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(r.content)
            return f"ok ({len(r.content) / 1e6:.1f} Mo)"
        except requests.RequestException as e:
            if i == essais - 1:
                return f"ERREUR : {e}"
            time.sleep(3 * (i + 1))
    return "ERREUR"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--pays", nargs="+", default=["Togo"],
                   help="Noms comme sur FIRMS (espaces -> _), ex : Burkina_Faso")
    p.add_argument("--debut", type=int, default=2000)
    p.add_argument("--fin", type=int, default=2025)
    p.add_argument("--dossier", default="data/raw")
    a = p.parse_args()

    for pays in a.pays:
        for capteur, annee_min in CAPTEURS.items():
            for annee in range(max(a.debut, annee_min), a.fin + 1):
                nom = f"{capteur}_{annee}_{pays}.csv"
                url = f"{BASE}/{capteur}/{annee}/{nom}"
                dest = Path(a.dossier) / capteur / nom
                print(f"{nom:45s} {telecharger(url, dest)}")


if __name__ == "__main__":
    main()
