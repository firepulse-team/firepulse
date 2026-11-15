<p align="center"><img src="docs/site/logo.png" alt="FIREPULSE" width="320"></p>

# FIREPULSE

**26 ans de feux vus de l'espace, en une seule série cohérente.**

Projet de l'équipe FIREPULSE pour le [NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/2026/) (Lomé, Togo), défi [Harmonization of MODIS and VIIRS Hot Spots](https://www.spaceappschallenge.org/2026/challenges/modis-and-viirs-hot-spots/).

**Site public : https://firepulse-team.github.io/firepulse/**

## Le problème

Les feux actifs sont suivis par satellite depuis 2000, mais par deux familles de capteurs qui ne comptent pas de la même façon. MODIS (1 km, depuis 2000) arrive en fin de vie. VIIRS (375 m, depuis 2012) le remplace et détecte quatre à cinq fois plus de feux sur le Togo. Mises bout à bout, les deux séries inventent une hausse en 2012. En ne gardant que VIIRS, on perd douze ans d'historique.

## Ce que fait FIREPULSE

1. **Harmonisation.** MODIS est recalé sur VIIRS par quantile mapping, sur une grille de 0,1° par mois. La série va de 2000 au mois en cours, quel que soit le capteur d'origine.
2. **Exploration.** L'utilisateur choisit une zone (dessin sur la carte ou coordonnées) et voit le calendrier de brûlage, les anomalies par rapport à la médiane 2001–2025 et la situation du mois en cours. Il peut télécharger les données en CSV.

| Résultat | Valeur |
|---|---|
| Corrélation mensuelle avec le VIIRS réel, hors échantillon | 0,995 |
| Erreur annuelle moyenne, hors échantillon | 5,0 % |
| Tendance des feux au Togo depuis 2001, une fois les capteurs raccordés | − 2,6 % par an |

La méthode, sa validation et ses limites sont décrites dans [`docs/METHODE.md`](docs/METHODE.md).

## Démarrage rapide

Il faut Python 3.10 ou plus récent. Les résultats sont déjà dans `data_public/`, donc il n'y a rien à télécharger ni à recalculer.

```bash
git clone https://github.com/firepulse-team/firepulse.git
cd firepulse
python -m venv .venv && source .venv/bin/activate    # Windows : .venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py                                 # ouvre http://localhost:8501
```

## Deux interfaces

Les deux lisent la même série harmonisée et affichent donc les mêmes chiffres que le pipeline.

### Site public (GitHub Pages)

Sans installation, en français et en anglais : https://firepulse-team.github.io/firepulse/

| Page | Fichier | Contenu |
|---|---|---|
| Accueil | `docs/index.html` | Carte du Togo, situation du mois en cours, chiffres clés, calendrier de brûlage |
| Explorer | `docs/explorer.html` | Zone d'intérêt (tout le Togo, région, rectangle saisi ou dessiné), carte par mois, calendrier en activité ou en anomalies, saison face à l'historique, tendance, export CSV |
| Méthode et données | `docs/methode.html` | Étapes de la méthode, validation hors échantillon, méthodes comparées, limites, fichiers à télécharger |

Pour le voir en local : `cd docs && python -m http.server 8000`, puis ouvrir http://localhost:8000.

### Application Streamlit

`streamlit run app.py`, en français et en anglais.

- **Zone d'intérêt** : tout le pays, une région, un rectangle réglé aux curseurs ou dessiné sur la carte.
- **Calendrier** : années × mois, en activité ou en anomalies.
- **Saison** : l'année choisie face à la médiane et aux percentiles historiques.
- **Tendance** : total annuel harmonisé contre comptage brut (pente de Theil–Sen, test de Mann–Kendall).
- **Mois en cours** : comparé aux mêmes jours des années passées.
- **Export CSV** : série mensuelle de la zone, calendrier type, hotspots individuels.

L'application lit `data/processed/` si le pipeline a tourné, sinon `data_public/`, sinon l'échantillon factice de `sample/` (avec un avertissement).

## Usage de l'IA

Le règlement Space Apps demande d'indiquer où l'IA a servi. Le site (`docs/`), l'app Streamlit (`app.py`, `firecal.py`), `build_site_data.py` et le logo ont été réalisés avec l'aide de Claude (Anthropic), puis relus et testés par l'équipe. Ces fichiers portent la mention en en-tête, et le pied de page du site le dit. Les graphiques et les cartes sont tracés par notre code à partir des données NASA FIRMS : aucun n'est une image générée par IA. Le texte de soumission est dans `docs/SUBMISSION.md`.

## Données

Source : [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/). Archives par pays pour 2000–2025, puis API FIRMS pour 2026.

| Capteur | Période | Résolution |
|---|---|---|
| MODIS (Terra + Aqua) | depuis 2000 | 1 km |
| VIIRS S-NPP | 2012 → 2 novembre 2026 (arrêt des livraisons) | 375 m |
| VIIRS NOAA-20 | depuis 2018 | 375 m |

Fichiers prêts à l'emploi dans `data_public/` :

| Fichier | Contenu |
|---|---|
| `harmonized_monthly.csv` | Série harmonisée par case de 0,1° et par mois (format : [`docs/FORMAT.md`](docs/FORMAT.md)) |
| `anomalies_togo_monthly.csv` | Médiane, ratio et percentile par mois pour le Togo |
| `hotspots_clean.csv.gz` | 1,06 million de hotspots filtrés, lisible directement par pandas |

## Reproduire le pipeline

Les données brutes et intermédiaires vont dans `data/`, qui n'est pas versionné (environ 90 Mo pour le Togo).

| Étape | Commande | Rôle |
|---|---|---|
| 1 | `python download_firms.py` | Télécharge les archives 2000–2025. Autres pays : `--pays Togo Benin Ghana` |
| 2 | `python download_2026.py` | Télécharge 2026 par l'API FIRMS (clé requise, voir ci-dessous) |
| 3 | `python clean_data.py` | Filtre par type et par confiance, unifie les colonnes |
| 4 | `python aggregate_grid.py` | Compte les hotspots par mois et par case de 0,1° |
| 5 | `python harmonize.py` | Calibre MODIS sur VIIRS et écrit la série harmonisée |
| 6 | `python anomalies.py` | Calcule les anomalies par rapport à la médiane 2001–2025 |
| 7 | `python validate.py` | Validation hors échantillon, figures et métriques dans `docs/` |
| 8 | `python build_site_data.py` | Met à jour les données du site (`docs/site/*.json`) |

**Clé FIRMS.** L'étape 2 demande une MAP_KEY gratuite, à créer sur la page « Web Services » de FIRMS. Placez-la dans un fichier `.env` à la racine, sous la forme `FIRMS_MAP_KEY=votre_clé`. Ce fichier est ignoré par Git : ne publiez jamais la clé.

## Structure du dépôt

```
├── app.py, firecal.py        Application Streamlit et calculs du calendrier
├── download_*.py             Téléchargement des données FIRMS
├── clean_data.py … validate.py   Pipeline d'harmonisation
├── build_site_data.py        Export des données pour le site
├── data_public/              Résultats prêts à l'emploi
├── docs/                     Site public, méthode, format, texte de soumission
└── sample/                   Échantillon factice pour les tests
```

## Contribuer

Une branche par tâche, puis fusion dans `main` par pull request. Ne jamais faire `git push --force`.

```bash
git checkout main && git pull
git checkout -b prenom/ma-tache
# ... travailler, puis :
git add fichier1 fichier2
git commit -m "Message clair"
git push -u origin prenom/ma-tache
```

Ouvrez ensuite une pull request sur GitHub.

## Équipe

- HODOME K. Achille
- ZOLOME K. Silvère

## Licence et mentions

Le code est sous licence MIT (voir [`LICENSE`](LICENSE)). Les données restent soumises aux conditions de leurs sources.

Ce projet a été réalisé pour le NASA Space Apps Challenge 2026. Les résultats sont ceux de l'équipe et n'engagent pas la NASA, qui ne cautionne pas ce projet.

- **Données de feux** : NASA FIRMS (MODIS / VIIRS 375 m), données ouvertes.
- **Frontières** : Natural Earth 1:50m (domaine public), via world-atlas.
- **Fond de carte de l'application Streamlit** : © les contributeurs d'OpenStreetMap (licence ODbL).
- **Bibliothèques** : Leaflet, Streamlit, folium, Plotly, pandas, NumPy, scikit-learn, Matplotlib.
- **Polices du site** : Space Grotesk, Inter, IBM Plex Mono (Google Fonts, licence OFL).
- **Intelligence artificielle** : Claude (Anthropic) a aidé à écrire et relire le code et les textes. L'équipe a exécuté le pipeline sur les données réelles, vérifié les résultats et en est responsable.
