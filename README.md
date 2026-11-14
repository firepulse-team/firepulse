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

## Travailler en équipe (Git)

Une branche par personne ou par tâche, puis fusion dans `main` via pull request. Ne jamais faire `git push --force`.

```bash
git clone https://github.com/firepulse-team/firepulse.git   # une seule fois
git checkout main && git pull                                 # récupérer le travail des autres
git checkout -b prenom/ma-tache                               # ex. achille/webapp
# ... travailler, puis :
git add fichier1 fichier2
git commit -m "Message clair"
git push -u origin prenom/ma-tache                            # première fois ; ensuite : git push
```

Puis ouvrir une pull request sur GitHub (bouton « Compare & pull request ») et la fusionner dans `main`.
Avant de recommencer une tâche : `git checkout main && git pull`.

Pipeline : `python download_firms.py` → `python clean_data.py` (écrit `data/processed/`, non versionné).
Le format de la série harmonisée est décrit dans `docs/FORMAT.md` ; un échantillon factice est dans `sample/`.

## Web app

```bash
pip install -r requirements.txt
streamlit run app.py
```

L'app lit `data/processed/harmonized_monthly.csv` (format : `docs/FORMAT.md`). Si ce fichier est absent, elle affiche l'échantillon factice de `sample/` avec un avertissement.

- **Zone d'intérêt** : toute l'étendue, une région (bandes de latitude approximatives), un rectangle réglé aux curseurs ou dessiné sur la carte.
- **Calendrier** : années × mois, en activité ou en anomalies (chaque mois comparé au même mois des autres années).
- **Saison** : l'année choisie face à la médiane, P25–P75 et P90.
- **Tendance** : total annuel harmonisé contre comptage brut, pente de Theil–Sen et test de Mann–Kendall.
- **Périodes critiques** : mois dont la médiane dépasse 50 % du pic, et liste des mois les plus inhabituels.
- **Export CSV** : série mensuelle de la zone, calendrier type, hotspots individuels.
- Option « année de feu » : l'année commence après les mois les plus calmes, pour ne pas couper la saison novembre–mars au 1er janvier. Interface en français et en anglais.

Les calculs sont dans `firecal.py` (sans Streamlit, donc testables à part).

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
- [x] Web app + calendrier (`app.py`) — à vérifier sur la vraie série
- [ ] Pitch et soumission

## Équipe

À compléter.

## Mentions

Projet réalisé pour le NASA Space Apps Challenge. La NASA ne cautionne pas ce projet. Les licences des données externes (ex. limites administratives) seront indiquées ici.
