import type { Hex } from "viem";

import {
  legalReplayTransitions,
  type ClaimInput,
  type ClaimResult,
  type PreparedResponse,
  type ReplayRecord,
  type ReplayStore,
  type SettlementReceipt,
  type TransitionInput,
  type TransitionResult,
} from "./replay-store";

const hashPattern = /^0x[0-9a-f]{64}$/;
const transactionPattern = /^0x[0-9a-fA-F]{64}$/;

function clonePrepared(
  value: PreparedResponse | undefined,
): PreparedResponse | undefined {
  return value ? { body: value.body.slice(), sha256: value.sha256 } : undefined;
}

function cloneSettlement(
  value: SettlementReceipt | undefined,
): SettlementReceipt | undefined {
  return value ? { ...value } : undefined;
}

function cloneRecord(record: ReplayRecord): ReplayRecord {
  return {
    ...record,
    preparedResponse: clonePrepared(record.preparedResponse),
    settlement: cloneSettlement(record.settlement),
  };
}

function assertIdentity(input: ClaimInput) {
  for (const [label, value] of [
    ["purchase key", input.purchaseKey],
    ["credential digest", input.credentialDigest],
    ["request fingerprint", input.requestFingerprint],
  ]) {
    if (!hashPattern.test(value)) throw new TypeError(`Invalid ${label}`);
  }
  if (
    !Number.isSafeInteger(input.nowMs) ||
    !Number.isSafeInteger(input.expiresAtMs)
  ) {
    throw new TypeError("Replay timestamps must be safe integer milliseconds");
  }
  if (input.expiresAtMs <= input.nowMs)
    throw new TypeError("Replay expiry must be in the future");
}

function assertPrepared(value: PreparedResponse) {
  if (!(value.body instanceof Uint8Array) || value.body.length === 0) {
    throw new TypeError("Prepared response body must be non-empty bytes");
  }
  if (!hashPattern.test(value.sha256))
    throw new TypeError("Invalid prepared response digest");
}

function assertSettlement(value: SettlementReceipt) {
  if (
    !value.header ||
    !value.network ||
    !transactionPattern.test(value.transaction)
  ) {
    throw new TypeError("Invalid settlement receipt");
  }
}

function sameIdentity(record: ReplayRecord, input: ClaimInput) {
  return (
    record.purchaseKey === input.purchaseKey &&
    record.credentialDigest === input.credentialDigest &&
    record.requestFingerprint === input.requestFingerprint
  );
}

export class MemoryReplayStore implements ReplayStore {
  readonly adapterKind = "memory-test-only" as const;
  private readonly records = new Map<Hex, ReplayRecord>();
  private readonly credentialOwners = new Map<Hex, Hex>();

  private removeExpired(record: ReplayRecord, nowMs: number) {
    if (record.expiresAtMs > nowMs) return false;
    this.records.delete(record.purchaseKey);
    if (
      this.credentialOwners.get(record.credentialDigest) === record.purchaseKey
    ) {
      this.credentialOwners.delete(record.credentialDigest);
    }
    return true;
  }

  async claim(input: ClaimInput): Promise<ClaimResult> {
    assertIdentity(input);
    const existing = this.records.get(input.purchaseKey);
    if (existing && !this.removeExpired(existing, input.nowMs)) {
      return sameIdentity(existing, input)
        ? { kind: "existing_match", record: cloneRecord(existing) }
        : { kind: "conflict", reason: "purchase_key_mismatch" };
    }

    const ownerKey = this.credentialOwners.get(input.credentialDigest);
    if (ownerKey) {
      const owner = this.records.get(ownerKey);
      if (owner && !this.removeExpired(owner, input.nowMs)) {
        return { kind: "conflict", reason: "credential_reused" };
      }
    }

    const record: ReplayRecord = {
      schemaVersion: "signal402.replay.v1",
      purchaseKey: input.purchaseKey,
      credentialDigest: input.credentialDigest,
      requestFingerprint: input.requestFingerprint,
      state: "verifying",
      version: BigInt(0),
      createdAtMs: input.nowMs,
      updatedAtMs: input.nowMs,
      expiresAtMs: input.expiresAtMs,
    };
    this.records.set(input.purchaseKey, record);
    this.credentialOwners.set(input.credentialDigest, input.purchaseKey);
    return { kind: "claimed", record: cloneRecord(record) };
  }

  async get(purchaseKey: Hex, nowMs: number): Promise<ReplayRecord | null> {
    const record = this.records.get(purchaseKey);
    if (!record || this.removeExpired(record, nowMs)) return null;
    return cloneRecord(record);
  }

  async transition(input: TransitionInput): Promise<TransitionResult> {
    const existing = this.records.get(input.purchaseKey);
    if (!existing || this.removeExpired(existing, input.nowMs))
      return { kind: "not_found" };
    if (
      existing.version !== input.expectedVersion ||
      existing.state !== input.from
    ) {
      return {
        kind: "version_or_state_mismatch",
        record: cloneRecord(existing),
      };
    }
    if (!legalReplayTransitions[input.from].includes(input.to)) {
      throw new TypeError(
        `Illegal replay transition ${input.from} -> ${input.to}`,
      );
    }
    if (
      !Number.isSafeInteger(input.nowMs) ||
      input.nowMs < existing.updatedAtMs
    ) {
      throw new TypeError("Invalid transition timestamp");
    }
    if (input.clearPrepared && input.to !== "verifying") {
      throw new TypeError(
        "Prepared data may only be cleared when retrying verification",
      );
    }
    if (input.preparedResponse) assertPrepared(input.preparedResponse);
    if (input.settlement) assertSettlement(input.settlement);

    const preparedResponse = input.clearPrepared
      ? undefined
      : clonePrepared(input.preparedResponse ?? existing.preparedResponse);
    const settlement = input.clearPrepared
      ? undefined
      : cloneSettlement(input.settlement ?? existing.settlement);

    if (
      ["prepared", "settling", "settled", "outcome_unknown"].includes(
        input.to,
      ) &&
      !preparedResponse
    ) {
      throw new TypeError(
        `Replay state ${input.to} requires prepared response bytes`,
      );
    }
    if (input.to === "settled" && !settlement) {
      throw new TypeError("Settled replay requires a settlement receipt");
    }
    if (input.to !== "settled" && input.settlement) {
      throw new TypeError(
        "Settlement receipt can only be attached to settled state",
      );
    }
    if (
      ["verifying", "processing"].includes(input.to) &&
      (preparedResponse || settlement)
    ) {
      throw new TypeError(
        `Replay state ${input.to} cannot retain prepared or settled data`,
      );
    }

    const next: ReplayRecord = {
      ...existing,
      state: input.to,
      version: existing.version + BigInt(1),
      updatedAtMs: input.nowMs,
      preparedResponse,
      settlement,
    };
    this.records.set(input.purchaseKey, next);
    return { kind: "transitioned", record: cloneRecord(next) };
  }
}

export function assertProductionReplayStore(
  store: ReplayStore,
): asserts store is ReplayStore & { adapterKind: "durable" } {
  if (store.adapterKind !== "durable") {
    throw new Error("Production requires a durable replay-store adapter");
  }
}
