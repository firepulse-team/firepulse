# Texte pour la page Space Apps (en anglais)

Chiffres tirés de `docs/METHODE.md`, `docs/validation_metrics.txt` et de la web app (Togo, données `data_public/`).
À relire par l'équipe avant de coller sur la page du projet. Les passages `[À COMPLÉTER]` restent à remplir.

## High-level summary

Satellites have recorded fires over Togo since 2000, but the record is split in two: MODIS (1 km) until 2012, then VIIRS (375 m), which detects four to five times more hotspots. Read naively, the data says fires tripled in 2012. They did not. FIREPULSE harmonizes both records into one VIIRS-equivalent series and turns it into a burning activity calendar. For any area of interest, early warning services, scientists and land managers can see when the season starts and peaks, which months are critical, and which years or months were unusual. On Togo, the harmonized record shows the opposite of the naive reading: fire activity has declined by about 2.6% per year since 2001.

## Project demo

[À COMPLÉTER : lien vers la vidéo de 30 secondes ou les 7 diapositives]

## Final project

https://github.com/firepulse-team/firepulse

## Detailed description

**How it works**

1. *Data.* NASA FIRMS country archives for Togo, 2000–2025 (MODIS Collection 6.1 on Terra and Aqua, VIIRS 375 m on S-NPP and NOAA-20), then the FIRMS API for 2026. After filtering: 1.06 million hotspots.
2. *Cleaning.* Vegetation fires only (`type = 0`), MODIS confidence ≥ 30, VIIRS nominal or high confidence.
3. *Common grid.* Monthly counts per 0.1° cell (about 11 km) and per satellite. Raw points cannot be compared between two resolutions: the monthly Aqua–S-NPP correlation rises from 0.52 on 0.05° cells to 0.75 on 0.1° cells.
4. *Calibration.* Four methods compared on the 2012–2025 overlap: global ratio, ratio per calendar month, ratio per month with a time trend, and quantile mapping. A separate calibration covers the period before September 2002, when Terra observed alone.
5. *Sensor relay.* S-NPP stopped delivering data on 2 November 2026. NOAA-20 takes over, corrected by its median ratio to S-NPP (1.004 over 2018–2025, monthly correlation 0.998).
6. *Anomalies.* Each month is compared with the median of the same calendar month over 2001–2025, with its percentile. The current, partial month is compared with the same window of days in past years.

**Validation**

| Method | Leave one year out | Trained 2018–2025, tested 2012–2017 |
|---|---|---|
| Global ratio | 35% | 36% |
| Ratio per month | 18% | 24% |
| Ratio per month + trend | 18% | 21% |
| **Quantile mapping** | **17%** | **16%** |

Monthly error on active months. With quantile mapping, out of sample over 2013–2025: national monthly correlation r = 0.995, mean yearly error 5.0% (maximum 8.8%), total within −2.8% of the real VIIRS count.

**The web app** (Streamlit, Plotly, folium; French and English)

- Area of interest: whole country, a region, or a rectangle drawn on the map.
- Burning calendar: fire years × months, in activity or anomaly view. The fire year runs from October to September so the season is not cut on 1 January.
- Season view: the chosen year against the median, P25–P75 and P90.
- Trend: harmonized yearly totals against raw counts, with Theil–Sen slope and Mann–Kendall test.
- Critical periods and the most unusual months on record.
- Current month against the same window of days in past years.
- CSV export of the series, the calendar and the individual hotspots.

**What we found for Togo**

- The season runs from November to March. December and January are the critical months: about 70% of yearly activity.
- Harmonized activity fell from about 52,000 hotspots per year (2001–2011) to about 37,900 (2013–2025). Trend: −2.6% per year (Mann–Kendall p < 0.001).
- The decline appears in MODIS alone and in VIIRS alone, so it is not produced by the correction.
- Spliced without harmonization, the same data would show a threefold increase in 2012.

**Limits**

- About 17% monthly uncertainty remains, mostly sampling noise between two instruments.
- Regional bias: the calibration is national; some cells in the centre-north-west are overestimated.
- 2000–2011 cannot be checked directly: no VIIRS existed. The backcast test is the closest proxy.
- The VIIRS/MODIS ratio rose from 4.65 (2012) to 5.30 (2025), a sign that MODIS sensitivity drifts with age.
- Recent months come from near-real-time data and may change after reprocessing.

## NASA data

NASA FIRMS active fire data: MODIS Collection 6.1 (Terra, Aqua) and VIIRS 375 m (S-NPP, NOAA-20), country archives 2000–2025 and Area API for 2026. https://firms.modaps.eosdis.nasa.gov/

## Use of artificial intelligence

[À COMPLÉTER honnêtement par l'équipe. Exemple :] We used Claude (Anthropic) to help write and review code and to draft this text. The team ran the pipeline on real FIRMS data, checked the results and is responsible for them. No AI-generated data or image is presented as NASA data.

## References

- Giglio, L., Schroeder, W., Justice, C. O. (2016). The collection 6 MODIS active fire detection algorithm and fire products. *Remote Sensing of Environment*, 178, 31–41.
- Schroeder, W., Oliva, P., Giglio, L., Csiszar, I. (2014). The New VIIRS 375 m active fire detection data product. *Remote Sensing of Environment*, 143, 85–96.
