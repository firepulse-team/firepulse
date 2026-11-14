# FIREPULSE

NASA Space Apps Challenge 2026 (Lomé) — défi **Harmonization of MODIS and VIIRS Hot Spots**.

L'objectif : construire une série temporelle cohérente des feux actifs MODIS (2000+) et VIIRS (2012+), puis la rendre explorable dans une web app (calendrier années × mois, anomalies vs médiane historique, export CSV).

## Démarrage

```bash
git clone https://github.com/firepulse-team/firepulse.git
cd firepulse
python download_firms.py
```

Les données sont téléchargées dans `data/raw/<capteur>/` (non versionnées, ~90 Mo pour le Togo).

Autres pays :

```bash
python download_firms.py --pays Togo Benin Ghana Burkina_Faso
```

## Données

Source : [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) — archives CSV par pays et par année.

| Capteur | Années | Résolution |
|---|---|---|
| `modis` (Terra + Aqua) | 2000–2025 | 1 km |
| `viirs-snpp` | 2012–2025 | 375 m |
| `viirs-jpss1` (NOAA-20) | 2018–2025 | 375 m |

Points d'attention :
- `confidence` est numérique (0–100) pour MODIS mais en lettres (l/n/h) pour VIIRS : à normaliser.
- La colonne `type` permet d'exclure les sources statiques (torchères, industrie).
- Les archives s'arrêtent fin 2025. Pour 2026, il faudra l'API FIRMS avec une MAP_KEY gratuite, à stocker dans un fichier `.env` (ignoré par git, ne jamais la committer).

Data: NASA FIRMS (MODIS / VIIRS 375 m).

## Plan

1. **Harmonisation** : agrégation mensuelle sur grille 0,1°, calibration MODIS → VIIRS sur le chevauchement 2012–2025 (ratio, régression ou quantile mapping), validation.
2. **Web app** : Streamlit + folium + Plotly, données précalculées.

## Avancement

- [x] Script de téléchargement
- [ ] Script d'harmonisation
- [ ] Web app + calendrier
- [ ] Pitch et soumission

## Équipe

À compléter.

## Mentions

Projet réalisé pour le NASA Space Apps Challenge. La NASA ne cautionne pas ce projet. Les licences des données externes (ex. limites administratives) seront indiquées ici.
