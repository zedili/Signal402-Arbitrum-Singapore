# Signal402 active submission surface audit

Status: **Sep 14 cleanup completed in `36cea75`; this maintenance is not claimed
as the substantive Buildathon feature.**

This audit distinguishes the deployed Signal402 product from inherited source
that remains in the immutable baseline. It protects the information-only claim
and prevents dormant trading or token experiments from being presented as
current functionality.

## Active production surface

The Sep 7, 2026 production build exposes these Next.js routes:

| Route | Purpose | Active evidence |
| --- | --- | --- |
| `/` | Signal402 product overview and live-market entry | Production HTTP 200 |
| `/markets` | Live normalized Polymarket list | Next.js build and production data check |
| `/markets/[id]` | Market detail and paid-report UI | Next.js build and live route behavior |
| `/api/markets` | Server-normalized market list | Imported by the active market page |
| `/api/markets/[id]` | Server-normalized market detail | Imported by the active detail page |
| `/api/analysis` | Current human-facing x402 paid report | Unpaid 402 and two prior Sepolia settlement receipts |
| `/api/analysis/status` | Server-side provider readiness | Production response `{"ready":true}` on Sep 7 |

The active contract surface is only
`contracts/src/Signal402Registry.sol`. `contracts/hardhat.config.ts` explicitly
sets `sources` to `./src` and tests to `./test-active`, so the legacy contracts
under `contracts/contracts` are neither compiled nor tested by the Buildathon
contract job.

## Inherited inactive surface

| Surface | Evidence that it is inactive | Final-submission treatment |
| --- | --- | --- |
| Go trading, portfolio, admin, auth, and market prototype | The Vercel product deploys the Next.js app; no active Next route proxies these Go endpoints | Removed from the working tree in `36cea75`; preserved in the immutable baseline tag |
| Legacy Go x402 middleware and ignored routes example | The router never registered the middleware; the example had `//go:build ignore` | Removed with the Go prototype in `36cea75`; never cite it as the active x402 implementation |
| Dormant React trading, order, position, wallet-dashboard, admin, mock-data, and obsolete API surfaces | Static import search found no imports from tracked `app` route entry points | Removed in `36cea75`; the active market client was reduced to read-only list/detail calls |
| `contracts/contracts/Lock.sol`, `InsightToken.sol`, and ` RewardPool.sol` | Hardhat sources are restricted to `contracts/src` | Removed in `36cea75`; only `contracts/src/Signal402Registry.sol` remains in the contract source surface |
| `X402_INTEGRATION.md` and `POLYMARKET_INTEGRATION.md` | Both described historical Solana/mock ideas and contained non-production pseudocode | Removed in `36cea75`; preserved in the immutable baseline tag |

## Claim controls

- “Signal402 does not place trades” refers to the deployed Next.js product and
  its active routes. Never imply that every inherited file is production-ready.
- The current x402 evidence comes only from
  `front-end/src/lib/x402/server.ts`, the protected Next.js analysis route, its
  tests, the production 402 response, and verified Arbitrum Sepolia receipts.
- The only submitted onchain component is the hash-only registry at the
  canonical address documented in `docs/registry-deployment-runbook.md`.
- Do not describe deletion of inherited code as the substantive in-window
  innovation. The agent protocol, proof bundle, failure coverage, deployment,
  and receipts must independently prove more-than-trivial development.

## Sep 14 cleanup gate

After the official start is verified and the final pre-event `main` commit is
recorded:

1. Confirm the target agent feature needs none of the inherited Go, trading,
   wallet-dashboard, or token-economics files.
2. Remove or archive only the inactive files proven outside the active import,
   build, deployment, and test graph.
3. Run the full frontend and contract gates before and after cleanup. Run the Go
   gate before cleanup and again afterward if any Go module remains.
4. Record the cleanup commit separately from the substantive agent feature.
5. Re-run the active-route and secret scans from a clean checkout.

Completed Sep 14, 2026 at commit `36cea75a1ef78e8c25f7a3f8fe016361f69807be`:

- the planned agent protocol needs none of the removed Go, trading, mock,
  wallet-dashboard, token-economics, or historical integration surfaces;
- the removal deleted 159 tracked files and retained the active Next.js market,
  report-payment, wallet-authorization, and registry sources;
- `typeit` and its unused component were removed, resolving the identified GPL
  distribution gate; the obsolete Axios/auth client was also removed;
- the legacy symbol scan and Go-module scan returned no matches;
- the 163-file secret scan, production dependency audit, 3/3 frontend baseline
  tests, TypeScript check, production build, and 3/3 registry tests passed.
