import type { Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { problemSchema } from "../signal402/problem-contract";
import {
  reportSchema,
  type Signal402Report,
} from "../signal402/report-contract";
import { derivePurchaseKey } from "../signal402/request-identity";
import { MemoryReplayStore } from "./memory-replay-store";
import {
  createReportResourceServer,
  type ReportResourceDependencies,
  type ResourceResponse,
} from "./report-resource-server";

const decoder = new TextDecoder();
const paymentTerms = {
  network: "eip155:421614",
  asset: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  amountAtomic: "10000",
  payTo: "0x0573f139d21fb3140155567Cba7630d3948F4ea3",
} as const;
const request = {
  body: { marketId: "123456" },
  idempotencyKey: "fixture-idempotency-key-0001",
  paymentHeader: "fixture-payment-authorization",
};
const receipt = {
  header: "fixture-payment-response",
  network: "eip155:421614",
  transaction: `0x${"4".repeat(64)}` as Hex,
};

function validReport(): Signal402Report {
  const marketHash = `0x${"1".repeat(64)}`;
  const contentHash = `0x${"2".repeat(64)}`;
  return reportSchema.parse({
    schemaVersion: "signal402.report.v1",
    request: {
      marketId: "123456",
      requestFingerprint: `0x${"3".repeat(64)}`,
      purchaseId: "purchase_fixture",
      receivedAt: "2026-09-16T08:00:00.000Z",
    },
    source: {
      provider: "polymarket",
      fetchedAt: "2026-09-16T08:00:01.000Z",
      market: {
        id: "123456",
        question: "Will the resource fixture pass?",
        description: "Deterministic fixture",
        outcomes: [
          { label: "Yes", probabilityBps: 5100 },
          { label: "No", probabilityBps: 4900 },
        ],
        volumeUsd: "123.45",
        liquidityUsd: "67.89",
        endTime: "2026-12-31T23:59:59.000Z",
        resolutionSource: "https://example.invalid/rules",
      },
      references: [
        {
          rel: "market",
          url: "https://example.invalid/market/123456",
          retrievedAt: "2026-09-16T08:00:01.000Z",
        },
      ],
    },
    analysis: {
      marketProbabilityBps: 5100,
      independentProbabilityBps: 4800,
      confidenceBps: 6200,
      summary: "Fixture summary",
      evidence: ["Fixture evidence"],
      counterarguments: ["Fixture counterargument"],
      risks: ["Fixture risk"],
      assumptions: ["Fixture assumption"],
    },
    generation: {
      provider: "fixture-provider",
      model: "fixture-model",
      generatedAt: "2026-09-16T08:00:03.000Z",
      validatedAgainst: "signal402.analysis.v1",
    },
    proof: {
      canonicalization: "RFC8785-JCS",
      hashAlgorithm: "ethereum-keccak256",
      contentSchema: "signal402.content.v1",
      marketIdHash: marketHash,
      contentHash,
      coveredGroups: ["source", "analysis", "generation"],
      registry: {
        required: false,
        network: "eip155:421614",
        address: "0xc896eB3B013a60deCA7029dc2aa4F0da9a5faf82",
        function: "attest(bytes32,bytes32)",
        args: { marketIdHash: marketHash, contentHash },
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
    disclaimer: "This is informational model output, not financial advice.",
  });
}

function sequentialClock() {
  let value = 1_000;
  return () => value++;
}

function dependencies(
  overrides: Partial<ReportResourceDependencies> = {},
): ReportResourceDependencies {
  return {
    replayStore: new MemoryReplayStore(),
    paymentTerms,
    paymentRequiredHeader: "fixture-payment-required",
    verifyPayment: vi.fn().mockResolvedValue({ ok: true }),
    settlePayment: vi.fn().mockResolvedValue({ ok: true, receipt }),
    generateReport: vi
      .fn()
      .mockResolvedValue({ ok: true, report: validReport() }),
    nowMs: sequentialClock(),
    claimTtlMs: 60_000,
    ...overrides,
  };
}

function json(response: ResourceResponse) {
  return JSON.parse(decoder.decode(response.body));
}

describe("canonical report resource", () => {
  beforeEach(() => vi.restoreAllMocks());

  it.each([
    [{ marketId: 123456 }, "invalid_market_id"],
    [{ marketId: "123456", extra: true }, "invalid_json"],
    [null, "invalid_json"],
  ] as const)(
    "rejects an invalid request before payment work",
    async (body, code) => {
      const deps = dependencies();
      const response = await createReportResourceServer(deps)({
        ...request,
        body,
      });
      expect(response.status).toBe(problemSchema.parse(json(response)).status);
      expect(json(response).code).toBe(code);
      expect(deps.verifyPayment).not.toHaveBeenCalled();
      expect(deps.generateReport).not.toHaveBeenCalled();
      expect(deps.settlePayment).not.toHaveBeenCalled();
    },
  );

  it("requires a valid idempotency key before presenting payment terms", async () => {
    const deps = dependencies();
    const handle = createReportResourceServer(deps);
    const invalid = await handle({
      body: request.body,
      idempotencyKey: "short",
    });
    expect(json(invalid).code).toBe("invalid_idempotency_key");
    const unpaid = await handle({
      body: request.body,
      idempotencyKey: request.idempotencyKey,
    });
    expect(unpaid.status).toBe(402);
    expect(unpaid.headers["payment-required"]).toBe("fixture-payment-required");
    expect(json(unpaid).code).toBe("payment_required");
    expect(deps.verifyPayment).not.toHaveBeenCalled();
  });

  it("claims replay protection before verification and provider work", async () => {
    const deps = dependencies();
    const events: string[] = [];
    const originalClaim = deps.replayStore.claim.bind(deps.replayStore);
    vi.spyOn(deps.replayStore, "claim").mockImplementation(async (input) => {
      events.push("claim");
      return originalClaim(input);
    });
    vi.mocked(deps.verifyPayment).mockImplementation(async () => {
      events.push("verify");
      return { ok: true };
    });
    vi.mocked(deps.generateReport).mockImplementation(async () => {
      events.push("provider");
      return { ok: true, report: validReport() };
    });
    await createReportResourceServer(deps)(request);
    expect(events).toEqual(["claim", "verify", "provider"]);
  });

  it("allows only one concurrent worker for the same purchase", async () => {
    let releaseProvider!: () => void;
    let enteredProvider!: () => void;
    const entered = new Promise<void>((resolve) => {
      enteredProvider = resolve;
    });
    const blocked = new Promise<void>((resolve) => {
      releaseProvider = resolve;
    });
    const deps = dependencies({
      generateReport: vi.fn().mockImplementation(async () => {
        enteredProvider();
        await blocked;
        return { ok: true, report: validReport() };
      }),
    });
    const handle = createReportResourceServer(deps);
    const first = handle(request);
    await entered;
    const concurrent = await handle(request);
    expect(concurrent.status).toBe(409);
    expect(json(concurrent).code).toBe("purchase_in_progress");
    expect(concurrent.headers["retry-after"]).toBe("2");
    expect(deps.verifyPayment).toHaveBeenCalledTimes(1);
    expect(deps.generateReport).toHaveBeenCalledTimes(1);
    releaseProvider();
    await expect(first).resolves.toMatchObject({ status: 200 });
  });

  it("cancels an invalid authorization before provider or settlement", async () => {
    const deps = dependencies({
      verifyPayment: vi.fn().mockResolvedValue({ ok: false }),
    });
    const response = await createReportResourceServer(deps)(request);
    expect(response.status).toBe(402);
    expect(json(response).code).toBe("payment_authorization_invalid");
    expect(deps.generateReport).not.toHaveBeenCalled();
    expect(deps.settlePayment).not.toHaveBeenCalled();
    const stored = await deps.replayStore.get(
      derivePurchaseKey(request.idempotencyKey),
      2_000,
    );
    expect(stored?.state).toBe("failed_retryable");
  });

  it("fails closed and releases the claim when verification is unavailable", async () => {
    const deps = dependencies({
      verifyPayment: vi
        .fn()
        .mockRejectedValue(new Error("private facilitator failure")),
    });
    const response = await createReportResourceServer(deps)(request);
    expect(json(response)).toMatchObject({
      code: "internal_error",
      paymentState: "unverified",
    });
    expect(decoder.decode(response.body)).not.toContain("facilitator");
    expect(deps.generateReport).not.toHaveBeenCalled();
    expect(deps.settlePayment).not.toHaveBeenCalled();
    const stored = await deps.replayStore.get(
      derivePurchaseKey(request.idempotencyKey),
      2_000,
    );
    expect(stored?.state).toBe("failed_retryable");
  });

  it("settles the exact bytes delivered and stores the standard receipt", async () => {
    const deps = dependencies();
    let settledBytes: Uint8Array | undefined;
    vi.mocked(deps.settlePayment).mockImplementation(
      async ({ responseBody }) => {
        settledBytes = responseBody.slice();
        return { ok: true, receipt };
      },
    );
    const response = await createReportResourceServer(deps)(request);
    expect(response.status).toBe(200);
    expect(response.headers["payment-response"]).toBe(receipt.header);
    expect(settledBytes).toEqual(response.body);
    expect(reportSchema.parse(json(response))).toEqual(validReport());
    expect(decoder.decode(response.body)).not.toMatch(
      /transaction|payer|success/i,
    );

    const stored = await deps.replayStore.get(
      derivePurchaseKey(request.idempotencyKey),
      2_000,
    );
    expect(stored?.state).toBe("settled");
    expect(stored?.preparedResponse?.body).toEqual(response.body);
    expect(stored?.settlement).toEqual(receipt);
  });

  it("replays exact stored bytes and skips verification, provider, and settlement", async () => {
    const deps = dependencies();
    const handle = createReportResourceServer(deps);
    const first = await handle(request);
    const replay = await handle(request);
    expect(replay).toEqual(first);
    expect(deps.verifyPayment).toHaveBeenCalledTimes(1);
    expect(deps.generateReport).toHaveBeenCalledTimes(1);
    expect(deps.settlePayment).toHaveBeenCalledTimes(1);
  });

  it("rejects a conflicting request before a second verification", async () => {
    const deps = dependencies();
    const handle = createReportResourceServer(deps);
    await handle(request);
    const conflict = await handle({ ...request, body: { marketId: "654321" } });
    expect(conflict.status).toBe(409);
    expect(json(conflict).code).toBe("idempotency_conflict");
    expect(deps.verifyPayment).toHaveBeenCalledTimes(1);
    expect(deps.generateReport).toHaveBeenCalledTimes(1);
    expect(deps.settlePayment).toHaveBeenCalledTimes(1);
  });

  it.each([
    "market_not_found",
    "source_unavailable",
    "unsupported_market_shape",
    "provider_unavailable",
    "provider_timeout",
    "provider_invalid_output",
    "internal_error",
  ] as const)(
    "cancels %s before settlement and permits a safe retry",
    async (code) => {
      const deps = dependencies({
        generateReport: vi.fn().mockResolvedValue({ ok: false, code }),
      });
      const response = await createReportResourceServer(deps)(request);
      expect(json(response).code).toBe(code);
      expect(deps.settlePayment).not.toHaveBeenCalled();
      const stored = await deps.replayStore.get(
        derivePurchaseKey(request.idempotencyKey),
        2_000,
      );
      expect(stored?.state).toBe("failed_retryable");
    },
  );

  it("marks a proven-unconsumed settlement failure retryable", async () => {
    const deps = dependencies({
      settlePayment: vi.fn().mockResolvedValue({
        ok: false,
        outcome: "proven_unconsumed",
      }),
    });
    const response = await createReportResourceServer(deps)(request);
    expect(json(response).code).toBe("settlement_failed_unconsumed");
    const stored = await deps.replayStore.get(
      derivePurchaseKey(request.idempotencyKey),
      2_000,
    );
    expect(stored?.state).toBe("failed_retryable");
  });

  it("blocks retries when settlement outcome is unknown", async () => {
    const deps = dependencies({
      settlePayment: vi
        .fn()
        .mockRejectedValue(new Error("ambiguous transport failure")),
    });
    const handle = createReportResourceServer(deps);
    const first = await handle(request);
    const second = await handle(request);
    expect(json(first).code).toBe("settlement_outcome_unknown");
    expect(json(second).code).toBe("settlement_outcome_unknown");
    expect(deps.verifyPayment).toHaveBeenCalledTimes(1);
    expect(deps.generateReport).toHaveBeenCalledTimes(1);
    expect(deps.settlePayment).toHaveBeenCalledTimes(1);
  });
});
