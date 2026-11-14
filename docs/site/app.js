/* FIREPULSE — interface du site (carte, calendrier, graphiques). Les calculs sont dans core.js. */
(function () {
  'use strict';
  const W = FP.W, $ = id => document.getElementById(id);
  const I18N = {
    fr: {
      tagline: 'Calendrier de brûlage harmonisé MODIS + VIIRS · Togo, 2000 à aujourd’hui', repo: 'Code et données', loading: 'Chargement des données…',
      loadErr: 'Les données n’ont pas pu être chargées. Si vous ouvrez le fichier directement, lancez plutôt <code>python -m http.server</code> dans le dossier <code>docs/</code>.',
      s1k: 'Le problème', s1t: 'VIIRS (375 m, depuis 2012) détecte 4 à 5 fois plus de points chauds que MODIS (1 km, depuis 2000). Mises bout à bout, les deux séries font croire à un triplement des feux en 2012.',
      s2k: 'La méthode', s2v: '5 % d’erreur annuelle', s2t: 'Calibration de MODIS sur VIIRS par quantile mapping, sur une grille de 0,1°. Vérifiée hors échantillon : 17 % d’erreur par mois, 5 % par an.',
      s3k: 'Le résultat', s3t: 'par an depuis 2001 sur l’ensemble du Togo, une fois les deux capteurs rendus comparables. La hausse apparente était un artefact.',
      mapTitle: 'Où ça brûle', mapSub: 'Points chauds harmonisés par case de 0,1° et par an (moyenne 2001–2025). Choisissez une région ou dessinez un rectangle : tout le reste de la page suit.',
      aoi: 'Zone d’intérêt', mapMonth: 'Mois affiché', allMonths: 'Toute l’année', draw: 'Dessiner une zone', drawing: 'Tracez un rectangle sur la carte…',
      whole: 'Togo entier', custom: 'Zone dessinée', approx: ' (bande approx.)', cells: (n, a) => `${n} cases actives · ${a}`, perYear: 'points chauds/an', low: 'faible', high: 'élevé',
      stTitle: d => `Situation au ${d}`, lvl: ['Période calme', 'Période active', 'Période critique'],
      mtd: (a, b, v, r, p) => `Du ${a} au ${b} : <b>${v}</b> points chauds, soit <b>${r} %</b> de la médiane de la même fenêtre sur 2001–2025 (percentile ${p}).`,
      mtdCat: p => p >= 90 ? 'Bien au-dessus de la normale' : p >= 75 ? 'Au-dessus de la normale' : p <= 10 ? 'Bien en dessous de la normale' : p <= 25 ? 'En dessous de la normale' : 'Proche de la normale',
      outlook: 'Ce que le calendrier annonce pour les 8 prochaines semaines',
      cat: { '-3': 'Record bas', '-2': 'Très en dessous de la normale', '-1': 'En dessous de la normale', 0: 'Proche de la normale', 1: 'Au-dessus de la normale', 2: 'Très au-dessus de la normale', 3: 'Record pour la saison' },
      kSeason: 'Saison des feux', kSeasonN: (d, m, s) => `Pic habituel le ${d} · mois critiques : ${m} (${s} % de l’année)`,
      kLast: m => `Dernier mois complet (${m})`, kLastN: (r, p) => `${r} % de la médiane du même mois, percentile ${p}.`,
      kYear: y => `Saison ${y}`, kYearN: r => `${r} % de la médiane des années complètes.`,
      kTrend: 'Tendance', kTrendN: (p, n) => `Pente de Theil–Sen sur ${n} années complètes (p ${p}, Mann–Kendall).`, perYr: ' % / an', na: 'n/d', few: 'Pas assez d’années complètes.',
      calTitle: 'Calendrier de brûlage', calSub: 'Une ligne par année de feu, une case par semaine. L’année de feu commence à la période la plus calme, pour ne pas couper la saison au 1er janvier. Cliquez une ligne pour la détailler.',
      modeAct: 'Activité', modeAno: 'Anomalies', typical: 'Calendrier type', week: 'Semaine du', act: 'Activité harmonisée', med: 'Médiane historique', src: 'Source', hs: 'points chauds',
      srcName: { T: 'MODIS Terra seul, calibré', M: 'MODIS Terra + Aqua, calibré', S: 'VIIRS S-NPP, observé', J: 'VIIRS NOAA-20, corrigé' }, stripe: 'Bande de gauche = capteur source', less: 'moins', more: 'plus',
      seasTitle: y => `Saison ${y} face à l’historique`, seasSub: 'Activité hebdomadaire de l’année choisie, comparée à la médiane et aux percentiles de toutes les années.',
      lgSel: 'Année choisie', lgMed: 'Médiane', lgBand: 'P25 à P75', lgP90: 'P90', lgLevel: 'Calme / active / critique', perWeek: 'points chauds / semaine',
      annTitle: 'Tendance : harmonisé contre brut', annSub: 'Total par année de feu. Le comptage brut bondit à l’arrivée de VIIRS en 2012 ; la série harmonisée exprime toute la période en équivalent VIIRS.',
      lgHarm: 'Série harmonisée', lgRaw: 'Comptage brut (MODIS puis VIIRS)', lgTs: 'Tendance (Theil–Sen)', viirs: 'Arrivée de VIIRS',
      valTitle: 'Preuve de l’harmonisation', valSub: 'Quatre méthodes comparées sur le recouvrement 2012–2025, tout le Togo. Erreur mensuelle sur les mois actifs.',
      vM: 'Méthode', vL: 'Une année retirée à la fois', vB: 'Entraîné 2018–2025, testé 2012–2017',
      vRows: ['A. Ratio global', 'B. Ratio par mois', 'C. Ratio par mois + tendance', 'D. Quantile mapping (retenu)'],
      vFacts: ['Corrélation mensuelle nationale hors échantillon : r = 0,995.', 'Erreur annuelle : 5,0 % en moyenne, 8,8 % au maximum (2024).', 'Total 2013–2025 : −2,8 % par rapport au VIIRS réel.', 'Par case de 0,1° : corrélation de rang 0,90.'],
      valCap: 'Validation hors échantillon, 2013–2025 : chaque année est estimée par un modèle entraîné sans elle (validate.py).',
      methTitle: 'Méthode', methSub: 'Reproductible de bout en bout avec les scripts du dépôt.',
      meth: ['<b>Données.</b> Archives NASA FIRMS par pays 2000–2025 (MODIS Collection 6.1, VIIRS 375 m S-NPP et NOAA-20), puis API FIRMS pour 2026.',
        '<b>Nettoyage.</b> Feux de végétation seulement (type 0), confiance MODIS ≥ 30, confiance VIIRS nominale ou haute : 1,06 million de points chauds.',
        '<b>Grille commune.</b> Comptage par mois et par case de 0,1° (environ 11 km), l’échelle où les deux capteurs deviennent comparables.',
        '<b>Calibration.</b> Quantile mapping MODIS → VIIRS sur 2012–2025 ; calibration séparée avant septembre 2002, quand Terra observait seul.',
        '<b>Relais de capteur.</b> S-NPP a cessé de livrer début novembre 2026 ; NOAA-20 prend la suite, corrigé de son ratio médian de 1,004.',
        '<b>Calendrier.</b> Médiane et percentiles par semaine ; période critique quand la médiane dépasse 50 % du pic ; anomalies par rang face aux autres années.'],
      limTitle: 'Limites', lim: ['Incertitude d’environ 17 % par mois, surtout due au bruit d’échantillonnage entre deux instruments.', 'Biais régional : la calibration est nationale ; quelques cases du centre-nord-ouest sont surestimées.', '2000–2011 ne peut pas être vérifié directement, faute de VIIRS à l’époque.', 'Les mois récents viennent de données en temps quasi réel et peuvent bouger après retraitement.', 'Les régions proposées sont des bandes de latitude approximatives, pas les limites administratives.'],
      dataTitle: 'Données', dataSub: 'Exports pour la zone choisie. Les valeurs hebdomadaires répartissent chaque total mensuel harmonisé au prorata des points chauds du capteur source.',
      dlWeek: 'Télécharger la série hebdomadaire (CSV)', dlMonth: 'Télécharger la série mensuelle (CSV)', dlAll: 'Toutes les données du projet', tblSum: 'Tableau par année de feu',
      tY: 'Année de feu', tTot: 'Total harmonisé', tRaw: 'Comptage brut', tPct: '% de la médiane', tSrc: 'Capteur',
      footer: 'Projet réalisé pour le NASA Space Apps Challenge 2026, défi « Harmonization of MODIS and VIIRS Hot Spots », avec les données <a href="https://firms.modaps.eosdis.nasa.gov/">NASA FIRMS</a>. Les résultats sont ceux de l’équipe et n’engagent pas la NASA. Frontières : Natural Earth. Fond de carte : © OpenStreetMap, © CARTO.',
      months: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
    },
    en: {
      tagline: 'Harmonized MODIS + VIIRS burning calendar · Togo, 2000 to today', repo: 'Code and data', loading: 'Loading data…',
      loadErr: 'The data could not be loaded. If you opened the file directly, run <code>python -m http.server</code> in the <code>docs/</code> folder instead.',
      s1k: 'The problem', s1t: 'VIIRS (375 m, since 2012) detects 4 to 5 times more hotspots than MODIS (1 km, since 2000). Joined end to end, the two records suggest fires tripled in 2012.',
      s2k: 'The method', s2v: '5% yearly error', s2t: 'MODIS is calibrated on VIIRS by quantile mapping, on a 0.1° grid. Checked out of sample: 17% error per month, 5% per year.',
      s3k: 'The result', s3t: 'per year since 2001 over the whole of Togo, once the two sensors are made comparable. The apparent rise was an artefact.',
      mapTitle: 'Where it burns', mapSub: 'Harmonized hotspots per 0.1° cell per year (2001–2025 mean). Pick a region or draw a rectangle: the rest of the page follows.',
      aoi: 'Area of interest', mapMonth: 'Month shown', allMonths: 'Whole year', draw: 'Draw an area', drawing: 'Drag a rectangle on the map…',
      whole: 'Whole of Togo', custom: 'Drawn area', approx: ' (approx. band)', cells: (n, a) => `${n} active cells · ${a}`, perYear: 'hotspots/yr', low: 'low', high: 'high',
      stTitle: d => `Status on ${d}`, lvl: ['Quiet period', 'Active period', 'Critical period'],
      mtd: (a, b, v, r, p) => `From ${a} to ${b}: <b>${v}</b> hotspots, <b>${r}%</b> of the median of the same window over 2001–2025 (percentile ${p}).`,
      mtdCat: p => p >= 90 ? 'Far above normal' : p >= 75 ? 'Above normal' : p <= 10 ? 'Far below normal' : p <= 25 ? 'Below normal' : 'Near normal',
      outlook: 'What the calendar says about the next 8 weeks',
      cat: { '-3': 'Record low', '-2': 'Far below normal', '-1': 'Below normal', 0: 'Near normal', 1: 'Above normal', 2: 'Far above normal', 3: 'Record for the season' },
      kSeason: 'Fire season', kSeasonN: (d, m, s) => `Usual peak on ${d} · critical months: ${m} (${s}% of the year)`,
      kLast: m => `Latest full month (${m})`, kLastN: (r, p) => `${r}% of the median of the same month, percentile ${p}.`,
      kYear: y => `Season ${y}`, kYearN: r => `${r}% of the median of complete years.`,
      kTrend: 'Trend', kTrendN: (p, n) => `Theil–Sen slope over ${n} complete years (p ${p}, Mann–Kendall).`, perYr: '% / yr', na: 'n/a', few: 'Not enough complete years.',
      calTitle: 'Burning calendar', calSub: 'One row per fire year, one cell per week. The fire year starts at the quietest time, so the season is not cut on 1 January. Click a row to inspect it.',
      modeAct: 'Activity', modeAno: 'Anomalies', typical: 'Typical calendar', week: 'Week of', act: 'Harmonized activity', med: 'Historical median', src: 'Source', hs: 'hotspots',
      srcName: { T: 'MODIS Terra only, calibrated', M: 'MODIS Terra + Aqua, calibrated', S: 'VIIRS S-NPP, observed', J: 'VIIRS NOAA-20, corrected' }, stripe: 'Left stripe = source sensor', less: 'less', more: 'more',
      seasTitle: y => `Season ${y} against the record`, seasSub: 'Weekly activity of the chosen year, compared with the median and percentiles of all years.',
      lgSel: 'Chosen year', lgMed: 'Median', lgBand: 'P25 to P75', lgP90: 'P90', lgLevel: 'Quiet / active / critical', perWeek: 'hotspots / week',
      annTitle: 'Trend: harmonized against raw', annSub: 'Total per fire year. The raw count jumps when VIIRS arrives in 2012; the harmonized series expresses the whole period in VIIRS equivalent.',
      lgHarm: 'Harmonized series', lgRaw: 'Raw count (MODIS then VIIRS)', lgTs: 'Trend (Theil–Sen)', viirs: 'VIIRS arrives',
      valTitle: 'Proof of harmonization', valSub: 'Four methods compared on the 2012–2025 overlap, whole of Togo. Monthly error on active months.',
      vM: 'Method', vL: 'Leave one year out', vB: 'Trained 2018–2025, tested 2012–2017',
      vRows: ['A. Global ratio', 'B. Ratio per month', 'C. Ratio per month + trend', 'D. Quantile mapping (chosen)'],
      vFacts: ['National monthly correlation out of sample: r = 0.995.', 'Yearly error: 5.0% on average, 8.8% at most (2024).', '2013–2025 total: −2.8% against the real VIIRS count.', 'Per 0.1° cell: rank correlation 0.90.'],
      valCap: 'Out-of-sample validation, 2013–2025: each year is estimated by a model trained without it (validate.py).',
      methTitle: 'Method', methSub: 'Reproducible end to end with the scripts in the repository.',
      meth: ['<b>Data.</b> NASA FIRMS country archives 2000–2025 (MODIS Collection 6.1, VIIRS 375 m S-NPP and NOAA-20), then the FIRMS API for 2026.',
        '<b>Cleaning.</b> Vegetation fires only (type 0), MODIS confidence ≥ 30, VIIRS nominal or high confidence: 1.06 million hotspots.',
        '<b>Common grid.</b> Counts per month and per 0.1° cell (about 11 km), the scale at which the two sensors become comparable.',
        '<b>Calibration.</b> Quantile mapping MODIS → VIIRS over 2012–2025; separate calibration before September 2002, when Terra observed alone.',
        '<b>Sensor relay.</b> S-NPP stopped delivering in early November 2026; NOAA-20 takes over, corrected by its median ratio of 1.004.',
        '<b>Calendar.</b> Median and percentiles per week; critical period when the median exceeds 50% of the peak; anomalies ranked against the other years.'],
      limTitle: 'Limits', lim: ['About 17% uncertainty per month, mostly sampling noise between two instruments.', 'Regional bias: the calibration is national; a few cells in the centre-north-west are overestimated.', '2000–2011 cannot be checked directly, since VIIRS did not exist.', 'Recent months come from near-real-time data and may change after reprocessing.', 'The regions offered are approximate latitude bands, not administrative boundaries.'],
      dataTitle: 'Data', dataSub: 'Exports for the chosen area. Weekly values spread each harmonized monthly total in proportion to the hotspots of the source sensor.',
      dlWeek: 'Download the weekly series (CSV)', dlMonth: 'Download the monthly series (CSV)', dlAll: 'All project data', tblSum: 'Table by fire year',
      tY: 'Fire year', tTot: 'Harmonized total', tRaw: 'Raw count', tPct: '% of median', tSrc: 'Sensor',
      footer: 'Built for the NASA Space Apps Challenge 2026, challenge “Harmonization of MODIS and VIIRS Hot Spots”, with <a href="https://firms.modaps.eosdis.nasa.gov/">NASA FIRMS</a> data. Results are the team’s own and do not represent NASA. Borders: Natural Earth. Basemap: © OpenStreetMap, © CARTO.',
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    }
  };
  const VAL = [[35, 36], [18, 24], [18, 21], [17, 16]];                                  // docs/METHODE.md
  const REGIONS = [['Savanes', 10.0, 11.2], ['Kara', 9.2, 10.0], ['Centrale', 8.2, 9.2], ['Plateaux', 6.8, 8.2], ['Maritime', 6.0, 6.8]];
  const SRC_STYLE = { T: ['--modis', .45], M: ['--modis', 1], S: ['--viirs', 1], J: ['--viirs', .5] };
  let lang = (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  try { lang = localStorage.getItem('fp-lang') || lang; } catch (e) { }
  let T = I18N[lang], D = null;
  const S = { aoi: null, aois: [], agg: null, mon: null, fys: null, cal: null, st: null, sel: -1, mode: 'act', month: 0, cells: null };
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (x, d) => x == null || isNaN(x) ? T.na : x.toLocaleString(lang, { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 });
  const pc = () => lang === 'fr' ? ' %' : '%';
  const fmt = (day, yr) => new Intl.DateTimeFormat(lang, Object.assign({ day: 'numeric', month: 'short', timeZone: 'UTC' }, yr ? { year: 'numeric' } : {})).format(FP.dateOf(day));
  const pd = (fy, p, yr) => fmt(FP.posToDay(S.cal, fy, p), yr);
  const niceMax = v => { if (!(v > 0)) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 1.2, 1.6, 2, 3, 4, 5, 6, 8, 10]) if (m * e >= v) return m * e; return 10 * e; };
  const step = (v, vmax) => v <= 0 ? 0 : Math.min(6, 1 + Math.floor(Math.sqrt(Math.min(1, v / vmax)) * 5.999));

  /* ---------- carte ---------- */
  let map, gCells, gAoi, tiles, drawing = false, drawStart = null, drawRect = null;
  function initMap() {
    map = L.map('map', { preferCanvas: true, zoomSnap: 0.25 });
    setTiles();
    L.geoJSON(window.FP_BORDERS, { interactive: false, style: () => ({ color: css('--ink3'), weight: 1.2, fill: false }) }).addTo(map);
    gCells = L.layerGroup().addTo(map); gAoi = L.layerGroup().addTo(map);
    map.on('mousedown', e => { if (drawing) drawStart = e.latlng; });
    map.on('mousemove', e => {
      if (drawing && drawStart) { const b = L.latLngBounds(drawStart, e.latlng); if (drawRect) drawRect.setBounds(b); else drawRect = L.rectangle(b, { color: css('--ink'), weight: 1.5, dashArray: '4 3', fill: false, interactive: false }).addTo(map); return; }
      if (!S.cells) return;
      const v = S.cells.get(FP.cellId(Math.floor(e.latlng.lat / D.res + 1e-9), Math.floor(e.latlng.lng / D.res + 1e-9)));
      if (v) showTip(`<b>${num(v, 1)}</b> ${T.perYear}<br>${e.latlng.lat.toFixed(2)}° N, ${e.latlng.lng.toFixed(2)}° E`, e.originalEvent.clientX, e.originalEvent.clientY); else hideTip();
    });
    map.on('mouseout', hideTip);
    map.on('mouseup', e => {
      if (!drawing || !drawStart) return; const b = L.latLngBounds(drawStart, e.latlng); endDraw();
      if (b.getEast() - b.getWest() < 0.15 || b.getNorth() - b.getSouth() < 0.15) return;
      const r = x => Math.round(x * 10) / 10;
      setAoi({ id: 'custom', box: [r(b.getSouth()), r(b.getNorth()), r(b.getWest()), r(b.getEast())] }, true);
    });
  }
  function setTiles() {
    const dark = matchMedia('(prefers-color-scheme: dark)').matches; if (tiles) map.removeLayer(tiles);
    tiles = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`, { subdomains: 'abcd', maxZoom: 12, attribution: '© OpenStreetMap, © CARTO · NASA FIRMS' }).addTo(map); tiles.bringToBack();
  }
  function endDraw() { drawing = false; drawStart = null; if (drawRect) { map.removeLayer(drawRect); drawRect = null; } map.dragging.enable(); $('map').classList.remove('drawing'); $('drawBtn').classList.remove('on'); $('drawBtn').textContent = T.draw; }
  const aoiName = a => a.id === 'all' ? T.whole : a.id === 'custom' ? `${T.custom} ${a.box[0]}–${a.box[1]}° N, ${a.box[2]}–${a.box[3]}° E` : a.name + T.approx;
  function renderMap(fit) {
    gCells.clearLayers(); gAoi.clearLayers();
    const vals = [...S.cells.values()].sort((a, b) => a - b), vmax = FP.quant(vals, 0.97) || 1, cols = [0, 1, 2, 3, 4, 5, 6].map(i => css('--h' + i));
    for (const [id, v] of S.cells) { const [la, lo] = FP.cellSW(D, id); L.rectangle([[la, lo], [la + D.res, lo + D.res]], { stroke: false, fillColor: cols[step(v, vmax)], fillOpacity: .85, interactive: false }).addTo(gCells); }
    const b = S.aoi.box; L.rectangle([[b[0], b[2]], [b[1], b[3]]], { color: css('--ink'), weight: 2, fill: false, interactive: false }).addTo(gAoi);
    if (fit) map.fitBounds([[b[0], b[2]], [b[1], b[3]]], { padding: [20, 20] });
    $('aoiInfo').textContent = T.cells(S.agg.nCells, aoiName(S.aoi));
    $('mapRamp').innerHTML = `${T.low} ${[1, 2, 3, 4, 5, 6].map(i => `<i style="background:var(--h${i})"></i>`).join('')} ${T.high} (≥ ${num(vmax, 0)} ${T.perYear})`;
  }

  /* ---------- zone et calculs ---------- */
  function fillAoi() {
    const list = S.aois.slice(); if (S.aoi && S.aoi.id === 'custom') list.push(S.aoi);
    $('aoiSel').innerHTML = list.map(a => `<option value="${esc(a.id)}">${esc(aoiName(a))}</option>`).join(''); $('aoiSel').value = S.aoi.id;
  }
  function setAoi(a, fit) {
    const agg = FP.aggregate(D, a.box); if (!agg.total) return;                       // zone vide : on garde la précédente
    S.aoi = a; S.agg = agg; S.mon = FP.monthly(D, agg); S.fys = FP.fireYears(S.mon); S.cal = FP.calendar(agg); S.st = FP.status(S.cal);
    S.cells = FP.cellMap(D, agg, S.month);
    const done = S.cal.years.filter(y => y.complete); if (S.sel < 0 || !S.cal.years[S.sel] || !S.cal.years[S.sel].n) S.sel = done.length ? done[done.length - 1].row : S.st.row;
    fillAoi(); renderMap(fit); renderAll();
  }
  function renderAll() { renderStatus(); renderKpis(); renderHeat(); renderSeason(); renderAnnual(); renderTable(); }

  /* ---------- situation et indicateurs ---------- */
  function renderStatus() {
    const st = S.st, col = ['var(--good)', 'var(--warn)', 'var(--crit)'][st.level], m = FP.monthToDate(D, S.agg);
    const out = st.next.map(n => `<div class="l${n.level}" data-tip="${esc(`<b>${T.lvl[n.level]}</b><br>${T.med} : ${num(n.med)} ${T.hs}<br>P90 : ${num(n.p90)}`)}">${pd(n.fy, n.p)}</div>`).join('');
    $('statusCard').innerHTML = `<h2>${T.stTitle(fmt(D.last, true))}</h2>
      <div><span class="pill"><i class="${st.level === 2 ? 'pulse' : ''}" style="background:${col}"></i>${T.lvl[st.level]}</span></div>
      <div class="big">${isNaN(m.ratio) ? T.cat[0] : T.mtdCat(m.pct)}</div>
      <div class="note">${T.mtd(fmt(m.from), fmt(m.to), num(m.value), num(100 * m.ratio), num(m.pct))}</div>
      <div class="note" style="margin-top:4px">${T.outlook}</div><div class="outlook">${out}</div>
      <div class="legend" style="margin-top:2px"><span><i class="sw box" style="background:var(--h0)"></i>${T.lvl[0]}</span><span><i class="sw box" style="background:var(--h2)"></i>${T.lvl[1]}</span><span><i class="sw box" style="background:var(--h4)"></i>${T.lvl[2]}</span></div>`;
  }
  function renderKpis() {
    const c = S.cal, f = S.fys, fy = c.fy0 + S.sel, sg = x => (x > 0 ? '+' : '−') + num(Math.abs(x), 1), k = [];
    const crit = S.mon.clim.filter(x => x.level === 2), order = crit.map(x => x.m).sort((a, b) => ((a + 12 - f.start) % 12) - ((b + 12 - f.start) % 12));
    k.push([T.kSeason, `${pd(fy, c.season.start)} → ${pd(fy, c.season.end)}`, T.kSeasonN(pd(fy, c.season.peakPos), order.map(m => T.months[m]).join(', '), num(100 * crit.reduce((s, x) => s + x.share, 0)))]);
    const full = S.mon.rows.filter(r => !r.partial), l = full[full.length - 1];
    k.push([T.kLast(`${T.months[l.m]} ${l.year}`), num(l.n), T.kLastN(num(100 * l.ratio), num(l.pct))]);
    const y = f.years.find(x => x.label === c.years[S.sel].label);
    k.push([T.kYear(c.years[S.sel].label), y ? num(y.total) : T.na, y && y.complete ? T.kYearN(num(100 * y.total / f.median)) : T.few]);
    k.push([T.kTrend, f.trend ? sg(f.trend.pct) + T.perYr : T.na, f.trend ? T.kTrendN(f.trend.p < 0.001 ? '< 0,001'.replace(',', lang === 'fr' ? ',' : '.') : '= ' + num(f.trend.p, 3), f.trend.n) : T.few]);
    $('kpis').innerHTML = k.map(x => `<div class="kpi"><div class="k">${x[0]}</div><div class="v">${x[1]}</div><div class="n">${x[2]}</div></div>`).join('');
  }

  /* ---------- calendrier ---------- */
  function ticks(fy) { const out = []; let last = -1; for (let p = 0; p < W; p++) { const m = FP.dateOf(FP.posToDay(S.cal, fy, p) + 3).getUTCMonth(); if (m !== last) { out.push([p, m]); last = m; } } return out.filter((t, i) => i === out.length - 1 ? W - t[0] >= 2 : out[i + 1][0] - t[0] >= 3); }
  function renderHeat() {
    const c = S.cal, rows = c.years.filter(y => y.n > 0), cw = 13.5, ch = 15, Lm = 104, top = 40, wd = Lm + W * cw + 8, ht = top + rows.length * ch + 6, all = [];
    for (const y of rows) for (let p = 0; p < W; p++) if (c.mat[y.row][p] > 0.5) all.push(c.mat[y.row][p]);
    all.sort((a, b) => a - b); const vmax = FP.quant(all, 0.97) || 1;
    let s = `<svg viewBox="0 0 ${wd} ${ht}" role="img" aria-label="${esc(T.calTitle)}">`;
    for (const [p, m] of ticks(c.fy0 + S.sel)) s += `<text x="${Lm + p * cw + 1}" y="11">${T.months[m]}</text>`;
    s += `<text x="${Lm - 8}" y="29" text-anchor="end">${T.typical}</text>`;
    for (let p = 0; p < W; p++) s += `<rect class="cell" x="${Lm + p * cw}" y="19" width="${cw}" height="13" rx="2" fill="var(--h${[0, 2, 4][c.level[p]]})" data-tip="${esc(`<b>${T.lvl[c.level[p]]}</b><br>${T.week} ${pd(c.fy0 + S.sel, p)}<br>${T.med} : ${num(c.clim.med[p])} ${T.hs}`)}"/>`;
    rows.forEach((y, i) => {
      const yy = top + i * ch, stl = SRC_STYLE[y.src] || ['--ink3', 1];
      s += `<text class="ylab${y.row === S.sel ? ' t1' : ''}" data-row="${y.row}" x="${Lm - 8}" y="${yy + 11}" text-anchor="end" tabindex="0" role="button">${y.label}</text><rect x="${Lm - 5}" y="${yy + 1}" width="3" height="${ch - 2}" fill="var(${stl[0]})" opacity="${stl[1]}"/>`;
      for (let p = 0; p < W; p++) {
        const v = c.mat[y.row][p]; if (isNaN(v)) continue; const cat = c.cat[y.row][p];
        const fill = S.mode === 'act' ? `var(--h${step(v < 0.5 ? 0 : v, vmax)})` : `var(--${cat < 0 ? 'dm' + (-cat) : cat > 0 ? 'dp' + cat : 'd0'})`;
        s += `<rect class="cell" data-row="${y.row}" x="${Lm + p * cw}" y="${yy}" width="${cw}" height="${ch}" rx="2" fill="${fill}" data-tip="${esc(`<b>${T.week} ${pd(y.fy, p, true)}</b><br>${T.act} : <b>${num(v)}</b> ${T.hs}<br>${T.med} : ${num(c.clim.med[p])}<br>${T.cat[cat]}<br>${T.src} : ${T.srcName[c.srcMat[y.row][p]]}`)}"/>`;
      }
      if (y.row === S.sel) s += `<rect class="rowsel" x="${Lm - .5}" y="${yy - .5}" width="${W * cw + 1}" height="${ch + 1}" rx="3" pointer-events="none"/>`;
    });
    $('heat').innerHTML = s + '</svg>';
    const srcs = [...new Set(rows.map(y => y.src))].filter(Boolean);
    $('heatLegend').innerHTML = (S.mode === 'act'
      ? `<span class="ramp">${T.less} ${[0, 1, 2, 3, 4, 5, 6].map(i => `<i style="background:var(--h${i})"></i>`).join('')} ${T.more} (≥ ${num(vmax)} ${T.hs})</span>`
      : `<span class="ramp">${T.cat[-3]} ${['dm3', 'dm2', 'dm1', 'd0', 'dp1', 'dp2', 'dp3'].map(k => `<i style="background:var(--${k})"></i>`).join('')} ${T.cat[3]}</span>`)
      + `<span>${T.stripe} :</span>` + srcs.map(k => `<span><i class="sw box" style="width:4px;background:var(${SRC_STYLE[k][0]});opacity:${SRC_STYLE[k][1]}"></i>${T.srcName[k]}</span>`).join('');
    $('modeAct').classList.toggle('on', S.mode === 'act'); $('modeAno').classList.toggle('on', S.mode === 'ano');
  }

  /* ---------- saison ---------- */
  function renderSeason() {
    const c = S.cal, y = c.years[S.sel], row = c.mat[S.sel], wd = 560, ht = 280, Lm = 48, R = 10, Tm = 10, B = 42, pw = wd - Lm - R, ph = ht - Tm - B;
    $('seasTitle').textContent = T.seasTitle(y.label);
    let mx = 0; for (let p = 0; p < W; p++) mx = Math.max(mx, c.clim.p90[p] || 0, row[p] || 0); mx = niceMax(mx);
    const X = p => Lm + (p + .5) * pw / W, Y = v => Tm + ph - v / mx * ph;
    const path = arr => { let d = '', pen = false; for (let p = 0; p < W; p++) { const v = arr[p]; if (v == null || isNaN(v)) { pen = false; continue; } d += (pen ? 'L' : 'M') + X(p).toFixed(1) + ' ' + Y(v).toFixed(1); pen = true; } return d; };
    let band = ''; for (let p = 0; p < W; p++) band += (p ? 'L' : 'M') + X(p).toFixed(1) + ' ' + Y(c.clim.p75[p] || 0).toFixed(1); for (let p = W - 1; p >= 0; p--) band += 'L' + X(p).toFixed(1) + ' ' + Y(c.clim.p25[p] || 0).toFixed(1);
    let s = `<svg viewBox="0 0 ${wd} ${ht}" role="img" aria-label="${esc(T.seasTitle(y.label))}">`;
    for (let i = 0; i <= 4; i++) { const v = mx * i / 4; s += `<line class="grid" x1="${Lm}" x2="${wd - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${Lm - 6}" y="${Y(v) + 4}" text-anchor="end">${num(v)}</text>`; }
    for (let p = 0; p < W; p++) s += `<rect x="${Lm + p * pw / W}" y="${Tm + ph + 3}" width="${pw / W + .3}" height="5" fill="var(--h${[0, 2, 4][c.level[p]]})"/>`;
    for (const [p, m] of ticks(y.fy)) s += `<text x="${Lm + p * pw / W + 1}" y="${ht - 16}">${T.months[m]}</text>`;
    s += `<text x="${Lm}" y="${ht - 2}">${T.perWeek}</text><path d="${band}Z" fill="var(--ink3)" opacity=".22"/><path d="${path(c.clim.p90)}" fill="none" stroke="var(--ink3)" stroke-width="1" stroke-dasharray="2 3"/><path d="${path(c.clim.med)}" fill="none" stroke="var(--ink2)" stroke-width="1.5"/><path d="${path(row)}" fill="none" stroke="var(--viirs)" stroke-width="2.5" stroke-linejoin="round"/>`;
    for (let p = 0; p < W; p++) { const v = row[p]; s += `<rect class="hit" x="${Lm + p * pw / W}" y="${Tm}" width="${pw / W}" height="${ph}" data-tip="${esc(`<b>${T.week} ${pd(y.fy, p, !isNaN(v))}</b>` + (isNaN(v) ? '' : `<br>${y.label} : <b>${num(v)}</b> ${T.hs}<br>${T.cat[c.cat[S.sel][p]]}`) + `<br>${T.med} : ${num(c.clim.med[p])}<br>P25–P75 : ${num(c.clim.p25[p])} – ${num(c.clim.p75[p])}<br>P90 : ${num(c.clim.p90[p])}`)}"/>`; }
    $('seas').innerHTML = s + '</svg>';
    $('seasLegend').innerHTML = `<span><i class="sw" style="background:var(--viirs)"></i>${T.lgSel} (${y.label})</span><span><i class="sw" style="background:var(--ink2)"></i>${T.lgMed}</span><span><i class="sw box" style="background:var(--ink3);opacity:.35"></i>${T.lgBand}</span><span><i class="sw" style="background:repeating-linear-gradient(90deg,var(--ink3) 0 2px,transparent 2px 5px)"></i>${T.lgP90}</span><span><i class="sw box" style="background:linear-gradient(90deg,var(--h0) 33%,var(--h2) 33% 66%,var(--h4) 66%)"></i>${T.lgLevel}</span>`;
  }

  /* ---------- tendance ---------- */
  function renderAnnual() {
    const f = S.fys, ys = f.done, wd = 560, ht = 280, Lm = 48, R = 14, Tm = 16, B = 28, pw = wd - Lm - R, ph = ht - Tm - B;
    if (ys.length < 2) { $('ann').innerHTML = `<p class="note">${T.few}</p>`; $('annLegend').innerHTML = ''; return; }
    const mx = niceMax(Math.max(...ys.map(y => Math.max(y.total, y.raw)))), X = i => Lm + (i + .5) * pw / ys.length, Y = v => Tm + ph - Math.max(0, v) / mx * ph;
    const line = g => 'M' + ys.map((y, i) => X(i).toFixed(1) + ' ' + Y(g(y)).toFixed(1)).join('L'), sel = S.cal.years[S.sel].label;
    let s = `<svg viewBox="0 0 ${wd} ${ht}" role="img" aria-label="${esc(T.annTitle)}">`;
    for (let i = 0; i <= 4; i++) { const v = mx * i / 4; s += `<line class="grid" x1="${Lm}" x2="${wd - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${Lm - 6}" y="${Y(v) + 4}" text-anchor="end">${num(v)}</text>`; }
    const iv = ys.findIndex(y => y.src === 'S' || y.src === 'J');
    if (iv > 0) { const x = (X(iv - 1) + X(iv)) / 2; s += `<line class="axis" x1="${x}" x2="${x}" y1="${Tm}" y2="${Tm + ph}" stroke-dasharray="4 3"/><text x="${x + 5}" y="${Tm + 9}">${T.viirs} →</text>`; }
    ys.forEach((y, i) => { if (i % Math.ceil(ys.length / 8) === 0) s += `<text x="${X(i)}" y="${ht - 8}" text-anchor="middle">${y.label}</text>`; });
    s += `<path d="${line(y => y.raw)}" fill="none" stroke="var(--modis)" stroke-width="2" stroke-dasharray="5 4"/>`;
    if (f.trend) s += `<path d="M${X(0)} ${Y(f.trend.intercept + f.trend.slope * ys[0].fy)}L${X(ys.length - 1)} ${Y(f.trend.intercept + f.trend.slope * ys[ys.length - 1].fy)}" stroke="var(--ink2)" stroke-width="1.5" stroke-dasharray="2 3" fill="none"/>`;
    s += `<path d="${line(y => y.total)}" fill="none" stroke="var(--viirs)" stroke-width="2.5" stroke-linejoin="round"/>`;
    ys.forEach((y, i) => { s += `<rect x="${X(i) - 3}" y="${Y(y.raw) - 3}" width="6" height="6" fill="var(--modis)" stroke="var(--surface)" stroke-width="1.5"/><circle cx="${X(i)}" cy="${Y(y.total)}" r="${y.label === sel ? 5.5 : 4}" fill="var(--viirs)" stroke="var(--surface)" stroke-width="2"/>`; });
    ys.forEach((y, i) => { s += `<rect class="hit" data-label="${y.label}" x="${Lm + i * pw / ys.length}" y="${Tm}" width="${pw / ys.length}" height="${ph}" data-tip="${esc(`<b>${y.label}</b><br>${T.lgHarm} : <b>${num(y.total)}</b><br>${T.lgRaw} : ${num(y.raw)}<br>${T.src} : ${T.srcName[y.src]}`)}"/>`; });
    $('ann').innerHTML = s + '</svg>';
    $('annLegend').innerHTML = `<span><i class="sw" style="background:var(--viirs)"></i>${T.lgHarm}</span><span><i class="sw" style="background:repeating-linear-gradient(90deg,var(--modis) 0 5px,transparent 5px 9px)"></i>${T.lgRaw}</span><span><i class="sw" style="background:repeating-linear-gradient(90deg,var(--ink2) 0 2px,transparent 2px 5px)"></i>${T.lgTs}</span>`;
  }
  function renderTable() {
    const f = S.fys;
    $('annTable').innerHTML = `<table><thead><tr><th>${T.tY}</th><th>${T.tTot}</th><th>${T.tRaw}</th><th>${T.tPct}</th><th>${T.tSrc}</th></tr></thead><tbody>` + f.done.map(y => `<tr><td>${y.label}</td><td>${num(y.total)}</td><td>${num(y.raw)}</td><td>${num(100 * y.total / f.median)}${pc()}</td><td>${T.srcName[y.src]}</td></tr>`).join('') + '</tbody></table>';
  }

  /* ---------- textes fixes, infobulle, événements ---------- */
  const tip = $('tip');
  function showTip(html, x, y) { tip.innerHTML = html; tip.style.display = 'block'; const r = tip.getBoundingClientRect(); tip.style.left = Math.max(4, Math.min(innerWidth - r.width - 4, x + 14)) + 'px'; tip.style.top = (y + r.height + 20 > innerHeight ? y - r.height - 10 : y + 16) + 'px'; }
  function hideTip() { tip.style.display = 'none'; }
  document.addEventListener('mousemove', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) showTip(el.getAttribute('data-tip'), e.clientX, e.clientY); else if (!e.target.closest || !e.target.closest('#map')) hideTip(); });
  function pickRow(e) { const el = e.target.closest && e.target.closest('[data-row]'); if (!el) return; S.sel = +el.getAttribute('data-row'); renderAll(); }
  $('heat').addEventListener('click', pickRow);
  $('heat').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickRow(e); } });
  $('ann').addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-label]'); if (!el) return; const y = S.cal.years.find(x => x.label === el.getAttribute('data-label')); if (y) { S.sel = y.row; renderAll(); } });
  function applyLang() {
    T = I18N[lang]; document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = T[el.getAttribute('data-i18n')]; });
    $('methList').innerHTML = T.meth.map(x => `<li>${x}</li>`).join(''); $('limList').innerHTML = T.lim.map(x => `<li>${x}</li>`).join(''); $('valFacts').innerHTML = T.vFacts.map(x => `<li>${x}</li>`).join('');
    $('valTable').innerHTML = `<thead><tr><th>${T.vM}</th><th>${T.vL}</th><th>${T.vB}</th></tr></thead><tbody>` + T.vRows.map((r, i) => `<tr${i === 3 ? ' class="best"' : ''}><td>${r}</td><td>${VAL[i][0]}${pc()}</td><td>${VAL[i][1]}${pc()}</td></tr>`).join('') + '</tbody>';
    $('valImg').alt = T.valCap;
    $('monthSel').innerHTML = `<option value="0">${T.allMonths}</option>` + T.months.map((m, i) => `<option value="${i + 1}">${m}</option>`).join(''); $('monthSel').value = S.month;
    $('lgfr').classList.toggle('on', lang === 'fr'); $('lgen').classList.toggle('on', lang === 'en');
    if (D) { $('storyTrend').textContent = S.story; fillAoi(); renderMap(false); renderAll(); }
  }
  const setLang = l => { lang = l; try { localStorage.setItem('fp-lang', l); } catch (e) { } if (D) S.story = storyText(); applyLang(); };
  $('lgfr').onclick = () => setLang('fr'); $('lgen').onclick = () => setLang('en');
  $('modeAct').onclick = () => { S.mode = 'act'; renderHeat(); }; $('modeAno').onclick = () => { S.mode = 'ano'; renderHeat(); };
  $('aoiSel').onchange = e => { const a = S.aois.find(x => x.id === e.target.value); if (a) setAoi(a, true); };
  $('monthSel').onchange = e => { S.month = +e.target.value; S.cells = FP.cellMap(D, S.agg, S.month); renderMap(false); };
  $('drawBtn').onclick = () => { if (drawing) return endDraw(); drawing = true; map.dragging.disable(); $('map').classList.add('drawing'); $('drawBtn').classList.add('on'); $('drawBtn').textContent = T.drawing; };
  function download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
  $('dlWeek').onclick = () => download('firepulse_weekly.csv', FP.weeklyCSV(S.agg, S.cal));
  $('dlMonth').onclick = () => download('firepulse_monthly.csv', FP.monthlyCSV(S.mon));
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (map) { setTiles(); renderMap(false); } }); } catch (e) { }
  let whole = null;
  function storyText() { const t = whole && whole.trend; return t ? (t.pct > 0 ? '+' : '−') + num(Math.abs(t.pct), 1) + pc() : T.na; }

  applyLang();
  fetch('data/firepulse.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(j => {
    D = FP.load(j);
    S.aois = [{ id: 'all', box: D.bbox }].concat(REGIONS.filter(r => r[1] < D.bbox[1] && r[2] > D.bbox[0]).map(r => ({ id: 'r:' + r[0], name: r[0], box: [Math.max(r[1], D.bbox[0]), Math.min(r[2], D.bbox[1]), D.bbox[2], D.bbox[3]] })));
    whole = FP.fireYears(FP.monthly(D, FP.aggregate(D, D.bbox))); S.story = storyText();
    $('loading').hidden = true; $('app').hidden = false; initMap(); setAoi(S.aois[0], true); applyLang();
  }).catch(() => { $('loading').className = 'err'; $('loading').innerHTML = T.loadErr; });
  window.FPUI = { S, setLang };
})();
