# Architecture

## System boundary

Realife is currently split across two public repositories.

| Boundary | Responsibilities | Persistent state |
| --- | --- | --- |
| `realife-frontend` | Next.js UI and API routes, auth, marketplace/indexers, AI semantic index/search/fulfillment, wallet and contract interaction | PostgreSQL through Prisma |
| `realife-backend` | media intake, video poster extraction, listing suggestion, IPFS metadata preparation, read-only ERC-1155 metadata resolution | no application database |
| Base Sepolia contracts | ownership, mint/list/purchase and protected transaction state | blockchain |
| Model provider | multimodal/structured generation for configured AI routes | provider-dependent; requests set `store: false` where supported |
| Pinata/IPFS gateways | media and token metadata | content-addressed storage/gateway caches |

Contract ABIs are present in the application. Solidity sources and reproducible
deployment scripts are not present in either repository as of this document.

## Four connected AI systems

### 1. Multimodal listing assistant

The create UI sends an image or a poster extracted from video to the companion
backend. `/api/ai-suggest` requests strict structured output and normalizes
category, offer path, fulfillment type, title, description, and search tags.
The user can review the values before the wallet transaction.

### 2. Visual enrichment and semantic indexing

`/api/ai/nft-enrich` reads a verified mint's image/poster plus cached metadata.
It extracts visible text and normalized product, service, brand, location,
category, and discovery tags. The result is stored in PostgreSQL as
`NftAiIndex`; it is a mutable search layer, not immutable token metadata.

### 3. Natural-language trading search

`/api/ai/trading-search` converts a query to a strict allow-listed filter
object. Marketplace listing queries search normal metadata and the visual
index. When no model key is configured or the provider fails, a deterministic
multilingual rule parser provides a limited fallback.

### 4. Fulfillment assistant

`/api/ai/order-assist` first authenticates the viewer and verifies buyer,
seller, or support access. It combines order state, public messages, product
metadata, and a rule-based safety fallback. Model output may summarize, flag
risks, suggest checklists, and draft a message. It cannot mutate the order or
perform an on-chain action.

## Security invariants

- Private wallet keys never enter AI prompts.
- Server credentials must never use a `NEXT_PUBLIC_` name.
- An order-assistant request is authorized before order/message context is
  assembled.
- Model output is normalized and cannot directly invoke payment or escrow code.
- Value-changing actions require the existing wallet/application/contract
  authorization path.
- AI enrichment is clearly separated from immutable NFT metadata.

## Known architectural debt

- Model calls currently target OpenAI-specific endpoints; a tested provider
  interface and open-weight reference deployment are not yet implemented.
- Contract source and reproducible deployment provenance need their own public
  repository or inclusion here.
- The companion backend is a single large module and needs route/service
  decomposition.
- Public upload and enrichment endpoints need production rate limits, abuse
  controls, quotas, and stronger content validation.
- End-to-end evaluations must expand beyond the deterministic fallback suite.
