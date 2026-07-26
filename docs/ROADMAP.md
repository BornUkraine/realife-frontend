# Open-source roadmap

The live MVP proves the connected product flow. The next phase turns that
working implementation into a reusable, independently inspectable open AI
project.

## Milestone 1 — reproducibility and security

- Publish verified Solidity sources, compiler settings, deployment scripts,
  addresses, and bytecode checks for every contract used by the public flow.
- Add authenticated quotas and abuse controls to upload/enrichment routes.
- Add end-to-end Base Sepolia tests for mint, list, purchase, fulfillment,
  release, refund, and dispute boundaries.
- Commission independent application and contract reviews and publish reports
  with remediation commits.
- Reduce the existing lint baseline and remaining low/moderate dependency debt.

## Milestone 2 — reusable AI components

- Extract model calls behind a documented provider interface.
- Add at least one reproducible open-weight reference configuration.
- Version prompts, JSON schemas, normalizers, fixtures, and provider settings.
- Package listing, enrichment, search, and advisory components so developers
  can run them without adopting the full marketplace.

## Milestone 3 — public evaluation

- Publish consented/redacted datasets and scoring code for all four systems.
- Report quality, latency, cost, failure slices, and rule-based fallback rates.
- Add human review protocols for creator acceptance and fulfillment usefulness.
- Track safety invariants separately from quality metrics.

## Milestone 4 — real usage

- Run structured onboarding with independent creators and small service
  providers.
- Measure listing completion, edits to AI fields, search success, completed
  testnet orders, and support load.
- Publish anonymized aggregate results and product changes driven by them.
- Build contributor issues around failures observed in the pilots.

## Definition of done

The open-source phase is complete when a new developer can clone the public
repositories, provision documented dependencies, run the test/evaluation
suites, reproduce a Base Sepolia deployment, and inspect every component that
can influence listing structure, discovery, or protected transaction guidance.
