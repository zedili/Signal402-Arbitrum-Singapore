# Durable replay-store decision brief

Status: **pre-event research only; no provider has been selected, provisioned,
connected, or authorized.**

Signal402's planned application idempotency requires one atomic state record
shared across serverless instances. This brief compares the current practical
options and prepares the owner's eventual infrastructure decision. It does not
authorize an account, plan, integration, credential, deployment, or transfer
of report/payment data.

## Required capabilities

The production adapter must provide:

1. atomic first-writer claim for a hashed purchase key;
2. a uniqueness constraint on the payment-credential digest, so the same
   authorization cannot be attached to a second logical purchase;
3. compare-and-set state transitions with a monotonically increasing version;
4. consistent reads for concurrent requests from different Vercel instances;
5. bounded retention and reliable deletion of stored response bytes;
6. encrypted transport, server-only credentials, least-privilege access, and
   no client-side database access;
7. a testable outage mode that fails closed before provider work/settlement;
8. a region and runtime configuration that do not add avoidable latency;
9. enough observability to prove transitions without logging the raw
   `Idempotency-Key`, `PAYMENT-SIGNATURE`, wallet signature, or report body.

An in-memory map, Vercel runtime cache, object/blob store, or browser storage
does not satisfy the shared atomic-state requirement.

## Current options

| Option | Fit | Main advantage | Main limitation | Current disposition |
| --- | --- | --- | --- | --- |
| Neon Postgres through Vercel Marketplace | Strong | Database uniqueness and conditional updates express the state machine directly; serverless HTTP driver; Singapore region; free test tier | More schema/cleanup work and possible cold-start latency | **Recommended for owner review** |
| Official Redis Cloud through Vercel Marketplace | Conditional | Standard Redis API and atomic commands fit a short-lived state record | Marketplace page says persistence is enabled on paid plans; cost and persistence configuration need review | Paid alternative only |
| Upstash Redis through Vercel Marketplace | Conditional/high-risk | Serverless REST, TTL, transactions, and atomic Lua scripts | Current documentation describes eventual consistency and says prior strong-consistency mode was deprecated; cross-request correctness must not rely on a stale replica read | Do not select without a primary-only/atomic proof |
| No external store | Fails requirement | No account, cost, or data processor | Cannot serialize different Vercel instances or recover stored body/receipt after instance loss | Test adapter only; not production-ready |

Evidence reviewed Sep 7, 2026:

- Vercel now connects Redis and Postgres providers through Marketplace and
  injects project environment variables:
  [Redis](https://vercel.com/docs/redis.rsc),
  [Postgres](https://vercel.com/docs/postgres).
- The Neon Vercel integration starts at $0 and supports a serverless driver:
  [Marketplace listing](https://vercel.com/marketplace/neon).
- Neon's current pricing page lists a $0 tier with 0.5 GB per project and
  bounded time-travel/restore; paid usage must still be rechecked at approval:
  [pricing](https://neon.com/pricing).
- Neon exposes a Singapore region and a serverless HTTP path:
  [regional latency matrix](https://neon.com/demos/regional-latency),
  [serverless driver](https://neon.com/docs/serverless/serverless-driver).
- Upstash supports atomic transactions and Lua/key locking, but its consistency
  page describes leader replication with asynchronous replicas and eventual
  consistency:
  [key locking](https://upstash.com/docs/redis/features/key-locking),
  [consistency](https://upstash.com/docs/redis/features/consistency).
- Vercel Functions default to `iad1`; Vercel recommends placing compute near
  the data source, and `sin1` exists:
  [function regions](https://vercel.com/docs/functions/configuring-functions/region),
  [region list](https://vercel.com/docs/regions).

Prices, quotas, terms, region availability, and plan features are mutable.
Reopen the exact provider and Vercel plan pages immediately before asking for
approval. A free tier is not the same as an SLA or production guarantee.

## Recommended bounded design: Neon Postgres

Use a dedicated schema/table, a dedicated least-privilege runtime role, and the
Neon serverless HTTP driver. Do not use a read replica for idempotency. Every
claim or transition is one atomic SQL statement executed against the primary;
the application does not hold a database transaction open across the provider
call or blockchain settlement.

Candidate record (names may change during in-window implementation):

```text
paid_purchase_replays
  purchase_key         bytea primary key
  credential_digest    bytea unique not null
  request_fingerprint  bytea not null
  state                text not null
  version              bigint not null
  response_body        bytea null
  response_body_sha256 bytea null
  settlement_header    text null
  payment_network      text null
  payment_tx_hash      text null
  created_at           timestamptz not null
  updated_at           timestamptz not null
  expires_at           timestamptz not null
```

Constraints must reject unknown states, incorrect digest lengths, a `settled`
row without exact body/digest/receipt, and sensitive raw credential columns.
The settlement header can contain public-chain payer/transaction data and is
still treated as personal/payment metadata. It is server-only and retained for
the shortest proven recovery window.

### Atomic operations

- **Claim:** `INSERT ... ON CONFLICT DO NOTHING RETURNING ...`; a unique
  `credential_digest` prevents the credential being claimed under a different
  purchase key. A returned row means this caller won. No returned row means it
  must perform a fresh primary read and compare the existing tuple; it must not
  continue work based on a pre-insert read.
- **Transition:** `UPDATE ... SET state = ..., version = version + 1 WHERE
  purchase_key = ... AND version = ... AND state = ... RETURNING ...`. Zero
  returned rows means the caller lost the race and must read the authoritative
  state, not continue provider/settlement work.
- **Prepare:** store the exact response bytes and SHA-256 digest before entering
  `settling`; do not return them until the row is `settled`.
- **Settle:** no SQL transaction is held open while the facilitator/blockchain
  runs. The unavoidable settlement-to-record gap remains governed by
  `outcome_unknown` and reconciliation in
  `docs/x402-idempotency-replay-wireframe.md`.
- **Replay:** require matching purchase-key, credential, and request digests;
  return stored exact bytes/header only from `settled`.

SQL parameterization is mandatory. Database errors are mapped to stable public
problem types; raw SQL, connection strings, provider identifiers, or internal
constraint names never appear in responses.

## Retention and deletion

Candidate initial policy for owner review:

- keep an unsettled record until the EIP-3009 `validBefore` value plus a
  15-minute reconciliation grace period;
- keep a settled report/receipt for no more than 24 hours for transport-loss
  recovery, unless testing proves a shorter sufficient window;
- treat an expired row as inaccessible immediately, even before physical
  deletion;
- delete expired rows through a separately authenticated scheduled task and an
  opportunistic bounded delete during normal writes;
- retain only aggregate, non-identifying test metrics after row deletion;
- provide a manual purge command for the event test data and record the purge
  result without printing row contents.

The final duration must reflect actual client retry behavior and provider
terms. Do not describe a database time-travel window as application retention:
backup/restore behavior is a separate provider-level retention boundary and
must be disclosed in the final data-flow review.

## Region and availability boundary

If Neon Singapore is selected, co-locating the paid Node.js function in Vercel
`sin1` is the latency candidate. This is not pre-approved: changing function
region can affect billing, all bundled routes, provider latency, and deployment
behavior. Verify the owner's current Vercel plan and the actual function bundle
before proposing an exact configuration.

No multi-region active writer is required for this testnet Buildathon. Adding
replicas or failover without proving read/write semantics could weaken the
idempotency claim. On database outage, return
`replay_store_unavailable` before provider work or settlement.

## Local implementation before connection

The in-window code can begin behind a `ReplayStore` interface using a local
deterministic test adapter. The production boot path must reject that adapter.
Contract tests define claim, conflict, transition, expiry, replay, outage, and
concurrency semantics independently of the provider.

Connecting the real service is a separate owner-confirmed step. Do not run a
Marketplace install command, create a Neon account/project, pull environment
variables, add a connection string, run a remote migration, change a function
region, or deploy before that approval.

## Approval packet to present

Immediately before requesting authorization, show:

1. provider and exact plan, including current price, quota, overage behavior,
   persistence/backups, and any credit-card requirement;
2. account/team and Vercel project to be linked;
3. selected region and whether Vercel function-region settings will change;
4. exact table schema, stored fields, encryption, 24-hour-or-shorter TTL,
   backup/time-travel retention, and deletion process;
5. environment-variable names and which Vercel environments receive them,
   without exposing values;
6. provider terms/privacy links and data-processing boundary;
7. migration and rollback commands, estimated cost, and outage behavior;
8. local concurrency/security test results;
9. the precise external actions approval authorizes.

Owner approval should be scoped separately for provisioning/linking, remote
migration, production secret configuration, function-region change, and
deployment if those actions do not occur in one reviewed operation.
