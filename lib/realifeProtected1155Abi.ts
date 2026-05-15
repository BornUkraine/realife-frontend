// Quantity/inventory ABI for RealifeProtected1155.
// Contract: 0xf67a0c7209445Ae176C9Be1081814Ce37dD0fA7c
// Supports protected supply > 1, pendingLockedBalance, completedLockedBalance.

export const realifeProtected1155Abi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_treasury",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_mintFeeWei",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_defaultRoyaltyBps",
        "type": "uint96",
        "internalType": "uint96"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "ProtectedTokenCreated",
    "anonymous": false,
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "creator",
        "type": "address",
        "internalType": "address",
        "indexed": true
      },
      {
        "name": "fulfillmentType",
        "type": "uint8",
        "internalType": "enum RealifeProtected1155.FulfillmentType",
        "indexed": false
      },
      {
        "name": "supply",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "uri",
        "type": "string",
        "internalType": "string",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "TokenURIUpdated",
    "anonymous": false,
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "uri",
        "type": "string",
        "internalType": "string",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "MarketplaceAuthorizationUpdated",
    "anonymous": false,
    "inputs": [
      {
        "name": "marketplace",
        "type": "address",
        "internalType": "address",
        "indexed": true
      },
      {
        "name": "authorized",
        "type": "bool",
        "internalType": "bool",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "LifecycleUpdated",
    "anonymous": false,
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "status",
        "type": "uint8",
        "internalType": "enum RealifeProtected1155.LifecycleStatus",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "PendingLocked",
    "anonymous": false,
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address",
        "indexed": true
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "PendingUnlocked",
    "anonymous": false,
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address",
        "indexed": true
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "CompletedLocked",
    "anonymous": false,
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address",
        "indexed": true
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "CompletedAsSBT",
    "anonymous": false,
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "buyer",
        "type": "address",
        "internalType": "address",
        "indexed": true
      }
    ]
  },
  {
    "type": "event",
    "name": "ReturnedToSellerAndReactivated",
    "anonymous": false,
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "seller",
        "type": "address",
        "internalType": "address",
        "indexed": true
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "TokenInvalidated",
    "anonymous": false,
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "status",
        "type": "uint8",
        "internalType": "enum RealifeProtected1155.LifecycleStatus",
        "indexed": false
      },
      {
        "name": "burned",
        "type": "bool",
        "internalType": "bool",
        "indexed": false
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "TreasuryUpdated",
    "anonymous": false,
    "inputs": [
      {
        "name": "treasury",
        "type": "address",
        "internalType": "address",
        "indexed": true
      }
    ]
  },
  {
    "type": "event",
    "name": "MintFeeUpdated",
    "anonymous": false,
    "inputs": [
      {
        "name": "feeWei",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "PausedSet",
    "anonymous": false,
    "inputs": [
      {
        "name": "paused",
        "type": "bool",
        "internalType": "bool",
        "indexed": false
      }
    ]
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOfBatch",
    "inputs": [
      {
        "name": "accounts",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "ids",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setApprovalForAll",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "approved",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isApprovedForAll",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "safeTransferFrom",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "safeBatchTransferFrom",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "ids",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "values",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "supportsInterface",
    "inputs": [
      {
        "name": "interfaceId",
        "type": "bytes4",
        "internalType": "bytes4"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalSupply",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalSupply",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "exists",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "royaltyInfo",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "salePrice",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "royaltyAmount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "nextTokenId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "maxSupply",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "creatorOf",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "fulfillmentTypeOf",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum RealifeProtected1155.FulfillmentType"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lifecycleOf",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum RealifeProtected1155.LifecycleStatus"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "completedSBT",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "invalidated",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "completedBuyerOf",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingLockedBalance",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "completedLockedBalance",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingLockedTotal",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "completedLockedTotal",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "authorizedMarketplace",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "mintFeeWei",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "treasury",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "paused",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "uri",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setTokenURI",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "tokenURI",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createProtected",
    "inputs": [
      {
        "name": "fulfillmentType",
        "type": "uint8",
        "internalType": "enum RealifeProtected1155.FulfillmentType"
      },
      {
        "name": "tokenURI",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "createProtected",
    "inputs": [
      {
        "name": "fulfillmentType",
        "type": "uint8",
        "internalType": "enum RealifeProtected1155.FulfillmentType"
      },
      {
        "name": "tokenURI",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "marketplaceMintTo",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "creator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "fulfillmentType",
        "type": "uint8",
        "internalType": "enum RealifeProtected1155.FulfillmentType"
      },
      {
        "name": "tokenURI",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "marketplaceMintTo",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "creator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "fulfillmentType",
        "type": "uint8",
        "internalType": "enum RealifeProtected1155.FulfillmentType"
      },
      {
        "name": "tokenURI",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "markInEscrow",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "markInEscrow",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "seller",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "lockPending",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "completePendingAsLocked",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "markCompletedAsSBT",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "buyer",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unlockPendingForRefund",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "markReturnedToSeller",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "seller",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "markReturnedToSeller",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "seller",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "markRefundedAndBurn",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "holder",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "markRefundedAndBurn",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "holder",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "markCancelledAndBurn",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "holder",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "markCancelledAndBurn",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "holder",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "markInvalidated",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "redeemBurn",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "redeemBurn",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "lockedBalanceOf",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "pending",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "completed",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalLocked",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferableBalance",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isFinal",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isTransferable",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokenState",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "fulfillmentType",
        "type": "uint8",
        "internalType": "enum RealifeProtected1155.FulfillmentType"
      },
      {
        "name": "lifecycle",
        "type": "uint8",
        "internalType": "enum RealifeProtected1155.LifecycleStatus"
      },
      {
        "name": "soulbound",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "isInvalidated",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "creator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "completedBuyer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenURI",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokenQuantityState",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "supply",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "pendingTotal",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "completedTotal",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "unlockedTotal",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "lifecycle",
        "type": "uint8",
        "internalType": "enum RealifeProtected1155.LifecycleStatus"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setAuthorizedMarketplace",
    "inputs": [
      {
        "name": "marketplace",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "authorized",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setTreasury",
    "inputs": [
      {
        "name": "t",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setMintFeeWei",
    "inputs": [
      {
        "name": "feeWei",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setPaused",
    "inputs": [
      {
        "name": "v",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setDefaultRoyalty",
    "inputs": [
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "feeNumerator",
        "type": "uint96",
        "internalType": "uint96"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "deleteDefaultRoyalty",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
] as const;
