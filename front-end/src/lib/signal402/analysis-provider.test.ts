import { describe, expect, it, vi } from "vitest";

import {
  AnalysisProviderError,
  runAnalysisProvider,
  type AnalysisProvider,
} from "./analysis-provider";
import type { MarketSnapshot } from "./market-snapshot";

const source = {
  provider: "polymarket",
  fetchedAt: "2026-09-15T08:00:00.000Z",
  market: {
    id: "123456",
    question: "Fixture?",
    description: "Fixture",
    outcomes: [
      { label: "Yes", probabilityBps: 5100 },
      { label: "No", probabilityBps: 4900 },
    ],
    volumeUsd: "1",
    liquidityUsd: "1",
    endTime: "2026-12-31T23:59:59.000Z",
    resolutionSource: "https://example.invalid/rules",
  },
  references: [
    {
      rel: "market",
      url: "https://example.invalid/market/123456",
      retrievedAt: "2026-09-15T08:00:00.000Z",
    },
  ],
} satisfies MarketSnapshot;

function validProviderOutput() {
  return {
    provider: "fixture-provider",
    model: "fixture-model",
    analysis: {
      independentProbabilityBps: 4800,
      confidenceBps: 6200,
      summary: "Bounded fixture summary",
      evidence: ["Fixture evidence"],
      counterarguments: ["Fixture counterargument"],
      risks: ["Fixture risk"],
      assumptions: ["Fixture assumption"],
    },
  };
}

describe("runAnalysisProvider", () => {
  it("validates output and derives market probability from the proved Yes outcome", async () => {
    const provider: AnalysisProvider = {
      generate: vi.fn().mockResolvedValue(validProviderOutput()),
    };
    await expect(runAnalysisProvider(provider, source)).resolves.toEqual({
      ok: true,
      analysis: {
        marketProbabilityBps: 5100,
        ...validProviderOutput().analysis,
      },
      generation: {
        provider: "fixture-provider",
        model: "fixture-model",
        validatedAgainst: "signal402.analysis.v1",
      },
    });
    expect(provider.generate).toHaveBeenCalledWith({ source });
  });

  it.each([
    [
      "unknown output member",
      { ...validProviderOutput(), rawPrompt: "secret" },
    ],
    [
      "unknown analysis member",
      {
        ...validProviderOutput(),
        analysis: { ...validProviderOutput().analysis, extra: true },
      },
    ],
    [
      "fractional bps",
      {
        ...validProviderOutput(),
        analysis: { ...validProviderOutput().analysis, confidenceBps: 1.5 },
      },
    ],
    [
      "out-of-range bps",
      {
        ...validProviderOutput(),
        analysis: { ...validProviderOutput().analysis, confidenceBps: 10001 },
      },
    ],
    ["empty model", { ...validProviderOutput(), model: "" }],
  ])("rejects %s as provider_invalid_output", async (_label, output) => {
    const provider: AnalysisProvider = {
      generate: vi.fn().mockResolvedValue(output),
    };
    await expect(runAnalysisProvider(provider, source)).resolves.toEqual({
      ok: false,
      code: "provider_invalid_output",
    });
  });

  it.each([
    ["timeout", new AnalysisProviderError("timeout"), "provider_timeout"],
    [
      "declared outage",
      new AnalysisProviderError("unavailable"),
      "provider_unavailable",
    ],
    [
      "unknown exception",
      new Error("raw private error"),
      "provider_unavailable",
    ],
  ] as const)(
    "maps %s to a stable public code",
    async (_label, error, code) => {
      const provider: AnalysisProvider = {
        generate: vi.fn().mockRejectedValue(error),
      };
      const result = await runAnalysisProvider(provider, source);
      expect(result).toEqual({ ok: false, code });
      expect(JSON.stringify(result)).not.toContain(error.message);
    },
  );
});
