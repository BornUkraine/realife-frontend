export const realife1155DeliveryAbi = [
  {
    type: "function",
    name: "mintFeeWei",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "nextTokenId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
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
    name: "allowedDeliveryMinters",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "creatorOf",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "primarySellerOf",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "maxSupply",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "deliveryEnabled",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "physicalItemIncluded",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "officialItem",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "uri",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },

  // actions
  {
    type: "function",
    name: "createDeliveryEdition",
    stateMutability: "payable",
    inputs: [
      { name: "supply", type: "uint256" },
      { name: "tokenURI", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "redeemBurn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setAllowedDeliveryMinter",
    stateMutability: "nonpayable",
    inputs: [
      { name: "wallet", type: "address" },
      { name: "allowed", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setPrimarySeller",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "newSeller", type: "address" },
    ],
    outputs: [],
  },

  // events
  {
    type: "event",
    name: "ProductCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: true, name: "seller", type: "address" },
      { indexed: false, name: "maxSupply", type: "uint256" },
      { indexed: false, name: "uri", type: "string" },
      { indexed: false, name: "deliveryEnabled", type: "bool" },
      { indexed: false, name: "physicalItemIncluded", type: "bool" },
      { indexed: false, name: "officialItem", type: "bool" },
    ],
  },
  {
    type: "event",
    name: "AllowedDeliveryMinterUpdated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "wallet", type: "address" },
      { indexed: false, name: "allowed", type: "bool" },
    ],
  },
  {
    type: "event",
    name: "PrimarySellerUpdated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "newSeller", type: "address" },
    ],
  },
] as const;