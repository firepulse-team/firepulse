/* Written with AI assistance (Claude, Anthropic); reviewed and tested by the FIREPULSE team. */
/* FIREPULSE — site computations (no DOM). Reads docs/site/firepulse.json, produced by build_site_data.py.
   The harmonized values come from the pipeline (quantile mapping); here they are only aggregated. */
(function (root) {
  'use strict';
  const FP = {}, DAY = 864e5, EPOCH = Date.UTC(2000, 0, 1), Y0 = 2000, YMAX = 2040, W = 52, BASE = [2001, 2025];
  FP.W = W; FP.Y0 = Y0; FP.BASE = BASE;
  FP.dayOf = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - EPOCH) / DAY);
  FP.dateOf = day => new Date(EPOCH + day * DAY);
  FP.ymd = day => FP.dateOf(day).toISOString().slice(0, 10);

  // Day -> week tables (52 blocks of 7 days from 1 January; the last one absorbs 1 or 2 days) and day -> month
  const ND = FP.dayOf(YMAX, 1, 1), NBIN = (YMAX - Y0) * W;
  const dBin = new Int32Array(ND), dMi = new Int32Array(ND), dDom = new Uint8Array(ND), binStart = new Int32Array(NBIN), binLen = new Uint8Array(NBIN);
  for (let y = Y0, d = 0; y < YMAX; y++) {
    const n = FP.dayOf(y + 1, 1, 1) - FP.dayOf(y, 1, 1);
    for (let i = 0; i < n; i++, d++) {
      const b = (y - Y0) * W + Math.min(W - 1, Math.floor(i / 7)); dBin[d] = b; if (!binLen[b]) binStart[b] = d; binLen[b]++;
      const dt = FP.dateOf(d); dMi[d] = (y - Y0) * 12 + dt.getUTCMonth(); dDom[d] = dt.getUTCDate();
    }
  }
  FP.binStart = binStart; FP.binYear = b => Y0 + Math.floor(b / W);
  const circ = (w, d) => ((w + d) % W + W) % W;
  const quant = (s, q) => { if (!s.length) return NaN; const p = (s.length - 1) * q, i = Math.floor(p); return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (p - i); };
  FP.quant = quant;
  const sorted = a => a.slice().sort((x, y) => x - y);

  FP.load = function (j) {
    if (!j || j.format !== 'firepulse-site-v1') throw new Error('format');
    const n = j.raw.length, D = { n, res: j.res, day: new Int32Array(n), iy: Int16Array.from(j.iy), ix: Int16Array.from(j.ix), raw: Float32Array.from(j.raw), harm: Float32Array.from(j.harm), first: j.first_day, last: j.last_day };
    for (let i = 0, d = 0; i < n; i++) { d += j.day_delta[i]; D.day[i] = d; }
    const ym = s => FP.dayOf(+s.slice(0, 4), +s.slice(5, 7), 1);
    D.aqua = ym(j.aqua_from); D.sw = ym(j.switch); D.n20 = ym(j.noaa20_from);
    let s = 1e9, w = 1e9, nn = -1e9, e = -1e9;
    for (let i = 0; i < n; i++) { if (D.iy[i] < s) s = D.iy[i]; if (D.iy[i] > nn) nn = D.iy[i]; if (D.ix[i] < w) w = D.ix[i]; if (D.ix[i] > e) e = D.ix[i]; }
    const r = x => Math.round(x * 10) / 10;
    D.bbox = [r(s * D.res), r((nn + 1) * D.res), r(w * D.res), r((e + 1) * D.res)];   // south, north, west, east
    D.lastMi = dMi[D.last]; D.firstMi = dMi[D.first];
    D.partial = FP.dateOf(D.last + 1).getUTCDate() !== 1;                              // is the last month incomplete?
    return D;
  };
  FP.srcOf = (D, day) => day < D.aqua ? 'T' : day < D.sw ? 'M' : day < D.n20 ? 'S' : 'J';
  FP.cellId = (iy, ix) => (iy + 900) * 4000 + (ix + 1800);
  FP.cellSW = (D, id) => [(Math.floor(id / 4000) - 900) * D.res, (id % 4000 - 1800) * D.res];

  // Aggregation over the area: box = [south, north, west, east]; a cell is in the area if its centre is
  FP.aggregate = function (D, box) {
    const h = D.res / 2, nd = D.last + 1, daily = new Float64Array(nd), dailyRaw = new Float64Array(nd), idx = [], cells = new Set();
    for (let i = 0; i < D.n; i++) {
      const la = D.iy[i] * D.res + h, lo = D.ix[i] * D.res + h;
      if (la < box[0] || la > box[1] || lo < box[2] || lo > box[3]) continue;
      idx.push(i); cells.add(FP.cellId(D.iy[i], D.ix[i])); daily[D.day[i]] += D.harm[i]; dailyRaw[D.day[i]] += D.raw[i];
    }
    const nb = (FP.binYear(dBin[D.last]) - Y0 + 1) * W, H = new Float64Array(nb).fill(NaN), naive = new Float64Array(nb).fill(NaN), src = new Array(nb).fill('');
    for (let b = 0; b < nb; b++) {
      const a = binStart[b], z = a + binLen[b] - 1; if (a < D.first || z > D.last) continue;       // fully observed weeks only
      let s = 0, r = 0; for (let d = a; d <= z; d++) { s += daily[d]; r += dailyRaw[d]; }
      H[b] = s * 7 / binLen[b]; naive[b] = r * 7 / binLen[b]; src[b] = FP.srcOf(D, a);
    }
    const nm = D.lastMi + 1, mH = new Float64Array(nm), mR = new Float64Array(nm);
    for (let d = D.first; d <= D.last; d++) { mH[dMi[d]] += daily[d]; mR[dMi[d]] += dailyRaw[d]; }
    return { nb, H, naive, src, idx, nCells: cells.size, daily, mH, mR, total: idx.length };
  };

  // Monthly table: same definition as anomalies.py (median and percentile of the same month over 2001-2025)
  FP.monthly = function (D, agg) {
    const hist = []; for (let m = 0; m < 12; m++) { const a = []; for (let y = BASE[0]; y <= BASE[1]; y++) a.push(agg.mH[(y - Y0) * 12 + m]); hist.push(sorted(a)); }
    const med = hist.map(a => quant(a, 0.5)), peak = Math.max(...med), tot = med.reduce((x, y) => x + y, 0);
    const clim = med.map((v, m) => ({ m, median: v, p90: quant(hist[m], 0.9), max: hist[m][hist[m].length - 1], share: tot > 0 ? v / tot : 0, level: peak > 0 ? (v >= 0.5 * peak ? 2 : v >= 0.1 * peak ? 1 : 0) : 0 }));
    const rows = [];
    for (let mi = D.firstMi; mi <= D.lastMi; mi++) {
      const m = mi % 12, v = agg.mH[mi], a = hist[m]; let lt = 0, eq = 0; for (const x of a) { if (x < v) lt++; else if (x === v) eq++; }
      rows.push({ mi, year: Y0 + Math.floor(mi / 12), m, n: v, raw: agg.mR[mi], median: med[m], ratio: med[m] > 0 ? v / med[m] : NaN, pct: 100 * (lt + 0.5 * eq) / a.length, partial: (mi === D.lastMi && D.partial) || (mi === D.firstMi && FP.dateOf(D.first).getUTCDate() !== 1), src: FP.srcOf(D, FP.dayOf(Y0 + Math.floor(mi / 12), m + 1, 1)) });
    }
    return { rows, clim };
  };

  // Totals per fire year, from the months (same rule as firecal.py: the year starts after the 2 quietest months)
  FP.fireYears = function (mon) {
    const med = mon.clim.map(c => c.median); let q = 0, best = Infinity;
    for (let m = 0; m < 12; m++) { const t = med[m] + med[(m + 1) % 12]; if (t < best) { best = t; q = m; } }
    const start = Math.max(...med) > 0 ? (q + 2) % 12 : 0, by = new Map();
    for (const r of mon.rows) {
      if (r.partial) continue; const fy = r.m >= start ? r.year : r.year - 1;
      const y = by.get(fy) || { fy, total: 0, raw: 0, months: 0, cnt: {} }; y.total += r.n; y.raw += r.raw; y.months++; y.cnt[r.src] = (y.cnt[r.src] || 0) + 1; by.set(fy, y);
    }
    const years = [...by.values()].sort((a, b) => a.fy - b.fy);
    for (const y of years) { y.complete = y.months === 12 && y.fy >= BASE[0]; y.src = Object.keys(y.cnt).sort((a, b) => y.cnt[b] - y.cnt[a])[0]; y.label = start > 0 ? y.fy + '/' + String((y.fy + 1) % 100).padStart(2, '0') : String(y.fy); }
    const done = years.filter(y => y.complete), median = quant(sorted(done.map(y => y.total)), .5);
    return { start, years, done, median, trend: FP.trend(done.map(y => y.fy), done.map(y => y.total)) };
  };

  // Current (partial) month compared with the same window of days in the reference years (as anomalies.month_to_date)
  FP.monthToDate = function (D, agg) {
    const dt = FP.dateOf(D.last), m = dt.getUTCMonth() + 1, dEnd = dt.getUTCDate(), yNow = dt.getUTCFullYear();
    const win = y => { let s = 0; for (let d = FP.dayOf(y, m, 1), z = FP.dayOf(y, m, dEnd); d <= z; d++) s += agg.daily[d] || 0; return s; };
    const hist = []; for (let y = BASE[0]; y <= BASE[1]; y++) hist.push(win(y));
    const v = win(yNow), med = quant(sorted(hist), 0.5); let lt = 0, eq = 0; for (const x of hist) { if (x < v) lt++; else if (x === v) eq++; }
    return { from: FP.dayOf(yNow, m, 1), to: D.last, value: v, median: med, ratio: med > 0 ? v / med : NaN, pct: 100 * (lt + 0.5 * eq) / hist.length };
  };

  /* Weekly calendar: fire year, climatology, levels, anomalies by rank */
  FP.calendar = function (agg) {
    const { nb, H, src, naive } = agg, m = new Float64Array(W), c = new Float64Array(W);
    for (let b = 0; b < nb; b++) if (!isNaN(H[b])) { m[b % W] += H[b]; c[b % W]++; }
    for (let w = 0; w < W; w++) m[w] = c[w] ? m[w] / c[w] : 0;
    let best = Infinity, start = 0;                                       // the fire year starts after the 4 quietest weeks
    for (let w = 0; w < W; w++) { const t = m[w] + m[circ(w, 1)] + m[circ(w, 2)] + m[circ(w, 3)]; if (t < best - 1e-9) { best = t; start = circ(w, 2); } }
    const fy0 = Y0 - (start > 0 ? 1 : 0), nfy = Math.ceil(nb / W) + (start > 0 ? 1 : 0), mat = [], srcMat = [], binOf = [];
    for (let f = 0; f < nfy; f++) { mat.push(new Float64Array(W).fill(NaN)); srcMat.push(new Array(W).fill('')); binOf.push(new Int32Array(W).fill(-1)); }
    for (let b = 0; b < nb; b++) { const y = FP.binYear(b), w = b % W, f = (w >= start ? y : y - 1) - fy0, p = circ(w, -start); mat[f][p] = H[b]; srcMat[f][p] = src[b]; binOf[f][p] = b; }
    const years = [];
    for (let f = 0; f < nfy; f++) {
      let n = 0, tot = 0, nv = 0; const cnt = {};
      for (let p = 0; p < W; p++) if (!isNaN(mat[f][p])) { n++; tot += mat[f][p]; nv += naive[binOf[f][p]]; cnt[srcMat[f][p]] = (cnt[srcMat[f][p]] || 0) + 1; }
      const fy = fy0 + f;
      years.push({ fy, row: f, n, total: tot, naive: nv, complete: n === W, src: Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || '', label: start > 0 ? fy + '/' + String((fy + 1) % 100).padStart(2, '0') : String(fy) });
    }
    const clim = { med: [], p25: [], p75: [], p90: [], mean: [] };
    for (let p = 0; p < W; p++) {
      const a = []; for (let f = 0; f < nfy; f++) if (!isNaN(mat[f][p])) a.push(mat[f][p]); a.sort((x, y) => x - y);
      clim.med.push(quant(a, .5)); clim.p25.push(quant(a, .25)); clim.p75.push(quant(a, .75)); clim.p90.push(quant(a, .9)); clim.mean.push(a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    }
    const sm = clim.med.map((_, p) => (clim.med[circ(p, -1)] + 2 * clim.med[p] + clim.med[circ(p, 1)]) / 4), peak = Math.max(...sm), peakPos = sm.indexOf(peak);
    const level = sm.map(x => peak > 0 ? (x >= 0.5 * peak ? 2 : x >= 0.1 * peak ? 1 : 0) : 0);
    const cum = (arr, q) => { const t = arr.reduce((x, y) => x + (isNaN(y) ? 0 : y), 0); let s = 0; for (let p = 0; p < W; p++) { s += isNaN(arr[p]) ? 0 : arr[p]; if (s >= q * t) return p; } return W - 1; };
    const season = { start: cum(clim.mean, .1), end: cum(clim.mean, .9), peakPos };
    for (const y of years) if (y.complete && y.total > 0) { y.start = cum(mat[y.row], .1); y.end = cum(mat[y.row], .9); let mx = -1; for (let p = 0; p < W; p++) if (mat[y.row][p] > mx) { mx = mat[y.row][p]; y.peakPos = p; } }
    const floor = Math.max(3, 0.02 * peak), cat = [], rank = [];
    for (let f = 0; f < nfy; f++) {
      const cr = new Int8Array(W), rr = new Float64Array(W).fill(NaN);
      for (let p = 0; p < W; p++) {
        const x = mat[f][p]; if (isNaN(x)) continue;
        const a = []; for (let g = 0; g < nfy; g++) if (g !== f) for (let d = -1; d <= 1; d++) { const q = p + d; if (q >= 0 && q < W && !isNaN(mat[g][q])) a.push(mat[g][q]); }
        if (a.length < 8) continue;
        let lt = 0; for (const y of a) if (y < x) lt++; const r = lt / a.length, small = x < floor && quant(sorted(a), .5) < floor;
        rr[p] = r; cr[p] = small ? 0 : r >= 0.98 ? 3 : r >= 0.9 ? 2 : r >= 0.75 ? 1 : r <= 0.02 ? -3 : r <= 0.1 ? -2 : r <= 0.25 ? -1 : 0;
      }
      cat.push(cr); rank.push(rr);
    }
    const done = years.filter(y => y.complete), tot = sorted(done.map(y => y.total));
    const medTot = quant(tot, .5); for (const y of done) y.ratio = y.total / medTot;
    return { start, fy0, nfy, mat, srcMat, binOf, years, clim, level, season, cat, rank, peak, floor, medianTotal: medTot, trend: FP.trend(done.map(y => y.fy), done.map(y => y.total)) };
  };
  FP.posToDay = (cal, fy, p) => { const w = (p + cal.start) % W, y = w >= cal.start ? fy : fy + 1; return binStart[(y - Y0) * W + w]; };

  // Trend: Theil–Sen slope (in % of the median per year) and Mann–Kendall test
  FP.trend = function (x, y) {
    const n = x.length; if (n < 6) return null; const sl = []; let S = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { sl.push((y[j] - y[i]) / (x[j] - x[i])); S += Math.sign(y[j] - y[i]); }
    const slope = quant(sorted(sl), .5), z = S === 0 ? 0 : (S - Math.sign(S)) / Math.sqrt(n * (n - 1) * (2 * n + 5) / 18);
    const az = Math.abs(z), t = 1 / (1 + 0.2316419 * az), cdf = 1 - 0.3989423 * Math.exp(-az * az / 2) * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    const med = quant(sorted(y), .5), icpt = quant(sorted(y.map((v, i) => v - slope * x[i])), .5);
    return { slope, intercept: icpt, pct: med > 0 ? 100 * slope / med : NaN, p: 2 * (1 - cdf), n };
  };

  // Last full week against the calendar, and the 8 following weeks
  FP.status = function (cal) {
    let lf = -1, lp = -1;
    for (let f = cal.nfy - 1; f >= 0 && lf < 0; f--) for (let p = W - 1; p >= 0; p--) if (!isNaN(cal.mat[f][p])) { lf = f; lp = p; break; }
    if (lf < 0) return null;
    const next = []; for (let d = 1; d <= 8; d++) { const p = (lp + d) % W; next.push({ p, level: cal.level[p], med: cal.clim.med[p], p90: cal.clim.p90[p], fy: cal.fy0 + lf + (lp + d >= W ? 1 : 0) }); }
    return { row: lf, pos: lp, level: cal.level[lp], cat: cal.cat[lf][lp], next };
  };

  // Map: harmonized hotspots per cell and per year over the reference years, for one month (1-12) or the whole year (0)
  FP.cellMap = function (D, agg, month) {
    const out = new Map(), d0 = FP.dayOf(BASE[0], 1, 1), d1 = FP.dayOf(BASE[1] + 1, 1, 1), ny = BASE[1] - BASE[0] + 1;
    for (const i of agg.idx) { const d = D.day[i]; if (d < d0 || d >= d1 || (month && dMi[d] % 12 !== month - 1)) continue; const id = FP.cellId(D.iy[i], D.ix[i]); out.set(id, (out.get(id) || 0) + D.harm[i] / ny); }
    return out;
  };

  // Map of a given month (mi = (year - 2000) * 12 + month): harmonized hotspots per cell
  FP.cellMapMonth = function (D, agg, mi) {
    const out = new Map();
    for (const i of agg.idx) { if (dMi[D.day[i]] !== mi) continue; const id = FP.cellId(D.iy[i], D.ix[i]); out.set(id, (out.get(id) || 0) + D.harm[i]); }
    return out;
  };
  // Anomaly category of a month (-3..3) from the percentile of anomalies.py
  FP.monthCat = function (r, floor) {
    if (r.partial || (r.n < floor && r.median < floor)) return 0; const k = r.pct;
    return k >= 98 ? 3 : k >= 90 ? 2 : k >= 75 ? 1 : k <= 2 ? -3 : k <= 10 ? -2 : k <= 25 ? -1 : 0;
  };

  const r2 = x => isNaN(x) ? '' : Math.round(x * 100) / 100;
  FP.weeklyCSV = function (agg, cal) {
    const rows = ['week_start,fire_year,n_harmonized,n_raw,source,historical_median,anomaly_category'], S = { T: 'MODIS Terra', M: 'MODIS', S: 'VIIRS S-NPP', J: 'VIIRS NOAA-20' };
    for (const y of cal.years) for (let p = 0; p < W; p++) { const b = cal.binOf[y.row][p]; if (b < 0 || isNaN(agg.H[b])) continue; rows.push([FP.ymd(binStart[b]), y.label, r2(agg.H[b]), r2(agg.naive[b]), S[agg.src[b]], r2(cal.clim.med[p]), cal.cat[y.row][p]].join(',')); }
    return rows.join('\n');
  };
  FP.monthlyCSV = function (mon) {
    const rows = ['month,n_harmonized,n_raw,median_2001_2025,ratio,percentile,partial'];
    for (const r of mon.rows) rows.push([r.year + '-' + String(r.m + 1).padStart(2, '0'), r2(r.n), r2(r.raw), r2(r.median), r2(r.ratio), r2(r.pct), r.partial ? 1 : 0].join(','));
    return rows.join('\n');
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = FP; else root.FP = FP;
})(typeof window !== 'undefined' ? window : globalThis);
