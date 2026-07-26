# AI evaluation plan

## What is reproducible today

`npm run eval:ai` runs a versioned, offline regression set against the
deterministic trading-search fallback. The fixture set covers English,
Ukrainian/Russian keywords, product delivery, digital services, local and
online services, locations, and sorting. CI fails if an expected safety-critical
filter changes.

This answers one narrow question: when the hosted model is unavailable, does
the fallback preserve the expected market and fulfillment classification?

It does **not** measure multimodal recognition, semantic retrieval quality,
hosted-model quality, creator usability, or fulfillment usefulness.

## Next public evaluations

| System | Dataset | Primary metrics | Safety checks |
| --- | --- | --- | --- |
| Listing assistant | consented creator media with reviewed listing fields | field accuracy, edit distance, time saved, creator acceptance rate | no invented claims, correct protected/standard selection |
| Visual enrichment | consented images/posters with human labels | OCR F1, tag precision/recall, location precision, coverage | no unsupported location/brand claims |
| Trading search | natural-language queries paired with relevant listings | filter exact match, Recall@K, nDCG@K, zero-result rate | invalid enum rate, price conversion error rate |
| Fulfillment assistant | synthetic and redacted order-state scenarios | next-step accuracy, checklist usefulness, human rating | never claims authority to release/refund/resolve |

## Evaluation protocol

1. Version datasets and prompts separately from production logs.
2. Collect explicit consent before including creator media or conversations.
3. Remove wallet-linked personal data and secrets.
4. Freeze model/provider/version and decoding settings for a run.
5. Publish aggregate results, known failure slices, and evaluator instructions.
6. Require a human review before changing transaction-routing rules.

The repository should not claim benchmark performance until the fixtures,
runner, raw outputs, and scoring code are published together.
