/** Scheduling and reporting deliberately use different explicit zones.
 * Persisted effective credits must not depend on the machine creating this fixture.
 */
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Application } from "../../electron/application.ts";
export const DATE_BOUNDARY_TIMES = [
  "2026-10-17T15:59:59Z",
  "2026-10-17T16:00:00Z",
  "2026-10-18T15:59:59Z",
  "2026-10-18T16:00:00Z",
];
export function seedDateBoundaryReviews(
  model: Application,
  db: DatabaseSync,
  card: string,
  setNow: (iso: string) => void,
) {
  // UTC preserves the original CI fixture: one credit per UTC day, with the
  // second attempt one second later saved as consolidation, not a new credit.
  db.prepare("UPDATE settings SET value=? WHERE key='studyTimezone'").run(
    "UTC",
  );
  for (const iso of DATE_BOUNDARY_TIMES) {
    setNow(iso);
    model.handle("review.submit", {
      request_id: randomUUID(),
      protocol_version: 2,
      question_id: card,
      content_version: 1,
      answer: "A",
      thought: "日期边界",
      self_score: 3,
      elapsed_seconds: 5,
      basis: "independent",
      understanding: 3,
    });
  }
  // Reporting in Shanghai must regroup timestamps without rewriting credits.
  db.prepare("UPDATE settings SET value=? WHERE key='studyTimezone'").run(
    "Asia/Shanghai",
  );
}
