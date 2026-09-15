import { sha256, type Hex } from "viem";
import { describe, expect, it, vi } from "vitest";

import { MemoryReplayStore } from "./memory-replay-store";
import {
  beginPurchase,
  markPrepared,
  markProcessing,
  markSettled,
  markSettlementFailure,
  markSettling,
  reconcileUnknown,
} from "./purchase-state-machine";
import type { ClaimInput, ReplayRecord, ReplayStore } from "./replay-store";

const input = {
  purchaseKey: `0x${"1".repeat(64)}` as Hex,
  credentialDigest: `0x${"2".repeat(64)}` as Hex,
  requestFingerprint: `0x${"3".repeat(64)}` as Hex,
  nowMs: 1_000,
  expiresAtMs: 100_000,
} satisfies ClaimInput;
const BODY = new TextEncoder().encode('{"report":"fixture"}');
const SETTLEMENT = {
  header: "fixture-payment-response",
  network: "eip155:421614",
  transaction: `0x${"4".repeat(64)}` as Hex,
};

async function start(store = new MemoryReplayStore()) {
  const result = await beginPurchase(store, input);
  if (result.kind !== "proceed")
    throw new Error(`Expected proceed, received ${result.kind}`);
  return { store, record: result.record };
}

async function advanceToSettling(store: ReplayStore, initial: ReplayRecord) {
  const processing = await markProcessing(store, initial, 2_000);
  if (!processing.ok) throw new Error(processing.code);
  const prepared = await markPrepared(store, processing.record, BODY, 3_000);
  if (!prepared.ok) throw new Error(prepared.code);
  const settling = await markSettling(store, prepared.record, 4_000);
  if (!settling.ok) throw new Error(settling.code);
  return settling.record;
}

describe("purchase state machine", () => {
  it("claims once and reports a matching concurrent attempt as in progress", async () => {
    const store = new MemoryReplayStore();
    expect((await beginPurchase(store, input)).kind).toBe("proceed");
    await expect(
      beginPurchase(store, { ...input, nowMs: 1_001 }),
    ).resolves.toEqual({
      kind: "problem",
      code: "purchase_in_progress",
    });
  });

  it("maps every identity mismatch to idempotency_conflict", async () => {
    const store = new MemoryReplayStore();
    await beginPurchase(store, input);
    await expect(
      beginPurchase(store, {
        ...input,
        credentialDigest: `0x${"5".repeat(64)}`,
        nowMs: 1_001,
      }),
    ).resolves.toEqual({ kind: "problem", code: "idempotency_conflict" });
    await expect(
      beginPurchase(store, {
        ...input,
        purchaseKey: `0x${"6".repeat(64)}`,
        nowMs: 1_001,
      }),
    ).resolves.toEqual({ kind: "problem", code: "idempotency_conflict" });
  });

  it("replays exact stored bytes and the standard receipt without work", async () => {
    const { store, record } = await start();
    const settling = await advanceToSettling(store, record);
    const settled = await markSettled(store, settling, SETTLEMENT, 5_000);
    expect(settled.ok).toBe(true);
    const providerWork = vi.fn();
    const settlementWork = vi.fn();
    const replay = await beginPurchase(store, { ...input, nowMs: 6_000 });
    expect(replay).toEqual({
      kind: "replay",
      body: BODY,
      settlementHeader: SETTLEMENT.header,
    });
    expect(providerWork).not.toHaveBeenCalled();
    expect(settlementWork).not.toHaveBeenCalled();
  });

  it("freezes response bytes before settlement", async () => {
    const { store, record } = await start();
    const processing = await markProcessing(store, record, 2_000);
    if (!processing.ok) throw new Error(processing.code);
    const mutable = BODY.slice();
    const prepared = await markPrepared(
      store,
      processing.record,
      mutable,
      3_000,
    );
    mutable[0] = 0;
    expect(prepared.ok && prepared.record.preparedResponse?.body).toEqual(BODY);
    expect(prepared.ok && prepared.record.preparedResponse?.sha256).toBe(
      sha256(BODY),
    );
  });

  it("moves ambiguous settlement to outcome_unknown and blocks a new attempt", async () => {
    const { store, record } = await start();
    const settling = await advanceToSettling(store, record);
    const unknown = await markSettlementFailure(
      store,
      settling,
      "unknown",
      5_000,
    );
    if (!unknown.ok) throw new Error(unknown.code);
    await expect(
      beginPurchase(store, { ...input, nowMs: 6_000 }),
    ).resolves.toEqual({
      kind: "problem",
      code: "settlement_outcome_unknown",
    });
  });

  it("reconciles an unknown result without creating another authorization", async () => {
    const { store, record } = await start();
    const settling = await advanceToSettling(store, record);
    const unknown = await markSettlementFailure(
      store,
      settling,
      "unknown",
      5_000,
    );
    if (!unknown.ok) throw new Error(unknown.code);
    const reconciled = await reconcileUnknown(
      store,
      unknown.record,
      { kind: "settled", settlement: SETTLEMENT },
      6_000,
    );
    expect(reconciled.ok && reconciled.record.state).toBe("settled");
    await expect(
      beginPurchase(store, { ...input, nowMs: 7_000 }),
    ).resolves.toMatchObject({ kind: "replay" });
  });

  it("retries a proven-unconsumed tuple with one compare-and-set winner", async () => {
    const { store, record } = await start();
    const failed = await store.transition({
      purchaseKey: record.purchaseKey,
      expectedVersion: record.version,
      from: "verifying",
      to: "failed_retryable",
      nowMs: 2_000,
    });
    if (failed.kind !== "transitioned") throw new Error(failed.kind);
    const results = await Promise.all(
      Array.from({ length: 16 }, () =>
        beginPurchase(store, { ...input, nowMs: 3_000 }),
      ),
    );
    expect(results.filter((result) => result.kind === "proceed")).toHaveLength(
      1,
    );
    expect(
      results.filter(
        (result) =>
          result.kind === "problem" && result.code === "purchase_in_progress",
      ),
    ).toHaveLength(15);
  });

  it("fails closed when the replay store is unavailable", async () => {
    const outage: ReplayStore = {
      adapterKind: "durable",
      claim: vi.fn().mockRejectedValue(new Error("private database error")),
      get: vi.fn().mockRejectedValue(new Error("private database error")),
      transition: vi
        .fn()
        .mockRejectedValue(new Error("private database error")),
    };
    const result = await beginPurchase(outage, input);
    expect(result).toEqual({
      kind: "problem",
      code: "replay_store_unavailable",
    });
    expect(JSON.stringify(result)).not.toContain("database");
  });

  it("rejects a corrupt stored body instead of synthesizing success", async () => {
    const corruptRecord: ReplayRecord = {
      schemaVersion: "signal402.replay.v1",
      purchaseKey: input.purchaseKey,
      credentialDigest: input.credentialDigest,
      requestFingerprint: input.requestFingerprint,
      state: "settled",
      version: BigInt(5),
      createdAtMs: 1_000,
      updatedAtMs: 5_000,
      expiresAtMs: input.expiresAtMs,
      preparedResponse: { body: BODY, sha256: `0x${"0".repeat(64)}` },
      settlement: SETTLEMENT,
    };
    const corruptStore: ReplayStore = {
      adapterKind: "durable",
      claim: vi
        .fn()
        .mockResolvedValue({ kind: "existing_match", record: corruptRecord }),
      get: vi.fn(),
      transition: vi.fn(),
    };
    await expect(beginPurchase(corruptStore, input)).resolves.toEqual({
      kind: "problem",
      code: "stored_receipt_invalid",
    });
  });
});
