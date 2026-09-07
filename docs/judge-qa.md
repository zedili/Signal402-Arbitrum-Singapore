# Signal402 judge Q&A

Status: **pre-event draft.** Update every answer after the in-window build. Do
not describe the planned versioned agent API, proof bundle, evaluation harness,
or report attestation as complete until their evidence gates pass.

Use these answers for live feedback sessions, asynchronous judge questions, and
the final review. Keep answers concise, demonstrate the product before showing
architecture, and do not extend a claim beyond the linked evidence.

## Product and market

### What problem does Signal402 solve?

Prediction-market probabilities are public, but contextual analysis is often
sold through subscriptions, accounts, or private API contracts. Signal402 lets
a person or autonomous agent buy one bounded report with explicit,
machine-readable payment terms instead of committing to a recurring plan.

### Who is the first customer?

The initial user is an occasional prediction-market researcher or an agent that
needs one structured market snapshot and cannot justify a subscription or a
bespoke commercial integration. This is an MVP buyer hypothesis, not a claim of
validated demand or retention.

### Why would someone pay when an LLM can answer for free?

The current baseline packages live market context, a schema-validated report,
explicit price and network metadata, server-side credential handling, payment
receipts, and fail-closed settlement behind one endpoint. The planned
in-window work adds a published, versioned agent contract; do not call the
baseline response a stable public agent schema before that work is complete.
The product value is the reliable commercial boundary, not access to a generic
chat model.

### What does the user receive?

A structured report with the current market-implied probability, an independent
estimate, confidence, evidence available in the supplied snapshot,
counterarguments, risks, assumptions, generation time, and a responsible-use
disclaimer. Signal402 does not promise accuracy or execute trades.

## Arbitrum and x402

### Why Arbitrum?

Small pay-per-request purchases need an EVM environment where transaction costs
do not overwhelm the unit price. Arbitrum also lets Signal402 use established
wallet and USDC authorization tooling while exposing a low-friction payment
boundary to both people and agents.

### What proves the project is deployed on Arbitrum?

- Production app: https://signal402.vercel.app
- Successful Arbitrum Sepolia settlement:
  https://sepolia.arbiscan.io/tx/0x4c0e782d706b544bb154116457eb8c3d447fe86a1b6e82ca4f94043221cdadf2
- Canonical registry:
  https://sepolia.arbiscan.io/address/0xc896eb3b013a60deca7029dc2aa4f0da9a5faf82
- Exact-match registry source verification:
  https://repo.sourcify.dev/421614/0xc896eB3B013a60deCA7029dc2aa4F0da9a5faf82

All assets and transactions are testnet assets. The settlement proves protocol
execution, not customer revenue.

### Why use x402 instead of a normal checkout?

The first unauthenticated request returns a standard `402 Payment Required`
response containing the price, asset, network, and resource description. An
x402-aware client can handle those terms without a user account or a custom
billing integration, which is essential for agent-native use.

### When does settlement happen?

The server verifies the authorization before generating the report, but it
settles only after the market refresh, provider call, JSON parsing, and schema
validation succeed. A tested provider-failure path returns an error without
calling settlement.

### Can a network retry charge twice?

The same EIP-3009 authorization nonce cannot transfer twice onchain, but that
alone does not make a logical API purchase idempotent: a newly signed
authorization has a new nonce. The baseline client performs one paid retry and
does not register an automatic recovery hook, but it does not yet provide
durable cross-instance replay recovery. The in-window design binds one client
purchase key and exact payment credential to a server-derived request
fingerprint, serializes provider and settlement work, and refuses to request a
fresh authorization after an ambiguous result. Replace this answer with test
and deployment evidence before claiming the design is complete.

### How does an agent know whether to retry?

The planned versioned API uses RFC 9457 Problem Details plus stable `code`,
`action`, and `paymentState` fields. Those fields distinguish correcting an
unpaid request, retrying the same unchanged authorization, waiting for the same
purchase, checking an unknown settlement, and deliberately starting a new
purchase with confirmation. The current baseline returns free-form error text,
so this remains planned until the in-window endpoint, fixtures, and public
problem documentation are deployed and tested.

### Is the registry part of the payment path?

No. `Signal402Registry` is a deliberately small, optional hash-attestation
contract. The x402 payment flow works without it. Keeping these concerns
separate reduces the active payment surface and avoids putting report contents
onchain.

### What does the registry attestation actually prove?

It proves that a wallet submitted a market hash and content hash to the
canonical registry in a successful Arbitrum Sepolia transaction. When a
disclosed report recomputes to that content hash, it proves the report matches
the commitment. It does not prove the analysis is true, that the requester
authored or purchased it, or that the hash is confidential. The contract is
permissionless and immutable, and the optional transaction is separate from
the x402 receipt. Replace this pre-event wording with the in-window receipt,
decoded event, recomputed ID, and mapping readback before claiming completion.

## Security and limitations

### Who controls funds and keys?

The user signs a test-USDC authorization in their browser wallet. Signal402
does not custody funds, store a wallet private key, or expose the AI provider
key to the browser. Facilitator verification and settlement are an explicitly
documented external trust boundary.

### What are the largest current limitations?

The product is testnet-only, depends on one AI provider and an external x402
facilitator, has no validated user or retention data, and has no formal
prediction-accuracy evaluation. The next milestones are provider redundancy,
an evaluation harness, an agent-native API, and initial paid-user validation.

### How was the project built?

It is a solo-founder project supported by AI development agents. The founder
owns the product decisions and submission; AI agents assisted with engineering,
testing, security review, documentation, and event operations. Do not imply a
larger current human team. Signal402 builds on the earlier X402AiPolyMarket
prototype, and the submission publicly acknowledges its historical project-team
contributors as preserved in Git history.

## Prize and milestone positioning

### What would prize or grant funding unlock?

Use measurable milestones rather than speculative token plans:

1. Publish a stable agent API with a documented JSON-body and standard
   `PAYMENT-RESPONSE` receipt-header boundary.
2. Add a second analysis provider with deterministic fallback behavior.
3. Ship an evaluation harness for report validity, calibration, and latency.
4. Run a bounded pilot and report real activation, repeat use, and paid-request
   metrics.
5. Prepare a reviewed path from testnet to an Arbitrum mainnet deployment.

### Why should this win now?

Replace this pre-event answer after the in-window acceptance gates pass.

Signal402 demonstrates a complete, narrow product loop: live data, explicit
machine-readable payment terms, wallet authorization, server-side structured
analysis, failure-safe settlement, and an onchain receipt on Arbitrum. Its scope
is honest and testable. The final answer must lead with the separately evidenced
Buildathon-period agent workflow rather than presenting this baseline as new
event work.
