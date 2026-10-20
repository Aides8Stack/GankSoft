export const MEDIA_SCHEMA = `
ALTER TABLE assets RENAME TO assets_v604;
CREATE TABLE assets (
 id TEXT PRIMARY KEY, question_id TEXT NOT NULL REFERENCES questions(id),
 role TEXT NOT NULL CHECK(role IN ('question','analysis','option-A','option-B','option-C','option-D')),
 file_name TEXT NOT NULL, mime TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0);
INSERT INTO assets SELECT * FROM assets_v604;
DROP TABLE assets_v604;
CREATE TABLE IF NOT EXISTS memory_assets (
 id TEXT PRIMARY KEY, card_id TEXT NOT NULL REFERENCES memory_cards(id),
 role TEXT NOT NULL CHECK(role IN ('question','analysis')),
 file_name TEXT NOT NULL, mime TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0);
`;
