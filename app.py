"""FIREPULSE — web app : calendrier de brûlage harmonisé MODIS + VIIRS.

Lancer :  streamlit run app.py
Lit data/processed/harmonized_monthly.csv (format : docs/FORMAT.md). Si le fichier est absent,
l'app utilise l'échantillon factice de sample/ et l'affiche clairement.
"""
import folium
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from branca.colormap import LinearColormap
from folium.plugins import Draw
from streamlit_folium import st_folium

import firecal as fc

st.set_page_config(page_title="FIREPULSE", page_icon="🔥", layout="wide")

MONTHS = {"fr": ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
          "en": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]}
TXT = {
    "fr": {
        "tagline": "Calendrier de brûlage harmonisé MODIS + VIIRS · NASA FIRMS",
        "sample": "**Échantillon factice.** `data/processed/harmonized_monthly.csv` est absent : l'app affiche `sample/harmonized_monthly_sample.csv`. Ces chiffres ne décrivent pas de vrais feux. Lancez le pipeline (`download_firms.py` → `clean_data.py` → `aggregate_grid.py` → `harmonize.py`) pour voir les données réelles.",
        "zone": "Zone d'intérêt", "whole": "Toute l'étendue des données", "custom": "Rectangle personnalisé", "drawn": "Rectangle dessiné sur la carte",
        "approx": "Les régions sont des bandes de latitude approximatives, pas les limites administratives.",
        "south": "Sud", "north": "Nord", "west": "Ouest", "east": "Est",
        "fy": "Année de feu (la saison n'est pas coupée au 1er janvier)", "year": "Année à détailler", "lang": "Langue",
        "empty": "Aucun feu dans cette zone. Agrandissez le rectangle.",
        "k_season": "Mois critiques", "k_season_h": "Mois dont la médiane dépasse 50 % du pic. Part de l'activité annuelle : {s:.0f} %.",
        "k_last": "Dernier mois ({m})", "k_last_h": "Hotspots équivalent VIIRS, comparés à la médiane du même mois.", "k_vs": "{d:+.0f} % vs médiane",
        "k_year": "Saison {y}", "k_year_h": "Total de l'année choisie, comparé à la médiane des années complètes.",
        "k_trend": "Tendance", "k_trend_v": "{p:+.1f} % / an", "k_trend_h": "Pente de Theil–Sen sur les années complètes ; p = {p:.3f} (Mann–Kendall).", "na": "n/d",
        "t_cal": "Calendrier", "t_season": "Saison", "t_trend": "Tendance", "t_map": "Carte", "t_crit": "Périodes critiques", "t_exp": "Export",
        "cal_h": "Une ligne par année, une colonne par mois", "mode": "Affichage", "act": "Activité", "ano": "Anomalies",
        "cal_cap": "Activité : hotspots équivalent VIIRS par mois. Anomalies : chaque mois comparé au même mois des autres années.",
        "hov": "<b>%{y} · %{x}</b><br>%{customdata[0]:,.0f} hotspots (équiv. VIIRS)<br>médiane : %{customdata[1]:,.0f}<br>%{customdata[2]}<br>source : %{customdata[3]}<extra></extra>",
        "cats": {-3: "record bas", -2: "très en dessous de la normale", -1: "en dessous de la normale", 0: "proche de la normale", 1: "au-dessus de la normale", 2: "très au-dessus de la normale", 3: "record"},
        "sea_h": "La saison {y} face à l'historique", "sel": "Saison {y}", "med": "Médiane", "band": "P25–P75", "p90": "P90", "ylab": "hotspots / mois (équiv. VIIRS)",
        "tr_h": "Total par année : série harmonisée contre comptage brut", "harm": "Série harmonisée", "raw": "Comptage brut (MODIS puis VIIRS)", "ts": "Tendance (Theil–Sen)",
        "tr_cap": "Le comptage brut saute à l'arrivée de VIIRS en 2012 : VIIRS (375 m) voit bien plus de petits feux que MODIS (1 km). La série harmonisée exprime toute la période en équivalent VIIRS.",
        "ylab_y": "hotspots / an",
        "map_h": "Où ça brûle", "map_m": "Mois affiché", "all": "Toute l'année", "map_cap": "Hotspots harmonisés par case de 0,1° et par an. Dessinez un rectangle (outil à gauche de la carte), puis cliquez sur le bouton pour l'utiliser comme zone.",
        "use": "Utiliser le rectangle dessiné comme zone", "leg": "hotspots / an",
        "crit_h": "Calendrier type de la zone", "lvl": ["calme", "actif", "critique"], "c_m": "Mois", "c_med": "Médiane", "c_p90": "P90", "c_max": "Maximum", "c_share": "Part annuelle", "c_lvl": "Niveau",
        "unusual": "Mois les plus inhabituels", "u_cap": "Mois classés « très au-dessus » ou « record » face au même mois des autres années.", "u_n": "Hotspots", "u_pct": "% de la médiane", "u_cat": "Catégorie", "none": "Aucun mois inhabituel dans cette zone.",
        "exp_series": "Série mensuelle de la zone (CSV)", "exp_cal": "Calendrier type (CSV)", "exp_hot": "Hotspots individuels de la zone (CSV)", "exp_nohot": "`data/processed/hotspots_clean.csv` est absent : lancez `clean_data.py` pour exporter les hotspots individuels.",
        "foot": "Données : NASA FIRMS (MODIS Collection 6.1, VIIRS 375 m S-NPP / NOAA-20). La NASA ne cautionne pas ce projet.",
    },
    "en": {
        "tagline": "Harmonized MODIS + VIIRS burning calendar · NASA FIRMS",
        "sample": "**Dummy sample.** `data/processed/harmonized_monthly.csv` is missing: the app shows `sample/harmonized_monthly_sample.csv`. These numbers do not describe real fires. Run the pipeline (`download_firms.py` → `clean_data.py` → `aggregate_grid.py` → `harmonize.py`) to see real data.",
        "zone": "Area of interest", "whole": "Full data extent", "custom": "Custom rectangle", "drawn": "Rectangle drawn on the map",
        "approx": "Regions are approximate latitude bands, not administrative boundaries.",
        "south": "South", "north": "North", "west": "West", "east": "East",
        "fy": "Fire year (the season is not cut on 1 January)", "year": "Year to inspect", "lang": "Language",
        "empty": "No fires in this area. Enlarge the rectangle.",
        "k_season": "Critical months", "k_season_h": "Months whose median exceeds 50% of the peak. Share of yearly activity: {s:.0f}%.",
        "k_last": "Latest month ({m})", "k_last_h": "VIIRS-equivalent hotspots, compared with the median of the same month.", "k_vs": "{d:+.0f}% vs median",
        "k_year": "Season {y}", "k_year_h": "Total of the chosen year, compared with the median of complete years.",
        "k_trend": "Trend", "k_trend_v": "{p:+.1f}% / yr", "k_trend_h": "Theil–Sen slope over complete years; p = {p:.3f} (Mann–Kendall).", "na": "n/a",
        "t_cal": "Calendar", "t_season": "Season", "t_trend": "Trend", "t_map": "Map", "t_crit": "Critical periods", "t_exp": "Export",
        "cal_h": "One row per year, one column per month", "mode": "View", "act": "Activity", "ano": "Anomalies",
        "cal_cap": "Activity: VIIRS-equivalent hotspots per month. Anomalies: each month compared with the same month of the other years.",
        "hov": "<b>%{y} · %{x}</b><br>%{customdata[0]:,.0f} hotspots (VIIRS equiv.)<br>median: %{customdata[1]:,.0f}<br>%{customdata[2]}<br>source: %{customdata[3]}<extra></extra>",
        "cats": {-3: "record low", -2: "far below normal", -1: "below normal", 0: "near normal", 1: "above normal", 2: "far above normal", 3: "record"},
        "sea_h": "Season {y} against the record", "sel": "Season {y}", "med": "Median", "band": "P25–P75", "p90": "P90", "ylab": "hotspots / month (VIIRS equiv.)",
        "tr_h": "Yearly total: harmonized series against raw count", "harm": "Harmonized series", "raw": "Raw count (MODIS then VIIRS)", "ts": "Trend (Theil–Sen)",
        "tr_cap": "The raw count jumps when VIIRS arrives in 2012: VIIRS (375 m) sees many more small fires than MODIS (1 km). The harmonized series expresses the whole period in VIIRS equivalent.",
        "ylab_y": "hotspots / yr",
        "map_h": "Where it burns", "map_m": "Month shown", "all": "Whole year", "map_cap": "Harmonized hotspots per 0.1° cell per year. Draw a rectangle (tool on the left of the map), then click the button to use it as the area.",
        "use": "Use the drawn rectangle as the area", "leg": "hotspots / yr",
        "crit_h": "Typical calendar of the area", "lvl": ["quiet", "active", "critical"], "c_m": "Month", "c_med": "Median", "c_p90": "P90", "c_max": "Maximum", "c_share": "Yearly share", "c_lvl": "Level",
        "unusual": "Most unusual months", "u_cap": "Months ranked “far above” or “record” against the same month of the other years.", "u_n": "Hotspots", "u_pct": "% of median", "u_cat": "Category", "none": "No unusual month in this area.",
        "exp_series": "Monthly series of the area (CSV)", "exp_cal": "Typical calendar (CSV)", "exp_hot": "Individual hotspots of the area (CSV)", "exp_nohot": "`data/processed/hotspots_clean.csv` is missing: run `clean_data.py` to export individual hotspots.",
        "foot": "Data: NASA FIRMS (MODIS Collection 6.1, VIIRS 375 m S-NPP / NOAA-20). NASA does not endorse this project.",
    },
}
# Bandes de latitude approximatives des régions du Togo (sud, nord)
REGIONS = {"Savanes": (10.0, 11.2), "Kara": (9.2, 10.0), "Centrale": (8.2, 9.2), "Plateaux": (6.8, 8.2), "Maritime": (6.0, 6.8)}
C_HARM, C_RAW, C_INK = "#eb6834", "#2a78d6", "#52514e"
HEAT = [[0, "#f3f1ec"], [0.15, "#fbe3d3"], [0.35, "#f6c3a3"], [0.55, "#ee9967"], [0.75, "#e06a30"], [0.9, "#b64717"], [1, "#74290b"]]
DIV = [[0, "#184f95"], [1 / 6, "#5598e7"], [2 / 6, "#b7d3f6"], [0.5, "#efeeea"], [4 / 6, "#f3b9b4"], [5 / 6, "#e06c68"], [1, "#a32323"]]


@st.cache_data
def get_series():
    return fc.load_series()


@st.cache_data
def get_hotspots(south, north, west, east):
    h = pd.read_csv(fc.HOTSPOTS)
    return h[(h.lat >= south) & (h.lat <= north) & (h.lon >= west) & (h.lon <= east)].to_csv(index=False).encode("utf-8")


df, is_sample = get_series()
ext = (float(df.lat_cell.min()), float(df.lat_cell.max()) + fc.RES, float(df.lon_cell.min()), float(df.lon_cell.max()) + fc.RES)  # S, N, W, E
first, last = df["month"].min(), df["month"].max()

# ---------- barre latérale ----------
with st.sidebar:
    lang = "fr" if st.radio("Langue / Language", ["Français", "English"], horizontal=True) == "Français" else "en"
    T, MO = TXT[lang], MONTHS[lang]
    choices = [T["whole"]] + [r for r, (s, n) in REGIONS.items() if s < ext[1] and n > ext[0]] + [T["custom"]]
    if "drawn" in st.session_state:
        choices.append(T["drawn"])
    default = choices.index(T["drawn"]) if st.session_state.pop("pick_drawn", False) and T["drawn"] in choices else 0
    zone = st.selectbox(T["zone"], choices, index=default)
    if zone in REGIONS:
        box = (max(REGIONS[zone][0], ext[0]), min(REGIONS[zone][1], ext[1]), ext[2], ext[3]); st.caption(T["approx"])
    elif zone == T["custom"]:
        lat = st.slider(f"{T['south']} – {T['north']} (°)", ext[0], ext[1], (ext[0], ext[1]), 0.1)
        lon = st.slider(f"{T['west']} – {T['east']} (°)", ext[2], ext[3], (ext[2], ext[3]), 0.1)
        box = (lat[0], lat[1], lon[0], lon[1])
    elif zone == T["drawn"]:
        box = st.session_state["drawn"]
    else:
        box = ext
    use_fy = st.checkbox(T["fy"], value=True)

st.title("FIREPULSE")
st.caption(T["tagline"])
if is_sample:
    st.warning(T["sample"])

sub = fc.in_bbox(df, *box)
if sub.empty:
    st.error(T["empty"]); st.stop()

# ---------- calculs ----------
mo = fc.monthly(sub, first, last)
start = fc.fire_year_start(mo) if use_fy else 1
mo = fc.add_fire_year(mo, start)
clim = fc.climatology(mo)
mo = fc.anomalies(mo, clim)
yr = fc.yearly(mo)
done = yr[yr.complete]
order = [(start - 1 + i) % 12 + 1 for i in range(12)]  # mois dans l'ordre de l'année de feu
xlab = [MO[m - 1] for m in order]
labels = list(yr.sort_values("fy").label)
with st.sidebar:
    opts = list(done.label) or labels
    sel = st.selectbox(T["year"], opts, index=len(opts) - 1)
    st.caption(f"{box[0]:.1f}–{box[1]:.1f}° N · {box[2]:.1f}–{box[3]:.1f}° E · {sub[['lat_cell', 'lon_cell']].drop_duplicates().shape[0]} cases")

# ---------- indicateurs ----------
crit = [m for m in order if clim.set_index("m").level[m] == 2]
lastrow = mo.iloc[-1]
tr = fc.trend(done.fy, done.n) if len(done) >= 6 else None
k1, k2, k3, k4 = st.columns(4)
k1.metric(T["k_season"], (MO[crit[0] - 1] if len(crit) == 1 else f"{MO[crit[0] - 1]} – {MO[crit[-1] - 1]}") if crit else T["na"], help=T["k_season_h"].format(s=100 * clim[clim.m.isin(crit)].share.sum()))
k2.metric(T["k_last"].format(m=f"{MO[int(lastrow.m) - 1]} {int(lastrow.year)}"), f"{lastrow.n:,.0f}", None if np.isnan(lastrow.pct) else T["k_vs"].format(d=lastrow.pct - 100), delta_color="inverse", help=T["k_last_h"])
if len(done):
    tot, med = float(yr.loc[yr.label == sel, "n"].iloc[0]), float(done.n.median())
    k3.metric(T["k_year"].format(y=sel), f"{tot:,.0f}", T["k_vs"].format(d=100 * tot / med - 100) if med > 0 else None, delta_color="inverse", help=T["k_year_h"])
k4.metric(T["k_trend"], T["k_trend_v"].format(p=tr["pct"]) if tr else T["na"], help=T["k_trend_h"].format(p=tr["p"]) if tr else None)

tabs = st.tabs([T["t_cal"], T["t_season"], T["t_trend"], T["t_map"], T["t_crit"], T["t_exp"]])

# ---------- calendrier ----------
with tabs[0]:
    c1, c2 = st.columns([3, 1])
    c1.subheader(T["cal_h"])
    mode = c2.radio(T["mode"], [T["act"], T["ano"]], horizontal=True)
    piv = lambda col: mo.pivot(index="label", columns="pos", values=col).reindex(labels)
    z_n, z_cat, z_med, z_src = piv("n"), piv("cat"), piv("median"), piv("source")
    custom = np.dstack([z_n.to_numpy(float), z_med.to_numpy(float), z_cat.map(lambda c: T["cats"].get(int(c), "") if pd.notna(c) else "").to_numpy(), z_src.fillna("").to_numpy()])
    if mode == T["act"]:
        vmax = float(np.nanquantile(z_n.to_numpy(float), 0.98)) or 1.0
        hm = go.Heatmap(z=np.sqrt(z_n.to_numpy(float) / vmax).clip(0, 1), colorscale=HEAT, zmin=0, zmax=1, showscale=False)
    else:
        hm = go.Heatmap(z=z_cat.to_numpy(float), colorscale=DIV, zmin=-3, zmax=3, showscale=False)
    hm.update(x=xlab, y=labels, customdata=custom, hovertemplate=T["hov"], xgap=2, ygap=2, hoverongaps=False)
    fig = go.Figure(hm)
    fig.update_layout(height=max(360, 22 * len(labels) + 80), margin=dict(l=10, r=10, t=30, b=10), yaxis=dict(autorange="reversed", type="category"), xaxis=dict(side="top", type="category"), plot_bgcolor="rgba(0,0,0,0)")
    st.plotly_chart(fig, width="stretch")
    st.caption(T["cal_cap"])

# ---------- saison ----------
with tabs[1]:
    st.subheader(T["sea_h"].format(y=sel))
    c = clim.set_index("m").loc[order]
    cur = mo[mo.label == sel].set_index("pos").n.reindex(range(12))
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=xlab, y=c.p75, line=dict(width=0), showlegend=False, hoverinfo="skip"))
    fig.add_trace(go.Scatter(x=xlab, y=c.p25, fill="tonexty", fillcolor="rgba(133,131,124,0.25)", line=dict(width=0), name=T["band"], hoverinfo="skip"))
    fig.add_trace(go.Scatter(x=xlab, y=c.p90, line=dict(color=C_INK, width=1, dash="dot"), name=T["p90"]))
    fig.add_trace(go.Scatter(x=xlab, y=c["median"], line=dict(color=C_INK, width=2), name=T["med"]))
    fig.add_trace(go.Scatter(x=xlab, y=cur, line=dict(color=C_HARM, width=3), mode="lines+markers", marker=dict(size=8), name=T["sel"].format(y=sel)))
    fig.update_layout(height=420, margin=dict(l=10, r=10, t=20, b=10), yaxis=dict(title=T["ylab"], rangemode="tozero"), hovermode="x unified", legend=dict(orientation="h", y=-0.15))
    st.plotly_chart(fig, width="stretch")

# ---------- tendance ----------
with tabs[2]:
    st.subheader(T["tr_h"])
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=done.label, y=done.raw, line=dict(color=C_RAW, width=2, dash="dash"), mode="lines+markers", marker=dict(size=7, symbol="square"), name=T["raw"]))
    fig.add_trace(go.Scatter(x=done.label, y=done.n, line=dict(color=C_HARM, width=3), mode="lines+markers", marker=dict(size=8), name=T["harm"]))
    if tr:
        fig.add_trace(go.Scatter(x=done.label, y=tr["intercept"] + tr["slope"] * done.fy, line=dict(color=C_INK, width=1.5, dash="dot"), mode="lines", name=T["ts"]))
    fig.update_layout(height=420, margin=dict(l=10, r=10, t=20, b=10), yaxis=dict(title=T["ylab_y"], rangemode="tozero"), xaxis=dict(type="category"), hovermode="x unified", legend=dict(orientation="h", y=-0.2))
    st.plotly_chart(fig, width="stretch")
    st.caption(T["tr_cap"])

# ---------- carte ----------
with tabs[3]:
    st.subheader(T["map_h"])
    pick = st.selectbox(T["map_m"], [T["all"]] + MO)
    cells = fc.cell_frequency(sub, MO.index(pick) + 1 if pick in MO else None, len(mo) / 12)
    fmap = folium.Map(tiles="CartoDB positron", control_scale=True)
    fmap.fit_bounds([[box[0], box[2]], [box[1], box[3]]])
    if len(cells):
        vmax = float(cells.per_year.quantile(0.97)) or 1.0
        cmap = LinearColormap(["#fbe3d3", "#ee9967", "#e06a30", "#b64717", "#74290b"], vmin=0, vmax=vmax, caption=T["leg"])
        for r in cells.itertuples():
            folium.Rectangle([[r.lat_cell, r.lon_cell], [r.lat_cell + fc.RES, r.lon_cell + fc.RES]], stroke=False, fill=True, fill_color=cmap(min(r.per_year, vmax)), fill_opacity=0.8,
                             tooltip=f"{r.per_year:,.1f} {T['leg']}").add_to(fmap)
        cmap.add_to(fmap)
    folium.Rectangle([[box[0], box[2]], [box[1], box[3]]], color="#171613", weight=2, fill=False).add_to(fmap)
    Draw(export=False, draw_options={k: False for k in ["polyline", "polygon", "circle", "marker", "circlemarker"]}, edit_options={"edit": False}).add_to(fmap)
    out = st_folium(fmap, height=520, use_container_width=True, returned_objects=["last_active_drawing"], key="map")
    drawing = (out or {}).get("last_active_drawing")
    if drawing:
        xs = [p[0] for p in drawing["geometry"]["coordinates"][0]]; ys = [p[1] for p in drawing["geometry"]["coordinates"][0]]
        new = (round(min(ys), 1), round(max(ys), 1), round(min(xs), 1), round(max(xs), 1))
        if st.button(T["use"] + f" ({new[0]}–{new[1]}° N, {new[2]}–{new[3]}° E)"):
            st.session_state["drawn"], st.session_state["pick_drawn"] = new, True
            st.rerun()
    st.caption(T["map_cap"])

# ---------- périodes critiques ----------
with tabs[4]:
    st.subheader(T["crit_h"])
    c = clim.set_index("m").loc[order].reset_index()
    tbl = pd.DataFrame({T["c_m"]: [MO[m - 1] for m in c.m], T["c_lvl"]: [T["lvl"][int(v)] for v in c.level], T["c_share"]: (100 * c.share).round(1), T["c_med"]: c["median"].round(0), T["c_p90"]: c.p90.round(0), T["c_max"]: c["max"].round(0)})
    st.dataframe(tbl, hide_index=True, width="stretch", column_config={T["c_share"]: st.column_config.ProgressColumn(T["c_share"], format="%.1f %%", min_value=0, max_value=float(max(1.0, tbl[T["c_share"]].max())))})
    st.subheader(T["unusual"])
    u = mo[mo.cat >= 2].sort_values(["rank", "pct"], ascending=False).head(15)
    if u.empty:
        st.info(T["none"])
    else:
        st.dataframe(pd.DataFrame({T["c_m"]: [f"{MO[int(m) - 1]} {int(y)}" for m, y in zip(u.m, u.year)], T["u_n"]: u.n.round(0), T["c_med"]: u["median"].round(0), T["u_pct"]: u.pct.round(0), T["u_cat"]: [T["cats"][int(k)] for k in u.cat]}), hide_index=True, width="stretch")
        st.caption(T["u_cap"])

# ---------- export ----------
with tabs[5]:
    series = mo.assign(month=mo.year.astype(str) + "-" + mo.m.astype(str).str.zfill(2), anomaly=[TXT["en"]["cats"][int(k)] for k in mo.cat])[["month", "label", "n", "raw", "source", "median", "pct", "rank", "anomaly"]]
    series = series.rename(columns={"label": "fire_year", "n": "n_harmonized", "raw": "n_raw", "median": "historical_median", "pct": "pct_of_median"}).round(3)
    st.download_button(T["exp_series"], series.to_csv(index=False).encode("utf-8"), "firepulse_monthly_series.csv", "text/csv")
    st.download_button(T["exp_cal"], clim.assign(level=[TXT["en"]["lvl"][int(v)] for v in clim.level]).round(3).to_csv(index=False).encode("utf-8"), "firepulse_calendar.csv", "text/csv")
    if fc.HOTSPOTS.exists():
        st.download_button(T["exp_hot"], get_hotspots(*box), "firepulse_hotspots.csv", "text/csv")
    else:
        st.info(T["exp_nohot"])

st.caption(T["foot"])
