# Security policy

## Current status

Realife is a Base Sepolia testnet MVP. Neither the application nor the
integrated contracts have received an independent security audit. The current
code is not approved for mainnet funds.

## Private reporting

Do not disclose an unpatched vulnerability, leaked secret, or exploit path in
a public issue. Use GitHub's private vulnerability reporting for this
repository. If it is unavailable, contact the maintainer through the verified
contact on the GitHub profile and request a private channel before sharing
details.

Please include the affected commit, reproduction steps, impact, and a safe
proof of concept. Do not access other users' data, submit real-value
transactions, or disrupt the public testnet service.

## High-value trust boundaries

- Wallet signing must remain client-controlled.
- AI routes are advisory and must not release escrow, refund funds, complete
  orders, or decide disputes.
- Order context may be sent to a model only after authorization.
- `DATABASE_URL`, authentication secrets, model keys, provider keys, admin
  credentials, and faucet private keys are server-only.
- `NEXT_PUBLIC_` variables are public by design and must never contain secrets.
- Admin and faucet wallets must never control production treasury funds.
- AI-derived semantic fields are mutable search data, not on-chain truth.

Before production use, commission independent application and contract audits,
add rate limits and abuse controls, verify deployed bytecode from published
Solidity sources, document incident response, and test backup/restore paths.

## Dependency audit snapshot

After a clean `npm ci` on 2026-07-26, `npm audit --omit=dev` reported 0
critical, 0 high, 22 moderate, and 16 low advisories. The remaining findings
are concentrated in the Web3Auth/Wagmi wallet-provider graph; several have no
non-breaking upstream fix. CI blocks critical/high regressions, and Dependabot
is configured for weekly updates. This snapshot is not a substitute for
reviewing the current advisory report.
