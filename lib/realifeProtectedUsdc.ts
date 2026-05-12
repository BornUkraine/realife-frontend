export const REALIFE_BASE_SEPOLIA_CHAIN_ID = 84532 as const;

export const BASE_SEPOLIA_USDC_ADDRESS =
  (process.env.NEXT_PUBLIC_BASE_SEPOLIA_USDC_ADDRESS ||
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as `0x${string}`;

export const REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT =
  (process.env.NEXT_PUBLIC_REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT ||
    "0x67e7472E48083DE3Ec8416CB8349448B1B39f1ae") as `0x${string}`;

export const REALIFE_PROTECTED_PAYMENT_USDC = {
  chainId: REALIFE_BASE_SEPOLIA_CHAIN_ID,
  symbol: "USDC",
  decimals: 6,
  tokenAddress: BASE_SEPOLIA_USDC_ADDRESS,
  marketplaceAddress: REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT,
} as const;

export function isAddressLike(v?: string | null): v is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(String(v || "").trim());
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
