// Run with: npm test  (or: node --test)
import { test } from "node:test";
import assert from "node:assert/strict";
import { SITES, COHORTS, REFS } from "../js/equations.js";
import { predict, reference, evaluate, classify, zOf, normalCdf, mmAtZ } from "../js/zscore.js";
import { toCm, fromCm, toKg, fromKg, bmi, bsaDuBois, feetInches } from "../js/units.js";

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (±${tol})`);
const man61 = { sex: "M", age: 61, heightCm: 177, weightKg: 77 };

test("expected diameters match the authors' online calculator (Italian, male, 61 y, 177 cm, 77 kg)", () => {
  // Their calculator shows Yp 21.3, 33.9, 31.6 mm and Yc 1.174, 1.119, 1.203 for 25, 38, 38 mm.
  close(predict("italian", "aoa", man61), 21.3, 0.05, "Ao-a Yp");
  close(predict("italian", "aos", man61), 33.9, 0.05, "Ao-s Yp");
  close(predict("italian", "aoasc", man61), 31.6, 0.05, "Ao-asc Yp");
  close(evaluate("italian", "aoa", 25, man61).yc, 1.174, 0.0005, "Ao-a Yc");
  close(evaluate("italian", "aos", 38, man61).yc, 1.119, 0.0005, "Ao-s Yc");
  close(evaluate("italian", "aoasc", 38, man61).yc, 1.203, 0.0005, "Ao-asc Yc");
});

test("flags for the worked example, Italian cohort", () => {
  assert.equal(evaluate("italian", "aoa", 25, man61).status, "highnormal");
  assert.equal(evaluate("italian", "aos", 38, man61).status, "normal");
  assert.equal(evaluate("italian", "aoasc", 38, man61).status, "above");
  close(evaluate("italian", "aoasc", 38, man61).z, 1.99, 0.01, "Ao-asc Z");
});

test("normal range in mm is expected diameter × published limits", () => {
  const r = evaluate("italian", "aoasc", NaN, man61);
  close(r.normalMm.lo, 25.3, 0.05, "lower mm");
  close(r.normalMm.hi, 37.7, 0.05, "upper mm");
  assert.equal(r.status, "none", "blank measurement is not flagged");
  assert.ok(Number.isNaN(r.z));
});

test("sex factor applies to women only", () => {
  const woman = { ...man61, sex: "F" };
  for (const c of Object.keys(COHORTS)) for (const s of SITES) {
    const ratio = predict(c, s.id, woman) / predict(c, s.id, man61);
    assert.ok(ratio > 0.9 && ratio < 1, `${c} ${s.id} female/male ${ratio}`);
  }
});

test("Table 5 means sit at Z = 0 and limits bracket the mean", () => {
  for (const c of ["italian", "chinese"]) for (const s of SITES) {
    const r = reference(c, s.id, "M");
    close(zOf(r.mean, r), 0, 1e-12, `${c} ${s.id} mean`);
    assert.ok(r.lo < r.mean && r.mean < r.hi, `${c} ${s.id} limits`);
    assert.ok(Math.abs(zOf(r.lo, r)) > 1.5 && Math.abs(zOf(r.hi, r)) < 2.6, `${c} ${s.id} limits near ±2 Z`);
  }
});

test("combined cohort: provisional limits are sex-specific mean ± 1.96 SD", () => {
  const r = reference("combined", "aoa", "F");
  assert.equal(r.provisional, true);
  close(r.lo, REFS.combined.F.aoa.mean - 1.96 * REFS.combined.F.aoa.sd, 1e-12, "lower");
  close(zOf(r.hi, r), 1.96, 1e-12, "upper Z");
});

test("classification boundaries", () => {
  const ref = { mean: 1, sd: 0.1, lo: 0.8, hi: 1.2 };
  assert.equal(classify(1.21, 2.1, ref), "above");
  assert.equal(classify(0.79, -2.1, ref), "below");
  assert.equal(classify(1.17, 1.7, ref), "highnormal");
  assert.equal(classify(0.83, -1.7, ref), "lownormal");
  assert.equal(classify(1.05, 0.5, ref), "normal");
  assert.equal(classify(NaN, NaN, ref), "none");
});

test("mm at a given Z round-trips through Z", () => {
  const yp = predict("chinese", "aos", man61), ref = reference("chinese", "aos", "M");
  const mm = mmAtZ(yp, ref, 1.5);
  close(zOf(mm / yp, ref), 1.5, 1e-12, "round trip");
});

test("unit conversions round-trip and match known values", () => {
  close(toCm(70, "in"), 177.8, 1e-9, "70 in");
  close(fromCm(toCm(69.7, "in"), "in"), 69.7, 1e-12, "in round trip");
  close(toKg(170, "lb"), 77.11, 0.01, "170 lb");
  close(fromKg(toKg(169.8, "lb"), "lb"), 169.8, 1e-12, "lb round trip");
  assert.equal(feetInches(177.8), "5 ft 10 in");
  close(bmi(177, 77), 24.58, 0.01, "BMI");
  close(bsaDuBois(177, 77), 1.94, 0.005, "BSA");
});

test("normal CDF", () => {
  close(normalCdf(0), 0.5, 1e-7, "Φ(0)");
  close(normalCdf(1.96), 0.975, 1e-4, "Φ(1.96)");
  close(normalCdf(-1.645), 0.05, 1e-4, "Φ(−1.645)");
});
