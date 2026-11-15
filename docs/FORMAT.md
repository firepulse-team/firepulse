# Format of the harmonized series (contract between the data and the web app)

File: `data/processed/harmonized_monthly.csv` (one row per grid cell and per month).

| Column | Type | Description |
|---|---|---|
| `month` | `YYYY-MM` | Month of detection |
| `lat_cell` | float | Latitude of the south-west corner of the cell (0.1° grid) |
| `lon_cell` | float | Longitude of the south-west corner of the cell (0.1° grid) |
| `n_raw` | int | Number of raw hotspots (sensor of origin) |
| `n_harmonized` | float | Number of VIIRS-equivalent hotspots, comparable over the whole period |
| `source` | `MODIS` / `VIIRS` | Sensor the value comes from |

Rules:
- Cells without fire may be omitted: the app treats absence as 0.
- `n_harmonized` is the only column to use for calendars and anomalies.
- The CSV export of the app contains the individual hotspots (`data/processed/hotspots_clean.csv`: `date, lat, lon, sensor, satellite, frp, daynight`).

A dummy sample is in `sample/harmonized_monthly_sample.csv`, to develop the app without waiting for the real series.

## Anomalies against the median (`anomalies.py`)

The web app has nothing to recompute itself: it calls these functions for the chosen area.

```python
import pandas as pd
from anomalies import monthly_series, anomalies, month_to_date

h = pd.read_csv("data/processed/harmonized_monthly.csv")
series = monthly_series(h, bbox=(lat_min, lat_max, lon_min, lon_max))   # bbox=None -> all of Togo
table = anomalies(series)          # one month per row
```

Columns of `anomalies()`: `month, year, m, value, median, diff, ratio, percentile`
- `median`: median of the same calendar month over 2001-2025
- `ratio`: value / median (1 = normal, 2 = twice as active; empty if median = 0)
- `percentile`: rank of the month among the same months of the reference years (0 = quietest, 100 = most active)

`month_to_date(hotspots, h, bbox)` compares the current (partial) month with the same window of days in past years
(`hotspots` = `data/processed/hotspots_clean.csv`). It answers "is this month abnormal?".
Precomputed for all of Togo: `data/processed/anomalies_togo_monthly.csv`.

The data run up to the date of the last download (`python download_2026.py`). The last month is partial.
