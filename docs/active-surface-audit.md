# Signal402 active submission surface audit

Status: **pre-event audit; no legacy removal is claimed as Buildathon work.**

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
| Go trading, portfolio, admin, auth, and market prototype | The Vercel product deploys the Next.js app; no active Next route proxies these Go endpoints | Do not deploy. Remove or move out of the final working tree during the official window if the agent feature does not require it; preserve history through the baseline tag |
| `back-end/PolyMarket/internal/middleware/x402.go` | `routes.go` never registers `X402Middleware`; its verifier returns `false` | Keep fail-closed until removal. Never cite it as the active x402 implementation |
| `back-end/PolyMarket/internal/handler/routes_example.go` | `//go:build ignore` excludes it from builds | Treat only as an inherited example and remove with the legacy Go surface if practical |
| Dormant React trading, order, position, wallet-dashboard, and admin components | Static import search found no imports from tracked `app` route entry points | Do not expose or demo. Remove during the official window if cleanly separable |
| `contracts/contracts/Lock.sol`, `InsightToken.sol`, and ` RewardPool.sol` | Hardhat sources are restricted to `contracts/src` | Remove from the final working tree; do not claim review, safety, deployment, or token economics |
| `X402_INTEGRATION.md` and `POLYMARKET_INTEGRATION.md` | Both describe historical Solana/mock ideas and contain non-production pseudocode | Warning banners added pre-event; remove or archive after the official start |

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
