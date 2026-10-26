// UI: patient inputs, the measurement ledger, sketched Z-bars, the calculation panel and the report.
import rough from "../vendor/rough.esm.js";
import { SITES, COHORTS, MODELS, REFS, STATUS, SCOPE } from "./equations.js";
import { evaluate, validPatient } from "./zscore.js";
import { toCm, fromCm, toKg, fromKg, bmi, bsaDuBois, feetInches } from "./units.js";
import { APP, longDate, stamp } from "./version.js";

const $ = (s) => document.querySelector(s);
const fmt = (x, d) => (Number.isFinite(x) ? x.toFixed(d) : "—");
const sgn = (x, d = 2) => (Number.isFinite(x) ? (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(d) : "—");
function ord(p) {
  const r = Math.round(p);
  if (r < 1) return "<1st";
  if (r > 99) return ">99th";
  const s = ["th", "st", "nd", "rd"], v = r % 100;
  return r + (s[(v - 20) % 10] || s[v] || s[0]);
}
const TONE = (status) => STATUS[status].tone;

// Height and weight are kept in cm and kg; the inputs show whichever unit is selected.
const state = { cohort: "italian", sex: "M", hUnit: "cm", wUnit: "kg", heightCm: 177, weightKg: 77, sel: "aoa", values: {} };
SITES.forEach((s) => (state.values[s.id] = s.example));

function patient() {
  return { sex: state.sex, age: parseFloat($("#age").value), heightCm: state.heightCm, weightKg: state.weightKg };
}

/* ---------- sketched Z-bar ---------- */
const Z0 = -3, Z1 = 3;
const SVGNS = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}) {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}
function put(svg, cls, node) {
  const g = el("g", { class: cls });
  g.appendChild(node);
  svg.appendChild(g);
  return g;
}
// rough.js strokes use currentColor, so each group takes its colour from the theme tokens.
function drawBar(svg, r, seed) {
  const W = Math.max(120, svg.clientWidth || 200), H = 46, pad = 9, cy = 16;
  const X = (v) => pad + ((Math.max(Z0, Math.min(Z1, v)) - Z0) / (Z1 - Z0)) * (W - 2 * pad);
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const R = rough.svg(svg);
  put(svg, "g-band", R.rectangle(X(r.zLo), cy - 7, X(r.zHi) - X(r.zLo), 14,
    { stroke: "none", fill: "currentColor", fillStyle: "hachure", hachureGap: 3.5, fillWeight: 1.1, hachureAngle: -41, roughness: 1.3, seed }));
  put(svg, "g-rule", R.line(pad, cy, W - pad, cy, { stroke: "currentColor", strokeWidth: 1, roughness: 0.9, bowing: 1.2, seed: seed + 1 }));
  [-2, -1, 0, 1, 2].forEach((t, i) =>
    put(svg, "g-rule", R.line(X(t), cy - (t ? 4 : 7), X(t), cy + (t ? 4 : 7),
      { stroke: "currentColor", strokeWidth: t ? 0.9 : 1.3, roughness: 0.7, seed: seed + 2 + i })));
  if (Number.isFinite(r.z)) {
    const g = put(svg, "g-dot", R.circle(X(r.z), cy, 13, { stroke: "currentColor", strokeWidth: 1.4, fill: "currentColor", fillStyle: "solid", roughness: 1.1, seed: seed + 10 }));
    const tone = TONE(r.status);
    g.classList.toggle("out", tone === "crit");
    g.classList.toggle("edge", tone === "warn");
    if (Math.abs(r.z) > Z1) {
      const t = el("text", { x: r.z > 0 ? W - pad : pad, y: H - 1, "text-anchor": r.z > 0 ? "end" : "start", class: "zl out" });
      t.textContent = r.z > 0 ? "beyond +3 →" : "← beyond −3";
      svg.appendChild(t);
    }
  }
  // Diameters (mm) at the published limits, handwritten under the band.
  for (const [v, zz] of [[r.normalMm.lo, r.zLo], [r.normalMm.hi, r.zHi]]) {
    if (Math.abs(r.z) > Z1 && Math.sign(r.z) === Math.sign(zz)) continue; // make room for the "beyond" note
    const t = el("text", { x: X(zz), y: H - 3, "text-anchor": "middle", class: "lim" });
    t.textContent = fmt(v, 1);
    svg.appendChild(t);
  }
}
function drawLegend() {
  const mk = (id, cls, fn) => {
    const s = $("#" + id);
    s.setAttribute("viewBox", "0 0 26 16");
    s.replaceChildren();
    put(s, cls, fn(rough.svg(s)));
  };
  mk("lg-dot", "g-dot", (rc) => rc.circle(13, 8, 11, { stroke: "currentColor", fill: "currentColor", fillStyle: "solid", roughness: 1.1, seed: 7 }));
  mk("lg-band", "g-band", (rc) => rc.rectangle(2, 2, 22, 12, { stroke: "none", fill: "currentColor", fillStyle: "hachure", hachureGap: 3, hachureAngle: -41, seed: 9 }));
}

/* ---------- controls built from data ---------- */
function buildCohorts() {
  $("#cohort-seg").innerHTML = Object.entries(COHORTS)
    .map(([id, c]) => `<button type="button" data-cohort="${id}" aria-pressed="${id === state.cohort}">${c.label}${c.provisional ? "*" : ""}</button>`).join("");
  document.querySelectorAll("[data-cohort]").forEach((b) => b.addEventListener("click", () => { state.cohort = b.dataset.cohort; render(); }));
}

function buildRows() {
  const host = $("#rows");
  host.innerHTML = "";
  SITES.forEach((s) => {
    const row = document.createElement("div");
    row.className = "prow";
    row.dataset.id = s.id;
    row.tabIndex = 0;
    row.innerHTML = `
      <div class="pname c-name"><span class="t">${s.name}</span><span class="s">${s.abbr} · mm</span><span class="pill none" id="st-${s.id}"></span></div>
      <div class="c-inp"><input type="number" id="v-${s.id}" aria-label="${s.name} in mm" step="0.1" value="${s.example}" inputmode="decimal"></div>
      <div class="r num c-pred" id="p-${s.id}"></div>
      <div class="r num c-pp" id="pp-${s.id}"></div>
      <div class="r num c-z"><span class="zval" id="z-${s.id}"></span><span class="pct" id="pc-${s.id}"></span></div>
      <div class="c-bar"><svg class="zbar" id="b-${s.id}" aria-hidden="true"></svg></div>`;
    host.appendChild(row);
    const select = () => { state.sel = s.id; render(); };
    row.addEventListener("click", (ev) => { if (ev.target.tagName !== "INPUT") select(); });
    row.addEventListener("keydown", (ev) => {
      if ((ev.key === "Enter" || ev.key === " ") && ev.target === row) { ev.preventDefault(); select(); }
    });
    const input = row.querySelector("input");
    input.addEventListener("input", (ev) => { state.values[s.id] = parseFloat(ev.target.value); render(); });
    input.addEventListener("focus", select);
  });
}

function buildRef() {
  const exp = (x) => (x === 0 ? "—" : x.toFixed(3));
  const cols = `<thead><tr><th>Site</th><th>a</th><th>Female ×</th><th>Age exp.</th><th>Height exp.</th><th>Weight exp.</th><th>Mean Y<sub>c</sub></th><th>SD</th><th>Lower</th><th>Upper</th></tr></thead>`;
  let body = "";
  for (const [cid, c] of Object.entries(COHORTS)) {
    body += `<tr><td class="grp" colspan="10">${c.label} cohort · reference from ${c.refSource}</td></tr>`;
    for (const s of SITES) {
      const m = MODELS[cid][s.id];
      let ref;
      if (c.provisional) {
        const rm = REFS[cid].M[s.id], rf = REFS[cid].F[s.id];
        ref = `<td>${rm.mean.toFixed(3)} / ${rf.mean.toFixed(3)}</td><td>${rm.sd.toFixed(3)} / ${rf.sd.toFixed(3)}</td><td>± 1.96 SD</td><td>± 1.96 SD</td>`;
      } else {
        const r = REFS[cid][s.id];
        ref = `<td>${r.mean.toFixed(3)}</td><td>${r.sd.toFixed(3)}</td><td>${r.lo.toFixed(3)}</td><td>${r.hi.toFixed(3)}</td>`;
      }
      body += `<tr><td>${s.abbr}</td><td>${m.a.toFixed(3)}</td><td>${m.b.toFixed(3)}</td><td>${exp(m.x)}</td><td>${exp(m.y)}</td><td>${exp(m.z)}</td>${ref}</tr>`;
    }
  }
  $("#reftable").innerHTML = cols + `<tbody>${body}</tbody>`;
}

/* ---------- render ---------- */
function render() {
  document.querySelectorAll("[data-sex]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.sex === state.sex));
  document.querySelectorAll("[data-cohort]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.cohort === state.cohort));
  $("#hunit").textContent = state.hUnit;
  $("#wunit").textContent = state.wUnit;
  const p = patient();
  const ok = validPatient(p);

  $("#height-alt").textContent = Number.isFinite(p.heightCm) && p.heightCm > 0
    ? (state.hUnit === "cm" ? `${feetInches(p.heightCm)}` : `${p.heightCm.toFixed(1)} cm`) : "Enter height";
  $("#weight-alt").textContent = Number.isFinite(p.weightKg) && p.weightKg > 0
    ? (state.wUnit === "kg" ? `${fromKg(p.weightKg, "lb").toFixed(1)} lb` : `${p.weightKg.toFixed(1)} kg`) : "Enter weight";
  $("#age-note").textContent = ok
    ? `BMI ${bmi(p.heightCm, p.weightKg).toFixed(1)} · BSA ${bsaDuBois(p.heightCm, p.weightKg).toFixed(2)} m²` : "Enter age";

  // Range warnings, from the Methods (inclusion and exclusion criteria).
  const w = [];
  if (Number.isFinite(p.age) && (p.age < SCOPE.ageMin || p.age > SCOPE.ageMax)) {
    w.push(`Age ${p.age} is outside the ${SCOPE.ageMin}–${SCOPE.ageMax} year range the equations were built on. Results are an extrapolation.`);
  }
  if (ok && bmi(p.heightCm, p.weightKg) >= SCOPE.bmiMax) {
    w.push(`BMI ${bmi(p.heightCm, p.weightKg).toFixed(1)} is ${SCOPE.bmiMax} or above. Obese adults were excluded from the reference cohorts.`);
  }
  if (ok && (p.heightCm < 130 || p.heightCm > 215)) w.push(`Height ${p.heightCm.toFixed(0)} cm looks implausible. Check the units.`);
  if (ok && (p.weightKg < 30 || p.weightKg > 200)) w.push(`Weight ${p.weightKg.toFixed(0)} kg looks implausible. Check the units.`);
  if (COHORTS[state.cohort].provisional) {
    w.push("Combined cohort: the paper publishes no reference values for this model. Limits here are provisional (validation-group mean ± 1.96 SD, by sex).");
  }
  $("#rangewarn").hidden = !w.length;
  $("#rangewarn").innerHTML = w.join("<br>");

  SITES.forEach((s, i) => {
    const pill = $("#st-" + s.id);
    if (!ok) {
      ["p-", "pp-", "z-", "pc-"].forEach((k) => ($("#" + k + s.id).textContent = "—"));
      pill.className = "pill none"; pill.textContent = "Needs patient";
      $("#b-" + s.id).replaceChildren();
      return;
    }
    const r = evaluate(state.cohort, s.id, state.values[s.id], p);
    $("#p-" + s.id).textContent = fmt(r.predicted, 1);
    $("#pp-" + s.id).textContent = Number.isFinite(r.percentPredicted) ? r.percentPredicted.toFixed(0) + "%" : "—";
    const zEl = $("#z-" + s.id);
    zEl.textContent = sgn(r.z);
    const tone = TONE(r.status);
    zEl.className = "zval" + (tone === "crit" ? " hi" : tone === "warn" ? " edge" : "");
    $("#pc-" + s.id).textContent = Number.isFinite(r.z) ? ord(r.percentile) : "";
    pill.className = "pill " + tone;
    pill.textContent = STATUS[r.status].label;
    drawBar($("#b-" + s.id), r, i * 20 + 3);
    document.querySelector(`.prow[data-id="${s.id}"]`).classList.toggle("sel", state.sel === s.id);
  });
  renderMath(p, ok);
}

function termStr(cohort, site, p) {
  const m = MODELS[cohort][site];
  const parts = [m.a.toFixed(3)];
  if (p.sex === "F") parts.push(m.b.toFixed(3));
  parts.push(`${fmt(p.age, 0)}<sup>${m.x}</sup>`);
  if (m.y) parts.push(`${fmt(p.heightCm, 1)}<sup>${m.y}</sup>`);
  if (m.z) parts.push(`${fmt(p.weightKg, 1)}<sup>${m.z}</sup>`);
  return parts.join(" × ");
}

// Reference values in millimetres for this patient: percentiles mapped back through Yp.
function rangeBlock(r) {
  const rows = [
    { z: r.zLo, label: r.ref.provisional ? "2.5th" : "Lower limit", yc: r.ref.lo, lim: true },
    { z: -1.645, label: "5th" }, { z: 0, label: "50th" }, { z: 1.645, label: "95th" },
    { z: r.zHi, label: r.ref.provisional ? "97.5th" : "Upper limit", yc: r.ref.hi, lim: true },
  ].map((x) => ({ ...x, yc: x.yc ?? r.ref.mean + x.z * r.ref.sd }))
   .map((x) => ({ ...x, mm: x.yc * r.predicted }));
  if (Number.isFinite(r.z)) {
    rows.push({ z: r.z, label: "This patient", yc: r.yc, mm: r.measured, you: true });
    rows.sort((a, b) => a.z - b.z);
  }
  return `<p class="rangeline">Normal range: <b>${fmt(r.normalMm.lo, 1)} – ${fmt(r.normalMm.hi, 1)} mm</b></p>
  <table class="ztable"><thead><tr><th>Percentile</th><th>Z</th><th>Y<sub>c</sub></th><th>mm</th></tr></thead><tbody>${
    rows.map((x) => `<tr class="${x.lim ? "lim" : ""}${x.you ? " you" : ""}"><td>${x.label}</td><td>${sgn(x.z)}</td><td>${x.yc.toFixed(3)}</td><td>${fmt(x.mm, 1)}</td></tr>`).join("")
  }</tbody></table>`;
}

function cohortCompare(site, p) {
  const m = state.values[site];
  const rows = Object.entries(COHORTS).map(([cid, c]) => {
    const r = evaluate(cid, site, m, p);
    const tone = TONE(r.status);
    return `<tr class="${cid === state.cohort ? "cur" : ""}"><td>${c.label}${c.provisional ? "*" : ""}</td><td class="num mono">${fmt(r.predicted, 1)}</td><td class="num mono">${fmt(r.normalMm.lo, 1)}–${fmt(r.normalMm.hi, 1)}</td><td class="num mono ${tone === "crit" || tone === "warn" ? tone : ""}">${sgn(r.z)}</td><td>${r.status === "none" ? "—" : STATUS[r.status].label}</td></tr>`;
  }).join("");
  return `<div><span class="eyebrow">Same patient, each cohort</span>
    <table class="cmp"><thead><tr><th>Cohort</th><th class="num">Expected</th><th class="num">Normal mm</th><th class="num">Z</th><th>Flag</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="note" style="margin-top:6px">* Provisional limits.</p></div>`;
}

function renderMath(p, ok) {
  const s = SITES.find((x) => x.id === state.sel);
  if (!ok) {
    $("#mathpanel").innerHTML = `<span class="eyebrow">Calculation</span><h3>${s.name}</h3><p class="note">Enter age, height and weight to see the calculation.</p>`;
    return;
  }
  const r = evaluate(state.cohort, s.id, state.values[s.id], p);
  const who = `${p.sex === "M" ? "male" : "female"}, ${fmt(p.age, 0)} y, ${fmt(p.heightCm, 1)} cm, ${fmt(p.weightKg, 1)} kg · ${COHORTS[state.cohort].label} cohort`;
  const has = Number.isFinite(r.z);
  const limTxt = `${r.ref.lo.toFixed(3)} – ${r.ref.hi.toFixed(3)}`;
  $("#mathpanel").innerHTML = `<span class="eyebrow">Calculation</span><h3>${s.name}</h3><p class="note">${who}</p>
  <dl class="steps">
    <dt>Expected Y<sub>p</sub></dt><dd>${termStr(state.cohort, s.id, p)} = <b>${fmt(r.predicted, 2)} mm</b></dd>
    <dt>Measured</dt><dd>${has ? fmt(r.measured, 1) + " mm" : "—"}</dd>
    <dt>Y<sub>c</sub></dt><dd>${has ? `${fmt(r.measured, 1)} / ${fmt(r.predicted, 2)} = <b>${r.yc.toFixed(3)}</b> (${r.percentPredicted.toFixed(1)}% of expected)` : "—"}</dd>
    <dt>Z</dt><dd>${has ? `(${r.yc.toFixed(3)} − ${r.ref.mean.toFixed(3)}) / ${r.ref.sd.toFixed(3)} = <b>${sgn(r.z)}</b>` : "—"}</dd>
    <dt>Percentile</dt><dd>${has ? ord(r.percentile) : "—"}</dd>
    <dt>Limits of Y<sub>c</sub></dt><dd>${limTxt}${r.ref.provisional ? " (provisional)" : ""}</dd>
    <dt>Flag</dt><dd><b>${STATUS[r.status].label}</b></dd>
  </dl>
  ${rangeBlock(r)}
  ${cohortCompare(s.id, p)}`;
}

/* ---------- controls ---------- */
document.querySelectorAll("[data-sex]").forEach((b) => b.addEventListener("click", () => { state.sex = b.dataset.sex; render(); }));
$("#age").addEventListener("input", render);
$("#height").addEventListener("input", (ev) => { state.heightCm = toCm(parseFloat(ev.target.value), state.hUnit); render(); });
$("#weight").addEventListener("input", (ev) => { state.weightKg = toKg(parseFloat(ev.target.value), state.wUnit); render(); });
// Unit switches re-display the stored metric value, so toggling never drifts.
$("#hunit").addEventListener("click", () => {
  state.hUnit = state.hUnit === "cm" ? "in" : "cm";
  if (Number.isFinite(state.heightCm)) $("#height").value = +fromCm(state.heightCm, state.hUnit).toFixed(1);
  $("#height").step = state.hUnit === "cm" ? "0.5" : "0.25";
  render();
});
$("#wunit").addEventListener("click", () => {
  state.wUnit = state.wUnit === "kg" ? "lb" : "kg";
  if (Number.isFinite(state.weightKg)) $("#weight").value = +fromKg(state.weightKg, state.wUnit).toFixed(1);
  render();
});

/* ---------- report ---------- */
function reportData() {
  const p = patient();
  const ok = validPatient(p);
  const rows = ok ? SITES.map((s) => ({ s, r: evaluate(state.cohort, s.id, state.values[s.id], p) }))
    .filter(({ r }) => Number.isFinite(r.z)) : [];
  const date = $("#rep-date").value;
  return {
    p, ok, rows,
    cohort: COHORTS[state.cohort],
    id: $("#rep-id").value.trim(),
    date: date ? new Date(date + "T00:00").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "",
    sex: state.sex === "M" ? "Male" : "Female",
    age: `${fmt(p.age, 0)} y`,
    height: ok ? `${p.heightCm.toFixed(1)} cm (${feetInches(p.heightCm)})` : "—",
    weight: ok ? `${p.weightKg.toFixed(1)} kg (${fromKg(p.weightKg, "lb").toFixed(1)} lb)` : "—",
    body: ok ? `BMI ${bmi(p.heightCm, p.weightKg).toFixed(1)} kg/m², BSA ${bsaDuBois(p.heightCm, p.weightKg).toFixed(2)} m²` : "—",
    generated: stamp(),
  };
}

// Provenance lines shared by the copied text and the printed report.
function provenance(generated) {
  return [
    "---",
    `Calculator: ${APP.name} v${APP.version} (${longDate(APP.date)})`,
    `URL: ${APP.url}`,
    `Equations: ${APP.equations}`,
    `Method: ${APP.method}`,
    `Created by: ${APP.author}`,
    `Generated: ${generated}`,
  ];
}

function limitsNote(cohort) {
  return cohort.provisional
    ? "Normal = within provisional limits (validation-group mean ± 1.96 SD, by sex); the paper publishes no reference values for the combined cohort."
    : `Normal = within the published 95% limits of the corrected value (${cohort.label} cohort, Table 5). High-/low-normal = inside the limits but beyond the 95th/5th percentile.`;
}

function reportText() {
  const d = reportData();
  const lines = [`Aortic root Z-scores, OMAM reference (Yao et al., MedComm 2026), ${d.cohort.label} cohort`];
  if (d.id || d.date) lines.push([d.id, d.date].filter(Boolean).join(" · "));
  lines.push(`${d.sex}, ${d.age}; height ${d.height}; weight ${d.weight}; ${d.body}`, "");
  for (const { s, r } of d.rows) {
    lines.push(`${s.abbr} ${fmt(r.measured, 1)} mm: Z ${sgn(r.z)} (${ord(r.percentile)} percentile), ${r.percentPredicted.toFixed(0)}% of expected ${fmt(r.predicted, 1)} mm; normal ${fmt(r.normalMm.lo, 1)}–${fmt(r.normalMm.hi, 1)} mm. ${STATUS[r.status].label}.`);
  }
  if (!d.rows.length) lines.push("No measurements entered.");
  lines.push("", limitsNote(d.cohort), "Measured leading edge to leading edge, end-diastole, parasternal long axis.");
  lines.push("", ...provenance(d.generated));
  return lines.join("\n");
}

function miniBar(r) {
  const X = (v) => 4 + ((Math.max(Z0, Math.min(Z1, v)) - Z0) / (Z1 - Z0)) * 122;
  const filled = TONE(r.status) === "crit";
  return `<svg viewBox="0 0 130 14" aria-hidden="true"><rect x="${X(r.zLo)}" y="3" width="${X(r.zHi) - X(r.zLo)}" height="8" fill="#dfe5ea"/>
    <line x1="4" y1="7" x2="126" y2="7" stroke="#888" stroke-width=".6"/><line x1="${X(0)}" y1="2" x2="${X(0)}" y2="12" stroke="#888" stroke-width=".6"/>
    <circle cx="${X(r.z)}" cy="7" r="3.6" fill="${filled ? "#000" : "#fff"}" stroke="#000" stroke-width="1"/></svg>`;
}

function buildReport() {
  const d = reportData();
  const demo = [["Patient / ID", d.id || "—"], ["Exam date", d.date || "—"], ["Sex", d.sex], ["Age", d.age],
    ["Height", d.height], ["Weight", d.weight], ["Body size", d.body], ["Reference cohort", d.cohort.label + (d.cohort.provisional ? " (provisional limits)" : "")]];
  $("#report").innerHTML = `
    <h1>Aortic root Z-scores · OMAM reference</h1>
    <p class="sub">Yao G, … Zhang Y. MedComm 2026;7(6):e70788 (CITED I). doi:10.1002/mco2.70788</p>
    <dl class="demo">${demo.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
    <table>
      <thead><tr><th>Site</th><th>Measured</th><th>Expected</th><th>Normal range</th><th>% exp</th><th>Z</th><th>Percentile</th><th>Flag</th><th>−3 · 0 · +3</th></tr></thead>
      <tbody>${d.rows.length ? d.rows.map(({ s, r }) => `<tr>
        <td>${s.name}</td>
        <td>${fmt(r.measured, 1)} mm</td>
        <td>${fmt(r.predicted, 1)}</td>
        <td>${fmt(r.normalMm.lo, 1)} – ${fmt(r.normalMm.hi, 1)}</td>
        <td>${r.percentPredicted.toFixed(0)}%</td>
        <td class="${TONE(r.status) === "crit" ? "flag" : ""}">${sgn(r.z)}</td>
        <td>${ord(r.percentile)}</td>
        <td class="${TONE(r.status) === "crit" ? "flag" : TONE(r.status) === "warn" ? "flag edge" : ""}">${STATUS[r.status].label}</td>
        <td class="bar">${miniBar(r)}</td></tr>`).join("") : `<tr><td colspan="9">No measurements entered.</td></tr>`}</tbody>
    </table>
    <div class="notes">
      <span>${limitsNote(d.cohort)} Filled markers fall outside the limits; the shaded band marks them.</span>
      <span>Reference cohorts: healthy, normotensive, non-obese Han Chinese and Italian adults aged 18–79. Diameters measured leading edge to leading edge at end-diastole, parasternal long axis. Age-related widening is treated as normal. May not apply to other populations or methods. Not a substitute for clinical judgment.</span>
    </div>
    <dl class="prov">
      <div><dt>Calculator</dt><dd>${APP.name} v${APP.version} (${longDate(APP.date)})</dd></div>
      <div><dt>URL</dt><dd>${APP.url}</dd></div>
      <div><dt>Equations</dt><dd>${APP.equations}</dd></div>
      <div><dt>Method</dt><dd>${APP.method}</dd></div>
      <div><dt>Created by</dt><dd>${APP.author}</dd></div>
      <div><dt>Generated</dt><dd>${d.generated}</dd></div>
    </dl>`;
}

function setStatus(msg, ok = false) {
  const st = $("#copy-status");
  st.textContent = msg;
  st.classList.toggle("ok", ok);
}

$("#rep-date").value = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
$("#btn-print").addEventListener("click", () => { buildReport(); window.print(); });
window.addEventListener("beforeprint", buildReport);
$("#btn-copy").addEventListener("click", async () => {
  const text = reportText();
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Report text copied. Paste it into your report.", true);
  } catch {
    setStatus("Copy was blocked by the browser. Use Print report instead.");
  }
});
$("#btn-clear").addEventListener("click", () => {
  SITES.forEach((s) => { state.values[s.id] = NaN; $("#v-" + s.id).value = ""; });
  setStatus("Measurements cleared. Enter the values you measured.");
  render();
  $("#v-" + SITES[0].id).focus();
});

// Footer credit from the same version record.
$("#app-version").textContent = `Version ${APP.version} | ${longDate(APP.date)}`;

buildCohorts();
buildRows();
buildRef();
drawLegend();
render();
if (window.ResizeObserver) {
  let raf = 0;
  new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); }).observe($("#rows"));
}
document.fonts?.ready.then(render);
