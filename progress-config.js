// progress-config.js — length-weighted progress for the INSPECTOR portal
// ---------------------------------------------------------------------------
// Purpose: replace flat "each section = 5%" with progress weighted by how long
// each section actually runs. Directly mirrors the host portal's proven pattern
// (SEGMENT_TIMINGS / TIMING_TOTALS + calculateOverallPercent in host/js/config.js
// and host/js/training-api.js).
//
// All numbers below were derived from the videoDuration + group start times
// already embedded in module1.html / module2.html — nothing new was invented.
// Section durations sum back to their part duration within rounding.
// ---------------------------------------------------------------------------

// Whole-part durations (seconds). Coarse weighting unit: one row per video "part".
const PART_DURATIONS = {
  '1-1': 299.7,  // Welcome & Company
  '1-2': 378.1,  // Inspection Rubric
  '1-3': 384.9,  // Workflow & Platform
  '2-1': 250.3,  // Intro & Outside
  '2-2': 312.7,  // Basement & Kitchen
  '2-3': 363.7,  // Bathroom & Hallway
  '2-4': 276.7,  // Bedroom
  '2-5': 429.6,  // Common Room & Overall
  '4-1': 1,      // Property-wide field walkthrough (binary completion)
  '4-2': 1,      // Common room field walkthrough
  '4-3': 1,      // Kitchen field walkthrough
  '4-4': 1,      // Hallway field walkthrough
  '4-5': 1,      // Bathroom field walkthrough
  '4-6': 1,      // Bedroom field walkthrough
  '5-1': 1,      // Certification quiz (binary required completion)
  // Module 3 is an optional reference library and is intentionally excluded.
};

// Per-section durations (seconds), in play order. Fine weighting unit: matches
// the host's SEGMENT_TIMINGS.durations. Index i = the i-th "group" in that part.
const SECTION_TIMINGS = {
  '1-1': { durations: [48.6, 28.0, 52.9, 91.5, 52.6, 24.9] },
  '1-2': { durations: [32.9, 345.1] },
  '1-3': { durations: [68.9, 35.8, 104.7, 22.4, 81.3, 32.0, 39.6] },
  '2-1': { durations: [50.6, 100.5, 98.1] },
  '2-2': { durations: [149.4, 162.8] },
  '2-3': { durations: [71.8, 139.2, 152.0] },
  '2-4': { durations: [130.2, 146.0] },
  '2-5': { durations: [159.5, 116.7, 153.0] },
  '4-1': { durations: [1] },
  '4-2': { durations: [1] },
  '4-3': { durations: [1] },
  '4-4': { durations: [1] },
  '4-5': { durations: [1] },
  '4-6': { durations: [1] },
  '5-1': { durations: [1] },
};

// ---------------------------------------------------------------------------
// Calc helpers. `progress` is a plain object keyed by part, e.g.:
//   { '1-1': { currentSection: 6, completed: true },
//     '1-2': { currentSection: 1, completed: false }, ... }
// currentSection = number of sections finished in that part (0 = not started).
// ---------------------------------------------------------------------------

// Seconds of a part credited given how many sections are done.
function partCompletedSeconds(partKey, currentSection) {
  const durs = (SECTION_TIMINGS[partKey] && SECTION_TIMINGS[partKey].durations) || [];
  let s = 0;
  for (let i = 0; i < currentSection && i < durs.length; i++) s += durs[i];
  return s;
}

// Overall completion 0–100, weighted by real section length.
// Falls back to part-level weighting, then to flat unit count, if timings are
// missing — so it degrades gracefully as you add M3/M4.
function calculateWeightedPercent(progress) {
  let totalSeconds = 0, doneSeconds = 0;
  let totalParts = 0, doneParts = 0;

  for (const key in PART_DURATIONS) {
    const p = progress[key] || {};
    const partDur = PART_DURATIONS[key];
    const hasSections = !!SECTION_TIMINGS[key];

    totalSeconds += partDur;
    if (hasSections) {
      doneSeconds += p.completed ? partDur
                                 : partCompletedSeconds(key, p.currentSection || 0);
    } else {
      doneSeconds += p.completed ? partDur : 0; // no section data → all-or-nothing
    }

    totalParts += 1;
    if (p.completed) doneParts += 1;
  }

  if (totalSeconds > 0) return Math.round((doneSeconds / totalSeconds) * 100);
  if (totalParts   > 0) return Math.round((doneParts   / totalParts)   * 100);
  return 0;
}

// Convenience: per-part percent (for a progress bar on each module card).
function partPercent(partKey, currentSection) {
  const durs = (SECTION_TIMINGS[partKey] && SECTION_TIMINGS[partKey].durations) || [];
  const total = durs.reduce((a, b) => a + b, 0) || PART_DURATIONS[partKey] || 0;
  if (!total) return 0;
  return Math.round((partCompletedSeconds(partKey, currentSection) / total) * 100);
}

// Expose (vanilla-JS style, matching the existing player.js globals).
window.PART_DURATIONS = PART_DURATIONS;
window.SECTION_TIMINGS = SECTION_TIMINGS;
window.calculateWeightedPercent = calculateWeightedPercent;
window.partPercent = partPercent;
