import { describe, expect, it } from "vitest";

import { reportRequestSchema, reportSchema } from "./report-contract";

const HASH_A = `0x${"a".repeat(64)}`;
const HASH_B = `0x${"b".repeat(64)}`;

function validReport() {
  return {
    schemaVersion: "signal402.report.v1",
    request: {
      marketId: "123456",
      requestFingerprint: HASH_A,
      purchaseId: "purchase_fixture_01",
      receivedAt: "2026-09-14T00:00:00.000Z",
    },
    source: {
      provider: "polymarket",
      fetchedAt: "2026-09-14T00:00:01.000Z",
      market: {
        id: "123456",
        question: "Will the fixture pass?",
        description: "A deterministic non-secret test fixture.",
        outcomes: [
          { label: "Yes", probabilityBps: 5100 },
          { label: "No", probabilityBps: 4900 },
        ],
        volumeUsd: "12345.67",
        liquidityUsd: "890.12",
        endTime: "2026-12-31T23:59:59.000Z",
        resolutionSource: "https://example.invalid/rules",
      },
      references: [
        {
          rel: "market",
          url: "https://example.invalid/market/123456",
          retrievedAt: "2026-09-14T00:00:01.000Z",
        },
      ],
    },
    analysis: {
      marketProbabilityBps: 5100,
      independentProbabilityBps: 4800,
      confidenceBps: 6200,
      summary: "The fixture contains a bounded estimate.",
      evidence: ["Evidence fixture"],
      counterarguments: ["Counterargument fixture"],
      risks: ["Risk fixture"],
      assumptions: ["Assumption fixture"],
    },
    generation: {
      provider: "deepseek",
      model: "deepseek-chat",
      generatedAt: "2026-09-14T00:00:03.000Z",
      validatedAgainst: "signal402.analysis.v1",
    },
    proof: {
      canonicalization: "RFC8785-JCS",
      hashAlgorithm: "ethereum-keccak256",
      contentSchema: "signal402.content.v1",
      marketIdHash: HASH_A,
      contentHash: HASH_B,
      coveredGroups: ["source", "analysis", "generation"],
      registry: {
        required: false,
        network: "eip155:421614",
        address: "0xc896eB3B013a60deCA7029dc2aa4F0da9a5faf82",
        function: "attest(bytes32,bytes32)",
        args: { marketIdHash: HASH_A, contentHash: HASH_B },
      },
    },
    payment: {
      protocol: "x402",
      version: 2,
      scheme: "exact",
      expected: {
        network: "eip155:421614",
        asset: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
        amountAtomic: "10000",
        payTo: "0x0573f139d21fb3140155567Cba7630d3948F4ea3",
      },
      authoritativeReceiptHeader: "PAYMENT-RESPONSE",
    },
    attestation: { required: false, status: "not_requested" },
    disclaimer: "This is informational model output, not financial advice.",
  };
}

describe("reportRequestSchema", () => {
  it("accepts exactly one positive canonical string market ID", () => {
    expect(reportRequestSchema.parse({ marketId: "123456" })).toEqual({
      marketId: "123456",
    });
  });

  it.each([
    [{ marketId: 123456 }, "number"],
    [{ marketId: "0" }, "zero"],
    [{ marketId: "001" }, "leading zero"],
    [{ marketId: " 1" }, "whitespace"],
    [{ marketId: "1", extra: true }, "unknown member"],
  ])("rejects %s (%s)", (request, _reason) => {
    expect(reportRequestSchema.safeParse(request).success).toBe(false);
  });
});

describe("reportSchema", () => {
  it("accepts the complete golden report fixture", () => {
    expect(reportSchema.parse(validReport())).toEqual(validReport());
  });

  it.each([
    [
      "unknown top-level member",
      (report: ReturnType<typeof validReport>) =>
        Object.assign(report, { extra: true }),
    ],
    [
      "unknown nested member",
      (report: ReturnType<typeof validReport>) =>
        Object.assign(report.source.market, { extra: true }),
    ],
    [
      "mismatched source market",
      (report: ReturnType<typeof validReport>) =>
        (report.source.market.id = "654321"),
    ],
    [
      "out-of-range probability",
      (report: ReturnType<typeof validReport>) =>
        (report.analysis.confidenceBps = 10_001),
    ],
    [
      "non-canonical money",
      (report: ReturnType<typeof validReport>) =>
        (report.source.market.volumeUsd = "01.20"),
    ],
    [
      "timestamp without milliseconds",
      (report: ReturnType<typeof validReport>) =>
        (report.source.fetchedAt = "2026-09-14T00:00:01Z"),
    ],
    [
      "uppercase proof hash",
      (report: ReturnType<typeof validReport>) =>
        (report.proof.contentHash = `0x${"B".repeat(64)}`),
    ],
    [
      "mismatched registry argument",
      (report: ReturnType<typeof validReport>) =>
        (report.proof.registry.args.contentHash = HASH_A),
    ],
    [
      "unsupported single outcome",
      (report: ReturnType<typeof validReport>) =>
        (report.source.market.outcomes = [
          { label: "Yes", probabilityBps: 10_000 },
        ]),
    ],
  ])("rejects %s", (_label, mutate) => {
    const report = validReport();
    mutate(report);
    expect(reportSchema.safeParse(report).success).toBe(false);
  });
});
