# MODIS → VIIRS harmonization method

## Problem
MODIS (Terra/Aqua, 1 km, since 2000) and VIIRS (S-NPP/NOAA-20, 375 m, since 2012) detect active fires with different sensitivities. Over Togo, VIIRS counts about **4 to 5 times more hotspots** than MODIS. Splicing the two records creates a false rise in 2012; keeping VIIRS alone loses 12 years of history.

## Data
NASA FIRMS: country archives for 2000-2025 (MODIS, VIIRS S-NPP, VIIRS NOAA-20) and the API for 2026 (SP then NRT). Source: *NASA FIRMS*.
Filters: `type == 0` (vegetation fires), MODIS confidence ≥ 30, VIIRS confidence `nominal` or `high`.
Result: 1.06 million hotspots (2000 → 14 November 2026).

## Method
1. **Aggregation** per month and per 0.1° cell (~11 km). Counting raw points makes no sense between two different resolutions: the monthly Aqua ↔ S-NPP correlation rises from 0.52 (0.05° cells) to 0.75 (0.1°) and 0.97 (all of Togo).
2. **Calibration by quantile mapping**: on the 2012-2025 overlap, the distribution of MODIS counts (Aqua + Terra) is aligned on that of S-NPP. Chosen among 4 methods (see table).
3. **Before September 2002**, Terra observes alone: specific Terra → VIIRS calibration.
4. **Sensor relay in 2026**: S-NPP stopped delivering on 2 November 2026. NOAA-20 takes over, corrected by its median ratio of 1.004 measured on 2018-2025 (monthly correlation 0.998).
5. **Final series**: calibrated value before 2012-02, real VIIRS count afterwards. Column `n_harmonized`.
6. **Anomaly**: ratio between a month and the median of the same calendar month over 2001-2025, with the percentile of the month among the reference years.

## Choice of the method (monthly error on active months)
| Method | One year left out at a time | Trained 2018-2025, tested 2012-2017 |
|---|---|---|
| A. global ratio | 35% | 36% |
| B. ratio per month | 18% | 24% |
| C. ratio per month + trend | 18% | 21% |
| **D. quantile mapping** | **17%** | **16%** |

## Validation (out of sample, 2013-2025)
Each year is estimated by a model trained without it. See `docs/validation_series.png` and `docs/validation_map.png`.
- National monthly correlation: **r = 0.995**.
- Mean monthly error (months ≥ 100 hotspots): **16.6%**.
- National yearly error: mean **5.0%**, maximum 8.8% (2024).
- Total 2013-2025: **−2.8%** against real VIIRS.
- Per 0.1° cell: rank correlation 0.90; median bias −5%, 80% of cells between −28% and +29%.

## Limits
- **Regional bias.** The error map shows a structure: overestimation in the centre-north-west (up to +100% on a few cells), underestimation towards the centre and the centre-south. The calibration is made for all of Togo; a calibration per region would be finer (not tested).
- **Monthly uncertainty of about 17%**: it comes mostly from sampling noise (two instruments that do not see exactly the same fires), not from a flaw in the method.
- **Extrapolation to 2000-2011**: the model never saw that period. The test "trained 2018-2025, tested 2012-2017" gives a 16% error, but 2000-2011 cannot be checked directly. If the behaviour of MODIS drifted before 2012, the calibration may be biased.
- **Forward test on 2026**: applied to January-October 2026, months the model never saw and in near-real-time data, the estimate is 16% below the real VIIRS total.
- Partial months: November-December 2000 (start of the archives), January 2012 (start of S-NPP) and the current month.
- NRT data (since August 2026 for VIIRS, September for MODIS) will be replaced by a reprocessed version; recent figures may change. NRT has no `type` column: 0 is assumed.
- Territory: filtered on the 0.1° cells that contain points of the Togo archives, not on a boundary polygon.

## Reproducing
`python download_firms.py` → `python download_2026.py` → `python clean_data.py` → `python aggregate_grid.py` → `python harmonize.py` → `python anomalies.py` → `python validate.py`
