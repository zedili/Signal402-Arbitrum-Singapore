import type { Hex } from "viem";

import {
  problemRules,
  problemSchema,
  type PaymentState,
  type ProblemCode,
} from "../signal402/problem-contract";
import type { ReportServiceResult } from "../signal402/report-service";
import {
  deriveCredentialDigest,
  derivePurchaseKey,
  deriveRequestFingerprint,
  normalizePositiveMarketId,
  type RequestPaymentTerms,
} from "../signal402/request-identity";
import {
  beginPurchase,
  markPreSettlementFailure,
  markPrepared,
  markProcessing,
  markSettled,
  markSettlementFailure,
  markSettling,
  type PurchaseProblemCode,
} from "./purchase-state-machine";
import type {
  ReplayRecord,
  ReplayStore,
  SettlementReceipt,
} from "./replay-store";

const encoder = new TextEncoder();
const REPORT_ROUTE = "/api/v1/reports";

export const canonicalReportResource = Object.freeze({
  method: "POST",
  route: REPORT_ROUTE,
  responseMediaType: "application/json",
  problemMediaType: "application/problem+json",
  settlementHeader: "PAYMENT-RESPONSE",
});

export type ResourceRequest = Readonly<{
  body: unknown;
  idempotencyKey?: string;
  paymentHeader?: string;
}>;

export type ResourceResponse = Readonly<{
  status: number;
  headers: Readonly<Record<string, string>>;
  body: Uint8Array;
}>;

export type PaymentVerifier = (
  input: Readonly<{
    paymentHeader: string;
    requestFingerprint: Hex;
    paymentTerms: RequestPaymentTerms;
  }>,
) => Promise<{ ok: true } | { ok: false }>;

export type PaymentSettler = (
  input: Readonly<{
    paymentHeader: string;
    requestFingerprint: Hex;
    responseBody: Uint8Array;
  }>,
) => Promise<
  | { ok: true; receipt: SettlementReceipt }
  | { ok: false; outcome: "proven_unconsumed" | "unknown" }
>;

export type ReportResourceDependencies = Readonly<{
  replayStore: ReplayStore;
  paymentTerms: RequestPaymentTerms;
  paymentRequiredHeader: string;
  verifyPayment: PaymentVerifier;
  settlePayment: PaymentSettler;
  generateReport: (input: {
    marketId: string;
    purchaseId: string;
  }) => Promise<ReportServiceResult>;
  nowMs: () => number;
  claimTtlMs?: number;
  problemOrigin?: string;
}>;

const problemCopy: Record<
  ProblemCode,
  Readonly<{ title: string; detail: string }>
> = {
  invalid_json: {
    title: "Invalid JSON request",
    detail: "Send one JSON object containing only a marketId string.",
  },
  invalid_market_id: {
    title: "Invalid market ID",
    detail: "marketId must be a positive canonical base-10 string.",
  },
  invalid_idempotency_key: {
    title: "Invalid idempotency key",
    detail: "Send a bounded, high-entropy Idempotency-Key with the request.",
  },
  market_not_found: {
    title: "Market not found",
    detail: "The requested market is unavailable.",
  },
  unsupported_market_shape: {
    title: "Unsupported market shape",
    detail:
      "The market cannot be represented without changing its source semantics.",
  },
  payment_required: {
    title: "Payment required",
    detail: "Authorize the quoted testnet payment to generate this report.",
  },
  payment_authorization_invalid: {
    title: "Payment authorization invalid",
    detail: "The supplied payment authorization was not accepted.",
  },
  idempotency_conflict: {
    title: "Idempotency conflict",
    detail: "The purchase identity does not match the stored request.",
  },
  purchase_in_progress: {
    title: "Purchase is still processing",
    detail: "Retry the same purchase after the indicated delay.",
  },
  source_unavailable: {
    title: "Market source unavailable",
    detail: "The market source is temporarily unavailable.",
  },
  provider_unavailable: {
    title: "Analysis provider unavailable",
    detail: "The analysis provider is temporarily unavailable.",
  },
  provider_timeout: {
    title: "Analysis provider timed out",
    detail: "The analysis provider did not answer in time.",
  },
  provider_invalid_output: {
    title: "Analysis output rejected",
    detail: "The analysis provider returned output that failed validation.",
  },
  replay_store_unavailable: {
    title: "Purchase store unavailable",
    detail: "The purchase cannot proceed until replay protection is available.",
  },
  settlement_failed_unconsumed: {
    title: "Settlement failed",
    detail:
      "Settlement failed without consuming the authorization; retry the same purchase.",
  },
  settlement_outcome_unknown: {
    title: "Settlement outcome unknown",
    detail: "Check the existing settlement before authorizing another payment.",
  },
  stored_receipt_invalid: {
    title: "Stored receipt invalid",
    detail: "The stored response cannot be safely replayed.",
  },
  internal_error: {
    title: "Internal error",
    detail: "The report could not be completed.",
  },
};

function jsonBytes(value: unknown) {
  return encoder.encode(JSON.stringify(value));
}

function problemResponse(
  code: ProblemCode,
  paymentState: PaymentState,
  origin: string,
  purchaseId?: string,
): ResourceResponse {
  const rule = problemRules[code];
  const body = problemSchema.parse({
    type: `${origin}/problems/${code.replaceAll("_", "-")}`,
    ...problemCopy[code],
    status: rule.status,
    code,
    action: rule.action,
    paymentState,
    ...(purchaseId ? { purchaseId } : {}),
    ...(code === "purchase_in_progress" ? { retryAfterSeconds: 2 } : {}),
  });
  return {
    status: rule.status,
    headers: {
      "content-type": "application/problem+json",
      "cache-control": "private, no-store",
      ...(code === "purchase_in_progress" ? { "retry-after": "2" } : {}),
    },
    body: jsonBytes(body),
  };
}

function successResponse(
  body: Uint8Array,
  settlementHeader: string,
): ResourceResponse {
  return {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "private, no-store",
      "payment-response": settlementHeader,
    },
    body: body.slice(),
  };
}

function purchaseId(purchaseKey: Hex) {
  return `purchase_${purchaseKey.slice(2, 26)}`;
}

function validatedMarketId(
  body: unknown,
): string | "invalid_json" | "invalid_market_id" {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return "invalid_json";
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== "marketId") return "invalid_json";
  try {
    return normalizePositiveMarketId((body as { marketId?: unknown }).marketId);
  } catch {
    return "invalid_market_id";
  }
}

function mapPurchaseProblem(code: PurchaseProblemCode): ProblemCode {
  return code;
}

async function failBeforeSettlement(
  dependencies: ReportResourceDependencies,
  record: ReplayRecord,
  code: ProblemCode,
  paymentState: PaymentState,
  origin: string,
) {
  const failed = await markPreSettlementFailure(
    dependencies.replayStore,
    record,
    dependencies.nowMs(),
  );
  if (!failed.ok) {
    return problemResponse(
      failed.code,
      paymentState,
      origin,
      purchaseId(record.purchaseKey),
    );
  }
  return problemResponse(
    code,
    paymentState,
    origin,
    purchaseId(record.purchaseKey),
  );
}

export function createReportResourceServer(
  dependencies: ReportResourceDependencies,
) {
  const ttl = dependencies.claimTtlMs ?? 5 * 60_000;
  if (!Number.isSafeInteger(ttl) || ttl <= 0)
    throw new TypeError("Invalid claim TTL");
  if (!dependencies.paymentRequiredHeader)
    throw new TypeError("Missing payment challenge");
  const origin = (
    dependencies.problemOrigin ?? "https://signal402.vercel.app"
  ).replace(/\/$/, "");

  return async function handle(
    request: ResourceRequest,
  ): Promise<ResourceResponse> {
    const marketId = validatedMarketId(request.body);
    if (marketId === "invalid_json" || marketId === "invalid_market_id") {
      return problemResponse(marketId, "not_present", origin);
    }

    let key: Hex;
    try {
      key = derivePurchaseKey(request.idempotencyKey ?? "");
    } catch {
      return problemResponse("invalid_idempotency_key", "not_present", origin);
    }

    if (!request.paymentHeader) {
      const response = problemResponse(
        "payment_required",
        "not_present",
        origin,
        purchaseId(key),
      );
      return {
        ...response,
        headers: {
          ...response.headers,
          "payment-required": dependencies.paymentRequiredHeader,
        },
      };
    }

    let credentialDigest: Hex;
    try {
      credentialDigest = deriveCredentialDigest(
        encoder.encode(request.paymentHeader),
      );
    } catch {
      return problemResponse(
        "payment_authorization_invalid",
        "unverified",
        origin,
        purchaseId(key),
      );
    }
    const requestFingerprint = deriveRequestFingerprint(
      marketId,
      dependencies.paymentTerms,
    );
    const now = dependencies.nowMs();
    const begun = await beginPurchase(dependencies.replayStore, {
      purchaseKey: key,
      credentialDigest,
      requestFingerprint,
      nowMs: now,
      expiresAtMs: now + ttl,
    });
    if (begun.kind === "problem") {
      const code = mapPurchaseProblem(begun.code);
      const state: PaymentState =
        code === "settlement_outcome_unknown" ||
        code === "stored_receipt_invalid"
          ? "unknown"
          : "unverified";
      return problemResponse(code, state, origin, purchaseId(key));
    }
    if (begun.kind === "replay") {
      return successResponse(begun.body, begun.settlementHeader);
    }

    let verification: Awaited<ReturnType<PaymentVerifier>>;
    try {
      verification = await dependencies.verifyPayment({
        paymentHeader: request.paymentHeader,
        requestFingerprint,
        paymentTerms: dependencies.paymentTerms,
      });
    } catch {
      return failBeforeSettlement(
        dependencies,
        begun.record,
        "internal_error",
        "unverified",
        origin,
      );
    }
    if (!verification.ok) {
      return failBeforeSettlement(
        dependencies,
        begun.record,
        "payment_authorization_invalid",
        "unverified",
        origin,
      );
    }

    const processing = await markProcessing(
      dependencies.replayStore,
      begun.record,
      dependencies.nowMs(),
    );
    if (!processing.ok) {
      return problemResponse(
        processing.code,
        "verified_unsettled",
        origin,
        purchaseId(key),
      );
    }

    let report: ReportServiceResult;
    try {
      report = await dependencies.generateReport({
        marketId,
        purchaseId: purchaseId(key),
      });
    } catch {
      report = { ok: false, code: "internal_error" };
    }
    if (!report.ok) {
      return failBeforeSettlement(
        dependencies,
        processing.record,
        report.code,
        "verified_unsettled",
        origin,
      );
    }

    const responseBody = jsonBytes(report.report);
    const prepared = await markPrepared(
      dependencies.replayStore,
      processing.record,
      responseBody,
      dependencies.nowMs(),
    );
    if (!prepared.ok) {
      return problemResponse(
        prepared.code,
        "verified_unsettled",
        origin,
        purchaseId(key),
      );
    }
    const settling = await markSettling(
      dependencies.replayStore,
      prepared.record,
      dependencies.nowMs(),
    );
    if (!settling.ok) {
      return problemResponse(
        settling.code,
        "verified_unsettled",
        origin,
        purchaseId(key),
      );
    }

    let settlement: Awaited<ReturnType<PaymentSettler>>;
    try {
      settlement = await dependencies.settlePayment({
        paymentHeader: request.paymentHeader,
        requestFingerprint,
        responseBody: responseBody.slice(),
      });
    } catch {
      settlement = { ok: false, outcome: "unknown" };
    }
    if (!settlement.ok) {
      const failed = await markSettlementFailure(
        dependencies.replayStore,
        settling.record,
        settlement.outcome,
        dependencies.nowMs(),
      );
      if (!failed.ok) {
        return problemResponse(failed.code, "unknown", origin, purchaseId(key));
      }
      return problemResponse(
        settlement.outcome === "unknown"
          ? "settlement_outcome_unknown"
          : "settlement_failed_unconsumed",
        settlement.outcome === "unknown" ? "unknown" : "verified_unsettled",
        origin,
        purchaseId(key),
      );
    }

    const settled = await markSettled(
      dependencies.replayStore,
      settling.record,
      settlement.receipt,
      dependencies.nowMs(),
    );
    if (!settled.ok) {
      return problemResponse(settled.code, "unknown", origin, purchaseId(key));
    }
    return successResponse(responseBody, settlement.receipt.header);
  };
}
