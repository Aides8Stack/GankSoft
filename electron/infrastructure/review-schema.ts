/** Additive schema602; learning events and existing policy tables are untouched. */
export const REVIEW_SCHEMA = `
CREATE TABLE IF NOT EXISTS deck_review_config_v2 (
 deck_id TEXT PRIMARY KEY REFERENCES decks(id) ON DELETE CASCADE,
 payload TEXT NOT NULL CHECK(json_valid(payload) AND json_extract(payload,'$.desiredRetention') BETWEEN 0.80 AND 0.97),
 revision INTEGER NOT NULL CHECK(revision>0),updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS knowledge_specialty_prefs (
 deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,knowledge_id TEXT NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,
 payload TEXT NOT NULL CHECK(json_valid(payload) AND json_extract(payload,'$.boost') BETWEEN 0.5 AND 2),
 revision INTEGER NOT NULL CHECK(revision>0),updated_at TEXT NOT NULL,PRIMARY KEY(deck_id,knowledge_id));
CREATE TABLE IF NOT EXISTS diagnosis_config (id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL CHECK(json_valid(payload)),revision INTEGER NOT NULL CHECK(revision>0),updated_at TEXT NOT NULL);
`;
export const DUE_SCHEMA = `
CREATE TABLE IF NOT EXISTS review_due_overrides (
 kind TEXT NOT NULL CHECK(kind IN ('question','memory')),card_id TEXT NOT NULL,
 source TEXT NOT NULL CHECK(source IN ('policy','snooze')),effective_due TEXT NOT NULL,
 operation_id TEXT NOT NULL,anchor TEXT NOT NULL,created_at TEXT NOT NULL,
 PRIMARY KEY(kind,card_id,source));
CREATE TABLE IF NOT EXISTS review_config_operations (
 id TEXT PRIMARY KEY,request_id TEXT NOT NULL UNIQUE,digest TEXT NOT NULL,
 response TEXT NOT NULL CHECK(json_valid(response)),created_at TEXT NOT NULL);
`;
export const EVIDENCE_SCHEMA = `
CREATE TABLE IF NOT EXISTS attempt_evidence_snapshots (
 attempt_id TEXT PRIMARY KEY REFERENCES attempts(id) ON DELETE CASCADE,
 deck_id TEXT NOT NULL REFERENCES decks(id),knowledge_ids TEXT NOT NULL CHECK(json_valid(knowledge_ids)),
 link_revision TEXT NOT NULL,study_timezone TEXT NOT NULL,practice INTEGER NOT NULL CHECK(practice IN(0,1)));
CREATE INDEX IF NOT EXISTS evidence_deck ON attempt_evidence_snapshots(deck_id);
`;
