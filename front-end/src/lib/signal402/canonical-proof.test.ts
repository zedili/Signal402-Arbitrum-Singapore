import { bytesToHex } from "viem";
import { describe, expect, it } from "vitest";

import {
  canonicalizeJcs,
  canonicalizeJcsBytes,
  hashContentPayload,
  hashMarketId,
  parseUniqueJson,
  selectContentPayload,
  type ContentPayload,
  type JcsValue,
} from "./canonical-proof";
import type { Signal402Report } from "./report-contract";

const RFC_SAMPLE = {
  numbers: [333333333.33333329, 1e30, 4.5, 2e-3, 1e-27],
  string: '€$\u000f\nA\'B"\\"/',
  literals: [null, true, false],
};

const RFC_CANONICAL =
  '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\\u000f\\nA\'B\\"\\\\\\"/"}';
const RFC_UTF8_HEX =
  "0x7b226c69746572616c73223a5b6e756c6c2c747275652c66616c73655d2c226e756d62657273223a5b3333333333333333332e333333333333332c31652b33302c342e352c302e3030322c31652d32375d2c22737472696e67223a22e282ac245c75303030665c6e4127425c225c5c5c222f227d";

const contentPayload: ContentPayload = {
  schemaVersion: "signal402.report.v1",
  marketId: "123456",
  source: {
    provider: "polymarket",
    fetchedAt: "2026-09-14T00:00:01.000Z",
    market: {
      id: "123456",
      question: "Fixture?",
      description: "Proof fixture",
      outcomes: [
        { label: "Yes", probabilityBps: 5100 },
        { label: "No", probabilityBps: 4900 },
      ],
      volumeUsd: "12.34",
      liquidityUsd: "5.67",
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
    summary: "Fixture summary",
    evidence: ["A", "B"],
    counterarguments: ["C"],
    risks: ["D"],
    assumptions: ["E"],
  },
  generation: {
    provider: "deepseek",
    model: "deepseek-chat",
    generatedAt: "2026-09-14T00:00:03.000Z",
    validatedAgainst: "signal402.analysis.v1",
  },
  disclaimer: "This is informational model output, not financial advice.",
};

describe("RFC 8785 canonicalization", () => {
  it("matches the RFC 8785 primitive and UTF-8 example", () => {
    expect(canonicalizeJcs(RFC_SAMPLE)).toBe(RFC_CANONICAL);
    expect(bytesToHex(canonicalizeJcsBytes(RFC_SAMPLE))).toBe(RFC_UTF8_HEX);
  });

  it("sorts recursively by UTF-16 code units while preserving array order", () => {
    const unicodeKeys = {
      "€": "Euro Sign",
      "\r": "Carriage Return",
      דּ: "Hebrew Letter Dalet With Dagesh",
      "1": "One",
      "😀": "Emoji: Grinning Face",
      "\u0080": "Control",
      ö: "Latin Small Letter O With Diaeresis",
    };
    expect(canonicalizeJcs(unicodeKeys)).toBe(
      '{"\\r":"Carriage Return","1":"One","\u0080":"Control","ö":"Latin Small Letter O With Diaeresis","€":"Euro Sign","😀":"Emoji: Grinning Face","דּ":"Hebrew Letter Dalet With Dagesh"}',
    );
    expect(canonicalizeJcs({ b: { y: 2, x: 1 }, a: ["second", "first"] })).toBe(
      '{"a":["second","first"],"b":{"x":1,"y":2}}',
    );
  });

  it("uses ECMAScript number serialization including negative zero", () => {
    expect(
      canonicalizeJcs({ minusZero: -0, tiny: 5e-324, exponent: 1e30 }),
    ).toBe('{"exponent":1e+30,"minusZero":0,"tiny":5e-324}');
  });

  it.each([
    ["NaN", { value: Number.NaN }],
    ["infinity", { value: Number.POSITIVE_INFINITY }],
    ["lone surrogate", { value: "\ud800" }],
    ["Unicode noncharacter", { value: "\ufdd0" }],
    ["non-plain object", { value: new Date(0) }],
    ["undefined", { value: undefined }],
  ])("rejects %s", (_label, value) => {
    expect(() => canonicalizeJcs(value as JcsValue)).toThrow();
  });

  it("rejects cycles, sparse arrays, accessors, and symbol properties", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const sparse = Array(1) as JcsValue[];
    const accessor = Object.defineProperty({}, "value", {
      enumerable: true,
      get: () => 1,
    });
    const symbol = { value: 1, [Symbol("hidden")]: 2 };
    for (const value of [cyclic, sparse, accessor, symbol]) {
      expect(() => canonicalizeJcs(value as JcsValue)).toThrow();
    }
  });
});

describe("unique JSON parser", () => {
  it("parses UTF-8 without losing negative zero", () => {
    const parsed = parseUniqueJson(
      new TextEncoder().encode('{"b":-0,"a":"€"}'),
    ) as Record<string, JcsValue>;
    expect(Object.is(parsed.b, -0)).toBe(true);
    expect(canonicalizeJcs(parsed)).toBe('{"a":"€","b":0}');
  });

  it.each([
    ["duplicate names", '{"marketId":"1","marketId":"2"}'],
    ["escaped duplicate names", '{"marketId":"1","market\\u0049d":"2"}'],
    ["unsafe integer", '{"value":9007199254740992}'],
    ["unpaired surrogate", '{"value":"\\ud800"}'],
    ["trailing input", '{"value":1}x'],
  ])("rejects %s", (_label, input) => {
    expect(() => parseUniqueJson(input)).toThrow();
  });

  it("rejects malformed UTF-8 bytes", () => {
    expect(() => parseUniqueJson(Uint8Array.from([0xc3, 0x28]))).toThrow(
      /UTF-8/,
    );
  });
});

describe("domain-separated proof hashes", () => {
  it("matches frozen market and content fixtures", () => {
    expect(hashMarketId("123456")).toBe(
      "0x65a41a26b789519f4df639185b4aaba11501edd47c1f2a169d18a65a85bb5cec",
    );
    expect(hashContentPayload(contentPayload)).toBe(
      "0x53f3d8ccf2a3ddf2b6fa21771b61a3c37fd307ff64bcb4ce080262c77e097014",
    );
  });

  it("changes for semantic content mutations and array reordering", () => {
    const baseline = hashContentPayload(contentPayload);
    const changedTimestamp = structuredClone(contentPayload);
    changedTimestamp.source.fetchedAt = "2026-09-14T00:00:02.000Z";
    const changedAnalysis = structuredClone(contentPayload);
    changedAnalysis.analysis.confidenceBps = 6201;
    const reorderedEvidence = structuredClone(contentPayload);
    reorderedEvidence.analysis.evidence.reverse();
    expect(hashContentPayload(changedTimestamp)).not.toBe(baseline);
    expect(hashContentPayload(changedAnalysis)).not.toBe(baseline);
    expect(hashContentPayload(reorderedEvidence)).not.toBe(baseline);
  });

  it("selects only the documented semantic groups", () => {
    const report = {
      ...contentPayload,
      request: {
        marketId: "123456",
        requestFingerprint: `0x${"1".repeat(64)}`,
        purchaseId: "private-correlation",
        receivedAt: "2026-09-14T00:00:00.000Z",
      },
      proof: {},
      payment: {},
      attestation: {},
    } as unknown as Signal402Report;
    const selected = selectContentPayload(report);
    expect(Object.keys(selected).sort()).toEqual([
      "analysis",
      "disclaimer",
      "generation",
      "marketId",
      "schemaVersion",
      "source",
    ]);
    expect(JSON.stringify(selected)).not.toContain("private-correlation");
  });
});
