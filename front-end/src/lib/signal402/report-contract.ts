import { z } from "zod";

const utcTimestampSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    "Expected a UTC RFC 3339 timestamp with millisecond precision",
  )
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid timestamp");

const canonicalMarketIdSchema = z
  .string()
  .regex(
    /^[1-9]\d*$/,
    "Expected a positive canonical base-10 market identifier",
  );

const basisPointsSchema = z.number().int().min(0).max(10_000);
const hashSchema = z
  .string()
  .regex(/^0x[0-9a-f]{64}$/, "Expected a lowercase 32-byte hash");
const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Expected an EVM address");
const atomicAmountSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)$/, "Expected an atomic-unit integer string");
const canonicalDecimalSchema = z
  .string()
  .regex(
    /^(0|[1-9]\d*)(\.\d*[1-9])?$/,
    "Expected a non-negative canonical decimal string",
  );
const nonEmptyTextSchema = z.string().trim().min(1);

export const reportRequestSchema = z.strictObject({
  marketId: canonicalMarketIdSchema,
});

export const outcomeSchema = z.strictObject({
  label: nonEmptyTextSchema,
  probabilityBps: basisPointsSchema,
});

export const marketSnapshotSchema = z.strictObject({
  id: canonicalMarketIdSchema,
  question: nonEmptyTextSchema,
  description: z.string(),
  outcomes: z.array(outcomeSchema).min(2),
  volumeUsd: canonicalDecimalSchema,
  liquidityUsd: canonicalDecimalSchema,
  endTime: utcTimestampSchema,
  resolutionSource: z.url(),
});

export const sourceSchema = z.strictObject({
  provider: z.literal("polymarket"),
  fetchedAt: utcTimestampSchema,
  market: marketSnapshotSchema,
  references: z.array(
    z.strictObject({
      rel: nonEmptyTextSchema,
      url: z.url(),
      retrievedAt: utcTimestampSchema,
    }),
  ),
});

export const analysisSchema = z.strictObject({
  marketProbabilityBps: basisPointsSchema,
  independentProbabilityBps: basisPointsSchema,
  confidenceBps: basisPointsSchema,
  summary: nonEmptyTextSchema,
  evidence: z.array(nonEmptyTextSchema),
  counterarguments: z.array(nonEmptyTextSchema),
  risks: z.array(nonEmptyTextSchema),
  assumptions: z.array(nonEmptyTextSchema),
});

export const generationSchema = z.strictObject({
  provider: nonEmptyTextSchema,
  model: nonEmptyTextSchema,
  generatedAt: utcTimestampSchema,
  validatedAgainst: z.literal("signal402.analysis.v1"),
});

export const proofSchema = z.strictObject({
  canonicalization: z.literal("RFC8785-JCS"),
  hashAlgorithm: z.literal("ethereum-keccak256"),
  contentSchema: z.literal("signal402.content.v1"),
  marketIdHash: hashSchema,
  contentHash: hashSchema,
  coveredGroups: z.tuple([
    z.literal("source"),
    z.literal("analysis"),
    z.literal("generation"),
  ]),
  registry: z.strictObject({
    required: z.literal(false),
    network: z.literal("eip155:421614"),
    address: addressSchema,
    function: z.literal("attest(bytes32,bytes32)"),
    args: z.strictObject({
      marketIdHash: hashSchema,
      contentHash: hashSchema,
    }),
  }),
});

export const paymentContextSchema = z.strictObject({
  protocol: z.literal("x402"),
  version: z.literal(2),
  scheme: z.literal("exact"),
  expected: z.strictObject({
    network: z.literal("eip155:421614"),
    asset: addressSchema,
    amountAtomic: atomicAmountSchema,
    payTo: addressSchema,
  }),
  authoritativeReceiptHeader: z.literal("PAYMENT-RESPONSE"),
});

export const reportSchema = z
  .strictObject({
    schemaVersion: z.literal("signal402.report.v1"),
    request: z.strictObject({
      marketId: canonicalMarketIdSchema,
      requestFingerprint: hashSchema,
      purchaseId: z.string().min(1).max(128),
      receivedAt: utcTimestampSchema,
    }),
    source: sourceSchema,
    analysis: analysisSchema,
    generation: generationSchema,
    proof: proofSchema,
    payment: paymentContextSchema,
    attestation: z.strictObject({
      required: z.literal(false),
      status: z.literal("not_requested"),
    }),
    disclaimer: z.literal(
      "This is informational model output, not financial advice.",
    ),
  })
  .superRefine((report, context) => {
    if (report.source.market.id !== report.request.marketId) {
      context.addIssue({
        code: "custom",
        path: ["source", "market", "id"],
        message: "Source market ID must equal the normalized request market ID",
      });
    }

    if (report.proof.registry.args.marketIdHash !== report.proof.marketIdHash) {
      context.addIssue({
        code: "custom",
        path: ["proof", "registry", "args", "marketIdHash"],
        message: "Registry market ID hash must equal the report proof hash",
      });
    }

    if (report.proof.registry.args.contentHash !== report.proof.contentHash) {
      context.addIssue({
        code: "custom",
        path: ["proof", "registry", "args", "contentHash"],
        message: "Registry content hash must equal the report proof hash",
      });
    }
  });

export type ReportRequest = z.infer<typeof reportRequestSchema>;
export type Signal402Report = z.infer<typeof reportSchema>;
