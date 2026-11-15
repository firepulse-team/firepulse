"""Validation for the judges: calibrated MODIS (quantile mapping) against real VIIRS S-NPP, 2013-2025.

Out of sample: each year is estimated by a model trained WITHOUT that year (LOYO).
Outputs: docs/validation_series.png, docs/validation_map.png, docs/validation_metrics.txt
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

    # ---- 1. national monthly series
    nat = p.groupby("month")[["modis", "viirs", "pred"]].sum()
    nat.index = pd.PeriodIndex(nat.index, freq="M").to_timestamp()
    r = nat["pred"].corr(nat["viirs"])
    big = nat[nat.viirs >= 100]
    mape = (np.abs(big.pred - big.viirs) / big.viirs).mean() * 100
    yr = p.groupby("year")[["viirs", "pred"]].sum()
    yr_err = ((yr.pred - yr.viirs).abs() / yr.viirs * 100)

    fig, axes = plt.subplots(1, 2, figsize=(13, 4.6), gridspec_kw={"width_ratios": [2.2, 1]})
    ax = axes[0]
    ax.plot(nat.index, nat["viirs"], color="#1b9e77", lw=2, label="Real VIIRS S-NPP")
    ax.plot(nat.index, nat["pred"], color="#7570b3", lw=1.6, ls="--", label="Calibrated MODIS (out of sample)")
    ax.plot(nat.index, nat["modis"], color="#d95f02", lw=1, alpha=0.7, label="Raw MODIS")
    ax.set_ylabel("hotspots / month (Togo)")
    ax.set_title("Monthly series, 2013-2025")
    ax.legend()
    ax.grid(alpha=0.3)
    ax = axes[1]
    ax.scatter(big["viirs"], big["pred"], s=14, color="#7570b3", alpha=0.7)
    lim = [big.viirs.min() * 0.8, big.viirs.max() * 1.2]
    ax.plot(lim, lim, "k:", lw=1)
    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlabel("Real VIIRS")
    ax.set_ylabel("Calibrated MODIS")
    ax.set_title(f"Active months (≥100 hotspots)\nr = {big.pred.corr(big.viirs):.3f}, mean error {mape:.0f}%")
    ax.grid(alpha=0.3)
    fig.suptitle("FIREPULSE — validation of the MODIS → VIIRS calibration", fontweight="bold")
    fig.tight_layout()
    fig.savefig(DOCS / "validation_series.png", dpi=150)

    # ---- 2. error map per cell (2013-2025 sum)
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
    ax.set_title("Calibration bias per 0.1° cell\n(calibrated MODIS − real VIIRS, % of VIIRS, 2013-2025)")
    cb = fig.colorbar(sc, ax=ax, shrink=0.7)
    cb.set_label("bias (%)  purple = overestimates, orange = underestimates")
    ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(DOCS / "validation_map.png", dpi=150)

    # ---- 3. figures
    cell_corr = cell["pred"].corr(cell["viirs"], method="spearman")
    lines = [
        "Out-of-sample validation (one year left out at a time), 2013-2025, Togo",
        f"- National monthly correlation: r = {nat.pred.corr(nat.viirs):.3f} (all months); {big.pred.corr(big.viirs):.3f} (months >= 100 hotspots)",
        f"- Mean monthly error (months >= 100 hotspots): {mape:.1f}%",
        f"- National yearly error: mean {yr_err.mean():.1f}%, max {yr_err.max():.1f}% ({int(yr_err.idxmax())})",
        f"- Total 2013-2025: predicted {yr.pred.sum():,.0f} vs real {yr.viirs.sum():,.0f} ({(yr.pred.sum()/yr.viirs.sum()-1)*100:+.1f}%)",
        f"- 0.1° cells (>= 200 real hotspots, n = {len(cell)}): rank correlation on the total = {cell_corr:.3f}",
        f"- Bias per cell: median {cell.bias.median():+.1f}%, 80% of cells between {cell.bias.quantile(.1):+.0f}% and {cell.bias.quantile(.9):+.0f}%",
    ]
    (DOCS / "validation_metrics.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
