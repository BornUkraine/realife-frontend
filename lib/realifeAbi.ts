export const TRANSFER_EVENT = {
  anonymous: false,
  inputs: [
    { indexed: true, internalType: "address", name: "from", type: "address" },
    { indexed: true, internalType: "address", name: "to", type: "address" },
    { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
  ],
  name: "Transfer",
  type: "event",
} as const;

export const REALIFE_ABI = [
  // mint(string tokenURI) returns (uint256)
  {
    inputs: [{ internalType: "string", name: "tokenURI", type: "string" }],
    name: "mint",
    outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },

  // mintTo(address to, string tokenURI) returns (uint256)
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "string", name: "tokenURI", type: "string" },
    ],
    name: "mintTo",
    outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },

  // tokenURI(uint256 tokenId) view returns (string)
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },

  // nextTokenId() view returns (uint256)
  {
    inputs: [],
    name: "nextTokenId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },

  // balanceOf(address owner) view returns (uint256)
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },

  // ownerOf(uint256 tokenId) view returns (address)
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },

  // event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
  TRANSFER_EVENT,
] as const;
