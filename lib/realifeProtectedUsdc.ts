export const REALIFE_BASE_SEPOLIA_CHAIN_ID = 84532 as const;

export const BASE_SEPOLIA_USDC_ADDRESS =
  (process.env.NEXT_PUBLIC_BASE_SEPOLIA_USDC_ADDRESS ||
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as `0x${string}`;

// Quantity/inventory protected ERC-1155 mint contract.
// Standard ERC-1155 mint stays in NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT.
// Protected goods/services mint goes here and supports supply > 1.
export const REALIFE_PROTECTED_1155_CONTRACT =
  (process.env.NEXT_PUBLIC_REALIFE_PROTECTED_1155_ADDRESS ||
    "0xf67a0c7209445Ae176C9Be1081814Ce37dD0fA7c") as `0x${string}`;

// Backward-friendly alias if some frontend files prefer this naming.
export const REALIFE_PROTECTED_1155_ADDRESS = REALIFE_PROTECTED_1155_CONTRACT;

// Quantity/inventory Protected Marketplace USDC contract.
export const REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT =
  (process.env.NEXT_PUBLIC_REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT ||
    "0x20F1128847028cdcBBcB0012Fc915737fCCd4e9D") as `0x${string}`;

export const REALIFE_PROTECTED_PAYMENT_USDC = {
  chainId: REALIFE_BASE_SEPOLIA_CHAIN_ID,
  symbol: "USDC",
  decimals: 6,
  tokenAddress: BASE_SEPOLIA_USDC_ADDRESS,
  marketplaceAddress: REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT,
  protected1155Address: REALIFE_PROTECTED_1155_CONTRACT,
} as const;

export function isAddressLike(v?: string | null): v is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(String(v || "").trim());
}

export function getProtected1155Address(): `0x${string}` {
  const addr = REALIFE_PROTECTED_1155_CONTRACT;
  if (!isAddressLike(addr)) {
    throw new Error("NEXT_PUBLIC_REALIFE_PROTECTED_1155_ADDRESS is missing or invalid");
  }
  return addr;
}

export function getProtectedUsdcMarketplaceAddress(): `0x${string}` {
  const addr = REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT;
  if (!isAddressLike(addr)) {
    throw new Error("NEXT_PUBLIC_REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT is missing or invalid");
  }
  return addr;
}

export function getBaseSepoliaUsdcAddress(): `0x${string}` {
  const addr = BASE_SEPOLIA_USDC_ADDRESS;
  if (!isAddressLike(addr)) {
    throw new Error("NEXT_PUBLIC_BASE_SEPOLIA_USDC_ADDRESS is missing or invalid");
  }
  return addr;
}
