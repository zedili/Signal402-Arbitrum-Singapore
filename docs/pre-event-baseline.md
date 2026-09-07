# Signal402 pre-event baseline

This document separates work that already existed before the Arbitrum Open
House Singapore Buildathon from qualifying implementation completed during the
official event window. Never describe a pre-event item as “built during the
Buildathon.”

## Standalone immutable public reference

- Repository: https://github.com/zedili/Signal402-Arbitrum-Singapore
- Tag: `arbitrum-singapore-pre-event-2026-09-07`
- Commit: `20a4d0d2b07ef33be5d6246d112e8d5eff687e20`
- Tree: `326a47024de0e47773950869cb6269e39bbc6826`
- Recorded: Sep 7, 2026, before the Sep 14 official start
- Public tag status: pushed to `origin` on Sep 7, 2026 after owner approval
- Annotated tag object: `7f585ad238d9736552c31bdde427a0ee12d9caf5`

The standalone tag points to the imported product tree plus the event-specific
repository and provenance documentation. It is the primary before/after
reference for the final Buildathon submission.

## Original source reference

- Tag: `arbitrum-singapore-pre-event-2026-08-31`
- Commit: `ea31aae7d177644c8a42dcceddde133df5e16a0d`
- Tree: `62961668af0d33306645057e08baa8066ec07eb4`
- Recorded: Aug 31, 2026, before the Sep 14 official start
- Public tag status: pushed to `origin` on Aug 31, 2026 after owner approval
- Annotated tag object: `91a420b9d3eddac40689198a9da6eaee7ea27bec`

The original baseline tag points to the complete source-repository state, including product
code, tests, videos, judging material, and the terms/workplan review available
at the time it was created.

## Key artifact blob IDs

These Git object IDs make later before/after comparisons unambiguous:

| Artifact | Baseline Git blob |
| --- | --- |
| x402 server flow | `a049db7fd32a5e1998a07161d29529c54298ffa1` |
| Paid analysis route | `477af9194305b3534a66e153f76f43cf95a7f1e2` |
| `Signal402Registry.sol` | `606ca60b84870746f76179034ba0dedc9668944c` |
| Demo video | `d19d171e5ada7bf0c96957106c171110d831b37d` |
| Pitch video | `45de8275bf984c5f08014e4aadac737a851703b6` |

## Features that are explicitly pre-event

- Live Polymarket market lists and detail views.
- The human-facing structured DeepSeek report.
- The x402 v2 `POST /api/analysis` payment gate.
- Browser-wallet EIP-3009 test-USDC authorization.
- Fail-closed behavior that avoids settlement after provider failure.
- The deployed production app at https://signal402.vercel.app.
- Two successful Arbitrum Sepolia x402 settlement receipts.
- The deployed and Sourcify-verified `Signal402Registry` contract.
- Existing frontend, protocol, contract, and Go tests.
- Existing HackQuest project copy, cover, demo video, pitch video, and 100/100
  project readiness.

These assets prove that the starting project is real and functional. They are
not the evidence for more-than-trivial in-window development.

## Pre-event public deployment state

In the original source repository, `origin/main` was
`ab6e455e835396e4f88798a95ca259818cf3710d`. The owner subsequently approved
the public push of the baseline tag and preparation commits. As of the final
Aug 31 pre-event audit, commits after the tag changed only documentation; they
did not add the planned in-window product functionality. Use the tag target,
not the moving `main` branch, as the before/after comparison point.

## In-window evidence rules

After Sep 14, 2026:

1. Continue implementation from the then-current `main`; do not reset, rebase,
   or create the working branch directly from the Sep 7 tag, because later
   pre-event commits contain documentation and evidence controls that must be
   preserved.
2. Record the final pre-event `main` commit before the first implementation
   change. Treat commits between the immutable tag and that kickoff commit as
   pre-event documentation only, not qualifying Buildathon work.
3. Use the standalone Sep 7 tag as the immutable product comparison point for
   judging and the final before/after diff.
4. Keep qualifying code, test, deployment, and evidence commits inside the
   official window.
5. Maintain `docs/progress-during-buildathon.md` as a commit-linked changelog.
6. Record production deployment identifiers and transaction receipts.
7. Compare changed source and behavior against this tag, while separately
   identifying the final pre-event docs-only `main` commit.
8. Update HackQuest's Progress During Hackathon field with only the verified
   post-baseline work.

The final submission should link this baseline and the post-event head so a
judge can independently inspect the substantive difference.
