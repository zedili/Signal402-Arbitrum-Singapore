import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sha256, type Hex } from "viem";
import { describe, expect, it } from "vitest";

import { assertProductionReplayStore } from "./memory-replay-store";
import { MemoryReplayStore } from "./memory-replay-store";
import {
  PostgresReplayStore,
  postgresReplaySql,
  type PostgresQueryExecutor,
} from "./postgres-replay-store";
import type { TransitionInput } from "./replay-store";
import type { ReplayRecord } from "./replay-store";

const PURCHASE_KEY = `0x${"1".repeat(64)}` as Hex;
const CREDENTIAL = `0x${"2".repeat(64)}` as Hex;
const FINGERPRINT = `0x${"3".repeat(64)}` as Hex;
const TRANSACTION = `0x${"4".repeat(64)}` as Hex;
const BODY = new TextEncoder().encode('{"fixture":true}');

function bytea(hex: Hex | Uint8Array) {
  const value =
    typeof hex === "string" ? hex.slice(2) : Buffer.from(hex).toString("hex");
  return `\\x${value}`;
}

function replayRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    schema_version: "signal402.replay.v1",
    purchase_key: bytea(PURCHASE_KEY),
    credential_digest: bytea(CREDENTIAL),
    request_fingerprint: bytea(FINGERPRINT),
    state: "verifying",
    version: "0",
    response_body: null,
    response_body_sha256: null,
    settlement_header: null,
    payment_network: null,
    payment_tx_hash: null,
    created_at: "1970-01-01T00:00:01.000Z",
    updated_at: "1970-01-01T00:00:01.000Z",
    expires_at: "1970-01-01T00:01:40.000Z",
    ...overrides,
  };
}

class StubExecutor implements PostgresQueryExecutor {
  readonly calls: Array<{ text: string; values: readonly unknown[] }> = [];
  private readonly responses: Array<readonly Record<string, unknown>[] | Error>;

  constructor(...responses: Array<readonly Record<string, unknown>[] | Error>) {
    this.responses = [...responses];
  }

  async query<Row extends Record<string, unknown>>(
    text: string,
    values: readonly unknown[],
  ): Promise<readonly Row[]> {
    this.calls.push({ text, values: [...values] });
    const response = this.responses.shift();
    if (response instanceof Error) throw response;
    if (!response) throw new Error("Missing stub response");
    return response as readonly Row[];
  }
}

function fromBytea(value: unknown) {
  if (typeof value !== "string" || !/^\\x[0-9a-f]+$/i.test(value)) {
    throw new TypeError("Expected bytea fixture");
  }
  return `0x${value.slice(2).toLowerCase()}` as Hex;
}

function rowFromRecord(record: ReplayRecord, resultKind?: string) {
  return {
    ...(resultKind ? { result_kind: resultKind } : {}),
    schema_version: record.schemaVersion,
    purchase_key: bytea(record.purchaseKey),
    credential_digest: bytea(record.credentialDigest),
    request_fingerprint: bytea(record.requestFingerprint),
    state: record.state,
    version: record.version.toString(),
    response_body: record.preparedResponse
      ? bytea(record.preparedResponse.body)
      : null,
    response_body_sha256: record.preparedResponse
      ? bytea(record.preparedResponse.sha256)
      : null,
    settlement_header: record.settlement?.header ?? null,
    payment_network: record.settlement?.network ?? null,
    payment_tx_hash: record.settlement
      ? bytea(record.settlement.transaction)
      : null,
    created_at: new Date(record.createdAtMs).toISOString(),
    updated_at: new Date(record.updatedAtMs).toISOString(),
    expires_at: new Date(record.expiresAtMs).toISOString(),
  };
}

class MemoryPostgresExecutor implements PostgresQueryExecutor {
  private readonly store = new MemoryReplayStore();

  async query<Row extends Record<string, unknown>>(
    text: string,
    values: readonly unknown[],
  ): Promise<readonly Row[]> {
    if (text.includes("signal402.claim_purchase")) {
      const result = await this.store.claim({
        purchaseKey: fromBytea(values[0]),
        credentialDigest: fromBytea(values[1]),
        requestFingerprint: fromBytea(values[2]),
        nowMs: Date.parse(String(values[3])),
        expiresAtMs: Date.parse(String(values[4])),
      });
      return [
        result.kind === "conflict"
          ? { result_kind: result.reason }
          : rowFromRecord(result.record, result.kind),
      ] as unknown as Row[];
    }

    if (text.trimStart().startsWith("update")) {
      const preparedBody = values[6]
        ? Uint8Array.from(Buffer.from(String(values[6]).slice(2), "hex"))
        : undefined;
      const preparedHash = values[7] ? fromBytea(values[7]) : undefined;
      const result = await this.store.transition({
        purchaseKey: fromBytea(values[0]),
        expectedVersion: BigInt(String(values[1])),
        from: String(values[2]) as TransitionInput["from"],
        to: String(values[3]) as TransitionInput["to"],
        nowMs: Date.parse(String(values[4])),
        clearPrepared: Boolean(values[5]),
        ...(preparedBody && preparedHash
          ? { preparedResponse: { body: preparedBody, sha256: preparedHash } }
          : {}),
        ...(values[8] && values[9] && values[10]
          ? {
              settlement: {
                header: String(values[8]),
                network: String(values[9]),
                transaction: fromBytea(values[10]),
              },
            }
          : {}),
      });
      return (result.kind === "transitioned"
        ? [rowFromRecord(result.record)]
        : []) as unknown as Row[];
    }

    const record = await this.store.get(
      fromBytea(values[0]),
      Date.parse(String(values[1])),
    );
    return (record ? [rowFromRecord(record)] : []) as unknown as Row[];
  }
}

function claimInput() {
  return {
    purchaseKey: PURCHASE_KEY,
    credentialDigest: CREDENTIAL,
    requestFingerprint: FINGERPRINT,
    nowMs: 1_000,
    expiresAtMs: 100_000,
  };
}

describe("PostgresReplayStore", () => {
  it("maps an atomic claim and sends only parameterized digests", async () => {
    const executor = new StubExecutor([
      { result_kind: "claimed", ...replayRow() },
    ]);
    const store = new PostgresReplayStore(executor);
    await expect(store.claim(claimInput())).resolves.toMatchObject({
      kind: "claimed",
      record: {
        purchaseKey: PURCHASE_KEY,
        credentialDigest: CREDENTIAL,
        requestFingerprint: FINGERPRINT,
        state: "verifying",
        version: BigInt(0),
      },
    });
    expect(executor.calls).toHaveLength(1);
    expect(executor.calls[0].text).toContain("signal402.claim_purchase");
    expect(executor.calls[0].text).not.toContain(PURCHASE_KEY.slice(2));
    expect(executor.calls[0].values).toEqual([
      bytea(PURCHASE_KEY),
      bytea(CREDENTIAL),
      bytea(FINGERPRINT),
      "1970-01-01T00:00:01.000Z",
      "1970-01-01T00:01:40.000Z",
    ]);
  });

  it.each([
    ["purchase_key_mismatch", "purchase_key_mismatch"],
    ["credential_reused", "credential_reused"],
  ] as const)(
    "maps the %s database decision without exposing a row",
    async (kind, reason) => {
      const store = new PostgresReplayStore(
        new StubExecutor([{ result_kind: kind }]),
      );
      await expect(store.claim(claimInput())).resolves.toEqual({
        kind: "conflict",
        reason,
      });
    },
  );

  it("decodes exact prepared bytes and a complete settled receipt", async () => {
    const executor = new StubExecutor([
      replayRow({
        state: "settled",
        version: "5",
        response_body: bytea(BODY),
        response_body_sha256: bytea(sha256(BODY)),
        settlement_header: "fixture-payment-response",
        payment_network: "eip155:421614",
        payment_tx_hash: bytea(TRANSACTION),
      }),
    ]);
    const stored = await new PostgresReplayStore(executor).get(
      PURCHASE_KEY,
      2_000,
    );
    expect(stored).toMatchObject({
      state: "settled",
      version: BigInt(5),
      settlement: {
        header: "fixture-payment-response",
        network: "eip155:421614",
        transaction: TRANSACTION,
      },
    });
    expect(stored?.preparedResponse?.body).toEqual(BODY);
  });

  it("rejects corrupt persisted response bytes", async () => {
    const store = new PostgresReplayStore(
      new StubExecutor([
        replayRow({
          state: "prepared",
          response_body: bytea(BODY),
          response_body_sha256: bytea(`0x${"0".repeat(64)}` as Hex),
        }),
      ]),
    );
    await expect(store.get(PURCHASE_KEY, 2_000)).rejects.toThrow(
      /digest mismatch/,
    );
  });

  it("performs a parameterized compare-and-set transition", async () => {
    const executor = new StubExecutor([
      replayRow({
        state: "prepared",
        version: "2",
        response_body: bytea(BODY),
        response_body_sha256: bytea(sha256(BODY)),
        updated_at: "1970-01-01T00:00:03.000Z",
      }),
    ]);
    const store = new PostgresReplayStore(executor);
    const input: TransitionInput = {
      purchaseKey: PURCHASE_KEY,
      expectedVersion: BigInt(1),
      from: "processing",
      to: "prepared",
      nowMs: 3_000,
      preparedResponse: { body: BODY, sha256: sha256(BODY) },
    };
    await expect(store.transition(input)).resolves.toMatchObject({
      kind: "transitioned",
      record: { state: "prepared", version: BigInt(2) },
    });
    expect(executor.calls[0].text).toContain("version = version + 1");
    expect(executor.calls[0].text).toContain("version = $2::bigint");
    expect(executor.calls[0].values.slice(0, 8)).toEqual([
      bytea(PURCHASE_KEY),
      "1",
      "processing",
      "prepared",
      "1970-01-01T00:00:03.000Z",
      false,
      bytea(BODY),
      bytea(sha256(BODY)),
    ]);
  });

  it("returns the authoritative row when compare-and-set loses", async () => {
    const executor = new StubExecutor(
      [],
      [replayRow({ state: "processing", version: "1" })],
    );
    const store = new PostgresReplayStore(executor);
    await expect(
      store.transition({
        purchaseKey: PURCHASE_KEY,
        expectedVersion: BigInt(0),
        from: "verifying",
        to: "processing",
        nowMs: 2_000,
      }),
    ).resolves.toMatchObject({
      kind: "version_or_state_mismatch",
      record: { state: "processing", version: BigInt(1) },
    });
    expect(executor.calls).toHaveLength(2);
  });

  it("returns not_found when a transition target is absent or expired", async () => {
    const executor = new StubExecutor([], []);
    const store = new PostgresReplayStore(executor);
    await expect(
      store.transition({
        purchaseKey: PURCHASE_KEY,
        expectedVersion: BigInt(0),
        from: "verifying",
        to: "processing",
        nowMs: 2_000,
      }),
    ).resolves.toEqual({ kind: "not_found" });
  });

  it("rejects illegal transitions before any query", async () => {
    const executor = new StubExecutor();
    const store = new PostgresReplayStore(executor);
    await expect(
      store.transition({
        purchaseKey: PURCHASE_KEY,
        expectedVersion: BigInt(0),
        from: "verifying",
        to: "settled",
        nowMs: 2_000,
      }),
    ).rejects.toThrow(/Illegal replay transition/);
    expect(executor.calls).toHaveLength(0);
  });

  it("propagates an opaque database outage for the resource layer to redact", async () => {
    const store = new PostgresReplayStore(
      new StubExecutor(new Error("private database hostname")),
    );
    await expect(store.claim(claimInput())).rejects.toThrow(
      "private database hostname",
    );
  });

  it("is accepted at the durable production boundary", () => {
    const store = new PostgresReplayStore(new StubExecutor());
    expect(() => assertProductionReplayStore(store)).not.toThrow();
  });
});

describe("PostgresReplayStore local conformance", () => {
  it("has one winner across 16 concurrent adapter claims", async () => {
    const store = new PostgresReplayStore(new MemoryPostgresExecutor());
    const results = await Promise.all(
      Array.from({ length: 16 }, () => store.claim(claimInput())),
    );
    expect(results.filter((result) => result.kind === "claimed")).toHaveLength(
      1,
    );
    expect(
      results.filter((result) => result.kind === "existing_match"),
    ).toHaveLength(15);
  });

  it("preserves both uniqueness conflicts through the adapter", async () => {
    const store = new PostgresReplayStore(new MemoryPostgresExecutor());
    await store.claim(claimInput());
    await expect(
      store.claim({
        ...claimInput(),
        credentialDigest: `0x${"5".repeat(64)}`,
        nowMs: 1_001,
      }),
    ).resolves.toEqual({
      kind: "conflict",
      reason: "purchase_key_mismatch",
    });
    await expect(
      store.claim({
        ...claimInput(),
        purchaseKey: `0x${"6".repeat(64)}`,
        nowMs: 1_001,
      }),
    ).resolves.toEqual({ kind: "conflict", reason: "credential_reused" });
  });

  it("has one compare-and-set winner through the adapter", async () => {
    const store = new PostgresReplayStore(new MemoryPostgresExecutor());
    const claimed = await store.claim(claimInput());
    if (claimed.kind !== "claimed") throw new Error(claimed.kind);
    const attempt = () =>
      store.transition({
        purchaseKey: PURCHASE_KEY,
        expectedVersion: claimed.record.version,
        from: "verifying",
        to: "processing",
        nowMs: 2_000,
      });
    const results = await Promise.all([attempt(), attempt()]);
    expect(
      results.filter((result) => result.kind === "transitioned"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.kind === "version_or_state_mismatch"),
    ).toHaveLength(1);
  });

  it("releases both uniqueness keys at expiry", async () => {
    const store = new PostgresReplayStore(new MemoryPostgresExecutor());
    await store.claim({ ...claimInput(), expiresAtMs: 2_000 });
    await expect(store.get(PURCHASE_KEY, 2_000)).resolves.toBeNull();
    await expect(
      store.claim({ ...claimInput(), nowMs: 2_001, expiresAtMs: 3_000 }),
    ).resolves.toMatchObject({ kind: "claimed" });
  });
});

describe("Postgres replay migration", () => {
  const migration = readFileSync(
    join(process.cwd(), "db/migrations/001_signal402_purchases.sql"),
    "utf8",
  );

  it("binds both identities, CAS state, expiry, and settled payload integrity", () => {
    expect(migration).toMatch(/purchase_key bytea primary key/i);
    expect(migration).toMatch(/credential_digest bytea not null unique/i);
    expect(migration).toMatch(/request_fingerprint bytea not null/i);
    expect(migration).toMatch(/expires_at timestamptz not null/i);
    expect(migration).toContain("paid_purchase_state_payload");
    expect(postgresReplaySql.transition).toContain("version = version + 1");
  });

  it("serializes claim races and strips public privileges", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("on conflict do nothing");
    expect(migration).toMatch(/revoke all on schema signal402 from public/i);
    expect(migration).toMatch(/revoke all on table .* from public/i);
    expect(migration).not.toMatch(
      /^\s*(idempotency_key|payment_signature)\s/im,
    );
    expect(migration).not.toMatch(
      /\b(drop|truncate)\s+(table\s+)?signal402\b/i,
    );
  });
});
