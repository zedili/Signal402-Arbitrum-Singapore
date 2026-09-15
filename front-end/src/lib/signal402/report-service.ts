import { z } from "zod";

import {
  hashContentPayload,
  hashMarketId,
  type ContentPayload,
} from "./canonical-proof";
import { fetchMarketSnapshot, type MarketTransport } from "./market-snapshot";
import { reportSchema, type Signal402Report } from "./report-contract";
import {
  deriveRequestFingerprint,
  requestPaymentTermsSchema,
  type RequestPaymentTerms,
} from "./request-identity";
import {
  runAnalysisProvider,
  type AnalysisProvider,
} from "./analysis-provider";

const registryAddressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const purchaseIdSchema = z.string().min(1).max(128);

export type ReportServiceFailureCode =
  | "market_not_found"
  | "source_unavailable"
  | "unsupported_market_shape"
  | "provider_unavailable"
  | "provider_timeout"
  | "provider_invalid_output"
  | "internal_error";

export type ReportServiceResult =
  | { ok: true; report: Signal402Report }
  | { ok: false; code: ReportServiceFailureCode };

export type ReportServiceDependencies = Readonly<{
  marketTransport: MarketTransport;
  analysisProvider: AnalysisProvider;
  now: () => Date;
  paymentTerms: RequestPaymentTerms;
  registryAddress: string;
}>;

export function createReportService(dependencies: ReportServiceDependencies) {
  const paymentTerms = requestPaymentTermsSchema.parse(
    dependencies.paymentTerms,
  );
  const registryAddress = registryAddressSchema.parse(
    dependencies.registryAddress,
  );

  return async function generateReport(input: {
    marketId: string;
    purchaseId: string;
  }): Promise<ReportServiceResult> {
    let receivedAt: string;
    let purchaseId: string;
    try {
      receivedAt = dependencies.now().toISOString();
      purchaseId = purchaseIdSchema.parse(input.purchaseId);
    } catch {
      return { ok: false, code: "internal_error" };
    }

    const snapshot = await fetchMarketSnapshot(
      input.marketId,
      dependencies.marketTransport,
      dependencies.now,
    );
    if (!snapshot.ok) return snapshot;

    const generated = await runAnalysisProvider(
      dependencies.analysisProvider,
      snapshot.source,
    );
    if (!generated.ok) return generated;

    try {
      const generation = {
        ...generated.generation,
        generatedAt: dependencies.now().toISOString(),
      };
      const contentPayload: ContentPayload = {
        schemaVersion: "signal402.report.v1",
        marketId: input.marketId,
        source: snapshot.source,
        analysis: generated.analysis,
        generation,
        disclaimer: "This is informational model output, not financial advice.",
      };
      const marketIdHash = hashMarketId(input.marketId);
      const contentHash = hashContentPayload(contentPayload);

      return {
        ok: true,
        report: reportSchema.parse({
          schemaVersion: "signal402.report.v1",
          request: {
            marketId: input.marketId,
            requestFingerprint: deriveRequestFingerprint(
              input.marketId,
              paymentTerms,
            ),
            purchaseId,
            receivedAt,
          },
          source: snapshot.source,
          analysis: generated.analysis,
          generation,
          proof: {
            canonicalization: "RFC8785-JCS",
            hashAlgorithm: "ethereum-keccak256",
            contentSchema: "signal402.content.v1",
            marketIdHash,
            contentHash,
            coveredGroups: ["source", "analysis", "generation"],
            registry: {
              required: false,
              network: "eip155:421614",
              address: registryAddress,
              function: "attest(bytes32,bytes32)",
              args: { marketIdHash, contentHash },
            },
          },
          payment: {
            protocol: "x402",
            version: 2,
            scheme: "exact",
            expected: paymentTerms,
            authoritativeReceiptHeader: "PAYMENT-RESPONSE",
          },
          attestation: { required: false, status: "not_requested" },
          disclaimer: contentPayload.disclaimer,
        }),
      };
    } catch {
      return { ok: false, code: "internal_error" };
    }
  };
}
