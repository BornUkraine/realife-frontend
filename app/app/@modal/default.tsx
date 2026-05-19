// PATH: app/app/@modal/default.tsx
//
// Required for parallel routes. When the current /app/... URL is NOT an
// intercepted NFT route, this slot renders nothing. Without this file
// Next.js would 404 every non-modal page under /app.

export default function ModalSlotDefault() {
  return null;
}
