"""Step 4: MODIS -> VIIRS-equivalent (S-NPP) calibration, comparison of 4 methods.

Input: data/processed/monthly_grid.csv (see aggregate_grid.py)
MODIS = Aqua + Terra (the only combination available since 2000). Target = S-NPP.
Overlap period used: 2012-02 -> 2025-12.

Methods:
  A  global ratio                      : n_viirs = r * n_modis
  B  ratio per calendar month          : r depends on the month (fire season)
  C  ratio per month + yearly trend    : log r = month + b * year (Poisson regression)
  D  quantile mapping (cell-months)    : the count distributions are aligned

Two validations:
  LOYO     : one year is left out and estimated from the others (13 years, 2013-2025)
  BACKCAST : trained on 2018-2025, tested on 2012-2017 (mimics the extrapolation to 2000-2011)
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


# ---------- methods: each returns a function predict(df_cells) -> prediction per row ----------
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
    "A global ratio": fit_ratio_global,
    "B ratio per month": fit_ratio_month,
    "C month + trend": fit_ratio_trend,
    "D quantile mapping": fit_quantile_mapping,
}


def score(test: pd.DataFrame, pred: np.ndarray) -> dict:
    t = test.assign(pred=pred)
    nat = t.groupby(["year", "m"])[["viirs", "pred"]].sum()
    nat = nat[nat.viirs >= 100]  # months active enough for a relative error to make sense
    mape = (np.abs(nat.pred - nat.viirs) / nat.viirs).mean() * 100
    yr = t.groupby("year")[["viirs", "pred"]].sum()
    bias = ((yr.pred.sum() - yr.viirs.sum()) / yr.viirs.sum()) * 100
    rho = t["pred"].corr(t["viirs"], method="spearman")
    return {"monthly error (%)": mape, "total bias (%)": bias, "cell corr. (rho)": rho}


def evaluate(g: pd.DataFrame, splits) -> pd.DataFrame:
    rows = []
    for name, fit in METHODS.items():
        preds, tests = [], []
        for train, test in splits:
            preds.append(fit(train)(test))
            tests.append(test)
        s = score(pd.concat(tests), np.concatenate(preds))
        rows.append({"method": name, **s})
    return pd.DataFrame(rows).set_index("method").round(2)


if __name__ == "__main__":
    g = load()
    full_years = [y for y in sorted(g.year.unique()) if y >= 2013]
    loyo = [(g[g.year != y], g[g.year == y]) for y in full_years]
    back = [(g[g.year >= 2018], g[g.year < 2018])]

    print("=== LOYO validation (one year left out at a time, 2013-2025) ===")
    print(evaluate(g, loyo).to_string())
    print("\n=== BACKCAST validation (trained 2018-2025, tested 2012-2017) ===")
    print(evaluate(g, back).to_string())

    n = national(g)
    full = fit_ratio_trend(g)
    print("\nEstimated trend of the VIIRS/MODIS ratio (method C, mean ratio per year, all of Togo):")
    gy = g.assign(pred=full(g)).groupby("year")[["modis", "viirs"]].sum()
    print((gy.viirs / gy.modis).round(2).to_string())
