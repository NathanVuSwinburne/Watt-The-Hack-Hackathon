/**
 * ML model evaluation for SolarCycle AI.
 *
 * Evaluates:
 *   1. Risk scoring engine  — confusion matrix + per-class metrics
 *   2. Route optimizer      — baseline vs optimised comparison
 *   3. Telemetry bridge     — PV fault feature mapping sample
 */

import { breakingRisk, riskScore, type RiskInputs } from "../src/lib/risk.js";
import { baselineRoute, optimizedRoute } from "../src/lib/optimizer.js";
import { healthReadingToPvTelemetry } from "../src/lib/pvFaultModel.js";
import type { BreakingRisk } from "../src/data/types.js";

// ─── 1. Risk Model Test Suite ────────────────────────────────────────────────

type TestCase = {
  label: string;
  inputs: RiskInputs;
  expected: BreakingRisk;
};

// 25 labelled test cases spanning all four risk bands.
// "expected" is the expert-assigned ground truth label.
const TEST_CASES: TestCase[] = [
  // ── NORMAL (score < 0.45) ──────────────────────────────────────────────────
  {
    label: "new healthy inverter",
    inputs: { temperature_c: 35, thd: 1.5, conversion_efficiency: 98.5, ac_voltage: 230, age_years: 1, expected_lifespan_years: 12 },
    expected: "normal",
  },
  {
    label: "young, slightly warm",
    inputs: { temperature_c: 50, thd: 3.0, conversion_efficiency: 96.5, ac_voltage: 228, age_years: 3, expected_lifespan_years: 12 },
    expected: "normal",
  },
  {
    label: "mid-life, all signals nominal",
    inputs: { temperature_c: 45, thd: 2.0, conversion_efficiency: 97.0, ac_voltage: 230, age_years: 5, expected_lifespan_years: 25 },
    expected: "normal",
  },
  {
    label: "cool, efficient, young panel",
    inputs: { temperature_c: 30, thd: 1.0, conversion_efficiency: 99.0, ac_voltage: 231, age_years: 2, expected_lifespan_years: 25 },
    expected: "normal",
  },
  {
    label: "stable mid-life panel",
    inputs: { temperature_c: 48, thd: 2.5, conversion_efficiency: 97.5, ac_voltage: 229, age_years: 8, expected_lifespan_years: 25 },
    expected: "normal",
  },
  {
    label: "fresh install, mild heat",
    inputs: { temperature_c: 52, thd: 2.8, conversion_efficiency: 97.2, ac_voltage: 231, age_years: 0.5, expected_lifespan_years: 12 },
    expected: "normal",
  },

  // ── WATCH (0.45 ≤ score < 0.70) ───────────────────────────────────────────
  {
    label: "warm + moderate THD",
    inputs: { temperature_c: 68, thd: 6.0, conversion_efficiency: 93.0, ac_voltage: 237, age_years: 8, expected_lifespan_years: 12 },
    expected: "watch",
  },
  {
    label: "ageing panel with rising THD",
    inputs: { temperature_c: 62, thd: 5.5, conversion_efficiency: 94.0, ac_voltage: 235, age_years: 7, expected_lifespan_years: 12 },
    expected: "watch",
  },
  {
    label: "efficiency degrading, voltage drifting",
    inputs: { temperature_c: 65, thd: 5.0, conversion_efficiency: 93.5, ac_voltage: 240, age_years: 9, expected_lifespan_years: 25 },
    expected: "watch",
  },
  {
    label: "hot summer day with normal THD",
    inputs: { temperature_c: 72, thd: 4.0, conversion_efficiency: 95.0, ac_voltage: 232, age_years: 5, expected_lifespan_years: 12 },
    expected: "watch",
  },
  {
    label: "mid-life efficiency drop",
    inputs: { temperature_c: 58, thd: 5.8, conversion_efficiency: 92.5, ac_voltage: 236, age_years: 10, expected_lifespan_years: 25 },
    expected: "watch",
  },
  {
    label: "voltage instability + warm",
    inputs: { temperature_c: 63, thd: 4.5, conversion_efficiency: 94.5, ac_voltage: 243, age_years: 6, expected_lifespan_years: 12 },
    expected: "watch",
  },

  // ── LIKELY_BREAKING (0.70 ≤ score < 0.85) ────────────────────────────────
  {
    label: "high temp + high THD + aged",
    inputs: { temperature_c: 80, thd: 8.5, conversion_efficiency: 87.0, ac_voltage: 243, age_years: 11, expected_lifespan_years: 12 },
    expected: "likely_breaking",
  },
  {
    label: "overheating + efficiency crash",
    inputs: { temperature_c: 78, thd: 7.5, conversion_efficiency: 88.0, ac_voltage: 241, age_years: 10, expected_lifespan_years: 12 },
    expected: "likely_breaking",
  },
  {
    label: "all signals stressed, not quite urgent",
    inputs: { temperature_c: 76, thd: 8.0, conversion_efficiency: 88.5, ac_voltage: 245, age_years: 11.5, expected_lifespan_years: 25 },
    expected: "likely_breaking",
  },
  {
    label: "near end-of-life inverter",
    inputs: { temperature_c: 77, thd: 7.8, conversion_efficiency: 89.0, ac_voltage: 242, age_years: 11.8, expected_lifespan_years: 12 },
    expected: "likely_breaking",
  },
  {
    label: "hot + degraded efficiency",
    inputs: { temperature_c: 82, thd: 7.0, conversion_efficiency: 87.5, ac_voltage: 240, age_years: 10.5, expected_lifespan_years: 12 },
    expected: "likely_breaking",
  },

  // ── URGENT (score ≥ 0.85) ─────────────────────────────────────────────────
  {
    label: "maximum stress all signals",
    inputs: { temperature_c: 90, thd: 10.0, conversion_efficiency: 82.0, ac_voltage: 255, age_years: 12, expected_lifespan_years: 12 },
    expected: "urgent",
  },
  {
    label: "critical overheating + old",
    inputs: { temperature_c: 88, thd: 9.5, conversion_efficiency: 83.5, ac_voltage: 250, age_years: 11.9, expected_lifespan_years: 12 },
    expected: "urgent",
  },
  {
    label: "severe THD + voltage swing",
    inputs: { temperature_c: 85, thd: 9.0, conversion_efficiency: 85.0, ac_voltage: 248, age_years: 11.5, expected_lifespan_years: 12 },
    expected: "urgent",
  },
  {
    label: "failing inverter, all red",
    inputs: { temperature_c: 86, thd: 9.2, conversion_efficiency: 84.0, ac_voltage: 252, age_years: 12, expected_lifespan_years: 12 },
    expected: "urgent",
  },
  {
    label: "thermal runaway signature",
    inputs: { temperature_c: 89, thd: 9.8, conversion_efficiency: 82.5, ac_voltage: 249, age_years: 11.8, expected_lifespan_years: 12 },
    expected: "urgent",
  },
  {
    label: "end-of-life panel extreme heat",
    inputs: { temperature_c: 87, thd: 9.1, conversion_efficiency: 84.5, ac_voltage: 246, age_years: 24.5, expected_lifespan_years: 25 },
    expected: "urgent",
  },
  {
    label: "very old panel at limit",
    inputs: { temperature_c: 84, thd: 8.8, conversion_efficiency: 85.5, ac_voltage: 247, age_years: 25, expected_lifespan_years: 25 },
    expected: "urgent",
  },
];

// ─── Evaluate ────────────────────────────────────────────────────────────────

const CLASSES: BreakingRisk[] = ["normal", "watch", "likely_breaking", "urgent"];
const classIdx = Object.fromEntries(CLASSES.map((c, i) => [c, i]));

// confusion[actual][predicted]
const confusion: number[][] = Array.from({ length: 4 }, () => Array(4).fill(0));
const results: { label: string; score: number; predicted: BreakingRisk; expected: BreakingRisk; correct: boolean }[] = [];

for (const tc of TEST_CASES) {
  const score = riskScore(tc.inputs);
  const predicted = breakingRisk(score);
  const correct = predicted === tc.expected;
  confusion[classIdx[tc.expected]][classIdx[predicted]]++;
  results.push({ label: tc.label, score, predicted, expected: tc.expected, correct });
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

function precision(cls: number): number {
  const colSum = confusion.reduce((s, row) => s + row[cls], 0);
  return colSum === 0 ? 0 : confusion[cls][cls] / colSum;
}
function recall(cls: number): number {
  const rowSum = confusion[cls].reduce((s, v) => s + v, 0);
  return rowSum === 0 ? 0 : confusion[cls][cls] / rowSum;
}
function f1(cls: number): number {
  const p = precision(cls), r = recall(cls);
  return p + r === 0 ? 0 : (2 * p * r) / (p + r);
}
function support(cls: number): number {
  return confusion[cls].reduce((s, v) => s + v, 0);
}

const totalCorrect = results.filter((r) => r.correct).length;
const accuracy = totalCorrect / results.length;

// ─── Route Optimizer Evaluation ──────────────────────────────────────────────

const baseline = baselineRoute();
const optimized = optimizedRoute();
const distSaved = baseline.distanceKm - optimized.distanceKm;
const distSavedPct = (distSaved / baseline.distanceKm) * 100;

// ─── PV Telemetry Bridge Sample ───────────────────────────────────────────────

const sampleReading = {
  timestamp: "10:00",
  dc_voltage: 490,
  ac_voltage: 235,
  current: 14.1,
  temperature_c: 72,
  conversion_efficiency: 91.5,
  power_factor: 0.93,
  thd: 6.8,
  risk_score: 0.62,
};
const mappedTelemetry = healthReadingToPvTelemetry(sampleReading);

// ─── Print ────────────────────────────────────────────────────────────────────

const pad = (s: string | number, n: number) => String(s).padEnd(n);
const rpad = (s: string | number, n: number) => String(s).padStart(n);
const pct = (v: number) => (v * 100).toFixed(1) + "%";
const fmt2 = (v: number) => v.toFixed(2);

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║          SolarCycle AI — ML Evaluation Report               ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

// --- Per-case table ---
console.log("## Risk Model — Test Cases\n");
console.log(`${"Case".padEnd(42)} ${"Score".padEnd(7)} ${"Predicted".padEnd(18)} ${"Expected".padEnd(18)} OK`);
console.log("─".repeat(92));
for (const r of results) {
  const mark = r.correct ? "✓" : "✗";
  const scoreStr = r.score.toFixed(3);
  const row = `${r.label.padEnd(42)} ${scoreStr.padEnd(7)} ${r.predicted.padEnd(18)} ${r.expected.padEnd(18)} ${mark}`;
  console.log(row);
}

// --- Confusion matrix ---
console.log("\n## Confusion Matrix (rows=actual, cols=predicted)\n");
const colW = 18;
console.log(" ".repeat(22) + CLASSES.map((c) => pad(c, colW)).join(""));
console.log("─".repeat(22 + colW * 4));
for (let i = 0; i < 4; i++) {
  const row = CLASSES[i].padEnd(22) + confusion[i].map((v) => rpad(v, colW)).join("");
  console.log(row);
}

// --- Classification report ---
console.log("\n## Classification Report\n");
console.log(`${"Class".padEnd(20)} ${"Precision".padEnd(12)} ${"Recall".padEnd(12)} ${"F1".padEnd(12)} ${"Support"}`);
console.log("─".repeat(68));
let wP = 0, wR = 0, wF = 0, total = 0;
for (let i = 0; i < 4; i++) {
  const s = support(i);
  const p = precision(i), r = recall(i), f = f1(i);
  wP += p * s; wR += r * s; wF += f * s; total += s;
  console.log(`${CLASSES[i].padEnd(20)} ${pct(p).padEnd(12)} ${pct(r).padEnd(12)} ${pct(f).padEnd(12)} ${s}`);
}
console.log("─".repeat(68));
console.log(`${"weighted avg".padEnd(20)} ${pct(wP / total).padEnd(12)} ${pct(wR / total).padEnd(12)} ${pct(wF / total).padEnd(12)} ${total}`);
console.log(`\nOverall accuracy: ${pct(accuracy)}  (${totalCorrect}/${results.length} correct)`);

// --- Route optimizer ---
console.log("\n## Route Optimizer — Baseline vs Optimised\n");
console.log(`${"Metric".padEnd(28)} ${"Baseline".padEnd(16)} ${"Optimised".padEnd(16)} Delta`);
console.log("─".repeat(72));
console.log(`${"Stops (excl. depot/RC)".padEnd(28)} ${rpad(baseline.stops.length - 2, 16)} ${rpad(optimized.stops.length - 2, 16)}`);
console.log(`${"Distance (km)".padEnd(28)} ${rpad(fmt2(baseline.distanceKm), 16)} ${rpad(fmt2(optimized.distanceKm), 16)} -${fmt2(distSaved)} km (-${distSavedPct.toFixed(1)}%)`);
console.log(`${"Mass collected (kg)".padEnd(28)} ${rpad(baseline.collectedMassKg, 16)} ${rpad(optimized.collectedMassKg, 16)}`);
console.log(`${"Sites skipped".padEnd(28)} ${rpad(baseline.skipped.length, 16)} ${rpad(optimized.skipped.length, 16)}`);
console.log(`\nOptimised stop order: ${optimized.stops.join(" → ")}`);
console.log(`Baseline stop order:  ${baseline.stops.join(" → ")}`);

// --- Telemetry bridge ---
console.log("\n## PV Fault Feature Mapping — Sample\n");
console.log("Input health reading:");
console.log(`  dc_voltage=${sampleReading.dc_voltage}V  current=${sampleReading.current}A  temperature=${sampleReading.temperature_c}°C  thd=${sampleReading.thd}%`);
console.log("\nMapped PV fault telemetry (6 model features):");
for (const [k, v] of Object.entries(mappedTelemetry)) {
  console.log(`  ${k.padEnd(26)} ${v}`);
}
console.log("\n✓ Evaluation complete.\n");
