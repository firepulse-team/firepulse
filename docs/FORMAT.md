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
