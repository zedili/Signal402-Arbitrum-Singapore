# Signal402 dependency-license preflight

Status: **Sep 7, 2026 pre-event inventory; not legal advice.**

This review identifies license work that must be completed against the final
in-window dependency and deployment artifact. It does not select or grant a
project-wide license.

## Frontend production inventory

`pnpm licenses list --prod --json` reported 210 package entries across these
declared license groups:

| Declared license | Package entries | Preflight treatment |
| --- | ---: | --- |
| MIT | 193 | Preserve required license notices |
| Apache-2.0 | 8 | Preserve licenses and any required notices |
| ISC | 3 | Preserve notices |
| 0BSD | 1 | Preserve notice |
| BSD-3-Clause | 1 | Preserve notice |
| CC-BY-4.0 | 1 | Preserve attribution for the packaged Browserslist dataset |
| Apache-2.0 AND LGPL-3.0-or-later | 1 | Platform-specific Sharp binary; re-audit the actual Linux deployment artifact and preserve notices/source-offer obligations if applicable |
| GPL-3.0 | 1 | `typeit`; resolve before final distribution |
| GSAP Standard “no charge” license | 1 | `gsap`; verify allowed use and preserve the applicable notice or replace it |

No unknown, unlicensed, AGPL, or SSPL group appeared in this production list.
That observation applies only to the installed Sep 7 Windows dependency tree,
not to the final Linux deployment artifact.

## Items requiring in-window action

### `typeit`

- `typeit@8.8.7` is a direct production dependency and declares GPL-3.0.
- The only tracked import is in `src/components/TypeItText.tsx`.
- Static import search found no activity-route or component import of
  `TypeItText`, so the package appears unused by the submitted UI.
- Preferred action after the official start: remove the unused component and
  dependency, rebuild, and prove that the route output is unchanged.
- If later work makes it active, stop and review GPL distribution obligations
  before public release rather than silently bundling it.

### `gsap`

- `gsap@3.14.2` is a direct production dependency under the GSAP Standard “no
  charge” license reported by pnpm.
- `src/hooks/useScrollAnimation.ts` imports GSAP, and the active homepage uses
  `AnimatedMarketCard`, which uses that hook.
- Preferred action during the provenance-clean visual refresh: replace this
  animation path with CSS or an already-MIT-licensed dependency if the result
  stays clear and accessible. Otherwise document the exact GSAP license terms
  and required notice for this use before final release.

### Sharp platform package

The installed Windows tree includes `@img/sharp-win32-x64` under a combined
Apache/LGPL declaration. Vercel builds for Linux, so the final audit must inspect
the dependency tree and notices from the actual deployment build rather than
copying the Windows package list as proof.

## Contract and legacy Go surfaces

The contract package's only production dependency is
`@openzeppelin/contracts@5.4.0`, which declares MIT. Preserve its notice in the
final third-party notice set.

The Go module belongs to the inherited, inactive backend identified in
`docs/active-surface-audit.md`. If it is removed from the final working tree,
its transitive license set is outside the distributed submission surface. If
any Go code remains, generate and review a complete Go license manifest before
submission.

## Final release gate

After all in-window dependency changes and before an owner-approved public
release:

1. Generate production-only license inventories from a clean checkout and the
   actual deployment platform.
2. Confirm `typeit` is removed or explicitly approved after GPL review.
3. Confirm GSAP is replaced or its current license and notice requirements are
   satisfied.
4. Generate a repository `THIRD_PARTY_NOTICES` artifact covering the code that
   is actually distributed.
5. Keep the project-level license decision separate. Do not add MIT, Apache,
   GPL, or another top-level license without owner authority and contributor
   rights sufficient for relicensing.
