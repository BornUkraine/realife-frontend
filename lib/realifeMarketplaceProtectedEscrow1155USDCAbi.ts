// Quantity/inventory ABI for RealifeMarketplaceProtectedEscrow1155USDC.
// Contract: 0x20F1128847028cdcBBcB0012Fc915737fCCd4e9D
// Supports list amount, buy amount, pending lock, completed lock, refund return, moderators.

export const realifeMarketplaceProtectedEscrow1155USDCAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_treasury",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_feeBps",
        "type": "uint96",
        "internalType": "uint96"
      },
      {
        "name": "_usdc",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "AllowedNftSet",
    "anonymous": false,
    "inputs": [
      {
        "name": "nft",
        "type": "address",
        "internalType": "address",
        "indexed": true
      },
      {
        "name": "allowed",
        "type": "bool",
        "internalType": "bool",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "TreasurySet",
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
    "name": "FeeBpsSet",
    "anonymous": false,
    "inputs": [
      {
        "name": "feeBps",
        "type": "uint96",
        "internalType": "uint96",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "ModeratorSet",
    "anonymous": false,
    "inputs": [
      {
        "name": "moderator",
        "type": "address",
        "internalType": "address",
        "indexed": true
      },
      {
        "name": "allowed",
        "type": "bool",
        "internalType": "bool",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "Listed",
    "anonymous": false,
    "inputs": [
      {
        "name": "listingId",
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
        "name": "nft",
        "type": "address",
        "internalType": "address",
        "indexed": true
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "pricePerUnitUsdc",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "fulfillmentType",
        "type": "uint8",
        "internalType": "enum RealifeMarketplaceProtectedEscrow1155USDC.FulfillmentType",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "Cancelled",
    "anonymous": false,
    "inputs": [
      {
        "name": "listingId",
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
        "name": "nft",
        "type": "address",
        "internalType": "address",
        "indexed": true
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "amountReturned",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "PurchaseFunded",
    "anonymous": false,
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "listingId",
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
        "name": "buyer",
        "type": "address",
        "internalType": "address",
        "indexed": false
      },
      {
        "name": "nft",
        "type": "address",
        "internalType": "address",
        "indexed": false
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "pricePerUnitUsdc",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "totalPriceUsdc",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "fulfillmentType",
        "type": "uint8",
        "internalType": "enum RealifeMarketplaceProtectedEscrow1155USDC.FulfillmentType",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "BuyerConfirmed",
    "anonymous": false,
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "listingId",
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
    "name": "RefundRequested",
    "anonymous": false,
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "listingId",
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
    "name": "PurchaseNftReturned",
    "anonymous": false,
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "listingId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "buyer",
        "type": "address",
        "internalType": "address",
        "indexed": true
      },
      {
        "name": "nft",
        "type": "address",
        "internalType": "address",
        "indexed": false
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256",
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
    "name": "RefundRequestRejected",
    "anonymous": false,
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "listingId",
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
    "name": "PurchaseReleased",
    "anonymous": false,
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "listingId",
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
        "name": "buyer",
        "type": "address",
        "internalType": "address",
        "indexed": false
      },
      {
        "name": "nft",
        "type": "address",
        "internalType": "address",
        "indexed": false
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "totalPriceUsdc",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "feeUsdc",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "sellerAmountUsdc",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "fulfillmentType",
        "type": "uint8",
        "internalType": "enum RealifeMarketplaceProtectedEscrow1155USDC.FulfillmentType",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "PurchaseRefunded",
    "anonymous": false,
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "listingId",
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
        "name": "buyer",
        "type": "address",
        "internalType": "address",
        "indexed": false
      },
      {
        "name": "nft",
        "type": "address",
        "internalType": "address",
        "indexed": false
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "totalPriceUsdc",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": false
      },
      {
        "name": "fulfillmentType",
        "type": "uint8",
        "internalType": "enum RealifeMarketplaceProtectedEscrow1155USDC.FulfillmentType",
        "indexed": false
      }
    ]
  },
  {
    "type": "event",
    "name": "RefundRejectedAndNftRestored",
    "anonymous": false,
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "listingId",
        "type": "uint256",
        "internalType": "uint256",
        "indexed": true
      },
      {
        "name": "buyer",
        "type": "address",
        "internalType": "address",
        "indexed": true
      },
      {
        "name": "nft",
        "type": "address",
        "internalType": "address",
        "indexed": false
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256",
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
    "name": "usdc",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "paymentToken",
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
    "name": "nextListingId",
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
    "name": "nextPurchaseId",
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
    "name": "allowedNft",
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
    "name": "moderators",
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
    "name": "feeBps",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint96",
        "internalType": "uint96"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isOperator",
    "inputs": [
      {
        "name": "account",
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
    "name": "listings",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "seller",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "nft",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "pricePerUnitUsdc",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amountTotal",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amountRemaining",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "fulfillmentType",
        "type": "uint8",
        "internalType": "enum RealifeMarketplaceProtectedEscrow1155USDC.FulfillmentType"
      },
      {
        "name": "status",
        "type": "uint8",
        "internalType": "enum RealifeMarketplaceProtectedEscrow1155USDC.ListingStatus"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "purchases",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "listingId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "seller",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "buyer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "nft",
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
      },
      {
        "name": "pricePerUnitUsdc",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalPriceUsdc",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "fulfillmentType",
        "type": "uint8",
        "internalType": "enum RealifeMarketplaceProtectedEscrow1155USDC.FulfillmentType"
      },
      {
        "name": "status",
        "type": "uint8",
        "internalType": "enum RealifeMarketplaceProtectedEscrow1155USDC.PurchaseStatus"
      },
      {
        "name": "buyerConfirmed",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "fundedAt",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "refundRequestedAt",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "nftReturnedAt",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "resolvedAt",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getListing",
    "inputs": [
      {
        "name": "listingId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct RealifeMarketplaceProtectedEscrow1155USDC.Listing",
        "components": [
          {
            "name": "seller",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "nft",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "tokenId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "pricePerUnitUsdc",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "amountTotal",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "amountRemaining",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "fulfillmentType",
            "type": "uint8",
            "internalType": "enum RealifeMarketplaceProtectedEscrow1155USDC.FulfillmentType"
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum RealifeMarketplaceProtectedEscrow1155USDC.ListingStatus"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPurchase",
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct RealifeMarketplaceProtectedEscrow1155USDC.Purchase",
        "components": [
          {
            "name": "listingId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "seller",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "buyer",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "nft",
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
          },
          {
            "name": "pricePerUnitUsdc",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "totalPriceUsdc",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "fulfillmentType",
            "type": "uint8",
            "internalType": "enum RealifeMarketplaceProtectedEscrow1155USDC.FulfillmentType"
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum RealifeMarketplaceProtectedEscrow1155USDC.PurchaseStatus"
          },
          {
            "name": "buyerConfirmed",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "fundedAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "refundRequestedAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "nftReturnedAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "resolvedAt",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setModerator",
    "inputs": [
      {
        "name": "moderator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "allowed",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setAllowedNft",
    "inputs": [
      {
        "name": "nft",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "allowed",
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
    "name": "setFeeBps",
    "inputs": [
      {
        "name": "bps",
        "type": "uint96",
        "internalType": "uint96"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "list1155",
    "inputs": [
      {
        "name": "nft",
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
      },
      {
        "name": "pricePerUnitUsdc",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "fulfillmentType",
        "type": "uint8",
        "internalType": "enum RealifeMarketplaceProtectedEscrow1155USDC.FulfillmentType"
      }
    ],
    "outputs": [
      {
        "name": "listingId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancel",
    "inputs": [
      {
        "name": "listingId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "buy",
    "inputs": [
      {
        "name": "listingId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "buyerConfirm",
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "buyerConfirmAndRelease",
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "requestRefund",
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "requestRefundAndReturnNft",
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "returnPurchaseNft",
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "releasePurchase",
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "rejectRefundRequest",
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "refundPurchase",
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "rejectRefundAndRestoreBuyer",
    "inputs": [
      {
        "name": "purchaseId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
] as const;
