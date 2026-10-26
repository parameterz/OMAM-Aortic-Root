// Pure calculation functions. No DOM access, so they run in the browser and under `node --test`.
import { MODELS, REFS, COHORTS } from "./equations.js";

/**
 * @typedef {Object} Patient
 * @property {"M"|"F"} sex
 * @property {number} age       years
 * @property {number} heightCm  centimetres
 * @property {number} weightKg  kilograms
 */

/** Expected diameter Yp (mm) for one cohort and site. */
export function predict(cohort, site, p) {
  const m = MODELS[cohort][site];
  return m.a * (p.sex === "F" ? m.b : 1) * Math.pow(p.age, m.x) * Math.pow(p.heightCm, m.y) * Math.pow(p.weightKg, m.z);
}

/** Reference distribution of Yc: mean, SD and the lower and upper limits of normal. */
export function reference(cohort, site, sex) {
  if (COHORTS[cohort].provisional) {
    const r = REFS[cohort][sex][site];
    return { mean: r.mean, sd: r.sd, lo: r.mean - 1.96 * r.sd, hi: r.mean + 1.96 * r.sd, provisional: true };
  }
  return { ...REFS[cohort][site], provisional: false };
}

/** Z for a corrected value: the familiar (value − mean) / SD, applied to Yc. */
export const zOf = (yc, ref) => (yc - ref.mean) / ref.sd;

/** Diameter (mm) that corresponds to a given Yc, or to a given Z. */
export const mmAtYc = (predicted, yc) => predicted * yc;
export const mmAtZ = (predicted, ref, z) => predicted * (ref.mean + z * ref.sd);

/** Flag a corrected value against the published limits, with a high/low-normal zone beyond the 95th/5th percentile. */
export function classify(yc, z, ref) {
  if (!Number.isFinite(yc)) return "none";
  if (yc > ref.hi) return "above";
  if (yc < ref.lo) return "below";
  if (z >= 1.645) return "highnormal";
  if (z <= -1.645) return "lownormal";
  return "normal";
}

/** Standard normal CDF via the Abramowitz–Stegun erf approximation (|error| < 1.5e-7). */
export function normalCdf(z) {
  const x = z / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + (x >= 0 ? y : -y));
}

/** Everything the page shows for one site under one cohort. `measured` may be NaN. */
export function evaluate(cohort, site, measured, p) {
  const predicted = predict(cohort, site, p);
  const ref = reference(cohort, site, p.sex);
  const out = {
    predicted, measured, ref,
    normalMm: { lo: mmAtYc(predicted, ref.lo), hi: mmAtYc(predicted, ref.hi) },
    zLo: zOf(ref.lo, ref), zHi: zOf(ref.hi, ref),
    yc: NaN, percentPredicted: NaN, z: NaN, percentile: NaN, status: "none",
  };
  if (measured > 0 && predicted > 0) {
    out.yc = measured / predicted;
    out.percentPredicted = 100 * out.yc;
    out.z = zOf(out.yc, ref);
    out.percentile = 100 * normalCdf(out.z);
    out.status = classify(out.yc, out.z, ref);
  }
  return out;
}

/** True when the patient's demographics are usable (all positive numbers). */
export const validPatient = (p) => [p.age, p.heightCm, p.weightKg].every((v) => Number.isFinite(v) && v > 0);
