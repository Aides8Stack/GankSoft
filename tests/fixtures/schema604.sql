-- Frozen from S0 schema604 inventory, acf8556; synthetic fixtures only.
CREATE TABLE analyses (id TEXT PRIMARY KEY, knowledge_id TEXT REFERENCES knowledge(id),content TEXT NOT NULL,stale INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);

CREATE TABLE assets (
        id TEXT PRIMARY KEY, question_id TEXT NOT NULL REFERENCES questions(id), role TEXT NOT NULL CHECK(role IN ('question','analysis')),
        file_name TEXT NOT NULL, mime TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0
      );

CREATE TABLE attempt_evidence_snapshots (
 attempt_id TEXT PRIMARY KEY REFERENCES attempts(id) ON DELETE CASCADE,
 deck_id TEXT NOT NULL REFERENCES decks(id),knowledge_ids TEXT NOT NULL CHECK(json_valid(knowledge_ids)),
 link_revision TEXT NOT NULL,study_timezone TEXT NOT NULL,practice INTEGER NOT NULL CHECK(practice IN(0,1)));

CREATE TABLE attempt_faults (
        id TEXT PRIMARY KEY, attempt_id TEXT NOT NULL REFERENCES attempts(id), knowledge_id TEXT REFERENCES knowledge(id),
        knowledge_snapshot TEXT NOT NULL DEFAULT '', category TEXT NOT NULL, detail TEXT NOT NULL DEFAULT ''
      );

CREATE TABLE attempts (
        id TEXT PRIMARY KEY, question_id TEXT NOT NULL REFERENCES questions(id), created_at TEXT NOT NULL, answer TEXT NOT NULL,
        correct INTEGER NOT NULL, basis TEXT NOT NULL, understanding INTEGER NOT NULL, score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 4),
        effective INTEGER NOT NULL, elapsed_seconds INTEGER NOT NULL DEFAULT 0, thought TEXT NOT NULL DEFAULT '', improvement TEXT NOT NULL DEFAULT '',
        mastery_after INTEGER, algorithm TEXT NOT NULL, parameters TEXT NOT NULL, question_version INTEGER NOT NULL,
        answer_snapshot TEXT NOT NULL
      , content_version INTEGER NOT NULL DEFAULT 0, fault_detail TEXT NOT NULL DEFAULT '', question_snapshot TEXT NOT NULL DEFAULT '', knowledge_snapshot TEXT NOT NULL DEFAULT '[]', self_score REAL CHECK(self_score IS NULL OR (self_score BETWEEN 0 AND 10 AND ((correct=1 AND self_score>=6) OR (correct=0 AND self_score<6)))), elapsed_value INTEGER CHECK(elapsed_value IS NULL OR elapsed_value BETWEEN 0 AND 86400), elapsed_source TEXT NOT NULL DEFAULT 'legacy_unknown' CHECK(elapsed_source IN ('legacy_unknown','missing','measured')), assessment_snapshot TEXT NOT NULL DEFAULT '');

CREATE TABLE audits (id INTEGER PRIMARY KEY AUTOINCREMENT,action TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL);

CREATE TABLE card_review_policies(
        kind TEXT NOT NULL CHECK(kind IN ('question','memory')),
        card_id TEXT NOT NULL,
        max_interval_days INTEGER NOT NULL CHECK(max_interval_days BETWEEN 1 AND 3650),
        PRIMARY KEY(kind,card_id));

CREATE TABLE deck_assessment_policies(deck_id TEXT PRIMARY KEY REFERENCES decks(id) ON DELETE CASCADE,target_seconds INTEGER CHECK(target_seconds IS NULL OR target_seconds BETWEEN 1 AND 86400));

CREATE TABLE deck_review_config_v2 (
 deck_id TEXT PRIMARY KEY REFERENCES decks(id) ON DELETE CASCADE,
 payload TEXT NOT NULL CHECK(json_valid(payload) AND json_extract(payload,'$.desiredRetention') BETWEEN 0.80 AND 0.97),
 revision INTEGER NOT NULL CHECK(revision>0),updated_at TEXT NOT NULL);

CREATE TABLE deck_review_policies(
        deck_id TEXT PRIMARY KEY REFERENCES decks(id) ON DELETE CASCADE,
        daily_limit INTEGER NOT NULL CHECK(daily_limit BETWEEN 1 AND 200),
        max_interval_days INTEGER NOT NULL CHECK(max_interval_days BETWEEN 1 AND 3650));

CREATE TABLE decks(id TEXT PRIMARY KEY,name TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('memory','question')),parent_id TEXT REFERENCES decks(id),sort_order INTEGER NOT NULL DEFAULT 0,deleted_at TEXT,version INTEGER NOT NULL DEFAULT 1, folder_id TEXT REFERENCES folders(id));

CREATE TABLE detached_knowledge_links(kind TEXT NOT NULL,card_id TEXT NOT NULL,knowledge_id TEXT NOT NULL,source_deck TEXT NOT NULL,knowledge_deck TEXT NOT NULL,PRIMARY KEY(kind,card_id,knowledge_id));

CREATE TABLE diagnosis_config (id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL CHECK(json_valid(payload)),revision INTEGER NOT NULL CHECK(revision>0),updated_at TEXT NOT NULL);

CREATE TABLE folders(id TEXT PRIMARY KEY,name TEXT NOT NULL,parent_id TEXT REFERENCES folders(id),sort_order INTEGER NOT NULL DEFAULT 0,deleted_at TEXT,version INTEGER NOT NULL DEFAULT 1);

CREATE TABLE import_batches(id TEXT PRIMARY KEY,package_id TEXT NOT NULL UNIQUE,checksum TEXT NOT NULL,report TEXT NOT NULL,created_at TEXT NOT NULL);

CREATE TABLE import_entries(namespace TEXT NOT NULL,entry_key TEXT NOT NULL,kind TEXT NOT NULL,local_id TEXT NOT NULL,checksum TEXT NOT NULL,archive_refs TEXT NOT NULL,PRIMARY KEY(namespace,entry_key));

CREATE TABLE knowledge (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, module TEXT NOT NULL,
        parent_id TEXT REFERENCES knowledge(id) ON DELETE RESTRICT,
        aliases TEXT NOT NULL DEFAULT '', principle TEXT NOT NULL DEFAULT '', conditions TEXT NOT NULL DEFAULT '',
        method TEXT NOT NULL DEFAULT '', traps TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1,
        deleted_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        CHECK(parent_id IS NULL OR parent_id <> id)
      );

CREATE TABLE knowledge_archives(id TEXT PRIMARY KEY,archive_key TEXT NOT NULL,module TEXT NOT NULL,version_label TEXT NOT NULL,content TEXT NOT NULL,checksum TEXT NOT NULL,created_at TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',UNIQUE(archive_key,version_label));

CREATE TABLE knowledge_keys(archive_key TEXT NOT NULL,node_key TEXT NOT NULL,knowledge_id TEXT NOT NULL REFERENCES knowledge(id),PRIMARY KEY(archive_key,node_key));

CREATE TABLE knowledge_specialty_prefs (
 deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,knowledge_id TEXT NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,
 payload TEXT NOT NULL CHECK(json_valid(payload) AND json_extract(payload,'$.boost') BETWEEN 0.5 AND 2),
 revision INTEGER NOT NULL CHECK(revision>0),updated_at TEXT NOT NULL,PRIMARY KEY(deck_id,knowledge_id));

CREATE TABLE materials (id TEXT PRIMARY KEY, content TEXT NOT NULL);

CREATE TABLE memory_cards(id TEXT PRIMARY KEY,module TEXT NOT NULL,title TEXT NOT NULL,cue TEXT NOT NULL,content TEXT NOT NULL,source TEXT NOT NULL DEFAULT '',version INTEGER NOT NULL DEFAULT 1,deleted_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,learning_version INTEGER NOT NULL DEFAULT 1,legacy_question_id TEXT REFERENCES questions(id));

CREATE TABLE memory_knowledge(card_id TEXT NOT NULL REFERENCES memory_cards(id),knowledge_id TEXT NOT NULL REFERENCES knowledge(id),PRIMARY KEY(card_id,knowledge_id));

CREATE TABLE memory_plans(card_id TEXT PRIMARY KEY REFERENCES memory_cards(id),due_at TEXT NOT NULL,interval_days INTEGER NOT NULL DEFAULT 0,mastery INTEGER,paused INTEGER NOT NULL DEFAULT 0,reason TEXT NOT NULL);

CREATE TABLE memory_reviews(id TEXT PRIMARY KEY,card_id TEXT NOT NULL REFERENCES memory_cards(id),created_at TEXT NOT NULL,score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 4),effective INTEGER NOT NULL,mastery_after INTEGER,content_snapshot TEXT NOT NULL,card_version INTEGER NOT NULL,algorithm TEXT NOT NULL,note TEXT NOT NULL DEFAULT '', card_snapshot TEXT NOT NULL DEFAULT '');

CREATE TABLE plans (
        question_id TEXT PRIMARY KEY REFERENCES questions(id), due_at TEXT NOT NULL, interval_days INTEGER NOT NULL DEFAULT 0,
        mastery INTEGER, paused INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL, algorithm TEXT NOT NULL
      );

CREATE TABLE platform_operations(request_id TEXT PRIMARY KEY,epoch TEXT NOT NULL,method TEXT NOT NULL,digest TEXT NOT NULL,state TEXT NOT NULL,created_at TEXT NOT NULL);

CREATE TABLE protocol_meta(
    singleton INTEGER PRIMARY KEY CHECK(singleton=1),epoch TEXT NOT NULL,revision INTEGER NOT NULL,
    schema_version INTEGER NOT NULL CHECK(schema_version>=1));

CREATE TABLE protocol_receipts(
    epoch TEXT NOT NULL,request_id TEXT NOT NULL,method TEXT NOT NULL,digest TEXT NOT NULL,response TEXT NOT NULL,
    PRIMARY KEY(epoch,request_id));

CREATE TABLE question_assessment_policies(question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE, mode TEXT NOT NULL CHECK(mode IN ('custom','none')), target_seconds INTEGER CHECK(target_seconds IS NULL OR target_seconds BETWEEN 1 AND 86400), CHECK((mode='custom' AND target_seconds IS NOT NULL) OR (mode='none' AND target_seconds IS NULL)));

CREATE TABLE question_knowledge (
        question_id TEXT NOT NULL REFERENCES questions(id), knowledge_id TEXT NOT NULL REFERENCES knowledge(id),
        PRIMARY KEY(question_id,knowledge_id)
      );

CREATE TABLE questions (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, module TEXT NOT NULL, stem TEXT NOT NULL DEFAULT '', options TEXT NOT NULL DEFAULT '',
        answer TEXT NOT NULL DEFAULT '', analysis TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT '', initial_thought TEXT NOT NULL DEFAULT '',
        material_id TEXT REFERENCES materials(id), status TEXT NOT NULL DEFAULT 'ready', version INTEGER NOT NULL DEFAULT 1,
        deleted_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      , project_note TEXT NOT NULL DEFAULT '', content_version INTEGER NOT NULL DEFAULT 1);

CREATE TABLE recycle_batches(kind TEXT NOT NULL,item_id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(kind,item_id));

CREATE TABLE relations (
        id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES knowledge(id), target_id TEXT NOT NULL REFERENCES knowledge(id),
        kind TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', CHECK(source_id < target_id), UNIQUE(source_id,target_id,kind)
      );

CREATE TABLE review_config_operations (
 id TEXT PRIMARY KEY,request_id TEXT NOT NULL UNIQUE,digest TEXT NOT NULL,
 response TEXT NOT NULL CHECK(json_valid(response)),created_at TEXT NOT NULL);

CREATE TABLE review_due_overrides (
 kind TEXT NOT NULL CHECK(kind IN ('question','memory')),card_id TEXT NOT NULL,
 source TEXT NOT NULL CHECK(source IN ('policy','snooze')),effective_due TEXT NOT NULL,
 operation_id TEXT NOT NULL,anchor TEXT NOT NULL,created_at TEXT NOT NULL,
 PRIMARY KEY(kind,card_id,source));

CREATE TABLE review_receipts(request_id TEXT PRIMARY KEY,kind TEXT NOT NULL,card_id TEXT NOT NULL,payload_hash TEXT NOT NULL,response TEXT NOT NULL,created_at TEXT NOT NULL);

CREATE TABLE saved_filters(id TEXT PRIMARY KEY,deck_id TEXT NOT NULL REFERENCES decks(id),name TEXT NOT NULL,payload TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1);

CREATE TABLE schedule_events(id TEXT PRIMARY KEY,kind TEXT NOT NULL,card_id TEXT NOT NULL,rating INTEGER NOT NULL,before_state TEXT NOT NULL,after_state TEXT NOT NULL,log TEXT NOT NULL,created_at TEXT NOT NULL);

CREATE TABLE scheduling(kind TEXT NOT NULL,card_id TEXT NOT NULL,data TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(kind,card_id));

CREATE TABLE settings (key TEXT PRIMARY KEY,value TEXT NOT NULL);

CREATE TABLE study_sessions(deck_id TEXT NOT NULL REFERENCES decks(id),payload TEXT NOT NULL,updated_at TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1);

CREATE INDEX attempt_faults_attempt ON attempt_faults(attempt_id);

CREATE INDEX attempts_card_time ON attempts(question_id,created_at);

CREATE INDEX attempts_question_date ON attempts(question_id,created_at);

CREATE INDEX evidence_deck ON attempt_evidence_snapshots(deck_id);

CREATE UNIQUE INDEX knowledge_live_name ON knowledge(module,coalesce(parent_id,''),name) WHERE deleted_at IS NULL;

CREATE INDEX schedule_events_card ON schedule_events(kind,card_id);

CREATE UNIQUE INDEX study_session_identity ON study_sessions(deck_id,json_extract(payload,'$.sessionId')) WHERE json_valid(payload);
PRAGMA application_id=1195462219;
PRAGMA user_version=604;
