# Space Apps project page — text ready to paste

Fields follow the official Project Submission Guide (13 November 2026). Everything on the project page must be in English.
Deadline: **Sunday 15 November, 11:59 p.m. Lomé time**, button "Submit for Judging". Save often; you can resubmit until the deadline.

Copy the text under each heading into the form field of the same name.

---

## Project Name

FIREPULSE

## High-Level Project Summary

Satellites have recorded fires over Togo since 2000, but the record is split in two: MODIS (1 km) from 2000, then VIIRS (375 m) from 2012, which detects four to five times more hotspots. Read end to end, the data says fires tripled in 2012. They did not. FIREPULSE harmonizes both records into one VIIRS-equivalent series and turns it into a burning activity calendar in a public web application. For any area of interest, early warning services, scientists and land managers can see when the fire season starts and peaks, which months are critical, how the current month compares with its history, and which years were unusual. It matters because nobody can call a season "abnormal" without a baseline they trust. On Togo, the harmonized record shows the opposite of the naive reading: fire activity has declined by about 2.6% per year since 2001.

## Link to Project Demo

https://firepulse-team.github.io/firepulse/FIREPULSE_demo.pdf

## Link to Final Project

https://firepulse-team.github.io/firepulse/

Source code and data: https://github.com/firepulse-team/firepulse

## Detailed Project Description

**What it does**

FIREPULSE is a three-page web application, in English and French, that needs no installation.

- *Home*: a map of fire frequency over Togo, the status of the current month against its history, and the burning calendar for 2000–2026.
- *Explore*: the user picks the whole country, a region, or draws a rectangle. The page then shows, for that area: the map for any month, the burning calendar in activity or anomaly view, the current status (hotspots, percent of the median, percentile), one season against the historical median and percentiles, the long-term trend, and a CSV export.
- *Method and data*: the method in four steps, the out-of-sample validation, the four methods we compared, the limits, and the open data files.

**How it works**

1. *Data.* NASA FIRMS country archives for Togo, 2000–2025 (MODIS Collection 6.1 on Terra and Aqua, VIIRS 375 m on S-NPP and NOAA-20), then the FIRMS Area API for 2026.
2. *Cleaning.* Vegetation fires only (`type = 0`), MODIS confidence ≥ 30, VIIRS nominal or high confidence. 1.06 million hotspots remain.
3. *Common grid.* Monthly counts per 0.1° cell (about 11 km) and per satellite. Raw points cannot be compared between two resolutions: the monthly Aqua–S-NPP correlation rises from 0.52 on 0.05° cells to 0.75 on 0.1° cells.
4. *Calibration.* We compared four ways to convert MODIS counts into VIIRS-equivalent counts over the 2012–2025 overlap: a global ratio, a ratio per calendar month, a ratio per month with a time trend, and quantile mapping. A separate calibration covers the period before September 2002, when Terra observed alone.
5. *Sensor relay.* S-NPP stopped delivering data in early November 2026. NOAA-20 takes over, corrected by its median ratio to S-NPP (1.004 over 2018–2025, monthly correlation 0.998).
6. *Anomalies.* Each month is compared with the median of the same calendar month over 2001–2025, with its percentile. The current, partial month is compared with the same window of days in past years.

**Validation**

| Method | Leave one year out | Trained 2018–2025, tested 2012–2017 |
|---|---|---|
| Global ratio | 35% | 36% |
| Ratio per month | 18% | 24% |
| Ratio per month + trend | 18% | 21% |
| **Quantile mapping (chosen)** | **17%** | **16%** |

Monthly error on active months. With quantile mapping, out of sample over 2013–2025: national monthly correlation r = 0.995, mean yearly error 5.0% (maximum 8.8%), total within −2.8% of the real VIIRS count. We also ran a forward test on January–October 2026, months the model never saw, in near-real-time data: the estimate is 16% below the real VIIRS count. We show this on the site because it marks the limit of a fixed calibration as MODIS ages.

**What we found for Togo**

- The fire season runs from November to March. December and January are the critical months, with about 70% of yearly activity.
- Harmonized activity fell from about 52,000 hotspots per year (2001–2011) to about 37,900 (2013–2025): −2.6% per year (Mann–Kendall p < 0.001).
- The decline appears in MODIS alone and in VIIRS alone, so it is not produced by the correction.
- From 1 to 14 November 2026: 285 hotspots, 49% of the median for the same days, 24th percentile.

**Benefits**

- One comparable record from 2000 to today, instead of two that contradict each other.
- A direct answer to "is this month normal here?", for any area the user draws.
- Uncertainty and limits are shown, not hidden.
- A static site with no server and no map-tile provider: it stays usable on a weak connection.

**What we hope to achieve**

Give fire services and researchers in Togo and West Africa a baseline they can trust, then extend it: other countries, land-cover-specific calibration, fire radiative power, and automatic daily updates with alerts when a week ranks above the 90th percentile.

**Limits**

About 17% monthly uncertainty remains. The calibration is national, so some cells are over- or underestimated. 2000–2011 cannot be checked directly, since VIIRS did not exist. The VIIRS/MODIS ratio rose from 4.65 (2012) to 5.30 (2025), a sign that MODIS sensitivity drifts with age. Recent months come from near-real-time data and may change after reprocessing. The regions offered are approximate latitude bands, not administrative boundaries.

**Tools**

Python (pandas, NumPy, scikit-learn, Matplotlib) for the pipeline; JavaScript, HTML and CSS with Leaflet for the website, hosted on GitHub Pages; Streamlit, Plotly and folium for a local exploration app; Git and GitHub for teamwork.

## Use of Super Intelligence (SI)

Yes. We used Claude (Anthropic), a large language model, as a coding and writing assistant:

- Code: the website (`docs/`), the Streamlit app (`app.py`, `firecal.py`) and the site data script (`build_site_data.py`) were written with Claude and reviewed and tested by the team. The pipeline scripts (download, cleaning, gridding, calibration, validation) were also written with Claude's help; the team ran them on real FIRMS data and checked the outputs.
- Images: the FIREPULSE logo was generated with Claude as vector code. All charts and maps are drawn by our code from NASA FIRMS data; none is an AI-generated image.
- Text: Claude helped draft and translate the texts of the site and of this page. The team checked every figure against the pipeline outputs. The English version of the demo slides was translated with Claude.

AI-assisted files carry an acknowledgement in their header, and the site footer and the repository README state it. No AI-generated content uses NASA logos or branding. The team chose the challenge and the use case. Claude suggested technical options; the team compared them on real data and decided on the method.

## NASA Data

- NASA FIRMS (Fire Information for Resource Management System) active fire data, https://firms.modaps.eosdis.nasa.gov/
  - MODIS Collection 6.1 active fire detections, Terra and Aqua (standard product MCD14ML, near-real-time MCD14DL)
  - VIIRS 375 m active fire detections, Suomi NPP (VNP14IMGT) and NOAA-20 (VJ114IMGT)
  - Country yearly archives for Togo (2000–2025) and the FIRMS Area API (2026)

## Space Agency Partner Data and Other References

No Space Agency Partner data was used.

Data and maps
- Natural Earth, country boundaries (public domain), via the `world-atlas` package.

Software
- Python: pandas, NumPy, scikit-learn, Matplotlib, Requests, Streamlit, Plotly, folium, streamlit-folium.
- JavaScript: Leaflet 1.9.4 (BSD 2-Clause).
- Fonts: Space Grotesk, Inter, IBM Plex Mono (SIL Open Font License), via Google Fonts.
- Hosting: GitHub Pages.
- AI assistant: Claude (Anthropic).

Scientific references
- Giglio, L., Schroeder, W., Justice, C. O. (2016). The collection 6 MODIS active fire detection algorithm and fire products. *Remote Sensing of Environment*, 178, 31–41. https://doi.org/10.1016/j.rse.2016.02.054
- Schroeder, W., Oliva, P., Giglio, L., Csiszar, I. A. (2014). The New VIIRS 375 m active fire detection data product: Algorithm description and initial assessment. *Remote Sensing of Environment*, 143, 85–96. https://doi.org/10.1016/j.rse.2013.12.008

---

## Checklist before "Submit for Judging"

- [ ] All fields filled, in English.
- [ ] Demo: at most 7 slides (title and intro included) or at most 30 seconds. It names the team, its members and the challenge. Exceeding the limit removes eligibility for Global Judging.
- [ ] Demo and project links open in a private browser window, without login.
- [ ] No image, video or audio of anyone under 18.
- [ ] All team members are confirmed at the same Local Event.
- [ ] Optional but recommended for a new website: request a FortiGuard Web Filter Classification for `firepulse-team.github.io` (category "Education" or "Reference", company name "N/A").
- [ ] Boxes "Terms and Conditions" and "Confirm All Work is Original" ticked, then "Submit for Judging" before 11:59 p.m.
