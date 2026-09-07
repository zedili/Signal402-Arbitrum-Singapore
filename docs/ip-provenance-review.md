# Signal402 IP and provenance review

This review supports the originality, non-infringement, and authority
representations required by the Singapore Buildathon terms. It is an evidence
checklist, not a legal conclusion.

## Repository authorship

The repository root commit is attributed to `zedili`, while the current event
preparation is primarily attributed to `zdl`. The owner confirmed on Aug 31,
2026 that both aliases belong to the same person. The Git history also contains
material commits from `wuyangfan`, plus smaller contributions under
`123skkda`, `zhaohaisen`, `Aist\\Administrator`, and `User`; the owner confirmed
that these were early project-team members and that their work is authorized
for use in the submission.

The final submission must continue to distinguish the current solo Buildathon
team from the historical project team. Preserve contributor history and do not
claim that the pre-existing contributions were created by the solo founder or
during this Buildathon.

The owner requested public acknowledgment of the early project team. Use the
public Git author names `wuyangfan`, `123skkda`, and `zhaohaisen` in an
acknowledgments section without treating them as registered Buildathon team
members, publishing private contact details, or inventing GitHub handles.

Before final submission, re-confirm only if project ownership or contributor
status changes:

- which aliases belong to the owner;
- whether every other contributor authorized inclusion of their work in this
  repository and in a public Buildathon submission;
- whether any contributor should be named or invited as a team member;
- whether earlier contributions were produced as work-for-hire, under an
  employment agreement, under another license, or with other restrictions;
- that the solo-team description refers to the current Buildathon team and does
  not erase required attribution for the pre-existing project.

Multiple historical Git authors are not automatically disqualifying because
the official materials allow an existing project subject to in-window
development. The risk is making an inaccurate ownership, originality, or team
representation.

## Repository license

There is currently no top-level `LICENSE` or `COPYING` file. A public GitHub
repository without a license is viewable but does not automatically grant broad
reuse rights.

Do not add an MIT, Apache, GPL, or other project-wide license without explicit
owner authority and confirmation that every included contribution can be
licensed on those terms. If the final submission form requires an open-source
license, treat license selection as a blocking owner decision.

The Solidity registry contains an SPDX MIT identifier, but that source-file
header does not establish a license for the entire repository.

## Media and visual assets

| Asset group | Git provenance | Rights status |
| --- | --- | --- |
| `hero-bg.jpg` | Added in the Dec 2025 frontend initialization by `wuyangfan` | Replace during the official event window with a newly created, provenance-recorded asset |
| Original AI/crypto/stocks/tech icons | Added in the same Dec 2025 initialization | Replace during the official event window with newly created, provenance-recorded assets |
| Processed icon variants | Derived repository assets | Replace together with the originals |
| Signal402 project cover | Added by `zdl` on Aug 28, 2026 | Confirm authoring/generation source and any input assets |
| Demo and pitch videos | Added by `zdl` on Aug 28, 2026 | Confirm narration, music, fonts, screenshots, and embedded assets |
| Pitch PPTX | Added by `zdl` on Aug 28, 2026 | Confirm slide media, logos, fonts, screenshots, and claims |

The available repository documentation contains no source, license, or
attribution record for the inherited raster assets. The owner chose replacement
during the official event window. Record the creation prompts or source files,
date, author/tool, input rights, and final hashes for every replacement.

Replacing inherited visuals during the event can also form part of the honest
in-window design work, but it must not be used to disguise third-party code or
other contributions.

## Third-party services and data

Signal402 uses or references Polymarket public market data, DeepSeek output,
official x402 packages, Circle test USDC, PayAI's facilitator, Arbitrum,
Sourcify, Arbiscan, Vercel, and open-source package dependencies. Before the
final submission:

- retain product and protocol names only for accurate descriptive use;
- do not imply sponsorship, endorsement, partnership, or ownership;
- comply with current API and service terms;
- preserve open-source notices required by distributed dependencies;
- keep external market descriptions and model outputs out of onchain storage;
- avoid embedding third-party logos or screenshots unless their use is
  permitted and documented.

## Presentation audit status

The seven-slide local pitch deck was rendered and inspected at full resolution
on Sep 7, 2026. Its package-integrity and canvas-overflow checks passed, the
deck uses Aptos and Aptos Display, and no visible secret was found. The deck
contains two embedded first-party product screenshots and no other raster
media:

| Embedded media | Visible content | SHA-256 | Repository match |
| --- | --- | --- | --- |
| `ppt/media/image.jpeg` | Signal402 homepage screenshot | `996304de564b6811191056c61f0977d026b8015f81458829ebc74d3652091868` | None; embedded only |
| `ppt/media/image2.jpeg` | Signal402 live-markets screenshot | `fdf646aa6a1e5db138d4e80e41b94eab8f0642d147a0c06caff18df2549fd906` | None; embedded only |

The inspection found several items that must be corrected in the final
in-window deck:

- All seven speaker-note source blocks still point to the historical
  `X402AiPolyMarket` repository. Replace them with the standalone event
  repository and commit-specific evidence.
- Slides 1 and 4 cite the temporary Vercel preview in their notes. Replace it
  with `https://signal402.vercel.app` and a final in-window deployment URL or
  identifier.
- Slide 6 says there are two x402 protocol tests and two smart-contract tests.
  The Sep 7 baseline already has three of each; replace these counts with the
  final verified test results rather than carrying the stale numbers forward.
- Slide 7 lists permanent deployment and a live testnet payment as future work,
  although both are already pre-event baseline accomplishments. Recast this
  slide around the actual in-window result and remaining roadmap.
- Slide 7 says the solo founder owns product and implementation delivery end to
  end without acknowledging the authorized historical project team. Preserve
  the solo Buildathon-team description, but add a concise historical-baseline
  acknowledgment consistent with the repository and submission copy.
- Refresh the two screenshots after the official implementation window begins
  so the deck shows the final submitted build. Record their capture source,
  time, author/tool, and hashes.

This review did not verify the generation history or input rights of the two
embedded screenshots, and the local browser security boundary prevented a
frame-by-frame or audio inspection of the MP4 files. Those rights remain owner
confirmation gates.

Before publishing an updated deck or video, complete all of the following:

- inspect every slide at full resolution;
- verify visible claims against current evidence and terms;
- add or confirm source notes for externally sourced claims and assets;
- remove any claim that pre-event work was built during the Buildathon;
- replace the Oct 4 deadline with the conservative Sep 30 internal target or
  omit the date;
- verify that no private key, API key, wallet recovery detail, email address, or
  other sensitive data is visible;
- verify all image, logo, font, music, narration, and screenshot rights.

## Owner confirmations required

Do not make the final originality/IP declaration until the owner confirms:

1. Re-confirm the historical contributor authorization if any ownership fact
   changes. The current owner statement resolves this gate operationally.
2. Complete and document the chosen in-window replacement of inherited images
   and icons.
3. The rights to the project cover, deck, videos, narration, music, fonts, and
   screenshots.
4. Whether to keep the repository unlicensed or adopt a specific license.
5. The accuracy of the solo-founder plus AI-agent disclosure.
