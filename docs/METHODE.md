# Méthode d'harmonisation MODIS → VIIRS

## Problème
MODIS (Terra/Aqua, 1 km, depuis 2000) et VIIRS (S-NPP/NOAA-20, 375 m, depuis 2012) détectent les feux actifs avec des sensibilités différentes. Sur le Togo, VIIRS compte environ **4 à 5 fois plus de hotspots** que MODIS. Coller les deux séries crée une fausse hausse en 2012 ; ne garder que VIIRS fait perdre 12 ans d'historique.

## Données
NASA FIRMS : archives par pays 2000-2025 (MODIS, VIIRS S-NPP, VIIRS NOAA-20) et API pour 2026 (SP puis NRT). Source : *NASA FIRMS*.
Filtres : `type == 0` (feux de végétation), confiance MODIS ≥ 30, confiance VIIRS `nominale` ou `haute`.
Résultat : 1,06 million de hotspots (2000 → 14 novembre 2026).

## Méthode
1. **Agrégation** par mois et par case de 0,1° (~11 km). Compter des points bruts n'a pas de sens entre deux résolutions différentes : la corrélation mensuelle Aqua ↔ S-NPP passe de 0,52 (cases de 0,05°) à 0,75 (0,1°) et 0,97 (Togo entier).
2. **Calibration par quantile mapping** : sur le chevauchement 2012-2025, on aligne la distribution des comptages MODIS (Aqua + Terra) sur celle de S-NPP. Choisi parmi 4 méthodes (voir tableau).
3. **Avant septembre 2002**, seul Terra observe : calibration spécifique Terra → VIIRS.
4. **Relais de capteur en 2026** : S-NPP a cessé de livrer le 2 novembre 2026. NOAA-20 prend le relais, corrigé de son ratio médian de 1,004 mesuré sur 2018-2025 (corrélation mensuelle 0,998).
5. **Série finale** : valeur calibrée avant 2012-02, comptage VIIRS réel ensuite. Colonne `n_harmonized`.
6. **Anomalie** : rapport entre un mois et la médiane du même mois calendaire sur 2001-2025, avec le percentile du mois parmi les années de référence.

## Choix de la méthode (erreur mensuelle sur les mois actifs)
| Méthode | Une année retirée à la fois | Entraîné 2018-2025, testé 2012-2017 |
|---|---|---|
| A. ratio global | 35 % | 36 % |
| B. ratio par mois | 18 % | 24 % |
| C. ratio par mois + tendance | 18 % | 21 % |
| **D. quantile mapping** | **17 %** | **16 %** |

## Validation (hors échantillon, 2013-2025)
Chaque année est estimée par un modèle entraîné sans elle. Voir `docs/validation_series.png` et `docs/validation_map.png`.
- Corrélation mensuelle nationale : **r = 0,995**.
- Erreur mensuelle moyenne (mois ≥ 100 hotspots) : **16,6 %**.
- Erreur annuelle nationale : moyenne **5,0 %**, maximum 8,8 % (2024).
- Total 2013-2025 : **−2,8 %** par rapport au VIIRS réel.
- Par case de 0,1° : corrélation de rang 0,90 ; biais médian −5 %, 80 % des cases entre −28 % et +29 %.

## Limites (à dire honnêtement)
- **Biais régional.** La carte d'erreur montre une structure : sur-estimation dans le centre-nord-ouest (jusqu'à +100 % sur quelques cases), sous-estimation vers le centre et le centre-sud. La calibration est faite pour tout le Togo ; une calibration par région serait plus fine (non testée).
- **Incertitude mensuelle d'environ 17 %** : elle vient surtout du bruit d'échantillonnage (deux instruments qui ne voient pas exactement les mêmes feux), pas d'un défaut de méthode.
- **Extrapolation vers 2000-2011** : le modèle n'a jamais vu cette période. Le test « entraîné 2018-2025, testé 2012-2017 » donne 16 % d'erreur, mais on ne peut pas vérifier 2000-2011 directement. Si le comportement de MODIS a dérivé avant 2012, la calibration peut être biaisée.
- Mois partiels : novembre-décembre 2000 (début des archives), janvier 2012 (début de S-NPP) et le mois en cours.
- Les données NRT (depuis août 2026 pour VIIRS, septembre pour MODIS) seront remplacées par une version retraitée ; les chiffres récents peuvent bouger. Le NRT n'a pas de colonne `type` : on suppose 0.
- Territoire : filtré sur les cases 0,1° contenant des points des archives du Togo, pas sur un polygone de frontières.

## Reproduire
`python download_firms.py` → `python download_2026.py` → `python clean_data.py` → `python aggregate_grid.py` → `python harmonize.py` → `python anomalies.py` → `python validate.py`
