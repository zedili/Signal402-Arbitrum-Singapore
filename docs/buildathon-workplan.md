# Signal402 in-window Buildathon workplan

This is a pre-event planning document only. Do not begin implementation before
the official Buildathon starts on Sep 14, 2026. Use the standalone repository's
`arbitrum-singapore-pre-event-2026-09-07` tag as the immutable product baseline,
record the final docs-only pre-event `main` commit at kickoff, then keep all
qualifying implementation commits inside the official window. Maintain the
commit-linked evidence ledger in `docs/progress-during-buildathon.md`.

Because the Terms do not provide a precise start time while HackQuest displays
Sep 14 at 01:01 in UTC+8, follow `docs/sep14-kickoff-runbook.md`: do not begin
implementation before **Sep 14, 2026 01:01 UTC+8**, and proceed only after the
official page visibly shows the window as open.

At kickoff, continue from the then-current `main`. Do not reset or branch from
the baseline tag: the commits after the tag are pre-event documentation and
evidence controls that must remain in history. Qualification is proven by the
tag-to-final product diff plus the separately recorded final pre-event `main`
commit.

## Objective

Turn the existing human-facing paid report flow into a verifiable,
agent-consumable insight protocol that produces a stable response envelope,
payment evidence, deterministic content hashes, and optional onchain
attestation on Arbitrum Sepolia.

This scope is more than a cosmetic or documentation-only change. It connects
the existing x402 payment boundary to the deployed `Signal402Registry`, adds a
machine client, and creates measurable reliability evidence.

## Deliverables

### 1. Versioned agent API

- Add a documented versioned endpoint for purchasing a report by market ID.
- Implement the strict request, success, RFC 9457 problem, action, and
  payment-state contract in `docs/agent-api-contract-wireframe.md`. Make the
  versioned route the sole paid settlement surface rather than maintaining two
  divergent payment implementations.
- Return the standard x402 v2 payment requirement to an unpaid client.
- Preserve the existing rule that provider or schema failure cancels settlement.
- Add durable application idempotency for paid retries. Bind a client purchase
  key and the exact payment credential to a server-derived request fingerprint,
  serialize concurrent attempts before provider work, and never request a fresh
  authorization automatically after an ambiguous result. Follow
  `docs/x402-idempotency-replay-wireframe.md`; do not claim generic exactly-once
  delivery unless the settlement-to-store recovery gap is proven.
- Return a versioned JSON envelope containing the source snapshot, structured
  analysis, generation metadata, expected payment context, receipt-channel
  metadata, and hash fields. Keep the authoritative settlement result in the
  standard `PAYMENT-RESPONSE` header; do not duplicate it into the body after
  settlement. Follow `docs/x402-response-boundary.md`.
- Keep AI credentials and market refresh server-side.

### 2. Deterministic proof bundle

- Validate and implement the RFC 8785 JCS plus domain-separated Ethereum
  `keccak256` design in `docs/canonical-proof-wireframe.md`; revise the version
  explicitly if an in-window test vector disproves an assumption.
- Compute and return `marketIdHash`, `contentHash`, and deterministic registry
  call arguments without exposing private report data onchain. Do not return a
  predicted `attestationId`: the current contract derives it from the caller
  and inclusion block, so the real ID exists only when the transaction is
  mined.
- Show the canonical registry address and network in the response and UI.
- Add a wallet-controlled, explicitly optional action that calls
  `Signal402Registry.attest(marketIdHash, contentHash)` on Arbitrum Sepolia.
- Display and link both the x402 settlement receipt and registry transaction.

### 3. Agent reference client

- Add a minimal command-line example using the official x402 client packages.
- Demonstrate the initial 402 response, wallet authorization, paid retry,
  structured response validation, and receipt extraction from the standard
  response header.
- Expose any combined report-and-settlement object only as a client-composed
  convenience result, not as the server's raw JSON response.
- Default to testnet and require the operator to supply its own signer securely.
- Never include or generate a funded private key in the repository.

### 4. Evaluation harness

- Implement the layered, reproducible suites, metrics, denominators, artifact
  rules, and acceptance thresholds in `docs/evaluation-harness-plan.md`.
- Measure schema-valid response rate, latency, and provider error behavior over
  a bounded test fixture set.
- Prove settlement is not called when market refresh, provider output, parsing,
  or schema validation fails.
- Prove every typed problem maps to the documented HTTP status, machine action,
  payment state, media type, and settlement behavior without leaking raw
  provider/facilitator details.
- Prove the response bytes supplied to settlement are the same bytes delivered
  to the caller, and reject a missing, malformed, failed, or network-mismatched
  `PAYMENT-RESPONSE` header in the reference client.
- Prove sequential and concurrent replay behavior across every idempotency
  state: matching settled requests return stored bytes and receipt without new
  work, mismatches fail before provider/settlement, and ambiguous settlement
  never triggers a new wallet authorization.
- Verify canonical hashes are stable across key-order differences and change
  when covered report content changes. Commit cross-runtime byte-and-hash test
  vectors, including Unicode, number, invalid-input, and array-order cases.
- Cover deterministic registry call data, decode the emitted
  `InsightAttested.attestationId` from a successful receipt, and verify the
  stored attestation against the event.
- Publish only test fixtures and aggregate results; never publish secrets.
- Keep the three existing x402 tests labeled as pre-event baseline coverage;
  report new in-window tests and failures separately.

### 5. Judge-facing evidence

- Add a before/after architecture diagram and short changelog tied to commits.
- Record one clean agent-client purchase and one optional registry attestation.
- Update the demo to show the machine-readable 402 boundary, structured report,
  settlement receipt, deterministic hash, and registry proof.
- Update the submission's Progress During Hackathon field with only work landed
  after the recorded baseline.

### 6. Provenance-clean visual refresh

- Replace the inherited hero background and AI/crypto/stocks/tech icon set
  during the official event window.
- Use newly created assets with recorded prompts or source files, date,
  author/tool, input rights, and SHA-256 hashes.
- Update the application, cover, deck, and videos consistently where those
  visuals appear.
- Preserve the old files only in the pre-event Git baseline; do not reuse them
  in the final submitted build unless their rights are separately documented.

## Acceptance gates

- All new implementation commits have timestamps inside the official window.
- Frontend tests, type checks, production build, contract tests, Go tests, and
  repository secret scanning pass from a clean checkout.
- Frontend and contract production-dependency audits pass. Re-run the full
  contract development-dependency audit and either resolve the Hardhat
  toolchain advisories or document each accepted residual risk before using the
  toolchain for an owner-approved transaction. Do not claim that all
  dependencies are vulnerability-free while those advisories remain.
- A fresh production smoke test returns live market data and a valid unpaid 402.
- The production paid endpoint uses a durable atomic replay store; an in-memory
  adapter is test-only. Store selection, external connection, and production
  secret configuration have owner approval. Use
  `docs/replay-store-decision.md` for the reviewed provider decision rather than
  provisioning ad hoc infrastructure.
- At least one new paid agent-client request settles on Arbitrum Sepolia.
- At least one optional report hash is attested through the canonical registry.
- Every public claim has a URL, transaction, test, or reproducible command as
  evidence.
- The project remains explicitly testnet-only and information-only.

## Suggested sequence

1. **Sep 14:** verify the immutable baseline tag, record the final pre-event
   `main` head, re-check terms, confirm the submission portal is open, and
   repeat the dependency audit before selecting a Hardhat upgrade path. Apply
   the legacy-surface cleanup gate in `docs/active-surface-audit.md` without
   presenting cleanup as the substantive feature.
2. **Sep 14–18:** implement the versioned API and canonical proof bundle.
3. **Sep 19–22:** integrate optional registry attestation and the reference
   client.
4. **Sep 23–25:** implement the evaluation harness and failure-path coverage.
5. **Sep 23–25:** create and integrate the provenance-clean visual refresh.
   Resolve the `typeit`, GSAP, platform-specific Sharp, and third-party-notice
   gates in `docs/dependency-license-preflight.md` as part of that refresh.
6. **Sep 26–27:** deploy, run testnet proof transactions, and collect evidence.
7. **Sep 28–29:** update videos, submission copy, and judge Q&A. In the deck,
   replace every historical repository or temporary-preview source, refresh
   the test counts and screenshots, recast the obsolete roadmap, and add the
   authorized historical-project acknowledgment recorded in
   `docs/ip-provenance-review.md`.
8. **Sep 30 by 8:00 PM UTC+8:** complete the final owner-confirmed submission,
   ahead of the earlier Oct 1 terms deadline.

## Scope controls

- Do not migrate to Robinhood Chain without an explicit owner decision; the
  existing Arbitrum deployment already qualifies for the reserved Arbitrum
  position, and a rushed second-chain deployment would dilute proof quality.
- Do not add trading, custody, token economics, or mainnet claims.
- Do not require registry attestation for report purchase; it remains an
  optional proof layer.
- Prefer one complete, measurable agent workflow over additional UI breadth.
