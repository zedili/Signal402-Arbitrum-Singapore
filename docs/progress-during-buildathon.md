# Signal402 progress during the Buildathon

Status: **Buildathon window verified open — engineering baseline in progress.**

This ledger must contain only work performed during the official Arbitrum Open
House Singapore Buildathon implementation window. Pre-existing functionality
is documented in `docs/pre-event-baseline.md` and must not be claimed here.

## Immutable product baseline

- Repository: https://github.com/zedili/Signal402-Arbitrum-Singapore
- Tag: `arbitrum-singapore-pre-event-2026-09-07`
- Commit: `20a4d0d2b07ef33be5d6246d112e8d5eff687e20`
- Tree: `326a47024de0e47773950869cb6269e39bbc6826`
- Official implementation start: September 14, 2026

## Kickoff record

Complete this section at or after the official start and before implementation:

- Start verified at (UTC+8): September 14, 2026, 09:08 UTC+8
- Official source used to verify start: HackQuest event page displayed the active
  `Start Submit` control and the project page displayed `Submit to Arbitrum Open
  House Singapore: Online Buildathon`.
- Final pre-event `main` commit: `4dd52eb255bebf1496cf0b1d43a79e8b96278d8c`
- Terms document URL and SHA-256:
  `https://openhouse.arbitrum.io/singapore_version_open_house_buildathon_terms___conditions.pdf`;
  SHA-256 unavailable because Chrome rendered the same 14-page document but its
  normal download control did not produce an accessible file, while a direct
  fetch reached a Vercel security checkpoint. The checkpoint was not bypassed.
- Submission portal state: open; Signal402 remained `100 Ready To Submit` and
  exposed the event-specific submit route. No submission was made.
- Official-page capture reference: ephemeral browser capture observed at
  September 14, 2026, 09:08 UTC+8; no account or personal data was retained.

## Engineering baseline and maintenance log

| Date/time (UTC+8) | Change or observation | Verification |
| --- | --- | --- |
| Sep 14, 09:12-09:15 | Baseline toolchain captured: Node 24.15.0, pnpm command 10.33.1 (project Corepack pnpm 10.4.1), npm 11.12.1, Go 1.26.2, Git 2.53.0.windows.3, Windows 10 IoT Enterprise LTSC build 19044 | Frontend 3/3 baseline tests, TypeScript check, production build, contract 3/3 tests, Go `./...`, and 316-file secret scan passed |
| Sep 14, 09:13 | The production audit detected `sharp@0.35.0` under Next.js as affected by `GHSA-rgj7-g3m4-5g8c`; this was a newly published advisory discovered before feature work | Baseline production audit failed with one high-severity advisory |
| Sep 14, 09:16 | Updated the existing `next>sharp` override to the patched `0.35.4`; this is maintenance and is not claimed as the substantive Buildathon feature | Frozen install passed; production audit reported no known vulnerabilities; 3/3 baseline tests, TypeScript check, production build, and secret scan passed |
| Sep 14, 09:14 | Contract production audit remained clean. The full development audit reported 37 toolchain findings (14 low, 7 moderate, 16 high), so no Hardhat transaction is authorized or claimed from this baseline | Production audit: 0; `Signal402Registry`: 3/3 tests passed |
| Sep 14, 09:28 | Removed the inactive Go, trading, wallet-dashboard, mock-data, legacy API, obsolete integration-document, and non-submitted contract surfaces in `36cea75a1ef78e8c25f7a3f8fe016361f69807be`; this cleanup is not counted as the substantive feature | Legacy symbol and Go-module scans returned no matches; 163-file secret scan, production audit, 3/3 baseline tests, TypeScript check, production build, and 3/3 registry tests passed |
| Sep 17, 10:21 | Removed the stale Go backend job from CI in `5f795c7bf430ffcaa7cb276792b3bdc418d4da2c`; the source had already been intentionally removed in `36cea75`, but the workflow reference was missed | Public run `35173917154` passed Frontend and Contracts and failed only at Backend `Set up Go`; the correction deletes that obsolete job and awaits an owner-approved corrective push |

## Qualifying work log

Add one row for every substantive, in-window change. Link the exact commit and
the strongest available test, deployment, or transaction evidence.

| Date/time (UTC+8) | Commit | Qualifying change | Verification evidence | AI assistance |
| --- | --- | --- | --- | --- |
| Sep 14, 09:34 | `cd2e0ae701d8fb7935e995240ae883d8aeb65809` | Added strict, environment-independent Zod contracts for the v1 request, normalized report, proof/payment boundary, and the complete RFC 9457 problem taxonomy. Cross-field checks reject mismatched market IDs and registry hash arguments; the problem contract binds every stable code to its HTTP status, machine action, and allowed payment state. | 54 new contract assertions passed, including one complete report fixture, every problem-code mapping, strict unknown-field rejection, normalization/range/time/hash failures, and HTTP/body-status mismatch; full frontend total 57/57, TypeScript check, production build, 163-file secret scan, and production audit passed. | Implemented with Codex; invariants and fixtures were derived from the pre-event wireframes and reviewed through deterministic tests. |
| Sep 15, 16:32 | `27e43faa789b63c06d8e86e94a243683ec113d9c` | Implemented dependency-free RFC 8785 JCS serialization, fatal UTF-8 and duplicate-name-aware JSON parsing, semantic report-payload selection, domain-separated market/content hashes, and quoted-payment-bound request fingerprints. | 36 new assertions covered the RFC canonical text/UTF-8 vector, UTF-16 key ordering, number edges, malformed and non-I-JSON inputs, frozen hashes, semantic mutations, excluded purchase fields, request normalization, and every fingerprint term; frontend total reached 93/93. | Implemented with Codex against RFC 8785, the existing locked viem Keccak utility, and the pre-event hash-domain specification; no dependency was added. |
| Sep 15, 16:35 | `e8af32fc74017947d7a279d7ec58f69881140c0f` | Added a minimal tracked `attest(bytes32,bytes32)` ABI plus deterministic registry calldata encode/decode validation, without any wallet or RPC action. | 7 new assertions froze the selector and calldata, proved exact decode order, and rejected zero, malformed, uppercase, and foreign-selector inputs; frontend total 100/100, TypeScript check, production build, 171-file secret scan, and production audit passed. | Implemented with Codex using the tracked Solidity source and existing locked viem encoder. |
| Sep 15, 17:21 | `adf3c0d50eb6d34305fc6c520cdbfeb537db54c4` | Added the strict Polymarket snapshot adapter, injected analysis-provider boundary, and deterministic report service. The adapter accepts only upstream-proved binary Yes/No markets with matched prices and required source fields; it never inserts fallback labels, probabilities, URLs, or timestamps. The service constructs and validates the complete report and proof before any payment layer is involved. | 37 new assertions covered strict source normalization, 16 unsupported-shape cases, not-found/outage mapping, provider schema and fault mapping, provider-call suppression, complete proof recomputation, and structural absence of a settlement collaborator; frontend total 137/137, TypeScript check, production build, 173-file secret scan, and production audit passed. | Implemented with Codex using synthetic fixtures and injected fakes only; no live Polymarket, model-provider, wallet, or settlement request was made. |
| Sep 15, 20:12 | `830e7fc973a3a3e3dc9ed7a82b05aad6b149bd72` | Added bounded SHA-256 purchase/credential identities, the replay-store contract, a test-only atomic memory adapter, and the purchase retry/reconciliation state machine. Matching settled attempts replay defensively copied exact bytes and the stored standard receipt; tuple mismatches, concurrent work, store outages, corrupt stored bodies, and ambiguous settlement fail closed. Production explicitly rejects the memory adapter. | 67 new assertions exhaustively covered every legal and illegal state transition, atomic compare-and-set loss, expiry and uniqueness release, defensive byte copies, stored-body integrity, 16-way initial and retry races, tuple conflicts, exact replay, outage mapping, and unknown-outcome reconciliation. A TypeScript target incompatibility in the initial BigInt literals was found and corrected before the final gate; frontend total 204/204, TypeScript check, production build, 179-file secret scan, and production audit passed. | Integrated and reviewed Codex-agent work; all tests use local synthetic identities, response bytes, and settlement fixtures. No raw idempotency key or payment header is retained by the store, and no external database, provider, facilitator, or wallet was used. |
| Sep 16, 16:35 | `f1154b0189010a2660c012891de3541c5d9cbfa4` | Added the dependency-injected canonical `/api/v1/reports` paid-resource orchestrator. It validates the request before payment work, claims replay protection before verification/provider work, freezes and settles the exact delivered bytes, replays the stored body and standard receipt without duplicate work, and maps application, concurrency, storage, and settlement outcomes to validated RFC 9457 responses. The contract now explicitly covers invalid idempotency keys and state-aware in-progress/store failures. | 22 new assertions covered invalid inputs and missing payment, claim ordering, single-worker concurrency, invalid or unavailable verification, exact-byte settlement, schema-valid body/receipt separation, exact settled replay, identity conflict, every report-service failure, proven-unconsumed settlement, and ambiguous settlement lockout. Frontend total 226/226, TypeScript check, production build, 184-file secret scan, and production audit passed. | Implemented with Codex using a test-only memory replay adapter and synthetic payment, provider, report, and settlement fixtures. No live source, model, facilitator, durable store, wallet, payment, RPC, deployment, or public push was used. |
| Sep 16, 21:11 | `e8fb9e907089d6af0cbb806b5e8145c0a7834936` | Added the strict Next.js boundary for `POST /api/v1/reports`, retired `/api/analysis` and its readiness endpoint with unpaid typed `410` responses, and removed the old route-specific x402 server. The canonical route rejects malformed, duplicate-member, wrong-media-type, and oversized requests before resource work and intentionally returns `replay_store_unavailable` without payment terms until a durable adapter is approved. | 12 new assertions covered header/body forwarding, exact response bytes, four pre-handler request rejections, redacted handler exceptions, the fail-closed canonical route, legacy route/readiness retirement, absence of payment headers or redirects on retirement, and a production-source inventory proving no second settlement implementation. Frontend total 238/238, TypeScript check, production build with `/api/v1/reports`, 188-file secret scan, production-source symbol scans, and production audit passed. | Implemented with Codex using local requests and synthetic handlers only. No durable provider was selected, no database or model/facilitator was contacted, and no public push, deployment, wallet, signature, payment, RPC, or submission action occurred. |
| Sep 17, 10:28 | `3c811e971bdba0b0b376494d6bbd8efccc72fb9e` | Added the durable Postgres replay adapter, server-only Neon factory, and unapplied v1 migration. The schema constrains hash lengths, credential uniqueness, legal state payloads, receipts, versions, and expiry; claims serialize both purchase and credential identities, while transitions use parameterized compare-and-set updates. Persisted response bytes are rehashed before replay. | 17 new assertions covered parameter binding, claim/conflict mapping, exact settled-row decoding, corruption rejection, CAS SQL, mismatch/not-found handling, illegal-transition suppression, outage propagation, durable-boundary acceptance, 16-way adapter claim concurrency, uniqueness conflicts, CAS races, expiry release, and migration safety. Frozen install, frontend 255/255, TypeScript check, production build, 192-file secret scan, MIT license check, and production audit passed. No local Postgres runtime was available, so SQL execution and true database-level concurrency remain explicitly unclaimed pending approved remote tests. | Implemented with Codex using an in-memory query executor and synthetic rows only. The exact Neon driver is pinned but no account, project, database, secret, network connection, migration execution, Vercel link, function-region change, deployment, or payment occurred. |

## Deployments and runtime evidence

| Date/time (UTC+8) | Environment | Deployment ID / commit | Smoke-test evidence |
| --- | --- | --- | --- |
| _pending_ | _pending_ | _pending_ | _pending_ |

## Onchain evidence

Record only in-window transactions initiated with explicit owner approval.

| Purpose | Network | Transaction | Related report / commit |
| --- | --- | --- | --- |
| _pending_ | Arbitrum Sepolia | _pending_ | _pending_ |

## Visual and media provenance

| Asset | Created at (UTC+8) | Author/tool and inputs | SHA-256 | Used in |
| --- | --- | --- | --- | --- |
| _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |

## Final comparison and submission copy

- Final submitted commit: _pending_
- Baseline-to-final comparison URL: _pending_
- Final test run: _pending_
- Final production deployment: _pending_
- Final demo and pitch hashes: _pending_
- Exact public **Progress During Hackathon** text: _pending owner review_
- HackQuest submission identifier and confirmation: _pending_
