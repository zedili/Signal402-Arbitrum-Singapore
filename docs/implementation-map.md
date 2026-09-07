# Signal402 in-window implementation map

Status: **pre-event planning only. No file or module listed below exists unless
it is already present in the baseline. Do not implement these changes before
the guarded kickoff in `docs/sep14-kickoff-runbook.md`.**

This map turns the Buildathon specifications into small, reviewable commit
slices. It is intentionally file-specific so the official-window work can start
from tests and stable boundaries rather than a large rewrite of the current
route.

## Baseline coupling to remove safely

The current paid path is concentrated in three places:

| Baseline file | Current responsibility | In-window risk |
| --- | --- | --- |
| `front-end/app/api/analysis/route.ts` | request parsing, market fetch, prompt construction, DeepSeek call, model parsing, report response | invalid input can be discovered inside the paid handler; error classes and response bytes are hard to test independently |
| `front-end/src/lib/x402/server.ts` | x402 route declaration, facilitator initialization, Next adapter, verification, cancellation, settlement, error mapping | global singleton and route-specific wrapper make durable replay/concurrency and fault injection difficult |
| `front-end/src/lib/x402/protocol.test.ts` | three baseline x402 integration cases | proves the old happy/failure paths only; it does not cover the planned API schema, replay store, concurrency, proof, or reference-client policy |

`front-end/src/lib/polymarket.ts` also silently supplies Yes/No labels and
probabilities when the upstream shape is incomplete. The v1 report path must
use a strict adapter that rejects unsupported market shapes; changing the
legacy list UI is not required to establish that boundary.

## Proposed module boundaries

Names may change if the in-window compiler or test baseline exposes a conflict,
but responsibilities must not be recombined without recording why.

### Pure contract layer

Planned files:

```text
front-end/src/lib/signal402/report-contract.ts
front-end/src/lib/signal402/problem-contract.ts
front-end/src/lib/signal402/request-identity.ts
front-end/src/lib/signal402/canonical-proof.ts
front-end/src/lib/signal402/registry-proof.ts
```

- `report-contract.ts` owns strict Zod request, source snapshot, analysis,
  generation, proof, payment-context, attestation, and success-envelope schemas.
- `problem-contract.ts` owns the closed `code`, `action`, and `paymentState`
  unions plus HTTP/media-type mapping. Human `detail` is never a control input.
- `request-identity.ts` owns market-ID normalization, exact UTF-8 request bytes,
  and the domain-separated request fingerprint.
- `canonical-proof.ts` owns RFC 8785 JCS input selection, canonical bytes,
  domain separation, `marketIdHash`, and `contentHash`.
- `registry-proof.ts` owns ABI encoding/decoding, runtime-code hash comparison,
  event/ID derivation, and readback validation. It performs no wallet action.

These modules must be deterministic, environment-independent, and importable by
both route tests and the reference client. They must not import `server-only`,
Next.js request objects, wallets, RPC transports, environment variables, or
provider clients.

### Analysis service layer

Planned files:

```text
front-end/src/lib/signal402/market-snapshot.ts
front-end/src/lib/signal402/analysis-provider.ts
front-end/src/lib/signal402/report-service.ts
```

- `market-snapshot.ts` converts a Polymarket response into the strict source
  shape or a typed `market_not_found`, `source_unavailable`, or
  `unsupported_market_shape` result. It never inserts fallback outcome labels.
- `analysis-provider.ts` contains the DeepSeek transport adapter and parses the
  provider output into the internal analysis schema. Tests inject a fake; the
  real adapter alone reads `DEEPSEEK_API_KEY`.
- `report-service.ts` composes the strict snapshot and provider interfaces,
  returns a typed result, and builds the final report before settlement. It
  accepts a clock and ID generator so fixtures stay deterministic.

No layer below the route returns `NextResponse`. Provider messages, prompts,
raw model output, API keys, and upstream bodies are never copied into public
problems or evidence artifacts.

### Payment and replay layer

Planned files:

```text
front-end/src/lib/x402/payment-config.ts
front-end/src/lib/x402/http-adapter.ts
front-end/src/lib/x402/replay-store.ts
front-end/src/lib/x402/memory-replay-store.ts
front-end/src/lib/x402/postgres-replay-store.ts
front-end/src/lib/x402/purchase-state-machine.ts
front-end/src/lib/x402/report-resource-server.ts
front-end/db/migrations/001_signal402_purchases.sql
```

- `payment-config.ts` exposes one validated configuration tuple for route,
  network, asset, atomic amount, recipient, timeout, and facilitator URL.
- `http-adapter.ts` contains the generic Next/x402 request and response adapters
  now embedded in `server.ts`.
- `replay-store.ts` is the atomic compare-and-set interface and serialized row
  shape from `docs/x402-idempotency-replay-wireframe.md`.
- `memory-replay-store.ts` is deterministic and test-only. Production startup
  must fail closed if this adapter is selected.
- `postgres-replay-store.ts` uses parameterized operations and transactions for
  the owner-approved durable provider. It stores digests and exact encrypted-or
  otherwise approved response/receipt bytes, never raw payment signatures or
  idempotency keys.
- `purchase-state-machine.ts` owns claim/replay/conflict/in-progress/settled/
  unknown transitions and reconciliation decisions; it receives provider and
  settlement functions as dependencies for fault injection.
- `report-resource-server.ts` is the sole x402 declaration for
  `POST /api/v1/reports` and joins the durable claim, verification, report work,
  byte capture, settlement, and completion in this exact order: durable tuple
  claim, x402 verification, report work, byte capture, settlement, then durable
  completion.
- the migration includes constraints, indexes, retention timestamps, and a
  schema version. It is reviewed locally before any external database action.

Production store selection, provisioning, region, data fields, TTL, migration,
secret creation, and deployment remain owner-gated. The initial implementation
uses the memory adapter only in tests and cannot claim paid production
readiness.

### HTTP and UI layer

Planned files:

```text
front-end/app/api/v1/reports/route.ts
front-end/app/api/analysis/route.ts
front-end/src/components/AIPredictionCard.tsx
front-end/src/components/ReportProofPanel.tsx
front-end/src/components/AttestationAction.tsx
```

- the v1 route performs strict byte/body validation before invoking x402, then
  delegates to the report resource server and adds no alternate settlement
  logic;
- the legacy route becomes either an unpaid typed retirement response or a
  separately tested adapter that delegates to the same canonical paid path. It
  must not register a second x402 resource;
- the existing card consumes the shared v1 schema and displays the standard
  receipt separately from the server body;
- the proof panel recomputes and labels proof fields without claiming
  attestation;
- the optional attestation action follows the preflight and one-transaction
  state machine in `docs/registry-attestation-wireframe.md`.

No trading, custody, mainnet, automatic attestation, or automatic fresh payment
is introduced.

### Reference client and evidence layer

Planned files:

```text
front-end/tools/signal402-client/src/index.ts
front-end/tools/signal402-client/src/policy.ts
front-end/tools/signal402-client/src/state-machine.ts
front-end/tools/signal402-client/src/output.ts
front-end/tools/signal402-client/tsconfig.json
front-end/tools/signal402-client/README.md
front-end/evaluation/fixtures/
front-end/evaluation/faults/
front-end/evaluation/run.ts
evidence/buildathon/.gitkeep
```

The tool uses a separate TypeScript build configuration and existing locked
dependencies where possible. Adding a runtime/compiler dependency requires the
normal license and vulnerability review. The canonical CLI remains
inspect-only unless an owner-approved signer adapter is injected, as defined in
`docs/reference-client-wireframe.md`.

`front-end/evaluation` owns deterministic fixtures and fault scripts.
`evidence/buildathon` receives only reviewed manifests, aggregate JSON, public
transaction references, and redacted transcripts. Raw signatures,
idempotency keys, provider responses, full prompts, secrets, cookies, database
URLs, and personal data stay outside the repository.

## Ordered commit slices

Each slice must leave the repository testable. A later slice cannot be used to
hide a failure introduced by an earlier one.

| Slice | Scope | Required proof before next slice |
| ---: | --- | --- |
| 0 | kickoff record only | portal-open evidence, final pre-event HEAD, Terms hash/state, clean baseline commands |
| 1 | strict request/problem/report schemas | golden and rejection fixtures; typecheck/build green |
| 2 | canonical request/content proof | published cross-runtime vectors; byte and hash mutation tests |
| 3 | strict market snapshot and injected report service | no fallback Yes/No; provider/source fault matrix; zero settlement calls in service tests |
| 4 | replay-store interface and memory conformance suite | every legal/illegal transition; 16-way concurrency; mismatches fail before work |
| 5 | canonical v1 x402 resource using test store | one paid surface; exact response bytes; settlement/cancellation/problem mapping |
| 6 | legacy-route retirement or delegation | route inventory and tests prove no second settlement implementation |
| 7 | owner-approved Postgres adapter and migration | local conformance first, then approved remote atomicity/failure tests and TTL record |
| 8 | reference client inspect/purchase state machine | zero/one signer-count proofs, frozen retry bytes, redaction and exit-code suite |
| 9 | UI proof panel and optional attestation flow | code-hash/simulation/event/ID/readback fixtures; wallet rejection and no-resubmit tests |
| 10 | evaluation harness and reviewed aggregate artifacts | denominators, failed runs, environment/dependency manifest, threshold results |
| 11 | provenance-clean visual refresh and judge flow | asset ledger/hashes, responsive screenshots, accessibility and full demo smoke |
| 12 | deployment and owner-approved testnet evidence | deployment ID/commit, live 402, one payment, optional one attestation, independent receipt checks |
| 13 | final README, deck, videos, submission copy | `claim-ledger.json`, `docs/final-demo-plan.md` acceptance audit, field map reconciliation, secret scan, clean checkout verification |

Slices may be split further. Do not squash or rewrite the evidence history. Log
every substantive commit and its tests in `docs/progress-during-buildathon.md`.

## Test file map

The in-window suite should add focused files instead of expanding the three
baseline cases into one opaque test:

```text
front-end/src/lib/signal402/report-contract.test.ts
front-end/src/lib/signal402/problem-contract.test.ts
front-end/src/lib/signal402/request-identity.test.ts
front-end/src/lib/signal402/canonical-proof.test.ts
front-end/src/lib/signal402/market-snapshot.test.ts
front-end/src/lib/signal402/report-service.test.ts
front-end/src/lib/x402/replay-store.conformance.test.ts
front-end/src/lib/x402/purchase-state-machine.test.ts
front-end/src/lib/x402/report-resource-server.test.ts
front-end/app/api/v1/reports/route.test.ts
front-end/tools/signal402-client/src/policy.test.ts
front-end/tools/signal402-client/src/state-machine.test.ts
front-end/src/lib/signal402/registry-proof.test.ts
```

Keep `src/lib/x402/protocol.test.ts` unchanged until the kickoff baseline is
recorded. Thereafter label its three cases as pre-event regression coverage;
never add them to the in-window test count.

## Stop and escalation points

Stop local work and request owner confirmation before:

- selecting or connecting the durable store, applying a migration, or setting a
  production database secret;
- connecting/importing/funding a signer or sending a payment authorization;
- signing or broadcasting the optional registry transaction;
- installing a dependency whose license, integrity, or vulnerability treatment
  changes the approved risk posture;
- any public push, deployment, release, page edit, track choice, Terms
  acceptance, organizer contact, or final submission.

If a slice reveals that the pinned x402 SDK, deployed facilitator, registry,
Next.js runtime, or storage provider cannot satisfy an invariant, record the
contradiction and revise the specification honestly. Do not weaken the final
claim while keeping language that implies the stronger behavior.
