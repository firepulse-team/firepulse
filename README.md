# FIREPULSE

NASA Space Apps Challenge 2026 (LomÃ©) â€” dÃ©fi **Harmonization of MODIS and VIIRS Hot Spots**.

L'objectif : construire une sÃ©rie temporelle cohÃ©rente des feux actifs MODIS (2000+) et VIIRS (2012+), puis la rendre explorable dans une web app (calendrier annÃ©es Ã— mois, anomalies vs mÃ©diane historique, export CSV).

## DÃ©marrage

```bash
git clone https://github.com/firepulse-team/firepulse.git
cd firepulse
python download_firms.py
```

Les donnÃ©es sont tÃ©lÃ©chargÃ©es dans `data/raw/<capteur>/` (non versionnÃ©es, ~90 Mo pour le Togo).

Autres pays :

```bash
python download_firms.py --pays Togo Benin Ghana Burkina_Faso
```

## DonnÃ©es

Source : [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) â€” archives CSV par pays et par annÃ©e.

| Capteur | AnnÃ©es | RÃ©solution |
|---|---|---|
| `modis` (Terra + Aqua) | 2000â€“2025 | 1 km |
| `viirs-snpp` | 2012â€“2025 | 375 m |
| `viirs-jpss1` (NOAA-20) | 2018â€“2025 | 375 m |

Points d'attention :
- `confidence` est numÃ©rique (0â€“100) pour MODIS mais en lettres (l/n/h) pour VIIRS : Ã  normaliser.
- La colonne `type` permet d'exclure les sources statiques (torchÃ¨res, industrie).
- Les archives s'arrÃªtent fin 2025. Pour 2026, il faudra l'API FIRMS avec une MAP_KEY gratuite, Ã  stocker dans un fichier `.env` (ignorÃ© par git, ne jamais la committer).

Data: NASA FIRMS (MODIS / VIIRS 375 m).

## Plan

1. **Harmonisation** : agrÃ©gation mensuelle sur grille 0,1Â°, calibration MODIS â†’ VIIRS sur le chevauchement 2012â€“2025 (ratio, rÃ©gression ou quantile mapping), validation.
2. **Web app** : Streamlit + folium + Plotly, donnÃ©es prÃ©calculÃ©es.

## Avancement

- [x] Script de tÃ©lÃ©chargement
- [ ] Script d'harmonisation
- [ ] Web app + calendrier
- [ ] Pitch et soumission

## Ã‰quipe

Ã€ complÃ©ter.

## Mentions

Projet rÃ©alisÃ© pour le NASA Space Apps Challenge. La NASA ne cautionne pas ce projet. Les licences des donnÃ©es externes (ex. limites administratives) seront indiquÃ©es ici.
