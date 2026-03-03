export const realife1155Abi = [
  {
    type: "function",
    name: "mintFeeWei",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "createEdition",
    stateMutability: "payable",
    inputs: [
      { name: "supply", type: "uint256" },
      { name: "tokenURI", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "event",
    name: "EditionCreated",
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "supply", type: "uint256" },
      { indexed: false, name: "uri", type: "string" },
    ],
    anonymous: false,
  },
] as const;