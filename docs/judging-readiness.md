# Signal402 judging-readiness matrix

This matrix maps Signal402 to the published Arbitrum Open House Singapore
Buildathon criteria. It is a claim-control document for the final submission
and judge Q&A, not a substitute for the working product or onchain evidence.

Source: [official HackQuest event page](https://arbitrum-singapore.hackquest.io/buildathons/Arbitrum-Open-House-Singapore-Online-Buildathon).

Status: **pre-event baseline.** Every final judging claim must distinguish the
evidence below from work completed after the official Sep 14 start.

Live prize-tab recheck on Sep 7, 2026: the account remained registered, the
page showed 430+ participants and 115,000 USDC total prizes, and both Overall
and Promising Products still used the four public criteria below. No weighting
was published, so do not invent percentages or optimize for an assumed score.

## Qualification

The project must be deployed on an Arbitrum chain. Signal402's protected
production flow has settled x402 payments through the Arbitrum Sepolia USDC
contract, and the UI links to the transaction receipt after success.

- Production: https://signal402.vercel.app
- Network: Arbitrum Sepolia (`eip155:421614`)
- Verified settlement: https://sepolia.arbiscan.io/tx/0x7a2eea1ee62ef8f02e2731498f6bb77072db477f33a258af5d8c53106aada4e5
- Post-key-rotation settlement: https://sepolia.arbiscan.io/tx/0x4c0e782d706b544bb154116457eb8c3d447fe86a1b6e82ca4f94043221cdadf2
- Canonical `Signal402Registry`: https://sepolia.arbiscan.io/address/0xc896eb3b013a60deca7029dc2aa4f0da9a5faf82
- Registry deployment: https://sepolia.arbiscan.io/tx/0x5af65b36f980448d63127b73120c6ab40a7b64a7a81cfa977bd8e710765d61f4
- Exact-match source verification: https://repo.sourcify.dev/421614/0xc896eB3B013a60deCA7029dc2aa4F0da9a5faf82

The production URL, readiness endpoint, public repository, media links,
Sourcify page, all three transaction receipts, and 1,730-byte registry runtime
code were re-verified on Sep 7, 2026. These checks prove the baseline remains
available; they do not prove in-window development.

## Published judging criteria

The public HackQuest page and the official terms use overlapping but not
identical wording. The terms additionally score use of Arbitrum, potential
impact, presentation quality, and novelty. The submission and demo must make
those dimensions explicit rather than relying only on the four public-page
criteria below.

| Criterion | Current evidence | Honest limitation / next proof |
| --- | --- | --- |
| Smart contract quality | `Signal402Registry` is minimal, permissionless, stores hashes rather than reports or funds, has three active Hardhat tests, and is deployed on Arbitrum Sepolia. Independent RPC checks confirmed the deployment receipt, non-empty runtime bytecode, empty-market rejection, and a successful valid-call simulation. Sourcify reports exact matches for both creation and runtime bytecode. The production payment path uses official x402 packages and settles only after a valid AI result. | The registry is optional and is not required for the core payment path. Arbiscan's automatic source-verification import hit its daily submission limit; use the public Sourcify exact-match record until that separate explorer view is available. |
| Product-Market Fit | One bounded report can be purchased without an account or subscription. A local protocol test proves an official x402 client can read the payment boundary, authorize, retry, and extract a receipt. | The production experience remains human-facing before the event, and there is no validated retention, revenue, or user-count evidence. Do not claim a published production agent API until the in-window endpoint is deployed. |
| Innovation and Creativity | Signal402 combines live prediction-market probabilities, schema-validated server-side analysis, and a non-custodial x402 pay-per-response boundary on Arbitrum. Provider failure prevents settlement. | Avoid presenting generic "AI plus markets" as the innovation; emphasize the atomic commercial boundary and agent compatibility. |
| Real Problem Solving | Occasional users and agents should not need a recurring subscription or private API contract to buy one piece of market context. The product makes price, network, asset, and receipt explicit. | The report is informational and does not guarantee accuracy or execute trades. Keep responsible-use language visible. |

## Final claim-to-evidence plan

The final entry should use the smallest claim that the evidence proves. Each
row below is a required evidence target, not a statement that the in-window
work already exists.

| Judging dimension | Target final claim | Required authoritative evidence | Demo beat | Prohibited shortcut |
| --- | --- | --- | --- | --- |
| Arbitrum deployment qualification | The submitted build executes its paid-agent workflow on Arbitrum Sepolia | final production commit/deployment ID, live 402, owner-approved in-window settlement transaction, decoded receipt, chain/asset/recipient checks | open unpaid request, show exact Arbitrum terms, then show the matching explorer receipt | treating an old deployment or configured chain name as proof of the submitted build |
| Smart contract quality | The optional registry commits report hashes without custody or report disclosure, and its client verifies the exact contract/event/readback | canonical address and Sourcify record, runtime-code hash, contract tests, simulated calldata, owner-approved in-window attestation receipt, decoded event/ID/mapping agreement | recompute the report hash, preview zero-value call, then open the independently checked attestation | implying the permissionless hash registry proves truth, authorship, purchase, privacy, or payment |
| Product-Market Fit | A person or agent can buy one bounded report without an account or subscription | exact 0.01 test-USDC policy, versioned schema, inspect-only client, one successful workflow, explicit buyer hypothesis and limitations | run `inspect`, show readable terms, then the one-report result | claiming users, retention, revenue, demand, willingness to pay, or mainnet readiness without measured data |
| Innovation and Creativity | Signal402 makes an AI response a verifiable, retry-safe commercial object rather than attaching a wallet to a chatbot | one-authorization signer-count test, durable concurrency/replay evidence, standard receipt boundary, deterministic content hash and optional attestation | show the same signed credential surviving a simulated retry without a new signature, then verify receipt and content hash separately | saying “AI + prediction markets” alone is novel, or claiming generic exactly-once delivery |
| Real Problem Solving | The workflow reduces billing and integration friction for a bounded information purchase while failing closed when no usable report is produced | published request/problem contract, provider/source failure matrix, zero-settlement assertions, stable machine actions, redacted error fixtures | trigger one deterministic provider failure and show no settlement attempt, then show the successful path | claiming the analysis is accurate, financial advice, a trading system, or a replacement for source verification |
| Technical implementation | The submitted system has one paid route, strict schemas, deterministic proof, atomic replay control, and independently validated client behavior | clean-checkout commands, route inventory, contract fixtures, 16-way concurrency result, exact response-byte check, secret scan, dependency manifests, deployed smoke tests | briefly show the architecture and selected aggregate test results after the product flow | using test count alone as quality evidence or mixing the three pre-event tests into the in-window total |
| Use of Arbitrum | Arbitrum is the execution layer for both the x402 transfer and optional public commitment | chain-specific payment requirement, settlement and attestation receipts, contract address/code, explorer links | keep chain, token, amount, and transaction visible at the moment each action occurs | implying Robinhood Chain eligibility or Arbitrum One/mainnet deployment |
| Potential impact | The same bounded purchase pattern can support autonomous software buyers of research without bespoke billing accounts | versioned client/API contract, reproducible example, clear next milestones, bounded pilot plan | end with the reference client and a concrete pilot metric | unverifiable TAM, adoption, partner, sponsor-endorsement, or growth claims |
| Presentation quality | A judge can understand the problem, complete flow, safety boundary, and proof within three minutes | final script, rights-cleared video, readable mobile/desktop screenshots, working public links, claim ledger | problem → unpaid terms → one authorization → report → receipt/hash → limitations | architecture-first narration, tiny terminal text, stale screenshots, or unverified live improvisation |
| Novelty | The combined standard-payment, application-idempotency, deterministic-content, and optional-attestation boundary is the differentiated unit | before/after architecture, baseline tag-to-final diff, commit-linked changelog, comparison stated without competitor disparagement | one before/after slide tied to the in-window commits | relabelling pre-event baseline functionality as new Buildathon work |

## Evidence artifact contract

Create these reviewed, public-safe artifacts during the official window under
`evidence/buildathon/`. File names may gain a UTC timestamp but should keep the
stable stem for automated checks:

| Artifact stem | Minimum contents | Must exclude |
| --- | --- | --- |
| `kickoff.json` | portal-open observation, UTC/UTC+8 time, final pre-event HEAD, immutable tag/tree, Terms URL/hash or access limitation | account cookies, screenshots with personal data |
| `environment.json` | OS and exact Node/pnpm/npm/Go/Git/dependency versions | home paths where unnecessary, environment-variable values |
| `tests.json` | commands, commit, start/end time, integer pass/fail/skip denominators, failed case IDs | raw secrets, inflated totals that include pre-event tests as new work |
| `replay-concurrency.json` | worker count, purchase/request/credential digests, provider and settlement call counts, terminal state | raw idempotency key, signature, nonce, payment header, stored report |
| `evaluation.json` | fixture manifest hash, per-layer denominators, latency summary, provider/fault outcomes, threshold decisions | unpublished raw model output, provider request headers or prompts containing secrets |
| `deployment.json` | deployed commit, provider deployment ID, production URL, health/402 checks | deployment token, environment variables, database URL |
| `payment-receipt.json` | public transaction hash/link, decoded standard receipt fields, expected quoted terms, independent verification result | private key, raw signature/payment header, unredacted request identifiers |
| `attestation-receipt.json` | contract/code hash, call-data digest, zero value, transaction/event/ID/mapping checks | signer material or a predicted pre-mining attestation ID |
| `asset-provenance.json` | asset path, creator/tool, prompt or source, creation time, input rights, SHA-256, usage locations | unrelated personal files or unlicensed source material |
| `claim-ledger.json` | final public claim, status, baseline/in-window classification, evidence URLs/files/commits, reviewer result | unsupported marketing copy or confidential judge-only data |

Every artifact includes `schemaVersion`, `generatedAt`, `commit`, and the command
or method that produced it. Generated evidence is reviewed before commit;
failure artifacts are retained with safe redaction rather than silently removed.

## Claim-status vocabulary

- `baseline_verified`: proven before Sep 14 and labelled as baseline only.
- `in_window_verified`: implemented after the guarded kickoff and proven by the
  final deployed commit plus the cited artifact.
- `planned`: documented but not implemented or not yet evidenced.
- `contradicted`: current evidence disproves the claim; remove or rewrite it.
- `unverified`: plausible but missing authoritative proof; do not publish it.

Only `baseline_verified` and `in_window_verified` claims may appear as facts in
the final submission, with the time boundary made explicit. A passing test does
not upgrade a deployment claim, and a live smoke check does not upgrade a
concurrency, privacy, accuracy, or market-demand claim.

## Prize positioning

- **Overall Prize:** lead with the complete working loop, Arbitrum settlement,
  security boundaries, and the path to agent-native paid APIs.
- **Promising Products:** lead with the narrow MVP, clear buyer, transparent
  unit price, and realistic roadmap from testnet evidence to user validation.
- **Milestone-based grants:** propose measurable milestones such as a public
  agent API, evaluation harness, multi-provider reliability, and initial paid
  usage rather than promising speculative token economics.

## Final claim controls

- Do not claim mainnet deployment, users, revenue, prediction accuracy, or
  production financial readiness without new evidence.
- Label every current product, payment, contract, deployment, test, deck, and
  video item as pre-event baseline evidence until a final in-window comparison
  proves otherwise.
- Describe all current assets as testnet assets.
- State that the recorded self-funded demo transferred test USDC to the project
  recipient address; it proves protocol settlement, not customer revenue.
- Use `0xc896eb3b013a60deca7029dc2aa4f0da9a5faf82` as the only canonical
  `Signal402Registry` address. A second identical testnet deployment caused by
  a double click is documented in the deployment runbook and is not the
  project registry.

## Submission operations

- HackQuest shows the account as registered. Signal402 is 100/100 ready, but
  its public `Submitted Buildathons` list remains empty until the submission
  window opens and the final submission is completed.
- HackQuest displays a submission window of Sep 14, 2026 01:01 through Oct 4,
  2026 23:59 in Asia/Shanghai. The official terms instead state Oct 1, 2026,
  11:59 PM SGT. Operate to the earlier deadline and seek written clarification.
- The project page reports 100/100 readiness. The existing Signal402 cover was
  uploaded to HackQuest and then verified on the public project page. The
  personal profile bio and pitch video are not part of this readiness
  calculation.
- Both uploaded videos are available from HackQuest, match the corresponding
  local file sizes, and resolve from the correct Demo and Pitch fields. A
  previous read during the tab-transition animation briefly observed the
  exiting video element and was not evidence of reversed fields.
- The event currently lists no individual workshop cards. Its official
  Workshops & Sessions tab directs participants to the Arbitrum Discord
  `#open-house` channel for workshop and feedback-session updates and strongly
  encourages attending feedback sessions.
- The event overview and terms section 3.1 allow existing projects that receive
  more-than-trivial development during the Buildathon, but the attached Code of
  Conduct says actual development must not begin before the event. Preserve the
  pre-event baseline, obtain organizer clarification, and ship a substantive
  in-window feature before submitting.
