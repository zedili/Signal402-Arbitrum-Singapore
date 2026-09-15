import { sha256, type Hex } from "viem";
import { describe, expect, it } from "vitest";

import {
  assertProductionReplayStore,
  MemoryReplayStore,
} from "./memory-replay-store";
import {
  legalReplayTransitions,
  replayStates,
  type ReplayRecord,
  type ReplayState,
  type ReplayStore,
  type TransitionInput,
} from "./replay-store";

const PURCHASE_KEY = `0x${"1".repeat(64)}` as Hex;
const CREDENTIAL = `0x${"2".repeat(64)}` as Hex;
const FINGERPRINT = `0x${"3".repeat(64)}` as Hex;
const BODY = new TextEncoder().encode('{"fixture":true}');
const PREPARED = { body: BODY, sha256: sha256(BODY) };
const SETTLEMENT = {
  header: "fixture-payment-response",
  network: "eip155:421614",
  transaction: `0x${"4".repeat(64)}` as Hex,
};

function identity(
  overrides: Partial<{
    purchaseKey: Hex;
    credentialDigest: Hex;
    requestFingerprint: Hex;
  }> = {},
) {
  return {
    purchaseKey: PURCHASE_KEY,
    credentialDigest: CREDENTIAL,
    requestFingerprint: FINGERPRINT,
    ...overrides,
  };
}

async function claimed(store: ReplayStore, overrides = {}) {
  const result = await store.claim({
    ...identity(),
    nowMs: 1_000,
    expiresAtMs: 100_000,
    ...overrides,
  });
  if (result.kind !== "claimed")
    throw new Error(`Expected claim, received ${result.kind}`);
  return result.record;
}

async function transition(
  store: ReplayStore,
  record: ReplayRecord,
  to: ReplayState,
  nowMs: number,
) {
  const input: TransitionInput = {
    purchaseKey: record.purchaseKey,
    expectedVersion: record.version,
    from: record.state,
    to,
    nowMs,
    ...(to === "prepared" ? { preparedResponse: PREPARED } : {}),
    ...(to === "settled" ? { settlement: SETTLEMENT } : {}),
    ...(record.state === "failed_retryable" && to === "verifying"
      ? { clearPrepared: true }
      : {}),
  };
  const result = await store.transition(input);
  if (result.kind !== "transitioned")
    throw new Error(`Expected transition, received ${result.kind}`);
  return result.record;
}

async function recordAt(store: ReplayStore, target: ReplayState) {
  let record = await claimed(store);
  let nowMs = 2_000;
  const step = async (to: ReplayState) => {
    record = await transition(store, record, to, nowMs++);
  };
  if (target === "verifying") return record;
  if (target === "failed_retryable") {
    await step("failed_retryable");
    return record;
  }
  await step("processing");
  if (target === "processing") return record;
  await step("prepared");
  if (target === "prepared") return record;
  await step("settling");
  if (target === "settling") return record;
  await step(target);
  return record;
}

describe("MemoryReplayStore conformance", () => {
  it("returns one atomic winner across 16 concurrent claims", async () => {
    const store = new MemoryReplayStore();
    const results = await Promise.all(
      Array.from({ length: 16 }, () =>
        store.claim({ ...identity(), nowMs: 1_000, expiresAtMs: 100_000 }),
      ),
    );
    expect(results.filter((result) => result.kind === "claimed")).toHaveLength(
      1,
    );
    expect(
      results.filter((result) => result.kind === "existing_match"),
    ).toHaveLength(15);
  });

  it("rejects every tuple mismatch before a second claim", async () => {
    const store = new MemoryReplayStore();
    await claimed(store);
    await expect(
      store.claim({
        ...identity({ credentialDigest: `0x${"5".repeat(64)}` }),
        nowMs: 1_001,
        expiresAtMs: 100_000,
      }),
    ).resolves.toEqual({ kind: "conflict", reason: "purchase_key_mismatch" });
    await expect(
      store.claim({
        ...identity({ requestFingerprint: `0x${"6".repeat(64)}` }),
        nowMs: 1_001,
        expiresAtMs: 100_000,
      }),
    ).resolves.toEqual({ kind: "conflict", reason: "purchase_key_mismatch" });
    await expect(
      store.claim({
        ...identity({ purchaseKey: `0x${"7".repeat(64)}` }),
        nowMs: 1_001,
        expiresAtMs: 100_000,
      }),
    ).resolves.toEqual({ kind: "conflict", reason: "credential_reused" });
  });

  it("uses compare-and-set versions so one concurrent transition loses", async () => {
    const store = new MemoryReplayStore();
    const record = await claimed(store);
    const attempt = () =>
      store.transition({
        purchaseKey: record.purchaseKey,
        expectedVersion: record.version,
        from: "verifying",
        to: "processing",
        nowMs: 2_000,
      });
    const attempts = await Promise.all([attempt(), attempt()]);
    expect(
      attempts.filter((result) => result.kind === "transitioned"),
    ).toHaveLength(1);
    expect(
      attempts.filter((result) => result.kind === "version_or_state_mismatch"),
    ).toHaveLength(1);
  });

  it.each(
    replayStates.flatMap((from) =>
      legalReplayTransitions[from].map((to) => [from, to] as const),
    ),
  )("allows legal transition %s -> %s", async (from, to) => {
    const store = new MemoryReplayStore();
    const record = await recordAt(store, from);
    await expect(transition(store, record, to, 50_000)).resolves.toMatchObject({
      state: to,
    });
  });

  it.each(
    replayStates.flatMap((from) =>
      replayStates
        .filter((to) => !legalReplayTransitions[from].includes(to))
        .map((to) => [from, to] as const),
    ),
  )("rejects illegal transition %s -> %s", async (from, to) => {
    const store = new MemoryReplayStore();
    const record = await recordAt(store, from);
    await expect(
      store.transition({
        purchaseKey: record.purchaseKey,
        expectedVersion: record.version,
        from,
        to,
        nowMs: 50_000,
      }),
    ).rejects.toThrow(/Illegal replay transition/);
  });

  it("expires records and releases both uniqueness constraints", async () => {
    const store = new MemoryReplayStore();
    await store.claim({ ...identity(), nowMs: 1_000, expiresAtMs: 2_000 });
    await expect(store.get(PURCHASE_KEY, 2_000)).resolves.toBeNull();
    await expect(
      store.claim({ ...identity(), nowMs: 2_001, expiresAtMs: 3_000 }),
    ).resolves.toMatchObject({
      kind: "claimed",
    });
  });

  it("defensively copies prepared response bytes on write and read", async () => {
    const store = new MemoryReplayStore();
    let record = await recordAt(store, "processing");
    const inputBody = BODY.slice();
    const result = await store.transition({
      purchaseKey: record.purchaseKey,
      expectedVersion: record.version,
      from: "processing",
      to: "prepared",
      nowMs: 50_000,
      preparedResponse: { body: inputBody, sha256: sha256(inputBody) },
    });
    if (result.kind !== "transitioned") throw new Error("Expected transition");
    record = result.record;
    inputBody[0] = 0;
    record.preparedResponse!.body[1] = 0;
    const stored = await store.get(PURCHASE_KEY, 50_001);
    expect(stored?.preparedResponse?.body).toEqual(BODY);
  });

  it("refuses the test-only adapter at a production boundary", () => {
    expect(() => assertProductionReplayStore(new MemoryReplayStore())).toThrow(
      /durable/,
    );
  });
});
