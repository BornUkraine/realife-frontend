export const marketplaceSpot1155Abi = [
  {
    type: "function",
    name: "listings",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "seller", type: "address" },
      { name: "nft", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "pricePerUnitWei", type: "uint256" },
      { name: "amountTotal", type: "uint256" },
      { name: "amountRemaining", type: "uint256" },
      { name: "status", type: "uint8" }, // enum Status
    ],
  },
  {
    type: "function",
    name: "allowedNft",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "feeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint96" }],
  },
  {
    type: "function",
    name: "treasury",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "nextListingId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  // --- actions ---
  {
    type: "function",
    name: "list1155",
    stateMutability: "nonpayable",
    inputs: [
      { name: "nft", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "pricePerUnitWei", type: "uint256" },
    ],
    outputs: [{ name: "listingId", type: "uint256" }],
  },
  {
    type: "function",
    name: "cancel",
    stateMutability: "nonpayable",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "buy",
    stateMutability: "payable",
    inputs: [
      { name: "listingId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },

  // --- events ---
  {
    type: "event",
    name: "Listed",
    anonymous: false,
    inputs: [
      { indexed: true, name: "listingId", type: "uint256" },
      { indexed: true, name: "seller", type: "address" },
      { indexed: true, name: "nft", type: "address" },
      { indexed: false, name: "tokenId", type: "uint256" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "pricePerUnitWei", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Cancelled",
    anonymous: false,
    inputs: [
      { indexed: true, name: "listingId", type: "uint256" },
      { indexed: true, name: "seller", type: "address" },
      { indexed: true, name: "nft", type: "address" },
      { indexed: false, name: "tokenId", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Bought",
    anonymous: false,
    inputs: [
      { indexed: true, name: "listingId", type: "uint256" },
      { indexed: true, name: "seller", type: "address" },
      { indexed: true, name: "buyer", type: "address" },
      { indexed: false, name: "nft", type: "address" },
      { indexed: false, name: "tokenId", type: "uint256" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "pricePerUnitWei", type: "uint256" },
      { indexed: false, name: "totalPriceWei", type: "uint256" },
    ],
  },
] as const;