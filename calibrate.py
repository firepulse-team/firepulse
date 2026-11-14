"""Étape 4 : calibration MODIS -> équivalent VIIRS (S-NPP), comparaison de 4 méthodes.

Entrée : data/processed/monthly_grid.csv (voir aggregate_grid.py)
MODIS = Aqua + Terra (seule combinaison disponible depuis 2000). Cible = S-NPP.
Période de chevauchement utilisée : 2012-02 -> 2025-12.

Méthodes :
  A  ratio global                      : n_viirs = r * n_modis
  B  ratio par mois calendaire         : r dépend du mois (saison des feux)
  C  ratio par mois + tendance annuelle: log r = mois + b * année (régression de Poisson)
  D  quantile mapping (cases-mois)     : on aligne les distributions de comptages

Deux validations :
  LOYO     : on retire une année, on l'estime avec les autres (13 années, 2013-2025)
  BACKCAST : entraînement 2018-2025, test 2012-2017 (imite l'extrapolation vers 2000-2011)
"""
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import PoissonRegressor

ROOT = Path(__file__).parent
SRC = ROOT / "data" / "processed" / "monthly_grid.csv"


def load() -> pd.DataFrame:
    g = pd.read_csv(SRC)
    g["modis"] = g["n_aqua"] + g["n_terra"]
    g["viirs"] = g["n_snpp"]
    g["year"] = g["month"].str[:4].astype(int)
    g["m"] = g["month"].str[5:7].astype(int)
    return g[(g["month"] >= "2012-02") & (g["month"] <= "2025-12")].reset_index(drop=True)


def national(g: pd.DataFrame) -> pd.DataFrame:
    return g.groupby(["year", "m"])[["modis", "viirs"]].sum().reset_index()


# ---------- méthodes : chacune renvoie une fonction predict(df_cellules) -> prédiction par ligne ----------
def fit_ratio_global(train):
    n = national(train)
    r = n.viirs.sum() / n.modis.sum()
    return lambda d: r * d["modis"].to_numpy()


def fit_ratio_month(train):
    n = national(train).groupby("m")[["modis", "viirs"]].sum()
    r = (n.viirs / n.modis).to_dict()
    return lambda d: d["m"].map(r).to_numpy() * d["modis"].to_numpy()


def _design(m, year):
    X = np.zeros((len(m), 13))
    X[np.arange(len(m)), np.asarray(m) - 1] = 1.0
    X[:, 12] = (np.asarray(year) - 2019) / 10.0
    return X


def fit_ratio_trend(train):
    n = national(train)
    n = n[n.modis > 0]
    model = PoissonRegressor(alpha=1e-9, fit_intercept=False, max_iter=1000)
    model.fit(_design(n.m, n.year), n.viirs / n.modis, sample_weight=n.modis)
    return lambda d: model.predict(_design(d["m"], d["year"])) * d["modis"].to_numpy()


def fit_quantile_mapping(train):
    mod = np.sort(train["modis"].to_numpy())
    vi = np.sort(train["viirs"].to_numpy())

    def predict(d):
        x = d["modis"].to_numpy()
        q = (np.searchsorted(mod, x, "left") + np.searchsorted(mod, x, "right")) / (2 * len(mod))
        return np.quantile(vi, np.clip(q, 0, 1))

    return predict


METHODS = {
    "A ratio global": fit_ratio_global,
    "B ratio par mois": fit_ratio_month,
    "C mois + tendance": fit_ratio_trend,
    "D quantile mapping": fit_quantile_mapping,
}


def score(test: pd.DataFrame, pred: np.ndarray) -> dict:
    t = test.assign(pred=pred)
    nat = t.groupby(["year", "m"])[["viirs", "pred"]].sum()
    nat = nat[nat.viirs >= 100]  # mois assez actifs pour que l'erreur relative ait un sens
    mape = (np.abs(nat.pred - nat.viirs) / nat.viirs).mean() * 100
    yr = t.groupby("year")[["viirs", "pred"]].sum()
    bias = ((yr.pred.sum() - yr.viirs.sum()) / yr.viirs.sum()) * 100
    rho = t["pred"].corr(t["viirs"], method="spearman")
    return {"erreur mensuelle (%)": mape, "biais total (%)": bias, "corr. cases (rho)": rho}


def evaluate(g: pd.DataFrame, splits) -> pd.DataFrame:
    rows = []
    for name, fit in METHODS.items():
        preds, tests = [], []
        for train, test in splits:
            preds.append(fit(train)(test))
            tests.append(test)
        s = score(pd.concat(tests), np.concatenate(preds))
        rows.append({"méthode": name, **s})
    return pd.DataFrame(rows).set_index("méthode").round(2)


if __name__ == "__main__":
    g = load()
    full_years = [y for y in sorted(g.year.unique()) if y >= 2013]
    loyo = [(g[g.year != y], g[g.year == y]) for y in full_years]
    back = [(g[g.year >= 2018], g[g.year < 2018])]

    print("=== Validation LOYO (une année retirée à la fois, 2013-2025) ===")
    print(evaluate(g, loyo).to_string())
    print("\n=== Validation BACKCAST (entraîné 2018-2025, testé 2012-2017) ===")
    print(evaluate(g, back).to_string())

    n = national(g)
    full = fit_ratio_trend(g)
    print("\nTendance estimée du ratio VIIRS/MODIS (méthode C, ratio moyen par année, tout le Togo) :")
    gy = g.assign(pred=full(g)).groupby("year")[["modis", "viirs"]].sum()
    print((gy.viirs / gy.modis).round(2).to_string())
