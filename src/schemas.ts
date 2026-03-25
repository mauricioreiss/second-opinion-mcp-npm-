import { z } from "zod";

const Confidence = z.enum(["HIGH", "MEDIUM", "LOW"]);
const Severity = z.enum(["HIGH", "MEDIUM", "LOW"]);

export const AskResponseSchema = z.object({
  verdict: z.enum(["YES", "NO", "PARTIAL", "UNCERTAIN"]),
  confidence: Confidence,
  answer: z.string(),
  evidence: z.array(z.string()),
});

export type AskResponse = z.infer<typeof AskResponseSchema>;

const FindingSchema = z.object({
  severity: Severity,
  line: z.number().nullable(),
  issue: z.string(),
  fix: z.string(),
});

const CriterionSchema = z.object({
  name: z.string(),
  status: z.enum(["PASS", "FAIL", "WARNING"]),
  findings: z.array(FindingSchema),
});

export const ReviewResponseSchema = z.object({
  verdict: z.enum(["PASS", "FAIL", "WARNING"]),
  score: z.number().min(1).max(10),
  criteria: z.array(CriterionSchema),
  summary: z.string(),
});

export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

export const VerifyResponseSchema = z.object({
  verdict: z.enum(["YES", "NO", "PARTIAL", "OUTDATED", "UNCERTAIN"]),
  confidence: Confidence,
  explanation: z.string(),
  caveats: z.array(z.string()),
  docs_to_check: z.array(z.string()),
});

export type VerifyResponse = z.infer<typeof VerifyResponseSchema>;

const ComparisonItemSchema = z.object({
  criterion: z.string(),
  winner: z.enum(["APPROACH_A", "APPROACH_B", "TIE"]),
  reason: z.string(),
});

export const CompareResponseSchema = z.object({
  winner: z.enum(["APPROACH_A", "APPROACH_B", "TIE", "DEPENDS"]),
  confidence: Confidence,
  comparison: z.array(ComparisonItemSchema),
  recommendation: z.string(),
});

export type CompareResponse = z.infer<typeof CompareResponseSchema>;
