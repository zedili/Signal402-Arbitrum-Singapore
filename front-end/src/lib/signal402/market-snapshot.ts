import { z } from "zod";

import { sourceSchema, type Signal402Report } from "./report-contract";
import { normalizePositiveMarketId } from "./request-identity";

const slugPattern = /^[a-z0-9](?:[a-z0-9-]{0,198}[a-z0-9])?$/;
const decimalPattern = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

const gammaMarketSchema = z.object({
  id: z.string(),
  question: z.string(),
  description: z.string(),
  slug: z.string().optional(),
  outcomes: z.string(),
  outcomePrices: z.string(),
  volume: z.string(),
  liquidity: z.string(),
  endDate: z.string(),
  resolutionSource: z.string(),
  events: z
    .array(
      z.object({
        slug: z.string().optional(),
      }),
    )
    .optional(),
});

export type MarketSnapshot = Signal402Report["source"];
export type MarketSnapshotFailureCode =
  | "market_not_found"
  | "source_unavailable"
  | "unsupported_market_shape";
export type MarketSnapshotResult =
  | { ok: true; source: MarketSnapshot }
  | { ok: false; code: MarketSnapshotFailureCode };

export type MarketTransportResult =
  | { kind: "found"; body: unknown }
  | { kind: "not_found" };

export interface MarketTransport {
  fetchMarket(marketId: string): Promise<MarketTransportResult>;
}

function parseStringArray(value: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !Array.isArray(parsed) ||
      !parsed.every((entry) => typeof entry === "string")
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}

function decimalToBasisPoints(value: string): number | null {
  if (!decimalPattern.test(value)) return null;
  const [integer, fraction = ""] = value.split(".");
  if (integer !== "0" && integer !== "1") return null;
  if (integer === "1" && /[1-9]/.test(fraction)) return null;
  if (integer === "1") return 10_000;
  const padded = `${fraction}00000`;
  const firstFour = Number(padded.slice(0, 4));
  const rounded = firstFour + (Number(padded[4]) >= 5 ? 1 : 0);
  return Math.min(10_000, rounded);
}

function canonicalDecimal(value: string): string | null {
  if (!decimalPattern.test(value)) return null;
  const [integer, fraction] = value.split(".");
  if (!fraction) return integer;
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed ? `${integer}.${trimmed}` : integer;
}

function canonicalTimestamp(value: string): string | null {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

function verifiedMarketUrl(
  input: z.infer<typeof gammaMarketSchema>,
): string | null {
  const slug = input.events?.[0]?.slug ?? input.slug;
  return slug && slugPattern.test(slug)
    ? `https://polymarket.com/event/${slug}`
    : null;
}

export function adaptGammaMarket(
  requestedMarketId: string,
  input: unknown,
  fetchedAt: string,
): MarketSnapshotResult {
  let marketId: string;
  try {
    marketId = normalizePositiveMarketId(requestedMarketId);
  } catch {
    return { ok: false, code: "unsupported_market_shape" };
  }

  const parsed = gammaMarketSchema.safeParse(input);
  if (!parsed.success || parsed.data.id !== marketId) {
    return { ok: false, code: "unsupported_market_shape" };
  }

  const market = parsed.data;
  const labels = parseStringArray(market.outcomes);
  const rawPrices = parseStringArray(market.outcomePrices);
  const volumeUsd = canonicalDecimal(market.volume);
  const liquidityUsd = canonicalDecimal(market.liquidity);
  const endTime = canonicalTimestamp(market.endDate);
  const retrievedAt = canonicalTimestamp(fetchedAt);
  const marketUrl = verifiedMarketUrl(market);
  const resolutionSource = z.url().safeParse(market.resolutionSource);

  if (
    !labels ||
    !rawPrices ||
    labels.length !== 2 ||
    labels[0] !== "Yes" ||
    labels[1] !== "No" ||
    rawPrices.length !== labels.length ||
    !volumeUsd ||
    !liquidityUsd ||
    !endTime ||
    !retrievedAt ||
    !marketUrl ||
    !resolutionSource.success ||
    market.question.trim().length === 0
  ) {
    return { ok: false, code: "unsupported_market_shape" };
  }

  const probabilities = rawPrices.map(decimalToBasisPoints);
  if (
    probabilities.some((value) => value === null) ||
    probabilities[0]! + probabilities[1]! !== 10_000
  ) {
    return { ok: false, code: "unsupported_market_shape" };
  }

  const source = sourceSchema.safeParse({
    provider: "polymarket",
    fetchedAt: retrievedAt,
    market: {
      id: marketId,
      question: market.question,
      description: market.description,
      outcomes: labels.map((label, index) => ({
        label,
        probabilityBps: probabilities[index],
      })),
      volumeUsd,
      liquidityUsd,
      endTime,
      resolutionSource: resolutionSource.data,
    },
    references: [{ rel: "market", url: marketUrl, retrievedAt }],
  });

  return source.success
    ? { ok: true, source: source.data }
    : { ok: false, code: "unsupported_market_shape" };
}

export async function fetchMarketSnapshot(
  marketId: string,
  transport: MarketTransport,
  now: () => Date,
): Promise<MarketSnapshotResult> {
  try {
    const response = await transport.fetchMarket(
      normalizePositiveMarketId(marketId),
    );
    if (response.kind === "not_found")
      return { ok: false, code: "market_not_found" };
    return adaptGammaMarket(marketId, response.body, now().toISOString());
  } catch {
    return { ok: false, code: "source_unavailable" };
  }
}
