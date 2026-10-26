// @ts-check
// Browser-qualification gates (BQ-0..BQ-3, design §8.7): administrative release state that
// only selects shipped limits and labels, never a score or seed input. Change a value only
// with a linked report.

/**
 * @typedef {object} QualificationEntry
 * @property {'not-run' | 'blocked' | 'fail' | 'pass'} status
 * @property {string | null} report Repo-relative path of the evidence report.
 */

/** @type {Readonly<{ bq0: Readonly<QualificationEntry>, bq1: Readonly<QualificationEntry>, bq2: Readonly<QualificationEntry>, bq3: Readonly<QualificationEntry> }>} */
export const QUALIFICATION = Object.freeze({
  bq0: Object.freeze({ status: 'not-run', report: null }),
  bq1: Object.freeze({ status: 'not-run', report: null }),
  bq2: Object.freeze({ status: 'not-run', report: null }),
  bq3: Object.freeze({ status: 'not-run', report: null }),
});
