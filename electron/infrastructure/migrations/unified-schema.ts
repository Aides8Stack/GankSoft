// 605 is occupied by feature/unified-image-recovery. 606 is NOT a startup upgrade yet.
export const UNIFIED_SCHEMA_VERSION = 606;
export const UNIFIED_SCHEMA = `
CREATE TABLE learning_cards (
 id TEXT PRIMARY KEY NOT NULL, deck_id TEXT NOT NULL REFERENCES decks(id), title TEXT NOT NULL CHECK(length(title)<=300),
 published_type TEXT NOT NULL CHECK(published_type IN ('question','qa','direct')),
 current_version_id TEXT NOT NULL, current_cycle_id TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0), deleted_at TEXT,
 legacy_kind TEXT CHECK(legacy_kind IN ('question','memory')),
 FOREIGN KEY(current_version_id,id,published_type) REFERENCES learning_content_versions(id,card_id,mode) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(current_cycle_id,id) REFERENCES learning_study_cycles(id,card_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX learning_cards_deck ON learning_cards(deck_id,deleted_at,published_type,id);
CREATE TABLE learning_content_versions (
 id TEXT PRIMARY KEY NOT NULL, card_id TEXT NOT NULL REFERENCES learning_cards(id) DEFERRABLE INITIALLY DEFERRED,
 mode TEXT NOT NULL CHECK(mode IN ('question','qa','direct')),
 document TEXT NOT NULL CHECK(json_valid(document) AND json_extract(document,'$.versionId') IS id
  AND json_extract(document,'$.cardId') IS card_id AND json_extract(document,'$.mode') IS mode
  AND (json_type(document,'$.payload')='null' OR json_extract(document,'$.payload.mode') IS mode)),
 UNIQUE(id,card_id,mode)
);
CREATE INDEX learning_versions_card ON learning_content_versions(card_id,mode);
CREATE INDEX learning_versions_legacy_token ON learning_content_versions(card_id,json_extract(document,'$.source.wireToken'));
CREATE TABLE learning_published_modes (
 card_id TEXT NOT NULL REFERENCES learning_cards(id), mode TEXT NOT NULL CHECK(mode IN ('question','qa','direct')),
 version_id TEXT NOT NULL,
 PRIMARY KEY(card_id,mode),
 FOREIGN KEY(version_id,card_id,mode) REFERENCES learning_content_versions(id,card_id,mode)
);
CREATE TABLE learning_study_cycles (
 id TEXT PRIMARY KEY NOT NULL, card_id TEXT NOT NULL REFERENCES learning_cards(id) DEFERRABLE INITIALLY DEFERRED,
 started_at TEXT, provenance TEXT NOT NULL CHECK(provenance IN ('legacy-segment','explicit-relearn')),
 source_ordinal INTEGER CHECK(source_ordinal>=0), UNIQUE(id,card_id)
);
CREATE TABLE learning_card_drafts (
 card_id TEXT PRIMARY KEY NOT NULL REFERENCES learning_cards(id),
 mode TEXT NOT NULL CHECK(mode IN ('question','qa','direct')),
 payload TEXT NOT NULL CHECK(json_valid(payload) AND json_extract(payload,'$.mode') IS mode),
 revision INTEGER NOT NULL CHECK(revision>0), base_published_revision INTEGER NOT NULL CHECK(base_published_revision>0),
 updated_at TEXT NOT NULL
);
CREATE TABLE learning_review_events (
 id TEXT PRIMARY KEY NOT NULL, card_id TEXT NOT NULL REFERENCES learning_cards(id),
 version_id TEXT NOT NULL, cycle_id TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('question','qa','direct')),
 created_at TEXT NOT NULL, document TEXT NOT NULL CHECK(json_valid(document)
  AND json_extract(document,'$.eventId') IS id AND json_extract(document,'$.cardId') IS card_id
  AND json_extract(document,'$.contentVersionId') IS version_id AND json_extract(document,'$.cycleId') IS cycle_id
  AND json_extract(document,'$.mode') IS mode AND json_extract(document,'$.createdAt') IS created_at
  AND (json_type(document,'$.scoreTenths')='null' OR (json_type(document,'$.scoreTenths')='integer' AND json_extract(document,'$.scoreTenths') BETWEEN 0 AND 100))),
 FOREIGN KEY(version_id,card_id,mode) REFERENCES learning_content_versions(id,card_id,mode),
 FOREIGN KEY(cycle_id,card_id) REFERENCES learning_study_cycles(id,card_id)
);
CREATE INDEX learning_events_card_time ON learning_review_events(card_id,created_at,id);
CREATE TABLE learning_model_meta (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), source_schema INTEGER NOT NULL CHECK(source_schema=604),
 target_schema INTEGER NOT NULL CHECK(target_schema=606), state TEXT NOT NULL CHECK(state='staged'),
 source_digest TEXT NOT NULL
);
` + ['learning_content_versions', 'learning_study_cycles', 'learning_review_events'].map(table => `
CREATE TRIGGER ${table}_immutable_update BEFORE UPDATE ON ${table} BEGIN SELECT RAISE(ABORT,'immutable learning record'); END;
CREATE TRIGGER ${table}_immutable_delete BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT,'immutable learning record'); END;
`).join('');
