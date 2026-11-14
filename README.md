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

Pipeline : `python download_firms.py` → `python download_2026.py` (clé FIRMS dans `.env`) → `python clean_data.py` → `python aggregate_grid.py` → `python harmonize.py` → `python anomalies.py` (écrit dans `data/processed/`, non versionné).
**Pour développer la web app sans rien recalculer** : les résultats prêts à l'emploi sont dans `data_public/` (série harmonisée, anomalies du Togo, hotspots nettoyés en `.csv.gz` lisible directement par pandas). `pip install -r requirements.txt` suffit.
Le format de la série harmonisée est décrit dans `docs/FORMAT.md` ; un échantillon factice est dans `sample/`.

## Web app

```bash
git clone https://github.com/firepulse-team/firepulse.git
cd firepulse
python3 -m venv .venv && source .venv/bin/activate    # Windows : .venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py                                  # ouvre http://localhost:8501
```

Rien à télécharger ni à recalculer : l'app lit la série de `data_public/`. Si le pipeline a tourné, elle prend `data/processed/` à la place ; sans aucune série réelle, elle affiche l'échantillon factice de `sample/` avec un avertissement.

- **Zone d'intérêt** : toute l'étendue, une région (bandes de latitude approximatives), un rectangle réglé aux curseurs ou dessiné sur la carte.
- **Calendrier** : années × mois, en activité ou en anomalies.
- **Saison** : l'année choisie face à la médiane, P25–P75 et P90.
- **Tendance** : total annuel harmonisé contre comptage brut, pente de Theil–Sen et test de Mann–Kendall.
- **Périodes critiques** : mois dont la médiane dépasse 50 % du pic, et mois les plus inhabituels.
- **Export CSV** : série mensuelle de la zone, calendrier type, hotspots individuels.
- **Mois en cours** : comparé à la même fenêtre de jours des années passées (`anomalies.month_to_date`).

Les anomalies viennent de `anomalies.py` (médiane 2001-2025), donc l'app et le pipeline affichent les mêmes chiffres. `firecal.py` ajoute l'année de feu (octobre à septembre pour le Togo, pour ne pas couper la saison au 1er janvier), les niveaux calme / actif / critique et la tendance. Interface en français et en anglais.

## Site web (GitHub Pages)

Une page publique, sans installation, pour le jury : `docs/index.html`.

- Mêmes chiffres que le pipeline et que l'app Streamlit : le site lit `docs/data/firepulse.json`, fabriqué à partir de la série harmonisée.
- Calendrier **par semaine** (chaque total mensuel harmonisé est réparti sur ses jours au prorata des hotspots du capteur source, comme `anomalies.month_to_date`).
- Carte avec zone à dessiner, situation du mois en cours, saison face à l'historique, tendance harmonisée contre brut, preuve de la validation, méthode et limites, export CSV. Français et anglais, thème clair et sombre.

Mettre à jour les données du site après un nouveau passage du pipeline :

```bash
python build_site_data.py        # écrit docs/data/firepulse.json
```

Voir le site en local :

```bash
cd docs && python -m http.server 8000     # puis ouvrir http://localhost:8000
```

Publier : dans GitHub, **Settings → Pages → Build and deployment → Deploy from a branch**, branche `main`, dossier `/docs`. Le site sera à l'adresse https://firepulse-team.github.io/firepulse/ (dépôt public requis avec un compte gratuit).

Fichiers : `docs/index.html`, `docs/site/` (`core.js` calculs, `app.js` interface, `style.css`, `borders.js` frontières Natural Earth).

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

- [x] Script de téléchargement (archives + API 2026)
- [x] Nettoyage, grille mensuelle, calibration MODIS → VIIRS (quantile mapping), série harmonisée
- [x] Anomalies vs médiane (`anomalies.py`)
- [x] Validation pour le jury (`validate.py`, `docs/METHODE.md`)
- [x] Web app + calendrier (`app.py`, `firecal.py`)
- [x] Site web public (`docs/index.html`) — à publier avec GitHub Pages
- [ ] Pitch et soumission

## Équipe

À compléter.

## Mentions

Projet réalisé pour le NASA Space Apps Challenge 2026 avec les données NASA FIRMS. Les résultats sont ceux de l'équipe et n'engagent pas la NASA. Les licences des données externes (ex. limites administratives) seront indiquées ici.
