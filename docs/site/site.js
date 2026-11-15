/* FIREPULSE — interface des trois pages (Accueil, Explorer, Méthode et données), d'après la maquette de l'équipe.
   Les calculs sont dans core.js ; les données viennent de site/firepulse.json et site/validation.json. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), page = document.body.dataset.page;
  const I18N = {
    fr: {
      navAria: 'Menu principal', navHome: 'Accueil', navExplorer: 'Explorer', navMethod: 'Méthode et données',
      foot1: 'Données : NASA FIRMS (MODIS / VIIRS 375 m). Projet d’équipe ; les résultats n’engagent pas la NASA.', foot2: 'Équipe FIREPULSE · NASA Space Apps Challenge 2026 · Lomé',
      loadErr: 'Les données n’ont pas pu être chargées. En local, lancez <code>python -m http.server</code> dans le dossier <code>docs/</code>.',
      months: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
      monthsLong: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
      hs: 'hotspots', median: 'médiane', percentile: 'percentile', partial: 'mois partiel', nodata: 'pas de données', ord: n => n + '<small>e</small>', west: 'O',
      calm: 'calme', veryActive: 'très actif', few: 'peu', many: 'beaucoup', below: 'sous la normale', above: 'au-dessus',
      countries: { Ghana: 'Ghana', Benin: 'Bénin', Burkina: 'Burkina Faso', gulf: 'Golfe de Guinée' },
      // accueil
      heroTitle: n => `${n} ans de feux vus de l’espace, en une seule série.`,
      heroLead: 'Les satellites MODIS et VIIRS ne comptent pas les feux de la même façon. FIREPULSE les raccorde pour comparer chaque mois à son historique, partout au Togo.',
      ctaExplore: 'Explorer la carte', ctaMethod: 'Lire la méthode', heroSmall: 'NASA Space Apps Challenge 2026 · Lomé · Données : NASA FIRMS (MODIS / VIIRS 375 m)',
      legHome: 'Hotspots par case de 0,1° · moyenne annuelle',
      bandCap: (m, y, a, b, part) => part ? `Ce mois-ci · ${m} ${y}, du ${a === 1 ? '1er' : a} au ${b}` : `Dernier mois · ${m} ${y}`,
      bandHead: p => p <= 25 ? 'Le Togo brûle moins que d’habitude.' : p >= 75 ? 'Le Togo brûle plus que d’habitude.' : 'Le Togo brûle à peu près comme d’habitude.',
      bandSub: 'Comparé aux mêmes jours des années 2001 à 2025. Données quasi temps réel, susceptibles d’évoluer.',
      bandT1: 'hotspots détectés', bandT2: 'de la médiane historique', bandT3: 'percentile',
      whyTitle: 'Pourquoi harmoniser ?',
      why1k: '01 · Le problème', why1v: '× 4 à 5', why1t: 'VIIRS (depuis 2012) détecte quatre à cinq fois plus de feux que MODIS (depuis 2000). Collées bout à bout, les deux séries inventent une hausse en 2012.',
      why2k: '02 · La preuve', why2v: 'r = 0,995', why2t: 'Testée sur des années jamais vues par le modèle, la série harmonisée suit le VIIRS réel, avec 5 % d’erreur annuelle en moyenne.',
      why3k: '03 · Le résultat', perYear: ' % / an',
      why3t: down => down ? 'Une fois les capteurs raccordés, l’activité des feux au Togo baisse depuis 2001. Elle ne triple pas en 2012.' : 'Une fois les capteurs raccordés, la tendance des feux au Togo depuis 2001 se lit sans le faux saut de 2012.',
      calTitle: 'Le calendrier de brûlage', calLead: (a, b) => `Chaque case est un mois. La saison des feux revient chaque année de ${a} à ${b}.`, calLink: 'Ouvrir le calendrier pour ma zone →',
      calNote: (a, b) => `Années de feu, de ${a} à ${b} · MODIS recalé jusqu’en janvier 2012, VIIRS ensuite`,
      // explorer
      p1: '1 · Zone d’intérêt', zAll: 'Tout le Togo', zRegion: 'Région', zRect: 'Rectangle', regionLbl: 'Région', regionNote: 'Bandes de latitude approximatives, pas les limites administratives.',
      north: 'Nord', south: 'Sud', east: 'Est', westL: 'Ouest', badBox: 'Rectangle invalide : il faut Sud < Nord et Ouest < Est.', emptyBox: 'Aucun feu dans cette zone. La zone précédente est conservée.', rectHint: 'Modifiez les valeurs ou dessinez un rectangle sur la carte.',
      p2: '2 · Affichage', mAct: 'Activité', mAno: 'Anomalies', monthLbl: 'Mois affiché sur la carte', allYear: 'Toute l’année (moyenne 2001–2025)', meanOf: m => `${m} (moyenne 2001–2025)`,
      sitCap: (m, y, a, b, part) => part ? `3 · Situation · ${m} ${y}, du ${a === 1 ? '1er' : a} au ${b}` : `3 · Situation · ${m} ${y}`,
      sitPill: p => p <= 10 ? 'Très sous la normale' : p <= 25 ? 'Sous la normale' : p >= 90 ? 'Très au-dessus de la normale' : p >= 75 ? 'Au-dessus de la normale' : 'Dans la normale',
      sitUnit: 'hotspots dans la zone', twice: '2 × médiane', ofMedian: 'de la médiane',
      p4: '4 · Export', dlMonth: 'Télécharger le CSV de la zone', dlNote: 'Série mensuelle harmonisée. Aussi :', dlWeek: 'série hebdomadaire', dlHot: 'hotspots individuels',
      mapAria: 'Carte', zoomIn: 'Zoom avant', zoomOut: 'Zoom arrière', draw: 'Dessiner une zone', drawing: 'Tracez un rectangle…',
      mapLeg: s => `Hotspots par case de 0,1° · ${s}`, perYr: 'par an', perYrU: 'hotspots/an',
      yearLbl: 'Année', seasTitle: y => `Saison ${y} face à l’historique`, seasSub: 'Activité par semaine de l’année choisie, comparée à la médiane et aux percentiles de toutes les années.',
      lgSel: y => `Saison ${y}`, lgMed: 'Médiane', lgBand: 'P25 à P75', lgP90: 'P90', perWeek: 'hotspots / semaine', week: 'Semaine du',
      annTitle: 'Tendance : harmonisé contre brut', annSub: 'Total par année de feu. Le comptage brut bondit à l’arrivée de VIIRS en 2012 ; la série harmonisée exprime toute la période en équivalent VIIRS.',
      lgHarm: 'Série harmonisée', lgRaw: 'Comptage brut (MODIS puis VIIRS)', lgTs: t => `Tendance : ${t} par an`, viirsIn: 'Arrivée de VIIRS', few2: 'Pas assez d’années complètes dans cette zone.',
      calTitleZone: z => `Calendrier de brûlage · ${z}`, zoneAll: 'Tout le Togo', zoneRect: 'Rectangle', calHelp: 'Cliquer une case pour voir le mois sur la carte. Hachures : mois sans données ou à venir.',
      // méthode
      mEyebrow: 'Méthode · Validation · Limites · Données', mTitle: 'Comment on raccorde deux satellites.',
      mLead: 'MODIS observe depuis 2000 à 1 km de résolution, VIIRS depuis 2012 à 375 m. Nous apprenons la relation entre les deux sur leurs années communes, puis nous l’appliquons au passé.',
      st1n: 'Étape 1', st1h: 'Filtrer', st1t: 'Feux de végétation seulement, confiance MODIS ≥ 30, VIIRS nominale ou haute. Il reste 1,06 million de hotspots.',
      st2n: 'Étape 2', st2h: 'Mettre sur une grille', st2t: 'Comptage par mois et par case de 0,1° (environ 11 km), pour atténuer l’écart de résolution entre capteurs.',
      st3n: 'Étape 3', st3h: 'Calibrer', st3t: 'Quantile mapping MODIS → VIIRS appris sur 2012–2025. Calibration à part avant septembre 2002, quand seul Terra observait.',
      st4n: 'Étape 4', st4h: 'Passer le relais', st4t: 'S-NPP s’est arrêté le 2 novembre 2026. NOAA-20 continue la série, corrigé d’un ratio de 1,004 mesuré sur 2018–2025.',
      prTitle: 'La preuve, hors échantillon', prLead: 'Chaque année de 2013 à 2025 est estimée par un modèle entraîné sans elle, puis comparée au VIIRS réel.',
      pr1v: '0,995', pr1t: 'corrélation mensuelle', pr2v: '5,0 %', pr2t: 'erreur annuelle moyenne', pr3v: '− 2,8 %', pr3t: 'écart sur le total 2013–2025',
      vReal: 'VIIRS S-NPP réel', vPred: 'MODIS recalé, hors échantillon', vRaw: 'MODIS brut', vY: 'hotspots / mois, Togo', vAria: 'Série mensuelle estimée contre VIIRS réel', vFwd: 'test en avant', vNote: (a, b, e) => `Zone grisée, de ${a} à ${b} : test en avant. Le modèle, entraîné sur 2012–2025, est appliqué à des mois qu’il n’a jamais vus, en données quasi temps réel. Écart sur le total : ${e}. Les trois chiffres ci-dessus portent sur 2013–2025.`,
      cmpTitle: 'Quatre méthodes comparées', cmpLead: 'Erreur mensuelle sur les mois actifs. Plus c’est bas, mieux c’est.', cmpH: ['Méthode', 'Une année retirée', 'Testé sur 2012–2017'],
      cmpRows: ['Ratio global', 'Ratio par mois', 'Ratio par mois + tendance', 'Quantile mapping (retenue)'],
      limTitle: 'Ce que la méthode ne sait pas faire',
      lims: [['Biais régional', 'La calibration est nationale. Elle surestime dans le centre-nord-ouest et sous-estime vers le centre-sud.'], ['Incertitude mensuelle', 'Environ 17 % par mois : les deux instruments ne voient pas exactement les mêmes feux.'], ['2000–2011 invérifiable', 'VIIRS n’existait pas. Le test le plus proche, sur 2012–2017, donne 16 % d’erreur.'], ['Chiffres récents provisoires', 'Les données quasi temps réel de 2026 seront retraitées par FIRMS et peuvent bouger.']],
      dlTitle: 'Télécharger les données', dlLead: 'Fichiers CSV ouverts, prêts à l’emploi. Source : NASA FIRMS.',
      dls: [['Série harmonisée', 'harmonized_monthly.csv', 'Par case de 0,1° et par mois, 2000 → 2026'], ['Anomalies du Togo', 'anomalies_togo_monthly.csv', 'Médiane, ratio et percentile par mois'], ['Hotspots nettoyés', 'hotspots_clean.csv.gz', '1,06 million de détections individuelles']]
    },
    en: {
      navAria: 'Main menu', navHome: 'Home', navExplorer: 'Explore', navMethod: 'Method and data',
      foot1: 'Data: NASA FIRMS (MODIS / VIIRS 375 m). Team project; results do not represent NASA.', foot2: 'FIREPULSE team · NASA Space Apps Challenge 2026 · Lomé',
      loadErr: 'The data could not be loaded. Locally, run <code>python -m http.server</code> in the <code>docs/</code> folder.',
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      monthsLong: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      hs: 'hotspots', median: 'median', percentile: 'percentile', partial: 'partial month', nodata: 'no data', ord: n => n + '<small>' + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th') + '</small>', west: 'W',
      calm: 'quiet', veryActive: 'very active', few: 'few', many: 'many', below: 'below normal', above: 'above',
      countries: { Ghana: 'Ghana', Benin: 'Benin', Burkina: 'Burkina Faso', gulf: 'Gulf of Guinea' },
      heroTitle: n => `${n} years of fires seen from space, in a single record.`,
      heroLead: 'The MODIS and VIIRS satellites do not count fires the same way. FIREPULSE joins them so that every month can be compared with its history, anywhere in Togo.',
      ctaExplore: 'Explore the map', ctaMethod: 'Read the method', heroSmall: 'NASA Space Apps Challenge 2026 · Lomé · Data: NASA FIRMS (MODIS / VIIRS 375 m)',
      legHome: 'Hotspots per 0.1° cell · yearly mean',
      bandCap: (m, y, a, b, part) => part ? `This month · ${m} ${a}–${b}, ${y}` : `Latest month · ${m} ${y}`,
      bandHead: p => p <= 25 ? 'Togo is burning less than usual.' : p >= 75 ? 'Togo is burning more than usual.' : 'Togo is burning about as usual.',
      bandSub: 'Compared with the same days of 2001 to 2025. Near-real-time data, subject to change.',
      bandT1: 'hotspots detected', bandT2: 'of the historical median', bandT3: 'percentile',
      whyTitle: 'Why harmonize?',
      why1k: '01 · The problem', why1v: '× 4 to 5', why1t: 'VIIRS (since 2012) detects four to five times more fires than MODIS (since 2000). Joined end to end, the two records invent a rise in 2012.',
      why2k: '02 · The proof', why2v: 'r = 0.995', why2t: 'Tested on years the model never saw, the harmonized record follows the real VIIRS, with 5% yearly error on average.',
      why3k: '03 · The result', perYear: '% / yr',
      why3t: down => down ? 'Once the sensors are joined, fire activity in Togo has been falling since 2001. It does not triple in 2012.' : 'Once the sensors are joined, the fire trend in Togo since 2001 reads without the false jump of 2012.',
      calTitle: 'The burning calendar', calLead: (a, b) => `Each cell is a month. The fire season returns every year from ${a} to ${b}.`, calLink: 'Open the calendar for my area →',
      calNote: (a, b) => `Fire years, from ${a} to ${b} · MODIS calibrated until January 2012, VIIRS after`,
      p1: '1 · Area of interest', zAll: 'All of Togo', zRegion: 'Region', zRect: 'Rectangle', regionLbl: 'Region', regionNote: 'Approximate latitude bands, not administrative boundaries.',
      north: 'North', south: 'South', east: 'East', westL: 'West', badBox: 'Invalid rectangle: South must be below North and West below East.', emptyBox: 'No fires in this area. The previous area is kept.', rectHint: 'Edit the values or draw a rectangle on the map.',
      p2: '2 · Display', mAct: 'Activity', mAno: 'Anomalies', monthLbl: 'Month shown on the map', allYear: 'Whole year (2001–2025 mean)', meanOf: m => `${m} (2001–2025 mean)`,
      sitCap: (m, y, a, b, part) => part ? `3 · Status · ${m} ${a}–${b}, ${y}` : `3 · Status · ${m} ${y}`,
      sitPill: p => p <= 10 ? 'Far below normal' : p <= 25 ? 'Below normal' : p >= 90 ? 'Far above normal' : p >= 75 ? 'Above normal' : 'Near normal',
      sitUnit: 'hotspots in the area', twice: '2 × median', ofMedian: 'of the median',
      p4: '4 · Export', dlMonth: 'Download the CSV for this area', dlNote: 'Harmonized monthly series. Also:', dlWeek: 'weekly series', dlHot: 'individual hotspots',
      mapAria: 'Map', zoomIn: 'Zoom in', zoomOut: 'Zoom out', draw: 'Draw an area', drawing: 'Drag a rectangle…',
      mapLeg: s => `Hotspots per 0.1° cell · ${s}`, perYr: 'per year', perYrU: 'hotspots/yr',
      yearLbl: 'Year', seasTitle: y => `Season ${y} against the record`, seasSub: 'Weekly activity of the chosen year, compared with the median and percentiles of all years.',
      lgSel: y => `Season ${y}`, lgMed: 'Median', lgBand: 'P25 to P75', lgP90: 'P90', perWeek: 'hotspots / week', week: 'Week of',
      annTitle: 'Trend: harmonized against raw', annSub: 'Total per fire year. The raw count jumps when VIIRS arrives in 2012; the harmonized series expresses the whole period in VIIRS equivalent.',
      lgHarm: 'Harmonized series', lgRaw: 'Raw count (MODIS then VIIRS)', lgTs: t => `Trend: ${t} per year`, viirsIn: 'VIIRS arrives', few2: 'Not enough complete years in this area.',
      calTitleZone: z => `Burning calendar · ${z}`, zoneAll: 'All of Togo', zoneRect: 'Rectangle', calHelp: 'Click a cell to see that month on the map. Hatching: months with no data or still to come.',
      mEyebrow: 'Method · Validation · Limits · Data', mTitle: 'How we join two satellites.',
      mLead: 'MODIS has observed since 2000 at 1 km resolution, VIIRS since 2012 at 375 m. We learn the relation between the two over their common years, then apply it to the past.',
      st1n: 'Step 1', st1h: 'Filter', st1t: 'Vegetation fires only, MODIS confidence ≥ 30, VIIRS nominal or high. 1.06 million hotspots remain.',
      st2n: 'Step 2', st2h: 'Put on a grid', st2t: 'Counts per month and per 0.1° cell (about 11 km), to soften the resolution gap between sensors.',
      st3n: 'Step 3', st3h: 'Calibrate', st3t: 'Quantile mapping MODIS → VIIRS learned over 2012–2025. Separate calibration before September 2002, when Terra observed alone.',
      st4n: 'Step 4', st4h: 'Hand over', st4t: 'S-NPP stopped on 2 November 2026. NOAA-20 continues the record, corrected by a ratio of 1.004 measured over 2018–2025.',
      prTitle: 'The proof, out of sample', prLead: 'Each year from 2013 to 2025 is estimated by a model trained without it, then compared with the real VIIRS.',
      pr1v: '0.995', pr1t: 'monthly correlation', pr2v: '5.0%', pr2t: 'mean yearly error', pr3v: '− 2.8%', pr3t: 'gap on the 2013–2025 total',
      vReal: 'Real VIIRS S-NPP', vPred: 'Calibrated MODIS, out of sample', vRaw: 'Raw MODIS', vY: 'hotspots / month, Togo', vAria: 'Estimated monthly series against real VIIRS', vFwd: 'forward test', vNote: (a, b, e) => `Shaded area, ${a} to ${b}: forward test. The model, trained on 2012–2025, is applied to months it never saw, in near-real-time data. Gap on the total: ${e}. The three figures above cover 2013–2025.`,
      cmpTitle: 'Four methods compared', cmpLead: 'Monthly error on active months. Lower is better.', cmpH: ['Method', 'Leave one year out', 'Tested on 2012–2017'],
      cmpRows: ['Global ratio', 'Ratio per month', 'Ratio per month + trend', 'Quantile mapping (chosen)'],
      limTitle: 'What the method cannot do',
      lims: [['Regional bias', 'The calibration is national. It overestimates in the centre-north-west and underestimates toward the centre-south.'], ['Monthly uncertainty', 'About 17% per month: the two instruments do not see exactly the same fires.'], ['2000–2011 cannot be checked', 'VIIRS did not exist. The closest test, on 2012–2017, gives 16% error.'], ['Recent figures are provisional', 'The near-real-time data of 2026 will be reprocessed by FIRMS and may change.']],
      dlTitle: 'Download the data', dlLead: 'Open CSV files, ready to use. Source: NASA FIRMS.',
      dls: [['Harmonized series', 'harmonized_monthly.csv', 'Per 0.1° cell and per month, 2000 → 2026'], ['Togo anomalies', 'anomalies_togo_monthly.csv', 'Median, ratio and percentile per month'], ['Cleaned hotspots', 'hotspots_clean.csv.gz', '1.06 million individual detections']]
    }
  };
  const CMP = [[35, 36], [18, 24], [18, 21], [17, 16]];                                 // docs/METHODE.md
  const REGIONS = [['Savanes', 10.0, 11.2], ['Kara', 9.2, 10.0], ['Centrale', 8.2, 9.2], ['Plateaux', 6.8, 8.2], ['Maritime', 6.0, 6.8]];
  const CITIES = [['Lomé', 6.13, 1.22, true], ['Kara', 9.55, 1.19], ['Sokodé', 8.98, 1.13], ['Dapaong', 10.86, 0.21]];
  const RAMP = ['#E6ECE3', '#F7E3B5', '#F3C06F', '#EC8F3B', '#DB5A1F', '#A93212', '#611B0C'];
  const DIV = { '-3': '#1D5FA8', '-2': '#6FA8DC', '-1': '#BBD9F2', 0: '#E6ECE3', 1: '#F3C06F', 2: '#DB5A1F', 3: '#8A2410' };
  let lang = (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  try { lang = localStorage.getItem('fp-lang') || lang; } catch (e) { }
  let T = I18N[lang], D = null, onLang = () => { };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (x, d) => x == null || isNaN(x) ? '–' : x.toLocaleString(lang, { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 });
  const pct = (x, d) => num(x, d) + (lang === 'fr' ? ' %' : '%');
  const step6 = (v, vmax) => v / vmax < 0.004 ? 0 : Math.min(6, Math.max(1, Math.ceil(6 * Math.sqrt(Math.min(1, v / vmax)))));
  const niceMax = v => { if (!(v > 0)) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 1.2, 1.6, 2, 3, 4, 5, 6, 8, 10]) if (m * e >= v) return m * e; return 10 * e; };

  function applyStatic() {
    T = I18N[lang]; document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { const v = T[el.getAttribute('data-i18n')]; if (typeof v === 'string') el.innerHTML = v; });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', T[el.getAttribute('data-i18n-aria')]));
    document.querySelectorAll('nav.main a').forEach(a => { if (a.dataset.nav === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('lgfr').classList.toggle('on', lang === 'fr'); $('lgen').classList.toggle('on', lang === 'en');
    const w = document.querySelector('[data-i18n="west"]'); if (w) w.textContent = T.westL;
  }
  const setLang = l => { lang = l; try { localStorage.setItem('fp-lang', l); } catch (e) { } applyStatic(); onLang(); };
  $('lgfr').onclick = () => setLang('fr'); $('lgen').onclick = () => setLang('en');

  const tip = $('tip');
  function showTip(html, x, y) { tip.innerHTML = html; tip.style.display = 'block'; const r = tip.getBoundingClientRect(); tip.style.left = Math.max(4, Math.min(innerWidth - r.width - 4, x + 14)) + 'px'; tip.style.top = (y + r.height + 20 > innerHeight ? y - r.height - 10 : y + 16) + 'px'; }
  function hideTip() { tip.style.display = 'none'; }
  document.addEventListener('mousemove', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) showTip(el.getAttribute('data-tip'), e.clientX, e.clientY); else if (!e.target.closest || !e.target.closest('#map')) hideTip(); });
  function download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

  /* ---------- carte : terres, graticule, cases, contour du Togo. Pas de fond de carte externe. ---------- */
  function makeMap(interactive) {
    const map = L.map('map', { zoomControl: false, attributionControl: false, zoomSnap: 0.25, zoomDelta: 0.5, minZoom: 6, maxZoom: 11, dragging: interactive, scrollWheelZoom: false, doubleClickZoom: interactive, touchZoom: interactive, boxZoom: false, keyboard: interactive });
    map.setView([8.6, 0.85], 7);
    const pane = (n, z) => { const p = map.createPane(n); p.style.zIndex = z; p.style.pointerEvents = 'none'; return n; };
    pane('land', 390); pane('grat', 395); pane('cells', 410); pane('outline', 420); pane('aoi', 430); pane('labels', 440);
    const cellR = L.canvas({ pane: 'cells' });
    L.geoJSON(window.FP_BORDERS, { pane: 'land', interactive: false, style: { color: '#AEBBAE', weight: 1, fillColor: '#E3E9E0', fillOpacity: 1 } }).addTo(map);
    for (let la = 6; la <= 11; la++) L.polyline([[la, -4], [la, 6]], { pane: 'grat', interactive: false, color: '#AEBBAE', weight: 1, dashArray: '4 4' }).addTo(map);
    for (let lo = -1; lo <= 2; lo++) L.polyline([[3, lo], [14, lo]], { pane: 'grat', interactive: false, color: '#AEBBAE', weight: 1, dashArray: '4 4' }).addTo(map);
    L.geoJSON({ type: 'FeatureCollection', features: window.FP_BORDERS.features.filter(f => f.properties.name === 'Togo') }, { pane: 'outline', interactive: false, style: { color: '#12261F', weight: 1.5, fill: false } }).addTo(map);
    for (const c of CITIES) L.circleMarker([c[1], c[2]], { pane: 'outline', interactive: false, radius: c[3] ? 4 : 3, color: '#12261F', weight: c[3] ? 2 : 1.5, fillColor: '#fff', fillOpacity: 1 }).addTo(map);
    const gCells = L.layerGroup().addTo(map), gAoi = L.layerGroup().addTo(map), gLab = L.layerGroup().addTo(map);
    const label = (la, lo, html, cls, anchor) => L.marker([la, lo], { pane: 'labels', interactive: false, keyboard: false, icon: L.divIcon({ className: '', html: `<div class="${cls}" style="position:absolute;${anchor}">${html}</div>`, iconSize: [0, 0] }) }).addTo(gLab);
    function relabel() {
      gLab.clearLayers();
      for (let la = 7; la <= 11; la++) label(la, -1, la + '°N', 'glabel', 'left:5px;bottom:2px');
      for (let lo = -1; lo <= 2; lo++) label(5.72, lo, lo === 0 ? '0°' : Math.abs(lo) + '°' + (lo < 0 ? T.west : 'E'), 'glabel sea', 'left:5px;top:0');
      label(8.35, -0.95, T.countries.Ghana, 'clabel', 'left:0;top:0'); label(7.75, 2.2, T.countries.Benin, 'clabel', 'left:0;top:0'); label(11.5, 0.75, T.countries.Burkina, 'clabel', 'left:0;top:0');
      label(5.9, -0.9, T.countries.gulf, 'clabel sea', 'left:0;top:0');
      for (const c of CITIES) label(c[1], c[2], c[0], 'city' + (c[3] ? ' cap' : ''), c[0] === 'Dapaong' ? 'right:8px;top:-9px' : 'left:8px;top:-9px');
    }
    relabel();
    if (interactive) L.control.scale({ imperial: false, position: 'bottomright', maxWidth: 110 }).addTo(map);
    let cur = null;
    return {
      map, relabel,
      fit(box, pad) { map.fitBounds([[box[0], box[2]], [box[1], box[3]]], { padding: [pad || 30, pad || 30] }); },
      setCells(cells) {
        gCells.clearLayers(); cur = cells; if (!cells.size) return 1;
        const vals = [...cells.values()].sort((a, b) => a - b), vmax = FP.quant(vals, 0.97) || 1;
        for (const [id, v] of cells) { const [la, lo] = FP.cellSW(D, id); L.rectangle([[la, lo], [la + D.res, lo + D.res]], { renderer: cellR, pane: 'cells', interactive: false, color: '#fff', weight: 0.5, fillColor: RAMP[Math.max(1, step6(v, vmax))], fillOpacity: 1 }).addTo(gCells); }
        return vmax;
      },
      valueAt(latlng) { return cur ? cur.get(FP.cellId(Math.floor(latlng.lat / D.res + 1e-9), Math.floor(latlng.lng / D.res + 1e-9))) : undefined; },
      setAoi(box) { gAoi.clearLayers(); if (box) L.rectangle([[box[0], box[2]], [box[1], box[3]]], { pane: 'aoi', interactive: false, color: '#1D5FA8', weight: 1.5, dashArray: '5 4', fill: false }).addTo(gAoi); }
    };
  }

  /* ---------- calendrier mensuel : mois en lignes, années de feu en colonnes ---------- */
  function renderCal(mon, fys, opt) {
    const start = fys.start, byMi = new Map(mon.rows.map(r => [r.mi, r])), f0 = fys.years[0].fy, f1 = fys.years[fys.years.length - 1].fy;
    const act = mon.rows.filter(r => !r.partial && r.n > 0).map(r => r.n).sort((a, b) => a - b), vmax = FP.quant(act, 0.97) || 1;
    const floor = Math.max(3, 0.02 * Math.max(...mon.clim.map(c => c.median)));
    $('calMonths').innerHTML = Array.from({ length: 12 }, (_, r) => `<span>${T.months[(start + r) % 12]}</span>`).join('');
    let g = '', ys = '';
    for (let fy = f0; fy <= f1; fy++) {
      for (let r = 0; r < 12; r++) {
        const m = (start + r) % 12, y = m >= start ? fy : fy + 1, mi = (y - FP.Y0) * 12 + m, row = byMi.get(mi), name = `${T.months[m]} ${y}`;
        if (!row) { g += `<div class="hatch" data-tip="${esc(`<b>${name}</b><br>${T.nodata}`)}"></div>`; continue; }
        const cat = FP.monthCat(row, floor), bg = opt.mode === 'ano' ? DIV[cat] : RAMP[step6(row.n, vmax)];
        const tipHtml = `<b>${name}</b>${row.partial ? ' · ' + T.partial : ''}<br><b>${num(row.n)}</b> ${T.hs}<br>${T.median} : ${num(row.median)}` + (row.partial || isNaN(row.ratio) ? '' : `<br>${pct(100 * row.ratio)} · ${T.percentile} ${num(row.pct)}`);
        g += `<div style="background:${bg}"${opt.pick ? ` data-mi="${mi}" tabindex="0" role="button" aria-label="${esc(name)}"` : ''}${opt.sel === mi ? ' class="sel"' : ''} data-tip="${esc(tipHtml)}"></div>`;
      }
      ys += `<span>${fy % 5 === 0 ? fy : ''}</span>`;
    }
    $('calGrid').innerHTML = g; $('calYears').innerHTML = ys;
  }

  /* ---------- Accueil ---------- */
  function home() {
    const agg = FP.aggregate(D, D.bbox), mon = FP.monthly(D, agg), fys = FP.fireYears(mon), m = FP.monthToDate(D, agg), mp = makeMap(false);
    mp.setCells(FP.cellMap(D, agg, 0)); mp.fit(D.bbox, 36);
    document.documentElement.style.setProperty('--ch', '18px');
    const y0 = FP.dateOf(D.first).getUTCFullYear(), y1 = FP.dateOf(D.last).getUTCFullYear(), dt = FP.dateOf(D.last);
    function draw() {
      $('heroEyebrow').textContent = `TOGO · 6°N – 11°N · 0° – 2°E · ${y0} → ${y1}`;
      $('heroTitle').textContent = T.heroTitle(y1 - y0);
      $('bandCap').textContent = T.bandCap(T.monthsLong[dt.getUTCMonth()], y1, 1, dt.getUTCDate(), D.partial);
      $('bandHead').textContent = isNaN(m.ratio) ? T.bandHead(50) : T.bandHead(m.pct);
      $('bandN').textContent = num(m.value);
      $('bandR').textContent = isNaN(m.ratio) ? '–' : pct(100 * m.ratio); $('bandR').style.color = m.pct <= 25 ? '#8CC5F0' : m.pct >= 75 ? '#F3C06F' : '#fff';
      $('bandP').innerHTML = T.ord(Math.round(m.pct));
      const t = fys.trend;
      $('trendNum').textContent = t ? (t.pct > 0 ? '+ ' : '− ') + num(Math.abs(t.pct), 1) + T.perYear : '–'; $('trendNum').style.color = t && t.pct > 0 ? 'var(--accent)' : 'var(--blue)';
      $('trendTxt').textContent = T.why3t(!t || t.pct <= 0);
      const on = Array.from({ length: 12 }, (_, r) => (fys.start + r) % 12).filter(k => mon.clim[k].level >= 1);
      $('calLead').textContent = T.calLead(T.monthsLong[on[0]], T.monthsLong[on[on.length - 1]]);
      $('calNote').textContent = T.calNote(T.monthsLong[fys.start], T.monthsLong[(fys.start + 11) % 12]);
      renderCal(mon, fys, { mode: 'act' }); mp.relabel();
    }
    onLang = draw; draw();
  }

  /* ---------- Explorer ---------- */
  function explorer() {
    const S = { type: 'all', box: D.bbox, region: REGIONS[0][0], mode: 'act', month: 0, pick: -1, agg: null, mon: null, fys: null, cal: null, year: '' };
    const mp = makeMap(true), map = mp.map; let drawing = false, d0 = null, dRect = null;
    document.documentElement.style.setProperty('--ch', '17px');
    $('regionSel').innerHTML = REGIONS.map(r => `<option>${r[0]}</option>`).join('');
    const r2 = x => Math.round(x * 100) / 100;
    function zoneName() { return S.type === 'all' ? T.zoneAll : S.type === 'region' ? S.region : `${T.zoneRect} ${S.box[0]}–${S.box[1]}°N, ${S.box[2]}–${S.box[3]}°E`; }
    function setZone(box, fit) {
      const agg = FP.aggregate(D, box); if (!agg.total) { $('zoneMsg').textContent = T.emptyBox; return false; }
      S.box = box; S.agg = agg; S.mon = FP.monthly(D, agg); S.fys = FP.fireYears(S.mon); S.cal = FP.calendar(agg);
      const cy = S.cal.years.filter(y => y.n > 0), cd = cy.filter(y => y.complete); if (!cy.some(y => y.label === S.year)) S.year = (cd.length ? cd[cd.length - 1] : cy[cy.length - 1]).label; $('zoneMsg').textContent = S.type === 'rect' ? T.rectHint : '';
      if (fit) mp.fit(S.type === 'all' ? D.bbox : box, 40);
      draw(); return true;
    }
    function drawMap() {
      const cells = S.pick >= 0 ? FP.cellMapMonth(D, S.agg, S.pick) : FP.cellMap(D, S.agg, S.month);
      mp.setCells(cells); mp.setAoi(S.type === 'all' ? null : S.box);
      const lbl = S.pick >= 0 ? `${T.months[S.pick % 12]} ${FP.Y0 + Math.floor(S.pick / 12)}` : S.month ? T.meanOf(T.monthsLong[S.month - 1]) : T.perYr;
      $('mapLegTitle').textContent = T.mapLeg(lbl);
    }
    function drawSit() {
      const m = FP.monthToDate(D, S.agg), dt = FP.dateOf(D.last), ok = !isNaN(m.ratio), p = ok ? m.pct : 50, col = p <= 25 ? '#8CC5F0' : p >= 75 ? '#F3C06F' : '#FFFFFF';
      $('sitCap').textContent = T.sitCap(T.months[dt.getUTCMonth()], dt.getUTCFullYear(), 1, dt.getUTCDate(), D.partial);
      $('sitPill').textContent = T.sitPill(p); $('sitDot').style.background = col; $('sitBar').style.background = col;
      $('sitN').textContent = num(m.value); $('sitBar').style.width = (ok ? Math.min(100, 50 * m.ratio) : 0) + '%';
      $('sitR').textContent = ok ? pct(100 * m.ratio) : '–'; $('sitP').innerHTML = ok ? T.ord(Math.round(m.pct)) : '–';
    }
    function drawCal() {
      $('calTitle').textContent = T.calTitleZone(zoneName());
      $('calRamp').innerHTML = S.mode === 'act'
        ? `<span>${T.calm}</span><span class="sw">${RAMP.map(c => `<i style="background:${c}"></i>`).join('')}</span><span>${T.veryActive}</span>`
        : `<span>${T.below}</span><span class="sw">${[-3, -2, -1, 0, 1, 2, 3].map(k => `<i style="background:${DIV[k]}"></i>`).join('')}</span><span>${T.above}</span>`;
      renderCal(S.mon, S.fys, { mode: S.mode, pick: true, sel: S.pick });
    }
    function drawControls() {
      document.querySelectorAll('#zoneSeg button').forEach(b => b.classList.toggle('on', b.dataset.zone === S.type));
      document.querySelectorAll('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === S.mode));
      $('regionField').hidden = S.type !== 'region'; $('regionSel').value = S.region;
      const ro = S.type !== 'rect'; [['bN', 1], ['bS', 0], ['bW', 2], ['bE', 3]].forEach(([id, i]) => { $(id).value = S.box[i].toFixed(2); $(id).readOnly = ro; });
      let o = `<option value="0">${T.allYear}</option>` + T.monthsLong.map((n, i) => `<option value="${i + 1}">${n.charAt(0).toUpperCase() + n.slice(1)}</option>`).join('');
      if (S.pick >= 0) o += `<option value="p">${T.months[S.pick % 12]} ${FP.Y0 + Math.floor(S.pick / 12)}</option>`;
      $('monthSel').innerHTML = o; $('monthSel').value = S.pick >= 0 ? 'p' : String(S.month);
      $('drawTxt').textContent = drawing ? T.drawing : T.draw; $('drawBtn').classList.toggle('on', drawing);
    }
    function ticks(fy) { const c = S.cal, out = []; let last = -1; for (let p = 0; p < FP.W; p++) { const m = FP.dateOf(FP.posToDay(c, fy, p) + 3).getUTCMonth(); if (m !== last) { out.push([p, m]); last = m; } } return out.filter((t, i) => i === out.length - 1 ? FP.W - t[0] >= 2 : out[i + 1][0] - t[0] >= 3); }
    function drawSeason() {
      const c = S.cal, W = FP.W, yrs = c.years.filter(y => y.n > 0), y = yrs.find(x => x.label === S.year), row = c.mat[y.row];
      $('yearSel').innerHTML = yrs.map(x => `<option>${x.label}</option>`).join(''); $('yearSel').value = S.year; $('seasTitle').textContent = T.seasTitle(y.label);
      const wd = 560, ht = 270, Lm = 50, R = 10, Tm = 10, B = 40, pw = wd - Lm - R, ph = ht - Tm - B;
      let mx = 0; for (let p = 0; p < W; p++) mx = Math.max(mx, c.clim.p90[p] || 0, row[p] || 0); mx = niceMax(mx);
      const X = p => Lm + (p + 0.5) * pw / W, Y = v => Tm + ph - v / mx * ph, wk = (fy, p) => { const d = FP.dateOf(FP.posToDay(c, fy, p)); return `${d.getUTCDate()} ${T.months[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
      const path = a => { let d = '', pen = false; for (let p = 0; p < W; p++) { const v = a[p]; if (v == null || isNaN(v)) { pen = false; continue; } d += (pen ? 'L' : 'M') + X(p).toFixed(1) + ' ' + Y(v).toFixed(1); pen = true; } return d; };
      let band = ''; for (let p = 0; p < W; p++) band += (p ? 'L' : 'M') + X(p).toFixed(1) + ' ' + Y(c.clim.p75[p] || 0).toFixed(1); for (let p = W - 1; p >= 0; p--) band += 'L' + X(p).toFixed(1) + ' ' + Y(c.clim.p25[p] || 0).toFixed(1);
      let s = `<svg viewBox="0 0 ${wd} ${ht}" role="img" aria-label="${esc(T.seasTitle(y.label))}">`;
      for (let k = 0; k <= 4; k++) { const v = mx * k / 4; s += `<line class="grid" x1="${Lm}" x2="${wd - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${Lm - 6}" y="${Y(v) + 4}" text-anchor="end">${num(v)}</text>`; }
      for (const [p, m] of ticks(y.fy)) s += `<text x="${Lm + p * pw / W + 1}" y="${ht - 20}">${T.months[m]}</text>`;
      s += `<text x="${Lm}" y="${ht - 4}">${T.perWeek}</text><path d="${band}Z" fill="#5A6B63" opacity=".2"/><path d="${path(c.clim.p90)}" fill="none" stroke="#5A6B63" stroke-width="1" stroke-dasharray="2 3"/><path d="${path(c.clim.med)}" fill="none" stroke="#12261F" stroke-width="1.5"/><path d="${path(row)}" fill="none" stroke="#C2410C" stroke-width="2.5" stroke-linejoin="round"/>`;
      for (let p = 0; p < W; p++) { const v = row[p]; s += `<rect class="hit" x="${Lm + p * pw / W}" y="${Tm}" width="${pw / W}" height="${ph}" data-tip="${esc(`<b>${T.week} ${wk(y.fy, p)}</b>` + (isNaN(v) ? '' : `<br>${y.label} : <b>${num(v)}</b> ${T.hs}`) + `<br>${T.median} : ${num(c.clim.med[p])}<br>P25–P75 : ${num(c.clim.p25[p])} – ${num(c.clim.p75[p])}<br>P90 : ${num(c.clim.p90[p])}`)}"/>`; }
      $('seas').innerHTML = s + '</svg>';
      $('seasLg').innerHTML = `<span><i style="background:#C2410C"></i>${T.lgSel(y.label)}</span><span><i style="background:#12261F"></i>${T.lgMed}</span><span><i style="background:#5A6B63;opacity:.35;height:10px"></i>${T.lgBand}</span><span><i style="background:repeating-linear-gradient(90deg,#5A6B63 0 2px,transparent 2px 5px)"></i>${T.lgP90}</span>`;
    }
    function drawTrend() {
      const f = S.fys, ys = f.done, wd = 560, ht = 270, Lm = 50, R = 14, Tm = 16, B = 28, pw = wd - Lm - R, ph = ht - Tm - B;
      if (ys.length < 2) { $('ann').innerHTML = `<p class="note">${T.few2}</p>`; $('annLg').innerHTML = ''; return; }
      const mx = niceMax(Math.max(...ys.map(y => Math.max(y.total, y.raw)))), X = i => Lm + (i + 0.5) * pw / ys.length, Y = v => Tm + ph - Math.max(0, Math.min(mx, v)) / mx * ph;
      const line = g => 'M' + ys.map((y, i) => X(i).toFixed(1) + ' ' + Y(g(y)).toFixed(1)).join('L');
      let s = `<svg viewBox="0 0 ${wd} ${ht}" role="img" aria-label="${esc(T.annTitle)}">`;
      for (let k = 0; k <= 4; k++) { const v = mx * k / 4; s += `<line class="grid" x1="${Lm}" x2="${wd - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${Lm - 6}" y="${Y(v) + 4}" text-anchor="end">${num(v)}</text>`; }
      const iv = ys.findIndex(y => y.src === 'S' || y.src === 'J');
      if (iv > 0) { const x = (X(iv - 1) + X(iv)) / 2; s += `<line class="axis" x1="${x}" x2="${x}" y1="${Tm}" y2="${Tm + ph}" stroke-dasharray="4 3"/><text x="${x + 5}" y="${Tm + 9}">${T.viirsIn} →</text>`; }
      ys.forEach((y, i) => { if (i % Math.ceil(ys.length / 8) === 0) s += `<text x="${X(i)}" y="${ht - 8}" text-anchor="middle">${y.label}</text>`; });
      s += `<path d="${line(y => y.raw)}" fill="none" stroke="#1D5FA8" stroke-width="2" stroke-dasharray="5 4"/>`;
      if (f.trend) s += `<path d="M${X(0)} ${Y(f.trend.intercept + f.trend.slope * ys[0].fy)}L${X(ys.length - 1)} ${Y(f.trend.intercept + f.trend.slope * ys[ys.length - 1].fy)}" stroke="#12261F" stroke-width="1.5" stroke-dasharray="2 3" fill="none"/>`;
      s += `<path d="${line(y => y.total)}" fill="none" stroke="#C2410C" stroke-width="2.5" stroke-linejoin="round"/>`;
      ys.forEach((y, i) => { s += `<rect x="${X(i) - 3}" y="${Y(y.raw) - 3}" width="6" height="6" fill="#1D5FA8" stroke="#fff" stroke-width="1.5"/><circle cx="${X(i)}" cy="${Y(y.total)}" r="${y.label === S.year ? 5.5 : 4}" fill="#C2410C" stroke="#fff" stroke-width="2"/>`; });
      ys.forEach((y, i) => { s += `<rect class="hit" data-label="${y.label}" x="${Lm + i * pw / ys.length}" y="${Tm}" width="${pw / ys.length}" height="${ph}" data-tip="${esc(`<b>${y.label}</b><br>${T.lgHarm} : <b>${num(y.total)}</b><br>${T.lgRaw} : ${num(y.raw)}`)}"/>`; });
      $('ann').innerHTML = s + '</svg>';
      const tp = f.trend ? (f.trend.pct > 0 ? '+' : '−') + pct(Math.abs(f.trend.pct), 1) : '';
      $('annLg').innerHTML = `<span><i style="background:#C2410C"></i>${T.lgHarm}</span><span><i style="background:repeating-linear-gradient(90deg,#1D5FA8 0 5px,transparent 5px 9px)"></i>${T.lgRaw}</span>` + (f.trend ? `<span><i style="background:repeating-linear-gradient(90deg,#12261F 0 2px,transparent 2px 5px)"></i>${T.lgTs(tp)}</span>` : '');
    }
    function drawCharts() { drawSeason(); drawTrend(); }
    function draw() { drawControls(); drawMap(); drawSit(); drawCal(); drawCharts(); }
    function endDraw() { drawing = false; d0 = null; if (dRect) { map.removeLayer(dRect); dRect = null; } map.dragging.enable(); $('mapBox').classList.remove('drawing'); drawControls(); }

    $('zoneSeg').onclick = e => {
      const b = e.target.closest('button'); if (!b) return; const prev = S.type; S.type = b.dataset.zone;
      if (S.type === 'all') setZone(D.bbox, true);
      else if (S.type === 'region') { const r = REGIONS.find(x => x[0] === S.region); if (!setZone([Math.max(r[1], D.bbox[0]), Math.min(r[2], D.bbox[1]), D.bbox[2], D.bbox[3]], true)) S.type = prev; }
      else { $('zoneMsg').textContent = T.rectHint; draw(); }
    };
    $('regionSel').onchange = e => { S.region = e.target.value; const r = REGIONS.find(x => x[0] === S.region); setZone([Math.max(r[1], D.bbox[0]), Math.min(r[2], D.bbox[1]), D.bbox[2], D.bbox[3]], true); };
    ['bN', 'bS', 'bW', 'bE'].forEach(id => $(id).addEventListener('change', () => {
      if (S.type !== 'rect') return; const v = k => parseFloat($(k).value.replace(',', '.')), box = [v('bS'), v('bN'), v('bW'), v('bE')];
      if (box.some(isNaN) || box[0] >= box[1] || box[2] >= box[3]) { $('zoneMsg').textContent = T.badBox; return; }
      if (!setZone(box.map(r2), true)) drawControls();
    }));
    $('modeSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.mode = b.dataset.mode; drawControls(); drawCal(); };
    $('monthSel').onchange = e => { if (e.target.value === 'p') return; S.pick = -1; S.month = +e.target.value; draw(); };
    const pickCell = e => {
      const el = e.target.closest('[data-mi]'); if (!el) return; const mi = +el.dataset.mi; S.pick = S.pick === mi ? -1 : mi;
      const m = mi % 12, y = FP.Y0 + Math.floor(mi / 12), fy = m >= S.fys.start ? y : y - 1, lab = S.fys.start > 0 ? fy + '/' + String((fy + 1) % 100).padStart(2, '0') : String(fy);
      if (S.cal.years.some(x => x.label === lab && x.n > 0)) S.year = lab;      // la courbe de saison suit l'année cliquée
      draw();
    };
    $('yearSel').onchange = e => { S.year = e.target.value; drawCharts(); };
    $('ann').addEventListener('click', e => { const el = e.target.closest('[data-label]'); if (el && S.cal.years.some(x => x.label === el.dataset.label && x.n > 0)) { S.year = el.dataset.label; drawCharts(); } });
    $('calGrid').addEventListener('click', pickCell);
    $('calGrid').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickCell(e); } });
    $('zIn').onclick = () => map.zoomIn(); $('zOut').onclick = () => map.zoomOut();
    $('drawBtn').onclick = () => { if (drawing) return endDraw(); drawing = true; map.dragging.disable(); $('mapBox').classList.add('drawing'); drawControls(); };
    map.on('mousedown', e => { if (drawing) d0 = e.latlng; });
    map.on('mousemove', e => {
      const la = e.latlng.lat, lo = e.latlng.lng;
      $('coords').textContent = `${Math.abs(la).toFixed(2)}°${la >= 0 ? 'N' : 'S'}  ${Math.abs(lo).toFixed(2)}°${lo >= 0 ? 'E' : T.west}`;
      if (drawing && d0) { const b = L.latLngBounds(d0, e.latlng); if (dRect) dRect.setBounds(b); else dRect = L.rectangle(b, { pane: 'aoi', color: '#1D5FA8', weight: 1.5, dashArray: '5 4', fill: false, interactive: false }).addTo(map); return; }
      const v = mp.valueAt(e.latlng);
      if (v) showTip(`<b>${num(v, v < 10 ? 1 : 0)}</b> ${S.pick >= 0 ? T.hs : T.perYrU}`, e.originalEvent.clientX, e.originalEvent.clientY); else hideTip();
    });
    map.on('mouseout', () => { hideTip(); $('coords').textContent = '—'; });
    map.on('mouseup', e => {
      if (!drawing || !d0) return; const b = L.latLngBounds(d0, e.latlng); endDraw();
      if (b.getEast() - b.getWest() < 0.15 || b.getNorth() - b.getSouth() < 0.15) return;
      const prev = S.type; S.type = 'rect'; if (!setZone([r2(b.getSouth()), r2(b.getNorth()), r2(b.getWest()), r2(b.getEast())], false)) { S.type = prev; drawControls(); }
    });
    $('dlMonth').onclick = () => download('firepulse_monthly.csv', FP.monthlyCSV(S.mon));
    $('dlWeek').onclick = e => { e.preventDefault(); download('firepulse_weekly.csv', FP.weeklyCSV(S.agg, FP.calendar(S.agg))); };
    onLang = () => { mp.relabel(); if (S.type === 'rect') $('zoneMsg').textContent = T.rectHint; draw(); };
    setZone(D.bbox, true);
    window.FPX = { S, setZone };
  }

  /* ---------- Méthode et données ---------- */
  function method() {
    let V = null;
    function chart() {
      if (!V) return;
      const n = V.month.length, wd = 640, ht = 290, Lm = 52, R = 10, Tm = 12, B = 34, pw = wd - Lm - R, ph = ht - Tm - B, mx = niceMax(Math.max(...V.viirs, ...V.pred));
      const X = i => Lm + (i + 0.5) * pw / n, Y = v => Tm + ph - v / mx * ph, path = a => a.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
      let s = `<svg viewBox="0 0 ${wd} ${ht}" role="img" aria-label="${esc(T.vAria)}">`;
      for (let k = 0; k <= 4; k++) { const v = mx * k / 4; s += `<line class="grid" x1="${Lm}" x2="${wd - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${Lm - 6}" y="${Y(v) + 4}" text-anchor="end">${num(v)}</text>`; }
      const fi = V.forward_from ? V.month.indexOf(V.forward_from) : -1;
      if (fi > 0) { const x = Lm + fi * pw / n; s += `<rect x="${x}" y="${Tm}" width="${wd - R - x}" height="${ph}" fill="#5A6B63" opacity=".12"/><text x="${wd - R - 3}" y="${Tm + 11}" text-anchor="end">${T.vFwd}</text>`; }
      V.month.forEach((m, i) => { if (m.slice(5) === '01' && (+m.slice(0, 4)) % 2 === 1) s += `<text x="${X(i) - 3}" y="${ht - 16}">${m.slice(0, 4)}</text>`; });
      s += `<text x="${Lm}" y="${ht - 2}">${T.vY}</text>`;
      s += `<path d="${path(V.modis)}" fill="none" stroke="#1D5FA8" stroke-width="1.3"/><path d="${path(V.viirs)}" fill="none" stroke="#12261F" stroke-width="2" stroke-linejoin="round"/><path d="${path(V.pred)}" fill="none" stroke="#C2410C" stroke-width="1.8" stroke-dasharray="5 3" stroke-linejoin="round"/>`;
      V.month.forEach((m, i) => { s += `<rect class="hit" x="${Lm + i * pw / n}" y="${Tm}" width="${pw / n}" height="${ph}" data-tip="${esc(`<b>${T.months[+m.slice(5) - 1]} ${m.slice(0, 4)}</b><br>${T.vReal} : <b>${num(V.viirs[i])}</b><br>${T.vPred} : <b>${num(V.pred[i])}</b><br>${T.vRaw} : ${num(V.modis[i])}`)}"/>`; });
      $('valChart').innerHTML = s + '</svg>';
      if (fi > 0) { let a = 0, b = 0; for (let i = fi; i < n; i++) { a += V.viirs[i]; b += V.pred[i]; } const e = 100 * (b / a - 1), mm = k => `${T.monthsLong[+V.month[k].slice(5) - 1]} ${V.month[k].slice(0, 4)}`; $('valNote').textContent = T.vNote(mm(fi), mm(n - 1), (e > 0 ? '+' : '−') + pct(Math.abs(e), 1)); }
      $('valLegend').innerHTML = `<span><i style="background:#12261F"></i>${T.vReal}</span><span><i style="background:repeating-linear-gradient(90deg,#C2410C 0 5px,transparent 5px 8px)"></i>${T.vPred}</span><span><i style="background:#1D5FA8"></i>${T.vRaw}</span>`;
    }
    function draw() {
      $('cmpTable').innerHTML = `<thead><tr>${T.cmpH.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>` + T.cmpRows.map((r, i) => `<tr${i === 3 ? ' class="best"' : ''}><td>${r}</td><td>${pct(CMP[i][0])}</td><td>${pct(CMP[i][1])}</td></tr>`).join('') + '</tbody>';
      $('limGrid').innerHTML = T.lims.map(l => `<div><b>${l[0]}</b>${l[1]}</div>`).join('');
      $('dlGrid').innerHTML = T.dls.map(d => `<a href="https://github.com/firepulse-team/firepulse/tree/main/data_public"><b>${d[0]}</b><code>${d[1]}</code><span>${d[2]}</span></a>`).join('');
      chart();
    }
    onLang = draw; draw();
    fetch('site/validation.json').then(r => { if (!r.ok) throw 0; return r.json(); }).then(j => { V = j; chart(); })
      .catch(() => { $('valChart').innerHTML = '<img src="validation_series.png" alt="" style="max-width:100%;border-radius:8px;border:1px solid var(--line)">'; });
  }

  applyStatic();
  if (page === 'method') method();
  else fetch('site/firepulse.json').then(r => { if (!r.ok) throw 0; return r.json(); }).then(j => { D = FP.load(j); if (page === 'home') home(); else explorer(); })
    .catch(e => { const d = document.createElement('div'); d.className = 'err'; d.innerHTML = T.loadErr; document.querySelector('header.site').after(d); if (window.console) console.error(e); });
})();
