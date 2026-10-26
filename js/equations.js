// OMAM equations and reference values, as data. Source: Yao G, et al. MedComm 2026;7(6):e70788 (CITED I).
//
// Expected diameter (mm):  Yp = a × b^female × age^x × height^y × weight^z
//   age in years, height in cm, weight in kg; a term is absent (exponent 0) where stepwise selection dropped it.
// Corrected value:         Yc = measured / Yp

/** The three aortic sites. `example` fills the form on first load. */
export const SITES = [
  { id: "aoa",   name: "Aortic annulus",           abbr: "Ao-a",   example: 25 },
  { id: "aos",   name: "Sinuses of Valsalva",      abbr: "Ao-s",   example: 38 },
  { id: "aoasc", name: "Proximal ascending aorta", abbr: "Ao-asc", example: 38 },
];

/** Reference cohorts. Order is the order of the buttons and comparison tables. */
export const COHORTS = {
  italian:  { label: "Italian",  n: 910, refSource: "Table 5" },
  chinese:  { label: "Chinese",  n: 910, refSource: "Table 5" },
  combined: { label: "Combined", n: 1820, refSource: "Table 4, validation group by sex (provisional)", provisional: true },
};

/** Coefficients from Results 2.6–2.8 and Tables 2–4. */
export const MODELS = {
  chinese: {
    aoa:   { a: 9.593, b: 0.943, x: 0.054, y: 0,     z: 0.142 },
    aos:   { a: 8.085, b: 0.949, x: 0.113, y: 0,     z: 0.210 },
    aoasc: { a: 5.028, b: 0.966, x: 0.161, y: 0,     z: 0.261 },
  },
  italian: {
    aoa:   { a: 1.042, b: 0.944, x: 0.054, y: 0.472, z: 0.081 },
    aos:   { a: 2.268, b: 0.925, x: 0.164, y: 0.317, z: 0.090 },
    aoasc: { a: 6.385, b: 0.956, x: 0.204, y: 0,     z: 0.175 },
  },
  combined: {
    aoa:   { a: 2.948, b: 0.928, x: 0.060, y: 0.338, z: 0     },
    aos:   { a: 2.689, b: 0.950, x: 0.137, y: 0.210, z: 0.198 },
    aoasc: { a: 4.375, b: 0.974, x: 0.180, y: 0,     z: 0.280 },
  },
};

/**
 * Reference distribution of Yc.
 * Chinese and Italian: mean ± SD and 95% limits from Table 5 (n = 910 each). The limits are asymmetric
 * and are not mean ± 1.96 SD, so they are probably empirical percentiles; the paper does not say.
 * Combined: the paper publishes no reference values. Table 4 gives the validation-group (group B)
 * mean ± SD by sex; limits are taken as mean ± 1.96 SD.
 */
export const REFS = {
  italian: {
    aoa:   { mean: 1.007, sd: 0.086, lo: 0.854, hi: 1.188 },
    aos:   { mean: 1.004, sd: 0.090, lo: 0.834, hi: 1.185 },
    aoasc: { mean: 1.006, sd: 0.099, lo: 0.802, hi: 1.195 },
  },
  chinese: {
    aoa:   { mean: 1.002, sd: 0.112, lo: 0.794, hi: 1.246 },
    aos:   { mean: 1.003, sd: 0.105, lo: 0.792, hi: 1.213 },
    aoasc: { mean: 1.006, sd: 0.122, lo: 0.747, hi: 1.262 },
  },
  combined: {
    M: { aoa: { mean: 0.996, sd: 0.101 }, aos: { mean: 0.992, sd: 0.100 }, aoasc: { mean: 0.995, sd: 0.120 } },
    F: { aoa: { mean: 1.010, sd: 0.108 }, aos: { mean: 1.001, sd: 0.109 }, aoasc: { mean: 1.007, sd: 0.114 } },
  },
};

/** Flags. "High-normal" and "low-normal" are this calculator's addition, not the authors'. */
export const STATUS = {
  normal:     { label: "Normal",       tone: "ok" },
  highnormal: { label: "High-normal",  tone: "warn" },
  lownormal:  { label: "Low-normal",   tone: "warn" },
  above:      { label: "Above normal", tone: "crit" },
  below:      { label: "Below normal", tone: "crit" },
  none:       { label: "Not measured", tone: "none" },
};

/** Derivation range from the Methods: healthy, normotensive, non-obese adults. */
export const SCOPE = { ageMin: 18, ageMax: 79, bmiMax: 30 };
