# Contributing

Contributions are welcome in small, reviewable pull requests.

1. Fork the repository and branch from the default branch.
2. Install exactly the locked graph with `npm ci`.
3. Copy `.env.example` to `.env.local`; never commit populated secrets.
4. Run `npm run verify`.
5. Describe behavior, tests, migrations, AI/provider impact, and transaction
   safety in the pull request.

Database changes require a Prisma migration. AI changes should include
versioned evaluation cases and document their provider/model assumptions.
Changes to contract addresses, enum mappings, mint/list/purchase logic, escrow,
or fulfillment state require explicit Base Sepolia test evidence.

Keep dependency upgrades separate from product behavior changes whenever
possible. Do not use real user content in tests without documented consent and
redaction.

By contributing, you agree that your contribution is licensed under Apache-2.0.
