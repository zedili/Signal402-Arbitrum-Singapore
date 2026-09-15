import { z } from "zod";

import {
  analysisSchema,
  generationSchema,
  type Signal402Report,
} from "./report-contract";
import type { MarketSnapshot } from "./market-snapshot";

const providerAnalysisSchema = analysisSchema.omit({
  marketProbabilityBps: true,
});
const providerResponseSchema = z.strictObject({
  provider: z.string().trim().min(1),
  model: z.string().trim().min(1),
  analysis: providerAnalysisSchema,
});

export type AnalysisProviderInput = Readonly<{ source: MarketSnapshot }>;
export interface AnalysisProvider {
  generate(input: AnalysisProviderInput): Promise<unknown>;
}

export class AnalysisProviderError extends Error {
  constructor(public readonly kind: "unavailable" | "timeout") {
    super(`Analysis provider ${kind}`);
    this.name = "AnalysisProviderError";
  }
}

export type AnalysisResult =
  | {
      ok: true;
      analysis: Signal402Report["analysis"];
      generation: Omit<Signal402Report["generation"], "generatedAt">;
    }
  | {
      ok: false;
      code:
        | "provider_unavailable"
        | "provider_timeout"
        | "provider_invalid_output";
    };

export async function runAnalysisProvider(
  provider: AnalysisProvider,
  source: MarketSnapshot,
): Promise<AnalysisResult> {
  try {
    const parsed = providerResponseSchema.safeParse(
      await provider.generate({ source }),
    );
    if (!parsed.success) return { ok: false, code: "provider_invalid_output" };
    return {
      ok: true,
      analysis: {
        marketProbabilityBps: source.market.outcomes[0].probabilityBps,
        ...parsed.data.analysis,
      },
      generation: generationSchema.omit({ generatedAt: true }).parse({
        provider: parsed.data.provider,
        model: parsed.data.model,
        validatedAgainst: "signal402.analysis.v1",
      }),
    };
  } catch (error) {
    if (error instanceof AnalysisProviderError) {
      return {
        ok: false,
        code:
          error.kind === "timeout"
            ? "provider_timeout"
            : "provider_unavailable",
      };
    }
    return { ok: false, code: "provider_unavailable" };
  }
}
