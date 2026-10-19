/** GankSoft Exchange 1.0. IDs here are portable source keys, never database row IDs. */
export interface ArchiveNode {
  key: string;
  name: string;
  parentKey?: string | null;
  aliases?: string;
  principle?: string;
  conditions?: string;
  method?: string;
  traps?: string;
}
export interface ArchiveDocument {
  archiveId: string;
  subject: string;
  version: string;
  note?: string;
  nodes: ArchiveNode[];
  relations: {
    sourceKey: string;
    targetKey: string;
    kind: string;
    note?: string;
  }[];
}
export interface ImportItem {
  key: string;
  kind: "question" | "memory";
  subject: string;
  title: string;
  stem?: string;
  options?: string;
  answer?: string;
  analysis?: string;
  cue?: string;
  content?: string;
  material?: string;
  thought?: string;
  projectNote?: string;
  source?: { file: string; page?: string };
  analysisOrigin?: "source" | "assistant" | "mixed";
  needsReview?: boolean;
  knowledgeRefs: { archiveId: string; version: string; nodeKey: string }[];
  images?: {
    role: "question" | "analysis";
    mime: "image/png" | "image/jpeg" | "image/webp";
    base64: string;
  }[];
}
export interface ExchangePackage {
  format: "ganksoft.content";
  schemaVersion: "2.0";
  packageId: string;
  namespace: string;
  collection?: { name: string; kind: "question" | "memory" };
  archives: ArchiveDocument[];
  items: ImportItem[];
}
