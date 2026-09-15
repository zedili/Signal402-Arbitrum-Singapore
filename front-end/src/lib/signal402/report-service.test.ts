import { describe, expect, it, vi } from "vitest";

import { hashContentPayload, selectContentPayload } from "./canonical-proof";
import {
  AnalysisProviderError,
  type AnalysisProvider,
} from "./analysis-provider";
import type { MarketTransport } from "./market-snapshot";
import { createReportService } from "./report-service";

const paymentTerms = {
  network: "eip155:421614",
  asset: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  amountAtomic: "10000",
  payTo: "0x0573f139d21fb3140155567Cba7630d3948F4ea3",
};

function validGammaMarket() {
  return {
    id: "123456",
    question: "Will the service fixture pass?",
    description: "A deterministic service fixture.",
    slug: "service-fixture",
    outcomes: '["Yes","No"]',
    outcomePrices: '["0.51","0.49"]',
    volume: "123.45",
    liquidity: "89.12",
    endDate: "2026-12-31T23:59:59Z",
    resolutionSource: "https://example.invalid/rules",
  };
}

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

function sequentialClock() {
  const values = [
    "2026-09-15T08:00:00.000Z",
    "2026-09-15T08:00:01.000Z",
    "2026-09-15T08:00:03.000Z",
  ];
  let index = 0;
  return () => new Date(values[Math.min(index++, values.length - 1)]);
}

function dependencies(
  overrides: Partial<Parameters<typeof createReportService>[0]> = {},
) {
  const marketTransport: MarketTransport = {
    fetchMarket: vi
      .fn()
      .mockResolvedValue({ kind: "found", body: validGammaMarket() }),
  };
  const analysisProvider: AnalysisProvider = {
    generate: vi.fn().mockResolvedValue(validProviderOutput()),
  };
  return {
    marketTransport,
    analysisProvider,
    now: sequentialClock(),
    paymentTerms,
    registryAddress: "0xc896eB3B013a60deCA7029dc2aa4F0da9a5faf82",
    ...overrides,
  };
}

describe("createReportService", () => {
  it("builds a strict report with recomputable proof and no settlement receipt in its body", async () => {
    const service = createReportService(dependencies());
    const result = await service({
      marketId: "123456",
      purchaseId: "purchase_fixture_01",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.report.request.receivedAt).toBe("2026-09-15T08:00:00.000Z");
    expect(result.report.source.fetchedAt).toBe("2026-09-15T08:00:01.000Z");
    expect(result.report.generation.generatedAt).toBe(
      "2026-09-15T08:00:03.000Z",
    );
    expect(result.report.proof.contentHash).toBe(
      hashContentPayload(selectContentPayload(result.report)),
    );
    expect(result.report.proof.registry.args).toEqual({
      marketIdHash: result.report.proof.marketIdHash,
      contentHash: result.report.proof.contentHash,
    });
    expect(result.report.payment.expected).toEqual(paymentTerms);
    expect(JSON.stringify(result.report)).not.toMatch(
      /transaction|payer|success|PAYMENT-SIGNATURE/i,
    );
  });

  it("stops before provider work when the market is absent", async () => {
    const deps = dependencies({
      marketTransport: {
        fetchMarket: vi.fn().mockResolvedValue({ kind: "not_found" }),
      },
    });
    const service = createReportService(deps);
    await expect(
      service({ marketId: "123456", purchaseId: "purchase_fixture_01" }),
    ).resolves.toEqual({
      ok: false,
      code: "market_not_found",
    });
    expect(deps.analysisProvider.generate).not.toHaveBeenCalled();
  });

  it("stops before provider work for an unsupported market shape", async () => {
    const deps = dependencies({
      marketTransport: {
        fetchMarket: vi.fn().mockResolvedValue({
          kind: "found",
          body: { ...validGammaMarket(), outcomes: '["Up","Down"]' },
        }),
      },
    });
    const service = createReportService(deps);
    await expect(
      service({ marketId: "123456", purchaseId: "purchase_fixture_01" }),
    ).resolves.toEqual({
      ok: false,
      code: "unsupported_market_shape",
    });
    expect(deps.analysisProvider.generate).not.toHaveBeenCalled();
  });

  it.each([
    [new AnalysisProviderError("timeout"), "provider_timeout"],
    [new AnalysisProviderError("unavailable"), "provider_unavailable"],
  ] as const)(
    "maps provider failure without any settlement collaborator",
    async (error, code) => {
      const settlement = vi.fn();
      const deps = dependencies({
        analysisProvider: { generate: vi.fn().mockRejectedValue(error) },
      });
      const service = createReportService(deps);
      await expect(
        service({ marketId: "123456", purchaseId: "purchase_fixture_01" }),
      ).resolves.toEqual({
        ok: false,
        code,
      });
      expect(settlement).not.toHaveBeenCalled();
    },
  );

  it("returns provider_invalid_output for malformed model data and never settles", async () => {
    const settlement = vi.fn();
    const deps = dependencies({
      analysisProvider: {
        generate: vi
          .fn()
          .mockResolvedValue({
            ...validProviderOutput(),
            analysis: { confidenceBps: 99999 },
          }),
      },
    });
    const service = createReportService(deps);
    await expect(
      service({ marketId: "123456", purchaseId: "purchase_fixture_01" }),
    ).resolves.toEqual({
      ok: false,
      code: "provider_invalid_output",
    });
    expect(settlement).not.toHaveBeenCalled();
  });

  it("returns internal_error for an invalid support correlation ID", async () => {
    const deps = dependencies();
    const service = createReportService(deps);
    await expect(
      service({ marketId: "123456", purchaseId: "" }),
    ).resolves.toEqual({
      ok: false,
      code: "internal_error",
    });
    expect(deps.marketTransport.fetchMarket).not.toHaveBeenCalled();
    expect(deps.analysisProvider.generate).not.toHaveBeenCalled();
  });
});
