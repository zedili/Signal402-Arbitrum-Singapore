import { describe, expect, it, vi } from "vitest";

import {
  adaptGammaMarket,
  fetchMarketSnapshot,
  type MarketTransport,
} from "./market-snapshot";

const FETCHED_AT = "2026-09-15T08:00:00.000Z";

function validGammaMarket() {
  return {
    id: "123456",
    question: "Will the fixture pass?",
    description: "A deterministic fixture.",
    slug: "fixture-market",
    outcomes: '["Yes","No"]',
    outcomePrices: '["0.51000","0.49000"]',
    volume: "123.4500",
    liquidity: "89.1200",
    endDate: "2026-12-31T23:59:59Z",
    resolutionSource: "https://example.invalid/rules",
  };
}

describe("adaptGammaMarket", () => {
  it("normalizes a fully proved binary Yes/No market", () => {
    const result = adaptGammaMarket("123456", validGammaMarket(), FETCHED_AT);
    expect(result).toEqual({
      ok: true,
      source: {
        provider: "polymarket",
        fetchedAt: FETCHED_AT,
        market: {
          id: "123456",
          question: "Will the fixture pass?",
          description: "A deterministic fixture.",
          outcomes: [
            { label: "Yes", probabilityBps: 5100 },
            { label: "No", probabilityBps: 4900 },
          ],
          volumeUsd: "123.45",
          liquidityUsd: "89.12",
          endTime: "2026-12-31T23:59:59.000Z",
          resolutionSource: "https://example.invalid/rules",
        },
        references: [
          {
            rel: "market",
            url: "https://polymarket.com/event/fixture-market",
            retrievedAt: FETCHED_AT,
          },
        ],
      },
    });
  });

  it("uses a verified event slug ahead of the market slug", () => {
    const result = adaptGammaMarket(
      "123456",
      { ...validGammaMarket(), events: [{ slug: "verified-event" }] },
      FETCHED_AT,
    );
    expect(result.ok && result.source.references[0].url).toBe(
      "https://polymarket.com/event/verified-event",
    );
  });

  it.each([
    ["mismatched ID", { id: "654321" }],
    ["missing outcomes", { outcomes: undefined }],
    ["malformed outcomes", { outcomes: "not-json" }],
    ["invented labels", { outcomes: '["Up","Down"]' }],
    ["single outcome", { outcomes: '["Yes"]', outcomePrices: '["1"]' }],
    [
      "three outcomes",
      {
        outcomes: '["Yes","No","Other"]',
        outcomePrices: '["0.4","0.4","0.2"]',
      },
    ],
    ["price count mismatch", { outcomePrices: '["1"]' }],
    ["invalid price", { outcomePrices: '["NaN","0.49"]' }],
    ["prices not totaling 10000 bps", { outcomePrices: '["0.5","0.49"]' }],
    ["missing volume", { volume: undefined }],
    ["noncanonicalizable volume", { volume: "1e6" }],
    ["missing liquidity", { liquidity: undefined }],
    ["invalid end time", { endDate: "someday" }],
    ["missing resolution URL", { resolutionSource: "" }],
    ["unverified slug", { slug: "../market" }],
    ["empty question", { question: "   " }],
  ])("rejects %s without fallback data", (_label, change) => {
    expect(
      adaptGammaMarket(
        "123456",
        { ...validGammaMarket(), ...change },
        FETCHED_AT,
      ),
    ).toEqual({
      ok: false,
      code: "unsupported_market_shape",
    });
  });

  it("rounds declared decimal probabilities deterministically to basis points", () => {
    const result = adaptGammaMarket(
      "123456",
      {
        ...validGammaMarket(),
        outcomePrices: '["0.50005","0.49994"]',
        volume: "1",
      },
      FETCHED_AT,
    );
    expect(
      result.ok &&
        result.source.market.outcomes.map((outcome) => outcome.probabilityBps),
    ).toEqual([5001, 4999]);
  });
});

describe("fetchMarketSnapshot", () => {
  it("maps an explicit absence to market_not_found", async () => {
    const transport: MarketTransport = {
      fetchMarket: vi.fn().mockResolvedValue({ kind: "not_found" }),
    };
    await expect(
      fetchMarketSnapshot("123456", transport, () => new Date(FETCHED_AT)),
    ).resolves.toEqual({
      ok: false,
      code: "market_not_found",
    });
  });

  it("maps transport errors to source_unavailable without exposing details", async () => {
    const transport: MarketTransport = {
      fetchMarket: vi
        .fn()
        .mockRejectedValue(new Error("private upstream response")),
    };
    const result = await fetchMarketSnapshot(
      "123456",
      transport,
      () => new Date(FETCHED_AT),
    );
    expect(result).toEqual({ ok: false, code: "source_unavailable" });
    expect(JSON.stringify(result)).not.toContain("private upstream response");
  });
});
