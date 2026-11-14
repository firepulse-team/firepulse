"""Validation pour le jury : MODIS recalé (quantile mapping) contre VIIRS S-NPP réel, 2013-2025.

Hors échantillon : chaque année est estimée par un modèle entraîné SANS cette année (LOYO).
Sorties : docs/validation_series.png, docs/validation_map.png, docs/validation_metrics.txt
"""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from calibrate import fit_quantile_mapping, load

DOCS = Path(__file__).parent / "docs"


def loyo_predictions() -> pd.DataFrame:
    g = load()
    parts = []
    for y in sorted(g.year.unique()):
        if y < 2013:
            continue
        test = g[g.year == y].copy()
        test["pred"] = fit_quantile_mapping(g[g.year != y])(test)
        parts.append(test)
    return pd.concat(parts, ignore_index=True)


def main():
    p = loyo_predictions()

    # ---- 1. séries mensuelles nationales
    nat = p.groupby("month")[["modis", "viirs", "pred"]].sum()
    nat.index = pd.PeriodIndex(nat.index, freq="M").to_timestamp()
    r = nat["pred"].corr(nat["viirs"])
    big = nat[nat.viirs >= 100]
    mape = (np.abs(big.pred - big.viirs) / big.viirs).mean() * 100
    yr = p.groupby("year")[["viirs", "pred"]].sum()
    yr_err = ((yr.pred - yr.viirs).abs() / yr.viirs * 100)

    fig, axes = plt.subplots(1, 2, figsize=(13, 4.6), gridspec_kw={"width_ratios": [2.2, 1]})
    ax = axes[0]
    ax.plot(nat.index, nat["viirs"], color="#1b9e77", lw=2, label="VIIRS S-NPP réel")
    ax.plot(nat.index, nat["pred"], color="#7570b3", lw=1.6, ls="--", label="MODIS recalé (hors échantillon)")
    ax.plot(nat.index, nat["modis"], color="#d95f02", lw=1, alpha=0.7, label="MODIS brut")
    ax.set_ylabel("hotspots / mois (Togo)")
    ax.set_title("Série mensuelle, 2013-2025")
    ax.legend()
    ax.grid(alpha=0.3)
    ax = axes[1]
    ax.scatter(big["viirs"], big["pred"], s=14, color="#7570b3", alpha=0.7)
    lim = [big.viirs.min() * 0.8, big.viirs.max() * 1.2]
    ax.plot(lim, lim, "k:", lw=1)
    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlabel("VIIRS réel")
    ax.set_ylabel("MODIS recalé")
    ax.set_title(f"Mois actifs (≥100 hotspots)\nr = {big.pred.corr(big.viirs):.3f}, erreur moy. {mape:.0f} %")
    ax.grid(alpha=0.3)
    fig.suptitle("FIREPULSE — validation de la calibration MODIS → VIIRS", fontweight="bold")
    fig.tight_layout()
    fig.savefig(DOCS / "validation_series.png", dpi=150)

    # ---- 2. carte d'erreur par case (somme 2013-2025)
    cell = p.groupby(["lat_cell", "lon_cell"])[["viirs", "pred"]].sum()
    cell = cell[cell.viirs >= 200]
    cell["bias"] = (cell.pred - cell.viirs) / cell.viirs * 100
    fig, ax = plt.subplots(figsize=(6, 7.2))
    sc = ax.scatter(
        cell.index.get_level_values("lon_cell") + 0.05,
        cell.index.get_level_values("lat_cell") + 0.05,
        c=cell["bias"].clip(-100, 100), cmap="PuOr", vmin=-100, vmax=100, s=75, marker="s",
    )
    ax.set_aspect("equal")
    ax.set_xlabel("longitude")
    ax.set_ylabel("latitude")
    ax.set_title("Biais de la calibration par case de 0,1°\n(MODIS recalé − VIIRS réel, % du VIIRS, 2013-2025)")
    cb = fig.colorbar(sc, ax=ax, shrink=0.7)
    cb.set_label("biais (%)  violet = sur-estime, orange = sous-estime")
    ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(DOCS / "validation_map.png", dpi=150)

    # ---- 3. chiffres
    cell_corr = cell["pred"].corr(cell["viirs"], method="spearman")
    lines = [
        "Validation hors échantillon (une année retirée à la fois), 2013-2025, Togo",
        f"- Corrélation mensuelle nationale : r = {nat.pred.corr(nat.viirs):.3f} (tous mois) ; {big.pred.corr(big.viirs):.3f} (mois >= 100 hotspots)",
        f"- Erreur mensuelle moyenne (mois >= 100 hotspots) : {mape:.1f} %",
        f"- Erreur annuelle nationale : moyenne {yr_err.mean():.1f} %, max {yr_err.max():.1f} % ({int(yr_err.idxmax())})",
        f"- Total 2013-2025 : prédit {yr.pred.sum():,.0f} vs réel {yr.viirs.sum():,.0f} ({(yr.pred.sum()/yr.viirs.sum()-1)*100:+.1f} %)",
        f"- Cases 0,1° (>= 200 hotspots réels, n = {len(cell)}) : corrélation de rang sur le total = {cell_corr:.3f}",
        f"- Biais par case : médiane {cell.bias.median():+.1f} %, 80 % des cases entre {cell.bias.quantile(.1):+.0f} % et {cell.bias.quantile(.9):+.0f} %",
    ]
    (DOCS / "validation_metrics.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
