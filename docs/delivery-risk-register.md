# Signal402 Buildathon delivery risk register

Status: **pre-event planning only.** Dates are internal control points, not
official deadlines or evidence that work has begun. The official-window gate in
`docs/sep14-kickoff-runbook.md` controls implementation.

This register protects the complete submission objective from late external
dependencies. It does not authorize a push, provider account, database,
deployment, wallet action, media upload, track selection, Terms acceptance, or
submission.

## Controlling dates

- Earliest implementation: not before **Sep 14, 2026 01:01 UTC+8**, and only
  after the official page visibly shows the window open.
- Internal production-candidate target: **Sep 25, 2026 20:00 UTC+8**.
- Internal evidence/media freeze: **Sep 28, 2026 20:00 UTC+8**.
- Internal final-form freeze: **Sep 29, 2026 20:00 UTC+8**.
- Internal submission target: **Sep 30, 2026 20:00 UTC+8**.
- Conservative controlling deadline: **Oct 1, 2026 23:59 SGT/UTC+8** unless
  the organizer gives written clarification. Do not rely on HackQuest's later
  Oct 4 display.

The Sep 30 target provides more than one day for portal, upload, or review
recovery without treating the Oct 4 UI date as permission.

## Completion-critical scope

These outcomes are not cut candidates:

1. guarded kickoff evidence and final pre-event HEAD;
2. more-than-trivial in-window implementation visible in tag-to-final history;
3. strict `/api/v1/reports` agent contract and one active paid route;
4. deterministic request/content proof with cross-runtime vectors;
5. durable atomic replay protection with honest `outcome_unknown` behavior;
6. inspect-first reference client with one-authorization retry invariant;
7. deterministic failure/concurrency evaluation with integer denominators;
8. final deployed Arbitrum Sepolia build and one owner-approved in-window x402
   payment;
9. optional-at-runtime but submission-targeted registry attestation with one
   separately approved transaction and independent event/readback proof;
10. provenance-clean visual replacement, claim ledger, final demo, deck/copy,
    Terms/track/field review, owner approval, submission, and confirmation
    evidence.

Cut candidates are additional UI breadth, multiple markets in the video,
multi-provider production integration, Robinhood Chain, mainnet, trading,
custody, token economics, advanced analytics, extra contracts, encrypted CLI
crash recovery, and speculative growth features. Cutting these protects rather
than narrows the declared Buildathon outcome.

## Daily critical path

| Internal date | Exit condition | Can continue without external approval | Approval packet due if exit condition passes |
| --- | --- | --- | --- |
| Sep 14 | official window verified; kickoff committed; baseline commands captured; strict contract schemas green | yes | none |
| Sep 15 | request identity and canonical proof vectors green | yes | none |
| Sep 16 | strict market adapter and injected report service pass failure matrix | yes | none |
| Sep 17 | replay-store interface and memory conformance suite complete | yes | prepare durable-store packet |
| Sep 18 | 16-way replay/concurrency behavior green; exact schema/migration reviewed locally | yes, on pure/local work | request durable-store provider/provisioning decision |
| Sep 19 | canonical v1 x402 resource works with test store; no second paid route | yes | request migration/secret scope only after provider exists |
| Sep 20 | reference-client inspect and one-signature fake-signer tests green | yes | prepare signer mechanism packet |
| Sep 21 | proof UI and registry preflight work locally; no wallet action | yes | request exact signer mechanism if needed for the evidence run |
| Sep 22 | complete deterministic contract/fault/concurrency suite green | yes | prepare bounded live-provider evaluation packet |
| Sep 23 | approved durable store passes remote atomicity/outage checks; live evaluation decision resolved | partly | request deployment candidate approval when all local gates pass |
| Sep 24 | provenance-clean visuals integrated; production candidate builds cleanly | yes until external promotion | request exact deployment approval |
| Sep 25 | deployed candidate passes live source and unpaid 402 smoke; claim ledger skeleton reconciled | no paid proof without approval | request one x402 signature and one separate attestation transaction |
| Sep 26 | in-window payment and attestation evidence independently verified | yes for documentation | request final-video recording inputs only if another signature is not needed |
| Sep 27 | final demo/deck/copy generated and locally audited; no stale baseline claims | yes | request exact media upload/public field replacement approval |
| Sep 28 | uploaded media and public links verified; exact final form transcribed | yes for review | request location, track, AI disclosure, and Terms decisions from live form |
| Sep 29 | clean-checkout audit and final approval packet complete; form frozen before submit | no | request exact Terms acceptance and final submit approval |
| Sep 30 | submission confirmed and re-opened from dashboard/gallery; identifiers saved | no | final submit only under the exact approval |

An unfinished earlier exit condition carries forward and displaces later polish.
Do not declare a date “done” because the calendar advanced.

## Owner-decision lead times

Ask only after the underlying local evidence exists, but no later than these
internal points:

| Decision | Evidence required before asking | Latest useful internal ask | Safe default while waiting |
| --- | --- | --- | --- |
| Durable store provisioning/link | local store conformance, proposed schema/TTL, current provider plan/price/region/privacy, exact actions | Sep 18 | continue with memory adapter in tests; production boot fails closed |
| Remote migration and production secret | provisioned target, reviewed SQL, rollback/purge, environment names, least-privilege role | Sep 20 | do not connect or migrate |
| Live DeepSeek evaluation | deterministic suite, exact snapshots/fields, token/request/cost ceilings, retention/abort rule | Sep 22 | use synthetic fixtures and fake provider only |
| Reference-client signer mechanism | inspect mode and fake signer tests, exact wallet/network/amount/recipient/custody/redaction plan | Sep 21 | inspect-only client; no wallet/key connection |
| Production deployment | clean candidate commit, tests/build/audits, environment-name-only diff, rollback, provider effects | Sep 24 | retain local candidate |
| One testnet x402 payment | deployed exact 402 terms, signer method, single request/purpose, amount/recipient, stop rule | Sep 25 | use baseline receipts only as labelled baseline evidence |
| One registry attestation | canonical code/simulation/calldata, report hashes, zero value, gas estimate, event/readback verifier | Sep 25 | no transaction; keep call preview only |
| Media upload/project-field replacement | final hashed files/text, rights ledger, field map, exact public destination | Sep 27 | keep files and copy local |
| Track/location/AI disclosure | live form transcript, current Terms, obligations, recommendation, exact public text | Sep 28 | leave unresolved fields unchanged/blank |
| Terms acceptance/final submission | complete final packet and clean audit, exact Terms hash/version, exact button | Sep 29 | do not accept or submit |

Approval for one row does not carry into another row or a later retry.

## Risk register

| Risk | Early signal | Preventive control | Recovery / stop rule |
| --- | --- | --- | --- |
| Portal is not visibly open at the planned kickoff | countdown, schedule, or submit state remains closed/inconsistent | check official page and record time/source before any code edit | do not implement; monitor the same official state and use a later controlling time |
| Organizer never answers deadline/existing-project/AI questions | no written reply by kickoff or submission week | preserve immutable baseline and transparent in-window changelog; use earlier deadline | proceed only within reviewed published rules; never infer permission from silence |
| Terms PDF changes | hash/text differs or URL is replaced | re-download/review at kickoff and pre-submit | stop affected work/acceptance, summarize delta, request owner decision or organizer contact approval |
| Durable-store decision arrives late | local conformance is green but no provider/plan is approved by Sep 20 | present bounded Neon-first packet on Sep 18 | continue non-store slices; do not deploy a paid v1 route with memory-only state |
| Selected store cannot prove atomic primary semantics | stale read, failed uniqueness/CAS, remote concurrency count >1 | use primary-only statements and provider conformance tests | fail production boot; propose an alternative only with a new owner-reviewed cost/data packet |
| Store fails after settlement before durable completion | transaction may exist but receipt row is incomplete | prepare exact bytes before settlement and implement reconciliation boundary | enter `outcome_unknown`; no new authorization or exactly-once claim |
| Pinned x402/facilitator behavior differs from design | contract fixture or hosted response contradicts v2/receipt/retry assumptions | revalidate locked source plus deployed behavior before integration | record contradiction, version the contract if needed, and stop any unsupported claim |
| DeepSeek is unavailable or returns invalid output | bounded evaluation or smoke failures | dependency injection, strict schemas, deterministic fakes, zero-settlement failure path | preserve failure evidence; retry only within approved quota, never settle invalid output, do not add an unreviewed provider |
| Polymarket shape is unsupported or source is down | missing outcomes/prices/ID/source response | strict adapter and preselected demo market with same-day smoke | return typed unpaid/verified-unsettled failure as appropriate; never synthesize Yes/No |
| Wallet/signer unavailable | connection, chain, balance, or signing UI fails | approve mechanism early; verify testnet balance without exposing secrets | do not import a private key or request extra signatures; reschedule the single approved action |
| Facilitator/RPC/explorer is unavailable | timeout, ambiguous settlement, missing receipt page | bounded timeouts, same-authorization replay, independent RPC checks | reconcile; if unknown, stop. Never create a fresh payment solely to repair evidence |
| Registry transaction rejects, reverts, or stays pending | simulation/receipt/event/readback mismatch | code-hash check, zero-value simulation, exact calldata owner packet | preserve purchased report, mark attestation unresolved, and never auto-resubmit; ask before any second transaction |
| Inherited media rights remain unresolved | missing source/license/creator record | replace hero/icons during the window with provenance-clean assets | use simple code-native visuals created in-window; remove the inherited asset rather than make an unsupported declaration |
| Demo leaks sensitive information | wallet/account chrome, headers, keys, notifications, DB/provider screens | clean recording profile, crop/redaction checklist, frame review | reject the recording and edit from safe captured evidence; do not upload |
| Public media or form upload fails | checksum/field mismatch, transcoding error, stale cached asset | freeze files by Sep 28, record hashes, verify each field after save | retry the same approved file/text only if the approval covers retry; otherwise request renewed confirmation |
| Final portal differs from prepared field map | new required field, one-track-only rule, checkbox, judge-only/public change | transcribe exact live form before filling | leave materially new choices blank, explain impact, and ask owner |
| Claim overstates evidence | claim ledger is `planned`, `unverified`, or contradicted | automated/manual claim-to-evidence audit and baseline/in-window labels | remove or narrow the claim; never manufacture evidence or count baseline tests as new |
| Schedule slips | two consecutive daily exit conditions remain incomplete | shift polish time to critical engineering and evidence; report material risk | cut only listed non-critical scope; never substitute memory storage, mock chain evidence, or an unverified submission |

## Daily close protocol

At the end of each active build day:

1. record the exact local commit and whether the worktree is clean;
2. run the slice-specific tests plus secret scan and `git diff --check`;
3. update `docs/progress-during-buildathon.md` with commands and honest result;
4. update the relevant evidence artifact with integer denominators and failure
   IDs, without raw secrets;
5. mark the day's exit condition complete, incomplete, or contradicted;
6. list the next critical action and any approval packet that is now evidence-ready;
7. do not push, deploy, sign, message, accept, or submit without the matching
   private-register confirmation.

Routine progress is quiet unless it materially changes readiness, risk, or a
decision deadline. A critical-path miss, contradictory rule, external failure,
or ready owner decision is reported promptly.

## Submission recovery boundary

The submission is complete only after the final action returns a positive
confirmation and the entry can be re-opened from the account dashboard or
gallery. A click, spinner, disabled button, draft save, 100/100 readiness, or
uploaded project page is not proof of submission.

If the final action times out or the confirmation is ambiguous:

- do not click submit again immediately;
- inspect dashboard/gallery state and any returned identifier;
- preserve a timestamped screenshot and response state without personal data;
- if still ambiguous, explain the exact evidence and request renewed approval
  before any second irreversible submission attempt.
