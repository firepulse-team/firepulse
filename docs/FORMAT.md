# Format de la série harmonisée (contrat entre données et web app)

Fichier : `data/processed/harmonized_monthly.csv` (une ligne par case de grille et par mois).

| Colonne | Type | Description |
|---|---|---|
| `month` | `YYYY-MM` | Mois de la détection |
| `lat_cell` | float | Latitude du coin sud-ouest de la case (grille 0,1°) |
| `lon_cell` | float | Longitude du coin sud-ouest de la case (grille 0,1°) |
| `n_raw` | int | Nombre de hotspots bruts (capteur d'origine) |
| `n_harmonized` | float | Nombre de hotspots équivalent VIIRS, comparable sur toute la période |
| `source` | `MODIS` / `VIIRS` | Capteur d'origine de la valeur |

Règles :
- Les cases sans feu peuvent être omises : l'app considère l'absence comme 0.
- `n_harmonized` est la seule colonne à utiliser pour les calendriers et anomalies.
- L'export CSV de l'app contient les hotspots individuels (`data/processed/hotspots_clean.csv` : `date, lat, lon, sensor, satellite, frp, daynight`).

Un échantillon factice est dans `sample/harmonized_monthly_sample.csv` pour développer l'app sans attendre la vraie série.

## Anomalies vs médiane (`anomalies.py`)

La web app n'a rien à recalculer elle-même : elle appelle ces fonctions pour la zone choisie.

```python
import pandas as pd
from anomalies import monthly_series, anomalies, month_to_date

h = pd.read_csv("data/processed/harmonized_monthly.csv")
serie = monthly_series(h, bbox=(lat_min, lat_max, lon_min, lon_max))   # bbox=None -> tout le Togo
tableau = anomalies(serie)          # un mois par ligne
```

Colonnes de `anomalies()` : `month, year, m, value, median, diff, ratio, percentile`
- `median` : médiane du même mois calendaire sur 2001-2025
- `ratio` : valeur / médiane (1 = normal, 2 = deux fois plus actif ; vide si médiane = 0)
- `percentile` : rang du mois parmi les mêmes mois des années de référence (0 = le plus calme, 100 = le plus actif)

`month_to_date(hotspots, h, bbox)` compare le mois en cours (partiel) à la même fenêtre de jours chez les années passées
(`hotspots` = `data/processed/hotspots_clean.csv`). Sert pour « ce mois-ci est-il anormal ? ».
Précalculé pour tout le Togo : `data/processed/anomalies_togo_monthly.csv`.

Les données vont jusqu'à la date du dernier téléchargement (`python download_2026.py`). Le dernier mois est partiel.
