# Signal402 Sep 14 kickoff runbook

Status: **pre-event execution plan. Do not run the implementation steps early.**

The Terms name Sep 14, 2026 as the start date without a precise start time.
HackQuest displays the submission window opening at Sep 14, 2026 01:01 in the
owner's UTC+8 browser session. To avoid beginning during the ambiguous first
hour, the safe implementation start is:

> **Not before Sep 14, 2026 01:01 UTC+8, and only after the official event page
> visibly shows the submission/build window as open.**

If the organizer supplies a later controlling time, use the later time. A page
error, countdown discrepancy, or missing portal state is not permission to
start.

## Phase 1: verify the event clock

Perform these checks at or after the safe start time:

1. Record the local time with UTC offset and the corresponding UTC time.
2. Open the official HackQuest event Schedule tab and verify the window is open.
3. Re-open all 14 pages of the official Singapore Terms and compare the event
   period, deadline, eligibility, existing-project, originality, AI, prize, and
   data/IP language with `docs/terms-risk-review.md`.
4. Download the official PDF through the normal browser flow if available and
   record its SHA-256. Do not bypass a security checkpoint to obtain it.
5. Check the organizer email thread. Record any reply exactly; do not answer or
   make a commitment without owner approval.
6. Check Workshops & Sessions and only the Discord content visible without
   joining. Accepting a Discord invitation remains a separate owner decision.

Stop before implementation if the portal is not visibly open, the Terms became
more restrictive, or the organizer says the existing-project/AI plan is
ineligible.

## Phase 2: freeze the final pre-event state

Run read-only Git checks from the standalone repository:

```powershell
git status --short --branch
git fetch --tags origin
git rev-parse HEAD
git rev-parse origin/main
git rev-parse 'arbitrum-singapore-pre-event-2026-09-07^{commit}'
git rev-parse 'arbitrum-singapore-pre-event-2026-09-07^{tree}'
git ls-remote --tags origin arbitrum-singapore-pre-event-2026-09-07
git log --reverse --format="%H %aI %s" arbitrum-singapore-pre-event-2026-09-07..HEAD
git diff --name-status arbitrum-singapore-pre-event-2026-09-07..HEAD
```

Expected immutable product baseline:

- Tag: `arbitrum-singapore-pre-event-2026-09-07`
- Commit: `20a4d0d2b07ef33be5d6246d112e8d5eff687e20`
- Tree: `326a47024de0e47773950869cb6269e39bbc6826`

Confirm that every commit after the tag and before the recorded kickoff head is
pre-event documentation or evidence control. Do not reset, rebase, amend, or
branch from the tag. Continue from the then-current local `main` so the full
pre-event record remains in history.

If local `main` is ahead of `origin/main`, record both hashes. Do not push merely
to make them equal; public push still requires the owner's exact approval.

## Phase 3: record kickoff before code

Before changing any product source:

1. Fill the Kickoff record in `docs/progress-during-buildathon.md` with the
   verified UTC+8 time, official source, final pre-event `main` commit, Terms
   URL/hash or checkpoint limitation, and portal state.
2. Add the official-page screenshot filename or capture reference to the local
   evidence notes without exposing account or personal data.
3. Commit only that kickoff record with an in-window timestamp.
4. Re-run the pre-event test commands once so failures can be separated from
   later implementation regressions.

The kickoff record commit is documentation evidence. Do not count it as the
required more-than-trivial development.

## Phase 4: establish the engineering baseline

Run these gates before the first feature edit:

```powershell
pnpm --dir front-end install --frozen-lockfile
pnpm --dir front-end security:secrets
pnpm --dir front-end audit --prod --audit-level high
pnpm --dir front-end test
pnpm --dir front-end check
pnpm --dir front-end build
npm --prefix contracts ci
npm --prefix contracts audit --omit=dev --audit-level=high
npm --prefix contracts test
go test ./...
```

Run `go test ./...` from `back-end/PolyMarket`. Also repeat the full contract
development-dependency audit and follow the risk treatment in
`docs/buildathon-workplan.md` before any owner-approved transaction.

Record exact versions of Node, pnpm, npm, Go, Git, and the operating system. Do
not update dependencies before this baseline run; otherwise a toolchain change
could hide a pre-existing failure.

## Phase 5: begin substantive in-window work

Use this order:

1. Apply the proven inactive-surface cleanup in
   `docs/active-surface-audit.md`, recording it separately from the feature.
2. Resolve dependency-license and visual-provenance gates without claiming the
   cleanup as the innovation.
3. Implement the versioned agent endpoint and proof bundle from
   `docs/agent-protocol-wireframe.md`.
4. Add the agent client, evaluation harness, deterministic registry call
   preview, event-decoded attestation ID, and typed failure coverage.
5. Keep `docs/progress-during-buildathon.md` linked to exact commits and tests
   after every substantive change.

Local implementation and tests inside the verified window are authorized by
the participation objective. The following still require separate approval:

- any public push, tag, release, project-field edit, or deployment;
- any wallet signature, x402 payment, registry transaction, faucet claim, or
  contract deployment;
- any organizer message, Discord join, or sensitive-data transmission;
- any track choice, Terms acceptance, final submission, AML/KYC action, or
  prize/grant agreement.

Read the private owner decision register before any such action.
