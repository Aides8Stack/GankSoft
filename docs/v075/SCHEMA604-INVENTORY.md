# Schema 604 字段清单（S0 合成库）

基线：`7970896c0306833e3b2f54a843f388d2e380618f`。

由 `openDatabase(":memory:")` + `Application` + `createApplicationProtocol` 实际创建；仅合成空库，不是用户数据库。未执行目标迁移。

- `user_version`: 604
- `application_id`: 1195462219
- `foreign_keys`: 1
- 内存库 journal_mode 为 memory；文件库由生产 openDatabase 设置 WAL，见基线测试。
- sqlite_master 规范序列 JSON（type/name 排序）SHA-256: `355c28a533579ffed5ad3c007bb7406eabe3c0cbff0d63950446d89b8f81c0ad`
- integrity_check: `ok`; foreign_key_check: 0 行。

## 字段与外键

| 表 | 字段（依 PRAGMA 顺序；PK 用 *） | 外键 |
| --- | --- | --- |
| `analyses` | `id*` TEXT, `knowledge_id` TEXT, `content` TEXT NOT NULL, `stale` INTEGER NOT NULL, `created_at` TEXT NOT NULL | `knowledge_id → knowledge.id` (NO ACTION) |
| `assets` | `id*` TEXT, `question_id` TEXT NOT NULL, `role` TEXT NOT NULL, `file_name` TEXT NOT NULL, `mime` TEXT NOT NULL, `sort_order` INTEGER NOT NULL | `question_id → questions.id` (NO ACTION) |
| `attempt_evidence_snapshots` | `attempt_id*` TEXT, `deck_id` TEXT NOT NULL, `knowledge_ids` TEXT NOT NULL, `link_revision` TEXT NOT NULL, `study_timezone` TEXT NOT NULL, `practice` INTEGER NOT NULL | `deck_id → decks.id` (NO ACTION), `attempt_id → attempts.id` (CASCADE) |
| `attempt_faults` | `id*` TEXT, `attempt_id` TEXT NOT NULL, `knowledge_id` TEXT, `knowledge_snapshot` TEXT NOT NULL, `category` TEXT NOT NULL, `detail` TEXT NOT NULL | `knowledge_id → knowledge.id` (NO ACTION), `attempt_id → attempts.id` (NO ACTION) |
| `attempts` | `id*` TEXT, `question_id` TEXT NOT NULL, `created_at` TEXT NOT NULL, `answer` TEXT NOT NULL, `correct` INTEGER NOT NULL, `basis` TEXT NOT NULL, `understanding` INTEGER NOT NULL, `score` INTEGER NOT NULL, `effective` INTEGER NOT NULL, `elapsed_seconds` INTEGER NOT NULL, `thought` TEXT NOT NULL, `improvement` TEXT NOT NULL, `mastery_after` INTEGER, `algorithm` TEXT NOT NULL, `parameters` TEXT NOT NULL, `question_version` INTEGER NOT NULL, `answer_snapshot` TEXT NOT NULL, `content_version` INTEGER NOT NULL, `fault_detail` TEXT NOT NULL, `question_snapshot` TEXT NOT NULL, `knowledge_snapshot` TEXT NOT NULL, `self_score` REAL, `elapsed_value` INTEGER, `elapsed_source` TEXT NOT NULL, `assessment_snapshot` TEXT NOT NULL | `question_id → questions.id` (NO ACTION) |
| `audits` | `id*` INTEGER, `action` TEXT NOT NULL, `detail` TEXT NOT NULL, `created_at` TEXT NOT NULL | — |
| `card_review_policies` | `kind*` TEXT NOT NULL, `card_id*` TEXT NOT NULL, `max_interval_days` INTEGER NOT NULL | — |
| `deck_assessment_policies` | `deck_id*` TEXT, `target_seconds` INTEGER | `deck_id → decks.id` (CASCADE) |
| `deck_review_config_v2` | `deck_id*` TEXT, `payload` TEXT NOT NULL, `revision` INTEGER NOT NULL, `updated_at` TEXT NOT NULL | `deck_id → decks.id` (CASCADE) |
| `deck_review_policies` | `deck_id*` TEXT, `daily_limit` INTEGER NOT NULL, `max_interval_days` INTEGER NOT NULL | `deck_id → decks.id` (CASCADE) |
| `decks` | `id*` TEXT, `name` TEXT NOT NULL, `kind` TEXT NOT NULL, `parent_id` TEXT, `sort_order` INTEGER NOT NULL, `deleted_at` TEXT, `version` INTEGER NOT NULL, `folder_id` TEXT | `folder_id → folders.id` (NO ACTION), `parent_id → decks.id` (NO ACTION) |
| `detached_knowledge_links` | `kind*` TEXT NOT NULL, `card_id*` TEXT NOT NULL, `knowledge_id*` TEXT NOT NULL, `source_deck` TEXT NOT NULL, `knowledge_deck` TEXT NOT NULL | — |
| `diagnosis_config` | `id*` INTEGER, `payload` TEXT NOT NULL, `revision` INTEGER NOT NULL, `updated_at` TEXT NOT NULL | — |
| `folders` | `id*` TEXT, `name` TEXT NOT NULL, `parent_id` TEXT, `sort_order` INTEGER NOT NULL, `deleted_at` TEXT, `version` INTEGER NOT NULL | `parent_id → folders.id` (NO ACTION) |
| `import_batches` | `id*` TEXT, `package_id` TEXT NOT NULL, `checksum` TEXT NOT NULL, `report` TEXT NOT NULL, `created_at` TEXT NOT NULL | — |
| `import_entries` | `namespace*` TEXT NOT NULL, `entry_key*` TEXT NOT NULL, `kind` TEXT NOT NULL, `local_id` TEXT NOT NULL, `checksum` TEXT NOT NULL, `archive_refs` TEXT NOT NULL | — |
| `knowledge` | `id*` TEXT, `name` TEXT NOT NULL, `module` TEXT NOT NULL, `parent_id` TEXT, `aliases` TEXT NOT NULL, `principle` TEXT NOT NULL, `conditions` TEXT NOT NULL, `method` TEXT NOT NULL, `traps` TEXT NOT NULL, `version` INTEGER NOT NULL, `deleted_at` TEXT, `created_at` TEXT NOT NULL, `updated_at` TEXT NOT NULL | `parent_id → knowledge.id` (RESTRICT) |
| `knowledge_archives` | `id*` TEXT, `archive_key` TEXT NOT NULL, `module` TEXT NOT NULL, `version_label` TEXT NOT NULL, `content` TEXT NOT NULL, `checksum` TEXT NOT NULL, `created_at` TEXT NOT NULL, `note` TEXT NOT NULL | — |
| `knowledge_keys` | `archive_key*` TEXT NOT NULL, `node_key*` TEXT NOT NULL, `knowledge_id` TEXT NOT NULL | `knowledge_id → knowledge.id` (NO ACTION) |
| `knowledge_specialty_prefs` | `deck_id*` TEXT NOT NULL, `knowledge_id*` TEXT NOT NULL, `payload` TEXT NOT NULL, `revision` INTEGER NOT NULL, `updated_at` TEXT NOT NULL | `knowledge_id → knowledge.id` (CASCADE), `deck_id → decks.id` (CASCADE) |
| `materials` | `id*` TEXT, `content` TEXT NOT NULL | — |
| `memory_cards` | `id*` TEXT, `module` TEXT NOT NULL, `title` TEXT NOT NULL, `cue` TEXT NOT NULL, `content` TEXT NOT NULL, `source` TEXT NOT NULL, `version` INTEGER NOT NULL, `deleted_at` TEXT, `created_at` TEXT NOT NULL, `updated_at` TEXT NOT NULL, `learning_version` INTEGER NOT NULL, `legacy_question_id` TEXT | `legacy_question_id → questions.id` (NO ACTION) |
| `memory_knowledge` | `card_id*` TEXT NOT NULL, `knowledge_id*` TEXT NOT NULL | `knowledge_id → knowledge.id` (NO ACTION), `card_id → memory_cards.id` (NO ACTION) |
| `memory_plans` | `card_id*` TEXT, `due_at` TEXT NOT NULL, `interval_days` INTEGER NOT NULL, `mastery` INTEGER, `paused` INTEGER NOT NULL, `reason` TEXT NOT NULL | `card_id → memory_cards.id` (NO ACTION) |
| `memory_reviews` | `id*` TEXT, `card_id` TEXT NOT NULL, `created_at` TEXT NOT NULL, `score` INTEGER NOT NULL, `effective` INTEGER NOT NULL, `mastery_after` INTEGER, `content_snapshot` TEXT NOT NULL, `card_version` INTEGER NOT NULL, `algorithm` TEXT NOT NULL, `note` TEXT NOT NULL, `card_snapshot` TEXT NOT NULL | `card_id → memory_cards.id` (NO ACTION) |
| `plans` | `question_id*` TEXT, `due_at` TEXT NOT NULL, `interval_days` INTEGER NOT NULL, `mastery` INTEGER, `paused` INTEGER NOT NULL, `reason` TEXT NOT NULL, `algorithm` TEXT NOT NULL | `question_id → questions.id` (NO ACTION) |
| `platform_operations` | `request_id*` TEXT, `epoch` TEXT NOT NULL, `method` TEXT NOT NULL, `digest` TEXT NOT NULL, `state` TEXT NOT NULL, `created_at` TEXT NOT NULL | — |
| `protocol_meta` | `singleton*` INTEGER, `epoch` TEXT NOT NULL, `revision` INTEGER NOT NULL, `schema_version` INTEGER NOT NULL | — |
| `protocol_receipts` | `epoch*` TEXT NOT NULL, `request_id*` TEXT NOT NULL, `method` TEXT NOT NULL, `digest` TEXT NOT NULL, `response` TEXT NOT NULL | — |
| `question_assessment_policies` | `question_id*` TEXT, `mode` TEXT NOT NULL, `target_seconds` INTEGER | `question_id → questions.id` (CASCADE) |
| `question_knowledge` | `question_id*` TEXT NOT NULL, `knowledge_id*` TEXT NOT NULL | `knowledge_id → knowledge.id` (NO ACTION), `question_id → questions.id` (NO ACTION) |
| `questions` | `id*` TEXT, `title` TEXT NOT NULL, `module` TEXT NOT NULL, `stem` TEXT NOT NULL, `options` TEXT NOT NULL, `answer` TEXT NOT NULL, `analysis` TEXT NOT NULL, `source` TEXT NOT NULL, `initial_thought` TEXT NOT NULL, `material_id` TEXT, `status` TEXT NOT NULL, `version` INTEGER NOT NULL, `deleted_at` TEXT, `created_at` TEXT NOT NULL, `updated_at` TEXT NOT NULL, `project_note` TEXT NOT NULL, `content_version` INTEGER NOT NULL | `material_id → materials.id` (NO ACTION) |
| `recycle_batches` | `kind*` TEXT NOT NULL, `item_id*` TEXT NOT NULL, `payload` TEXT NOT NULL | — |
| `relations` | `id*` TEXT, `source_id` TEXT NOT NULL, `target_id` TEXT NOT NULL, `kind` TEXT NOT NULL, `note` TEXT NOT NULL | `target_id → knowledge.id` (NO ACTION), `source_id → knowledge.id` (NO ACTION) |
| `review_config_operations` | `id*` TEXT, `request_id` TEXT NOT NULL, `digest` TEXT NOT NULL, `response` TEXT NOT NULL, `created_at` TEXT NOT NULL | — |
| `review_due_overrides` | `kind*` TEXT NOT NULL, `card_id*` TEXT NOT NULL, `source*` TEXT NOT NULL, `effective_due` TEXT NOT NULL, `operation_id` TEXT NOT NULL, `anchor` TEXT NOT NULL, `created_at` TEXT NOT NULL | — |
| `review_receipts` | `request_id*` TEXT, `kind` TEXT NOT NULL, `card_id` TEXT NOT NULL, `payload_hash` TEXT NOT NULL, `response` TEXT NOT NULL, `created_at` TEXT NOT NULL | — |
| `saved_filters` | `id*` TEXT, `deck_id` TEXT NOT NULL, `name` TEXT NOT NULL, `payload` TEXT NOT NULL, `revision` INTEGER NOT NULL | `deck_id → decks.id` (NO ACTION) |
| `schedule_events` | `id*` TEXT, `kind` TEXT NOT NULL, `card_id` TEXT NOT NULL, `rating` INTEGER NOT NULL, `before_state` TEXT NOT NULL, `after_state` TEXT NOT NULL, `log` TEXT NOT NULL, `created_at` TEXT NOT NULL | — |
| `scheduling` | `kind*` TEXT NOT NULL, `card_id*` TEXT NOT NULL, `data` TEXT NOT NULL, `updated_at` TEXT NOT NULL | — |
| `settings` | `key*` TEXT, `value` TEXT NOT NULL | — |
| `study_sessions` | `deck_id` TEXT NOT NULL, `payload` TEXT NOT NULL, `updated_at` TEXT NOT NULL, `revision` INTEGER NOT NULL | `deck_id → decks.id` (NO ACTION) |

## 完整 DDL（包含旧 CHECK/索引）

```sql
CREATE INDEX attempt_faults_attempt ON attempt_faults(attempt_id);

CREATE INDEX attempts_card_time ON attempts(question_id,created_at);

CREATE INDEX attempts_question_date ON attempts(question_id,created_at);

CREATE INDEX evidence_deck ON attempt_evidence_snapshots(deck_id);

CREATE UNIQUE INDEX knowledge_live_name ON knowledge(module,coalesce(parent_id,''),name) WHERE deleted_at IS NULL;

CREATE INDEX schedule_events_card ON schedule_events(kind,card_id);

CREATE UNIQUE INDEX study_session_identity ON study_sessions(deck_id,json_extract(payload,'$.sessionId')) WHERE json_valid(payload);

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
```

协议存储表由网关初始化，不能只按 user_version 推断完整表集合。迁移清单还需枚举 settings 中媒体草稿、platform_operations、protocol_receipts 和 review_receipts 的依赖。
