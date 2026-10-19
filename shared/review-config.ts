import { z } from "zod";
export const RULE_VERSION = "adaptive-review-v2.0";
export const PRESETS = {
  balanced: { question: 0.4, knowledge: 0.25, overdue: 0.25, coverage: 0.1 },
  weak: { question: 0.5, knowledge: 0.3, overdue: 0.15, coverage: 0.05 },
  overdue: { question: 0.25, knowledge: 0.15, overdue: 0.5, coverage: 0.1 },
  coverage: { question: 0.25, knowledge: 0.25, overdue: 0.2, coverage: 0.3 },
};
const unit = z.number().min(0).max(1);
export const Weights = z
  .strictObject({
    question: unit,
    knowledge: unit,
    overdue: unit,
    coverage: unit,
  })
  .refine(
    (w) => Math.abs(Object.values(w).reduce((a, b) => a + b, 0) - 1) < 1e-9,
    "四项权重总和必须为 1",
  );
export const DeckConfig = z.strictObject({
  desiredRetention: z.number().min(0.8).max(0.97).default(0.9),
  sameDayRelearnBudget: z.number().int().min(0).max(200).default(10),
  specialtyDailyLimit: z.number().int().min(0).max(200).default(5),
  practiceMinutes: z
    .union([z.literal(0), z.number().int().min(5).max(240)])
    .default(0),
  priorityPreset: z
    .enum(["balanced", "weak", "overdue", "coverage", "custom"])
    .default("balanced"),
  weights: Weights.default(PRESETS.balanced),
  severeOverdueReserve: z.number().min(0).max(0.6).default(0.3),
  diversityMode: z.enum(["spread", "balanced", "focus"]).default("balanced"),
  crossQuestionVerification: z.boolean().default(true),
  sameDayFatiguePenalty: z.boolean().default(true),
  randomFraction: unit.default(0),
});
export type ReviewDeckConfig = z.infer<typeof DeckConfig>;
export const KnowledgePreference = z.strictObject({
  mode: z
    .enum(["auto", "normal", "prioritize", "reduce", "exclude_specialty"])
    .default("auto"),
  boost: z.number().min(0.5).max(2).default(1),
  practiceTarget: z.number().int().min(0).max(50).nullable().default(null),
  variantFirst: z.boolean().default(true),
  practicePaused: z.boolean().default(false),
});
export const DiagnosisRule = z.strictObject({
  evidenceHalfLifeDays: z.number().min(1).max(3650).default(60),
  knowledgePerQuestionCreditCap: z.number().min(0.1).max(10).default(2),
  repeatPenalty: z.enum(["sqrt", "linear", "none"]).default("sqrt"),
});
export const ConfigView = z.strictObject({
  deckId: z.string(),
  revision: z.number().int(),
  config: DeckConfig,
  dailyLimit: z.number().int(),
  maxIntervalDays: z.number().int(),
  knowledge: z.array(
    z.strictObject({
      knowledgeId: z.string(),
      revision: z.number().int(),
      preference: KnowledgePreference,
      orphan: z.boolean(),
    }),
  ),
});
