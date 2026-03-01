export const REALIFE_1155_ABI = [
  {
    type: "function",
    name: "isVerified",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "createEdition",
    stateMutability: "nonpayable",
    inputs: [
      { name: "supply", type: "uint256" },
      { name: "tokenURI", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "EditionCreated",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "supply", type: "uint256", indexed: false },
      { name: "uri", type: "string", indexed: false },
    ],
    anonymous: false,
  },
] as const;