<p align="center"><img src="docs/site/logo.png" alt="FIREPULSE" width="320"></p>

# FIREPULSE

**26 years of fires seen from space, in a single consistent record.**

Project of team FIREPULSE for the [NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/2026/) (Lomé, Togo), challenge [Harmonization of MODIS and VIIRS Hot Spots](https://www.spaceappschallenge.org/2026/challenges/modis-and-viirs-hot-spots/).

- **Public website:** https://firepulse-team.github.io/firepulse/
- **Demo (7 slides):** https://firepulse-team.github.io/firepulse/FIREPULSE_demo.pdf

## The problem

Active fires have been tracked by satellite since 2000, but by two sensor families that do not count the same way. MODIS (1 km, since 2000) is reaching the end of its life. VIIRS (375 m, since 2012) replaces it and detects four to five times more fires over Togo. Spliced together, the two records show a rise in 2012 that never happened. Keeping VIIRS alone loses twelve years of history.

## What FIREPULSE does

1. **Harmonization.** MODIS is calibrated on VIIRS by quantile mapping, on a monthly 0.1° grid. The series runs from 2000 to the current month, whatever the sensor of origin.
2. **Exploration.** The user chooses an area (drawn on the map or typed as coordinates) and sees the burning calendar, the anomalies against the 2001–2025 median and the status of the current month. The data can be downloaded as CSV.

| Result | Value |
|---|---|
| Monthly correlation with real VIIRS, out of sample | 0.995 |
| Mean yearly error, out of sample | 5.0% |
| Fire trend in Togo since 2001, once the sensors are joined | −2.6% per year |

The method, its validation and its limits are described on the [Method and data](https://firepulse-team.github.io/firepulse/methode.html) page of the site, and in French in [`docs/METHODE.md`](docs/METHODE.md).

## Quick start

Python 3.10 or later is required. The results are already in `data_public/`, so there is nothing to download or recompute.

```bash
git clone https://github.com/firepulse-team/firepulse.git
cd firepulse
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py                                 # opens http://localhost:8501
```

## Two interfaces

Both read the same harmonized series, so they show the same figures as the pipeline.

### Public website (GitHub Pages)

No installation, in English and French: https://firepulse-team.github.io/firepulse/

| Page | File | Content |
|---|---|---|
| Home | `docs/index.html` | Map of Togo, status of the current month, key figures, burning calendar |
| Explore | `docs/explorer.html` | Area of interest (all of Togo, a region, a typed or drawn rectangle), map per month, calendar in activity or anomalies, season against history, trend, CSV export |
| Method and data | `docs/methode.html` | Steps of the method, out-of-sample validation, methods compared, limits, files to download |

To view it locally: `cd docs && python -m http.server 8000`, then open http://localhost:8000.

### Streamlit application

`streamlit run app.py`, in English and French.

- **Area of interest**: the whole country, a region, or a rectangle set with sliders or drawn on the map.
- **Calendar**: years × months, in activity or anomalies.
- **Season**: the chosen year against the historical median and percentiles.
- **Trend**: harmonized yearly total against raw count (Theil–Sen slope, Mann–Kendall test).
- **Current month**: compared with the same days in past years.
- **CSV export**: monthly series of the area, typical calendar, individual hotspots.

The application reads `data/processed/` if the pipeline has run, otherwise `data_public/`, otherwise the dummy sample in `sample/` (with a warning).

## Data

Source: [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/). Country archives for 2000–2025, then the FIRMS API for 2026.

| Sensor | Period | Resolution |
|---|---|---|
| MODIS (Terra + Aqua) | since 2000 | 1 km |
| VIIRS S-NPP | 2012 → 2 November 2026 (deliveries stopped) | 375 m |
| VIIRS NOAA-20 | since 2018 | 375 m |

Ready-to-use files in `data_public/`:

| File | Content |
|---|---|
| `harmonized_monthly.csv` | Harmonized series per 0.1° cell and per month (format, in French: [`docs/FORMAT.md`](docs/FORMAT.md)) |
| `anomalies_togo_monthly.csv` | Median, ratio and percentile per month for Togo |
| `hotspots_clean.csv.gz` | 1.06 million filtered hotspots, readable directly with pandas |

## Reproducing the pipeline

Raw and intermediate data go to `data/`, which is not versioned (about 90 MB for Togo).

| Step | Command | Role |
|---|---|---|
| 1 | `python download_firms.py` | Downloads the 2000–2025 archives. Other countries: `--pays Togo Benin Ghana` |
| 2 | `python download_2026.py` | Downloads 2026 through the FIRMS API (key required, see below) |
| 3 | `python clean_data.py` | Filters by type and confidence, unifies the columns |
| 4 | `python aggregate_grid.py` | Counts hotspots per month and per 0.1° cell |
| 5 | `python harmonize.py` | Calibrates MODIS on VIIRS and writes the harmonized series |
| 6 | `python anomalies.py` | Computes the anomalies against the 2001–2025 median |
| 7 | `python validate.py` | Out-of-sample validation, figures and metrics in `docs/` |
| 8 | `python build_site_data.py` | Updates the site data (`docs/site/*.json`) |

**FIRMS key.** Step 2 needs a free MAP_KEY, created on the "Web Services" page of FIRMS. Put it in a `.env` file at the root, as `FIRMS_MAP_KEY=your_key`. This file is ignored by Git: never publish the key.

## Repository structure

```
├── app.py, firecal.py        Streamlit application and calendar computations
├── download_*.py             FIRMS data download
├── clean_data.py … validate.py   Harmonization pipeline
├── build_site_data.py        Data export for the website
├── data_public/              Ready-to-use results
├── docs/                     Public website, method, format, submission text, demo
└── sample/                   Dummy sample for tests
```

## Contributing

One branch per task, then merge into `main` through a pull request. Never run `git push --force`.

```bash
git checkout main && git pull
git checkout -b firstname/my-task
# ... work, then:
git add file1 file2
git commit -m "Clear message"
git push -u origin firstname/my-task
```

Then open a pull request on GitHub.

## Team

- HODOME K. Achille
- ZOLOME K. Silvère

## Use of AI

The Space Apps rules ask teams to state where AI was used. Claude (Anthropic) helped write and review the code (pipeline scripts, website in `docs/`, Streamlit application, `build_site_data.py`), the logo (generated as vector code) and the texts, including the English translation of the demo slides. The files concerned carry the mention in their header, and the site footer states it. The team ran the pipeline on real FIRMS data, checked the results and is responsible for them. The project idea and the choice of method are the team's own.

All charts and maps are drawn by our code from NASA FIRMS data: none is an AI-generated image. The submission text is in [`docs/SUBMISSION.md`](docs/SUBMISSION.md).

## License and credits

The code is under the MIT license (see [`LICENSE`](LICENSE)). The data remain subject to the terms of their sources.

This project was made for the NASA Space Apps Challenge 2026. The results are the team's own. NASA does not endorse this project.

- **Fire data**: NASA FIRMS (MODIS / VIIRS 375 m), open data.
- **Boundaries**: Natural Earth 1:50m (public domain), through world-atlas.
- **Basemap of the Streamlit application**: © OpenStreetMap contributors (ODbL).
- **Libraries**: Leaflet, Streamlit, folium, Plotly, pandas, NumPy, scikit-learn, Matplotlib.
- **Website fonts**: Space Grotesk, Inter, IBM Plex Mono (Google Fonts, SIL Open Font License).
