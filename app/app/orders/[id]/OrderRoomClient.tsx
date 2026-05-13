"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { decodeFunctionResult, encodeFunctionData, formatUnits, toHex } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useSession } from "next-auth/react";
import { useWeb3Auth } from "@web3auth/modal/react";
import OrderAiAssistant from "@/components/orders/OrderAiAssistant";

type ViewerRole = "buyer" | "seller" | "unknown";
type MessageRole = "BUYER" | "SELLER" | "SUPPORT" | "SYSTEM";
type MarketType = "STANDARD" | "DELIVERY" | "PROTECTED";
type FulfillmentType =
  | "PHYSICAL_GOOD"
  | "DIGITAL_SERVICE"
  | "ONLINE_SESSION"
  | "LOCAL_SERVICE";
type ServiceStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "REVISION_REQUESTED"
  | "COMPLETED"
  | "CONFIRMED"
  | "CANCELLED";

type OrderRow = {
  id: string;
  createdAt: string;
  updatedAt: string;

  chainId: number;
  contract: string;
  tokenId: string;
  vertical: string;

  sourceType?: "STORE" | "MARKETPLACE" | null;
  orderKind?: "PRIMARY" | "SECONDARY" | null;

  marketType?: MarketType | null;
  marketplaceContract?: string | null;
  marketplaceListingId?: string | null;
  marketplacePurchaseId?: string | null;

  buyerWallet: string;
  sellerWallet: string;

  amount: string;
  unitPrice: string;
  totalPrice: string;
  paymentToken: string | null;

  deliveryRequired: boolean;
  physicalItem: boolean;
  officialItem: boolean;

  fulfillmentType?: FulfillmentType | null;
  serviceStatus?: ServiceStatus | null;
  category?: string | null;
  subcategory?: string | null;

  escrowStatus:
    | "NOT_REQUIRED"
    | "PENDING"
    | "FUNDED"
    | "RELEASED"
    | "REFUNDED"
    | "DISPUTED"
    | "CANCELLED";

  deliveryStatus:
    | "NOT_REQUIRED"
    | "PENDING"
    | "READY_TO_SHIP"
    | "SHIPPED"
    | "DELIVERED"
    | "CONFIRMED"
    | "RETURN_REQUESTED"
    | "RETURNED"
    | "CANCELLED";

  shippedAt: string | null;
  deliveredAt: string | null;
  confirmedAt: string | null;
  releasedAt: string | null;

  buyerConfirmedAt?: string | null;
  refundRequestedAt?: string | null;
  nftReturnedAt?: string | null;
  refundRejectedAt?: string | null;

  scheduledFor?: string | null;
  workStartedAt?: string | null;
  submittedAt?: string | null;
  revisionRequestedAt?: string | null;
  completedAt?: string | null;

  shippingName: string | null;
  shippingPhone: string | null;
  shippingCountry: string | null;
  shippingCity: string | null;
  shippingAddress: string | null;
  shippingZip: string | null;

  trackingCode: string | null;
  trackingUrl: string | null;
  carrier: string | null;

  buyTxHash: string | null;
  escrowReleaseTxHash?: string | null;
  escrowRefundTxHash?: string | null;

  noteBuyer: string | null;
  noteSeller: string | null;
  adminNote: string | null;

  product: {
    name: string | null;
    image: string | null;
    tokenUri: string | null;
    deliveryEnabled: boolean;
    physicalItemIncluded: boolean;
    officialItem: boolean;
    primarySellerWallet: string | null;
  } | null;
};

type OrderResponse = {
  ok: boolean;
  viewerRole: ViewerRole;
  order: OrderRow;
};

type DeliveryMessage = {
  id: string;
  orderId: string;
  senderUserId: string | null;
  senderWallet: string | null;
  senderRole: MessageRole;
  body: string;
  isInternal: boolean;
  createdAt: string;
};

type MessagesResponse = {
  ok: boolean;
  items: DeliveryMessage[];
};


const ERC1155_RETURN_APPROVAL_ABI = [
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
] as const;

const PROTECTED_ESCROW_BUYER_ABI = [
  {
    type: "function",
    name: "buyerConfirmAndRelease",
    stateMutability: "nonpayable",
    inputs: [{ name: "purchaseId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "requestRefundAndReturnNft",
    stateMutability: "nonpayable",
    inputs: [{ name: "purchaseId", type: "uint256" }],
    outputs: [],
  },
] as const;

type Eip1193Provider = {
  request: (args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) => Promise<unknown>;
};

function normalizeEvmAddress(v: unknown): `0x${string}` | undefined {
  const x = String(v || "").trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(x) ? (x as `0x${string}`) : undefined;
}

function normalizeTxHash(v: unknown): `0x${string}` | undefined {
  const x = String(v || "").trim().toLowerCase();
  return /^0x[a-f0-9]{64}$/.test(x) ? (x as `0x${string}`) : undefined;
}

function parseRpcChainId(v: unknown): number | undefined {
  const x = String(v || "").trim();
  if (!x) return undefined;
  const n = x.startsWith("0x") ? Number.parseInt(x, 16) : Number(x);
  return Number.isFinite(n) ? n : undefined;
}

async function readProviderChainId(provider: Eip1193Provider | null) {
  if (!provider) return undefined;
  const raw = await provider.request({ method: "eth_chainId" }).catch(() => null);
  return parseRpcChainId(raw);
}

function chainAddParams(chainId: number) {
  if (chainId === 84532) {
    return {
      chainId: toHex(chainId),
      chainName: "Base Sepolia",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://sepolia.base.org"],
      blockExplorerUrls: ["https://sepolia.basescan.org"],
    };
  }

  return null;
}

async function ensureEmbeddedChain(provider: Eip1193Provider | null, chainId: number) {
  if (!provider) {
    throw new Error(
      "Embedded wallet provider is not ready. Please click Continue with Google again."
    );
  }

  const currentChainId = await readProviderChainId(provider);
  if (currentChainId === chainId) return;

  const chainIdHex = toHex(chainId);

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError: any) {
    const code = switchError?.code ?? switchError?.data?.originalError?.code;
    const addParams = chainAddParams(chainId);

    if (code !== 4902 || !addParams) throw switchError;

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [addParams],
    });

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  }
}


async function waitForEmbeddedTxReceipt(
  provider: Eip1193Provider,
  hash: `0x${string}`,
  timeoutMs = 120_000
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const receipt = await provider
      .request({
        method: "eth_getTransactionReceipt",
        params: [hash],
      })
      .catch(() => null);

    if (receipt && typeof receipt === "object") return receipt;
    await new Promise((resolve) => setTimeout(resolve, 2_500));
  }

  throw new Error("Approval transaction was submitted, but receipt was not confirmed yet. Please wait and try again.");
}

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  const s = String(addr);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function shortHash(v?: string | null) {
  if (!v) return "—";
  const s = String(v);
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-6)}`;
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB");
}

function titleCase(v?: string | null) {
  const s = String(v || "").trim();
  if (!s) return "—";
  return s
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

const PRIMARY_IPFS_ORIGIN = (
  process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://nftstorage.link"
).replace(/\/$/, "");

const IPFS_GATEWAYS = [
  `${PRIMARY_IPFS_ORIGIN}/ipfs/`,
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
] as const;

function ipfsToHttp(uri?: string | null, gw: string = IPFS_GATEWAYS[0]) {
  const u = String(uri || "").trim();
  if (!u) return null;

  if (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("data:") ||
    u.startsWith("blob:")
  ) {
    return u;
  }

  if (u.startsWith("ipfs://")) {
    let p = u.slice("ipfs://".length);
    if (p.startsWith("ipfs/")) p = p.slice("ipfs/".length);
    return `${gw}${p}`;
  }

  if (u.startsWith("/ipfs/")) return `${gw}${u.slice("/ipfs/".length)}`;
  if (u.startsWith("Qm") || u.startsWith("bafy")) return `${gw}${u}`;
  return u;
}

async function fetchJSON<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const j = await r.json().catch(() => null);
  if (!r.ok || !j) throw new Error(j?.error || j?.message || "request_failed");
  return j as T;
}

function paymentSymbol(paymentToken?: string | null) {
  return paymentToken ? "USDT" : "ETH";
}

function formatPaymentAmount(raw?: string | null, paymentToken?: string | null) {
  try {
    if (!raw) return "—";
    const decimals = paymentToken ? 6 : 18;
    const symbol = paymentSymbol(paymentToken);
    const v = formatUnits(BigInt(raw), decimals);
    const [a, b = ""] = v.split(".");
    const bb = b.slice(0, 6).replace(/0+$/, "");
    const out = bb ? `${a}.${bb}` : a;
    return `${out} ${symbol}`;
  } catch {
    return raw ? `${raw} ${paymentSymbol(paymentToken)}` : "—";
  }
}

function messageTone(role: MessageRole, internal: boolean) {
  if (internal) return "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-50";
  if (role === "BUYER") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-50";
  if (role === "SELLER") return "border-sky-500/20 bg-sky-500/10 text-sky-50";
  if (role === "SUPPORT") return "border-amber-500/20 bg-amber-500/10 text-amber-50";
  return "border-white/10 bg-white/[0.06] text-white/80";
}

function senderLabel(role: MessageRole) {
  if (role === "BUYER") return "Buyer";
  if (role === "SELLER") return "Seller";
  if (role === "SUPPORT") return "Support";
  return "System";
}

function isOnchainEscrowOrder(x: OrderRow) {
  return (
    x.marketType === "DELIVERY" ||
    x.marketType === "PROTECTED" ||
    (x.sourceType === "MARKETPLACE" && Boolean(x.marketplacePurchaseId))
  );
}

function isPhysicalOrder(x: OrderRow) {
  return x.deliveryRequired || x.fulfillmentType === "PHYSICAL_GOOD";
}

function isServiceOrder(x: OrderRow) {
  return (
    x.fulfillmentType === "DIGITAL_SERVICE" ||
    x.fulfillmentType === "ONLINE_SESSION" ||
    x.fulfillmentType === "LOCAL_SERVICE"
  );
}

export default function OrderRoomClient({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [viewerRole, setViewerRole] = useState<ViewerRole>("unknown");
  const [messages, setMessages] = useState<DeliveryMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [supportDraft, setSupportDraft] = useState("");
  const [refundDraft, setRefundDraft] = useState("");

  const [serviceSchedule, setServiceSchedule] = useState("");
  const [serviceNote, setServiceNote] = useState("");
  const [revisionDraft, setRevisionDraft] = useState("");

  const { data: session } = useSession();
  const { provider: web3AuthProviderRaw } = useWeb3Auth();
  const embeddedProvider = (web3AuthProviderRaw as Eip1193Provider | null) || null;

  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [embeddedChainId, setEmbeddedChainId] = useState<number | undefined>(undefined);
  const [chainTxHash, setChainTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [chainActionKind, setChainActionKind] = useState<"confirm_release" | "refund_return" | null>(null);

  const sessionUser = (session as any)?.user || null;
  const sessionWalletKind = String(sessionUser?.walletKind || "").toUpperCase();
  const externalWalletAddress = normalizeEvmAddress(address);
  const embeddedWalletAddress = normalizeEvmAddress(sessionUser?.walletAddress);
  const activeAddress = externalWalletAddress || embeddedWalletAddress;
  const activeWalletKind: "EXTERNAL" | "EMBEDDED" | null = externalWalletAddress
    ? "EXTERNAL"
    : embeddedWalletAddress && sessionWalletKind === "EMBEDDED"
    ? "EMBEDDED"
    : null;
  const walletReady = Boolean(isConnected || embeddedWalletAddress);

  const txReceipt = useWaitForTransactionReceipt({
    hash: chainTxHash,
    query: {
      enabled: Boolean(chainTxHash),
    },
  });

  async function loadInitial() {
    setLoading(true);
    setErr(null);

    try {
      const [orderRes, messagesRes] = await Promise.all([
        fetchJSON<OrderResponse>(`/api/delivery/orders/${orderId}`),
        fetchJSON<MessagesResponse>(`/api/delivery/orders/${orderId}/messages`),
      ]);

      setOrder(orderRes.order);
      setViewerRole(orderRes.viewerRole);
      setMessages(Array.isArray(messagesRes.items) ? messagesRes.items : []);
      setServiceSchedule(
        orderRes.order.scheduledFor
          ? new Date(orderRes.order.scheduledFor).toISOString().slice(0, 16)
          : ""
      );
    } catch (e: any) {
      setErr(e?.message || "Failed to load order room");
    } finally {
      setLoading(false);
    }
  }

  async function refreshRoom() {
    try {
      const [orderRes, messagesRes] = await Promise.all([
        fetchJSON<OrderResponse>(`/api/delivery/orders/${orderId}`),
        fetchJSON<MessagesResponse>(`/api/delivery/orders/${orderId}/messages`),
      ]);

      setOrder(orderRes.order);
      setViewerRole(orderRes.viewerRole);
      setMessages(Array.isArray(messagesRes.items) ? messagesRes.items : []);
      setServiceSchedule(
        orderRes.order.scheduledFor
          ? new Date(orderRes.order.scheduledFor).toISOString().slice(0, 16)
          : ""
      );
    } catch (e: any) {
      setErr(e?.message || "Failed to refresh room");
    }
  }

  useEffect(() => {
    void loadInitial();
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;

    async function syncEmbeddedChain() {
      if (activeWalletKind !== "EMBEDDED" || !embeddedProvider) {
        setEmbeddedChainId(undefined);
        return;
      }

      const nextChainId = await readProviderChainId(embeddedProvider);
      if (!cancelled) setEmbeddedChainId(nextChainId);
    }

    void syncEmbeddedChain();

    return () => {
      cancelled = true;
    };
  }, [activeWalletKind, embeddedProvider]);

  useEffect(() => {
    if (txReceipt.isSuccess && chainTxHash) {
      const label =
        chainActionKind === "confirm_release"
          ? "Buyer on-chain confirm + release completed."
          : "Buyer refund-return transaction submitted.";
      window.alert(`${label}\n\nTx: ${chainTxHash}`);
      setChainTxHash(undefined);
      setChainActionKind(null);
      void refreshRoom();
    }
  }, [txReceipt.isSuccess, chainTxHash, chainActionKind]);

  async function sendMessage() {
    if (!draft.trim()) return;
    setSending(true);
    setErr(null);

    try {
      await fetchJSON(`/api/delivery/orders/${orderId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: draft.trim() }),
      });
      setDraft("");
      await refreshRoom();
    } catch (e: any) {
      setErr(e?.message || "Send message failed");
    } finally {
      setSending(false);
    }
  }

  async function callSupport() {
    if (!supportDraft.trim()) return;
    setActing(true);
    setErr(null);

    try {
      await fetchJSON(`/api/delivery/orders/${orderId}/support`, {
        method: "POST",
        body: JSON.stringify({ note: supportDraft.trim() }),
      });
      setSupportDraft("");
      await refreshRoom();
    } catch (e: any) {
      setErr(e?.message || "Support request failed");
    } finally {
      setActing(false);
    }
  }

  async function requestRefund() {
    if (!refundDraft.trim()) return;
    setActing(true);
    setErr(null);

    try {
      await fetchJSON(`/api/delivery/orders/${orderId}/request-refund`, {
        method: "POST",
        body: JSON.stringify({ note: refundDraft.trim() }),
      });
      setRefundDraft("");
      await refreshRoom();
    } catch (e: any) {
      setErr(e?.message || "Refund request failed");
    } finally {
      setActing(false);
    }
  }

  async function confirmOrder() {
    setConfirming(true);
    setErr(null);

    try {
      await fetchJSON(`/api/delivery/orders/${orderId}/confirm`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await refreshRoom();
    } catch (e: any) {
      setErr(e?.message || "Confirm failed");
    } finally {
      setConfirming(false);
    }
  }

  async function updateService(action: string, extra?: Record<string, unknown>) {
    setActing(true);
    setErr(null);

    try {
      await fetchJSON(`/api/delivery/orders/${orderId}/service`, {
        method: "POST",
        body: JSON.stringify({
          action,
          note: serviceNote.trim(),
          ...extra,
        }),
      });
      setServiceNote("");
      setRevisionDraft("");
      await refreshRoom();
    } catch (e: any) {
      setErr(e?.message || "Service update failed");
    } finally {
      setActing(false);
    }
  }

  async function requestRevision() {
    if (!revisionDraft.trim()) return;
    setActing(true);
    setErr(null);

    try {
      await fetchJSON(`/api/delivery/orders/${orderId}/service`, {
        method: "POST",
        body: JSON.stringify({
          action: "request_revision",
          note: revisionDraft.trim(),
        }),
      });
      setRevisionDraft("");
      await refreshRoom();
    } catch (e: any) {
      setErr(e?.message || "Revision request failed");
    } finally {
      setActing(false);
    }
  }

  async function isNftApprovedForProtectedMarketplace(params: {
    nftContract: `0x${string}`;
    owner: `0x${string}`;
    operator: `0x${string}`;
  }) {
    const { nftContract, owner, operator } = params;

    if (activeWalletKind === "EMBEDDED") {
      if (!embeddedProvider) return false;

      const data = encodeFunctionData({
        abi: ERC1155_RETURN_APPROVAL_ABI,
        functionName: "isApprovedForAll",
        args: [owner, operator],
      });

      const raw = await embeddedProvider.request({
        method: "eth_call",
        params: [
          {
            to: nftContract,
            data,
          },
          "latest",
        ],
      });

      const decoded = decodeFunctionResult({
        abi: ERC1155_RETURN_APPROVAL_ABI,
        functionName: "isApprovedForAll",
        data: String(raw || "0x") as `0x${string}`,
      });

      return Boolean(decoded);
    }

    if (!publicClient) return false;

    const approved = await publicClient.readContract({
      address: nftContract,
      abi: ERC1155_RETURN_APPROVAL_ABI,
      functionName: "isApprovedForAll",
      args: [owner, operator],
    });

    return Boolean(approved);
  }

  async function runBuyerOnchainAction(
    action: "confirm_release" | "refund_return"
  ) {
    try {
      if (!order) throw new Error("Order not loaded.");
      if (viewerRole !== "buyer") throw new Error("Only buyer can use this action.");
      if (!order.marketplaceContract || !order.marketplacePurchaseId) {
        throw new Error("Marketplace contract or purchaseId is missing.");
      }
      if (!walletReady || !activeAddress || !activeWalletKind) {
        throw new Error("Connect buyer wallet first or continue with Google.");
      }
      if (normAddr(activeAddress) !== normAddr(order.buyerWallet)) {
        throw new Error("Active wallet must match buyer wallet.");
      }

      const functionName =
        action === "confirm_release"
          ? "buyerConfirmAndRelease"
          : "requestRefundAndReturnNft";
      const args = [BigInt(order.marketplacePurchaseId)];
      const marketplaceContract = order.marketplaceContract as `0x${string}`;
      const nftContract = order.contract as `0x${string}`;

      let hash: `0x${string}`;

      if (activeWalletKind === "EMBEDDED") {
        await ensureEmbeddedChain(embeddedProvider, order.chainId);
        const nextChainId = await readProviderChainId(embeddedProvider);
        setEmbeddedChainId(nextChainId);

        if (action === "refund_return") {
          const alreadyApproved = await isNftApprovedForProtectedMarketplace({
            nftContract,
            owner: activeAddress,
            operator: marketplaceContract,
          });

          if (!alreadyApproved) {
            const approvalData = encodeFunctionData({
              abi: ERC1155_RETURN_APPROVAL_ABI,
              functionName: "setApprovalForAll",
              args: [marketplaceContract, true],
            });

            const rawApprovalHash = await embeddedProvider!.request({
              method: "eth_sendTransaction",
              params: [
                {
                  from: activeAddress,
                  to: nftContract,
                  data: approvalData,
                },
              ],
            });

            const approvalHash = normalizeTxHash(rawApprovalHash);
            if (!approvalHash) {
              throw new Error("Embedded wallet did not return approval transaction hash.");
            }

            await waitForEmbeddedTxReceipt(embeddedProvider!, approvalHash);
          }
        }

        const data = encodeFunctionData({
          abi: PROTECTED_ESCROW_BUYER_ABI,
          functionName: functionName as any,
          args: args as any,
        });

        const rawHash = await embeddedProvider!.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: activeAddress,
              to: marketplaceContract,
              data,
            },
          ],
        });

        const txHash = normalizeTxHash(rawHash);
        if (!txHash) throw new Error("Embedded wallet did not return transaction hash.");
        hash = txHash;
      } else {
        if (currentChainId !== order.chainId) {
          await switchChainAsync?.({ chainId: order.chainId });
        }

        if (action === "refund_return") {
          if (!publicClient) {
            throw new Error("Public client is not ready. Please refresh the page and try again.");
          }

          const alreadyApproved = await isNftApprovedForProtectedMarketplace({
            nftContract,
            owner: activeAddress,
            operator: marketplaceContract,
          });

          if (!alreadyApproved) {
            const approvalHash = await writeContractAsync({
              address: nftContract,
              abi: ERC1155_RETURN_APPROVAL_ABI,
              functionName: "setApprovalForAll",
              args: [marketplaceContract, true],
            } as any);

            await publicClient.waitForTransactionReceipt({ hash: approvalHash });
          }
        }

        hash = await writeContractAsync({
          address: marketplaceContract,
          abi: PROTECTED_ESCROW_BUYER_ABI,
          functionName: functionName as any,
          args: args as any,
        } as any);
      }

      setChainActionKind(action);
      setChainTxHash(hash);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Wallet action failed");
    }
  }

  const visibleMessages = useMemo(() => messages, [messages]);

  if (loading) {
    return (
      <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 text-white/60">
        Loading order room...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-[30px] border border-rose-500/20 bg-rose-500/10 p-6 text-rose-100">
        Order not found.
      </div>
    );
  }

  const onchainEscrow = isOnchainEscrowOrder(order);
  const isPhysical = isPhysicalOrder(order);
  const isService = isServiceOrder(order);

  const nftHref = `/nft/${order.chainId}/${order.contract}/${encodeURIComponent(
    String(order.tokenId)
  )}`;

  const canConfirmOffchain =
    viewerRole === "buyer" &&
    !onchainEscrow &&
    order.escrowStatus !== "REFUNDED" &&
    order.escrowStatus !== "CANCELLED" &&
    order.escrowStatus !== "DISPUTED" &&
    ((isPhysical &&
      (order.deliveryStatus === "SHIPPED" ||
        order.deliveryStatus === "DELIVERED")) ||
      (isService &&
        (order.serviceStatus === "SUBMITTED" ||
          order.serviceStatus === "COMPLETED")));

  const canConfirmOnchainRelease =
    viewerRole === "buyer" &&
    onchainEscrow &&
    order.escrowStatus === "FUNDED" &&
    ((isPhysical &&
      (order.deliveryStatus === "SHIPPED" || order.deliveryStatus === "DELIVERED")) ||
      (isService &&
        (order.serviceStatus === "SUBMITTED" || order.serviceStatus === "COMPLETED")));

  const canStartOnchainRefundReturn =
    viewerRole === "buyer" &&
    onchainEscrow &&
    order.escrowStatus !== "RELEASED" &&
    order.escrowStatus !== "REFUNDED" &&
    order.escrowStatus !== "CANCELLED" &&
    order.escrowStatus !== "DISPUTED" &&
    Boolean(order.marketplaceContract) &&
    Boolean(order.marketplacePurchaseId);

  const sellerCanSetSchedule =
    viewerRole === "seller" && isService && order.serviceStatus !== "CONFIRMED";

  const sellerCanStartWork =
    viewerRole === "seller" &&
    isService &&
    order.serviceStatus !== "CONFIRMED" &&
    order.serviceStatus !== "COMPLETED" &&
    order.serviceStatus !== "CANCELLED";

  const sellerCanSubmit =
    viewerRole === "seller" &&
    isService &&
    order.serviceStatus !== "CONFIRMED" &&
    order.serviceStatus !== "CANCELLED";

  const sellerCanComplete =
    viewerRole === "seller" &&
    isService &&
    order.serviceStatus !== "CONFIRMED" &&
    order.serviceStatus !== "CANCELLED";

  const buyerCanRequestRevision =
    viewerRole === "buyer" &&
    isService &&
    (order.serviceStatus === "SUBMITTED" || order.serviceStatus === "COMPLETED");

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
        <div className="p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row">
            <div className="w-full shrink-0 lg:w-[180px]">
              <div className="aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                {ipfsToHttp(order.product?.image || null) ? (
                  <img
                    src={ipfsToHttp(order.product?.image || null) || ""}
                    alt={order.product?.name || `Token #${order.tokenId}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-black text-white/25">
                    No image
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[18px] font-black text-white/90">
                {order.product?.name || `Order NFT #${order.tokenId}`}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black text-white/80">
                  {viewerRole.toUpperCase()}
                </span>
                {order.marketType ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black text-white/80">
                    {order.marketType}
                  </span>
                ) : null}
                {order.fulfillmentType ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black text-white/80">
                    {titleCase(order.fulfillmentType)}
                  </span>
                ) : null}
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black text-white/80">
                  ESCROW {order.escrowStatus}
                </span>
                {isPhysical ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black text-white/80">
                    DELIVERY {order.deliveryStatus}
                  </span>
                ) : null}
                {isService ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black text-white/80">
                    SERVICE {order.serviceStatus || "—"}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-white/55">
                <span>Buyer: {shortAddr(order.buyerWallet)}</span>
                <span>Seller: {shortAddr(order.sellerWallet)}</span>
                <span>Amount: {formatPaymentAmount(order.totalPrice, order.paymentToken)}</span>
                <span>Created: {fmtDate(order.createdAt)}</span>
              </div>

              {isService ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="text-[12px] font-black text-white/80">
                    Service flow
                  </div>
                  <div className="mt-2 text-[12px] text-white/60">
                    Status: {order.serviceStatus || "—"}
                  </div>
                  <div className="mt-1 text-[12px] text-white/60">
                    Scheduled: {fmtDate(order.scheduledFor)}
                  </div>
                  <div className="mt-1 text-[12px] text-white/60">
                    Started: {fmtDate(order.workStartedAt)}
                  </div>
                  <div className="mt-1 text-[12px] text-white/60">
                    Submitted: {fmtDate(order.submittedAt)}
                  </div>
                  <div className="mt-1 text-[12px] text-white/60">
                    Revision requested: {fmtDate(order.revisionRequestedAt)}
                  </div>
                  <div className="mt-1 text-[12px] text-white/60">
                    Completed: {fmtDate(order.completedAt)}
                  </div>
                </div>
              ) : null}

              {onchainEscrow ? (
                <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-[12px] text-sky-50/85">
                  <div className="font-black text-sky-100">
                    On-chain escrow flow
                  </div>
                  <div className="mt-2 leading-relaxed">
                    This room is used for communication and support, but final payout / refund path
                    is controlled by marketplace contract logic. Buyer wallet can use
                    <span className="mx-1 font-black">buyerConfirmAndRelease(purchaseId)</span>
                    and
                    <span className="mx-1 font-black">requestRefundAndReturnNft(purchaseId)</span>.
                    Refund return checks NFT approval first. If already approved, it only sends the return transaction; otherwise it asks for approval first, then returns the NFT to escrow.
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    {order.marketplacePurchaseId ? (
                      <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 font-black text-sky-100">
                        Purchase #{order.marketplacePurchaseId}
                      </span>
                    ) : null}
                    {order.marketplaceContract ? (
                      <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 font-black text-sky-100">
                        {shortAddr(order.marketplaceContract)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={nftHref}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-2 text-[12px] font-black text-white/85 transition hover:bg-white/[0.10]"
                >
                  Open NFT
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>


      <OrderAiAssistant
        orderId={orderId}
        viewerRole={viewerRole}
        order={order}
        onUseSuggestedMessage={(message) =>
          setDraft((prev) => (prev.trim() ? `${prev.trim()}\n\n${message}` : message))
        }
      />

      {isService && viewerRole === "seller" ? (
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
          <div className="p-5 md:p-6">
            <div className="text-[12px] font-black uppercase tracking-wider text-white/85">
              Service provider actions
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="text-[12px] font-black text-white/80">
                  Schedule / note
                </div>
                <input
                  type="datetime-local"
                  value={serviceSchedule}
                  onChange={(e) => setServiceSchedule(e.target.value)}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                />
                <textarea
                  value={serviceNote}
                  onChange={(e) => setServiceNote(e.target.value)}
                  rows={3}
                  placeholder="Optional service note..."
                  className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                />
                <div className="mt-3 flex flex-wrap gap-3">
                  {sellerCanSetSchedule ? (
                    <button
                      onClick={() =>
                        updateService("set_schedule", { scheduledFor: serviceSchedule })
                      }
                      disabled={acting || !serviceSchedule}
                      className={cx(
                        "inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-[12px] font-extrabold transition",
                        acting || !serviceSchedule
                          ? "cursor-not-allowed border-white/10 bg-white/[0.06] text-white/40"
                          : "border-sky-500/20 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15"
                      )}
                    >
                      Save schedule
                    </button>
                  ) : null}

                  {sellerCanStartWork ? (
                    <button
                      onClick={() => updateService("start_work")}
                      disabled={acting}
                      className={cx(
                        "inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-[12px] font-extrabold transition",
                        acting
                          ? "cursor-not-allowed border-white/10 bg-white/[0.06] text-white/40"
                          : "border-violet-500/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/15"
                      )}
                    >
                      Start work
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="text-[12px] font-black text-white/80">
                  Submit / complete
                </div>
                <div className="mt-2 text-[12px] text-white/60">
                  Seller should mark the service submitted first, then completed when ready.
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  {sellerCanSubmit ? (
                    <button
                      onClick={() => updateService("mark_submitted")}
                      disabled={acting}
                      className={cx(
                        "inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-[12px] font-extrabold transition",
                        acting
                          ? "cursor-not-allowed border-white/10 bg-white/[0.06] text-white/40"
                          : "border-sky-500/20 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15"
                      )}
                    >
                      Mark submitted
                    </button>
                  ) : null}

                  {sellerCanComplete ? (
                    <button
                      onClick={() => updateService("mark_completed")}
                      disabled={acting}
                      className={cx(
                        "inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-[12px] font-extrabold transition",
                        acting
                          ? "cursor-not-allowed border-white/10 bg-white/[0.06] text-white/40"
                          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                      )}
                    >
                      Mark completed
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isService && viewerRole === "buyer" && buyerCanRequestRevision ? (
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
          <div className="p-5 md:p-6">
            <div className="text-[12px] font-black uppercase tracking-wider text-white/85">
              Buyer revision request
            </div>
            <textarea
              value={revisionDraft}
              onChange={(e) => setRevisionDraft(e.target.value)}
              rows={4}
              placeholder="Describe what needs to be fixed or changed..."
              className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
            />
            <button
              onClick={requestRevision}
              disabled={acting || !revisionDraft.trim()}
              className={cx(
                "mt-3 inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-[12px] font-extrabold transition",
                acting || !revisionDraft.trim()
                  ? "cursor-not-allowed border-white/10 bg-white/[0.06] text-white/40"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
              )}
            >
              {acting ? "Submitting..." : "Request revision"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
        <div className="p-5 md:p-6">
          <div className="text-[12px] font-black uppercase tracking-wider text-white/85">
            Chat
          </div>

          <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {visibleMessages.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-[12px] text-white/55">
                No messages yet.
              </div>
            ) : (
              visibleMessages.map((m) => (
                <div
                  key={m.id}
                  className={cx(
                    "rounded-2xl border p-4",
                    messageTone(m.senderRole, m.isInternal)
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-black uppercase tracking-wider">
                      {senderLabel(m.senderRole)}
                      {m.isInternal ? " • internal" : ""}
                    </div>
                    <div className="text-[11px] opacity-70">{fmtDate(m.createdAt)}</div>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed">
                    {m.body}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder="Write a message to the other side..."
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={sendMessage}
                disabled={sending || !draft.trim()}
                className={cx(
                  "inline-flex items-center justify-center rounded-2xl px-5 py-3 font-extrabold text-black transition",
                  "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)]",
                  sending || !draft.trim()
                    ? "cursor-not-allowed opacity-60"
                    : "hover:brightness-110"
                )}
              >
                {sending ? "Sending..." : "Send message"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
        <div className="p-5 md:p-6">
          <div className="text-[12px] font-black uppercase tracking-wider text-white/85">
            Support & actions
          </div>

          {err ? (
            <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-[12px] text-rose-100">
              {err}
            </div>
          ) : null}

          {txReceipt.isLoading ? (
            <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-[12px] text-sky-100">
              Waiting for on-chain transaction receipt...
              {chainTxHash ? ` ${shortHash(chainTxHash)}` : ""}
            </div>
          ) : null}

          {viewerRole === "buyer" && canConfirmOffchain ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="text-[12px] font-black text-emerald-100">
                {isPhysical
                  ? "Confirm successful delivery"
                  : "Confirm successful service completion"}
              </div>
              <button
                onClick={confirmOrder}
                disabled={confirming}
                className={cx(
                  "mt-3 inline-flex items-center justify-center rounded-2xl px-5 py-3 font-extrabold text-black transition",
                  "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)]",
                  confirming ? "cursor-not-allowed opacity-60" : "hover:brightness-110"
                )}
              >
                {confirming ? "Confirming..." : isPhysical ? "Confirm delivery" : "Confirm service"}
              </button>
            </div>
          ) : null}

          {viewerRole === "buyer" && canConfirmOnchainRelease ? (
            <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
              <div className="text-[12px] font-black text-sky-100">
                Buyer wallet can release seller payout on-chain
              </div>
              <div className="mt-2 text-[12px] leading-relaxed text-sky-50/85">
                This uses buyerConfirmAndRelease(purchaseId). Funds go from the protected escrow contract directly to seller.
              </div>
              <button
                onClick={() => runBuyerOnchainAction("confirm_release")}
                disabled={txReceipt.isLoading}
                className={cx(
                  "mt-3 inline-flex items-center justify-center rounded-2xl px-5 py-3 font-extrabold text-black transition",
                  "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)]",
                  txReceipt.isLoading ? "cursor-not-allowed opacity-60" : "hover:brightness-110"
                )}
              >
                {txReceipt.isLoading && chainActionKind === "confirm_release"
                  ? "Waiting for chain..."
                  : isPhysical
                  ? "Confirm delivery on-chain"
                  : "Confirm service on-chain"}
              </button>
            </div>
          ) : null}

          {viewerRole === "buyer" ? (
            <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
              <div className="text-[12px] font-black text-rose-100">
                Request refund
              </div>
              <textarea
                value={refundDraft}
                onChange={(e) => setRefundDraft(e.target.value)}
                rows={4}
                placeholder="Explain why you need a refund..."
                className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
              />
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  onClick={requestRefund}
                  disabled={acting || !refundDraft.trim()}
                  className={cx(
                    "inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-[12px] font-extrabold transition",
                    acting || !refundDraft.trim()
                      ? "cursor-not-allowed border-white/10 bg-white/[0.06] text-white/40"
                      : "border-rose-500/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                  )}
                >
                  {acting ? "Submitting..." : "Request refund"}
                </button>

                {canStartOnchainRefundReturn ? (
                  <div className="flex max-w-[420px] flex-col gap-2">
                    <button
                      onClick={() => runBuyerOnchainAction("refund_return")}
                      disabled={txReceipt.isLoading}
                      className={cx(
                        "inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-[12px] font-extrabold transition",
                        txReceipt.isLoading
                          ? "cursor-not-allowed border-white/10 bg-white/[0.06] text-white/40"
                          : "border-sky-500/20 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15"
                      )}
                    >
                      {txReceipt.isLoading && chainActionKind === "refund_return"
                        ? "Waiting for chain..."
                        : "Return NFT"}
                    </button>
                    <div className="text-[11px] leading-relaxed text-white/55">
                      To complete a protected refund, the NFT must be returned to escrow first. If approval already exists, this should be one wallet transaction; otherwise approval + return is required.
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="text-[12px] font-black text-amber-100">
              Call support
            </div>
            <textarea
              value={supportDraft}
              onChange={(e) => setSupportDraft(e.target.value)}
              rows={3}
              placeholder="Write a support note..."
              className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
            />
            <button
              onClick={callSupport}
              disabled={acting || !supportDraft.trim()}
              className={cx(
                "mt-3 inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-[12px] font-extrabold transition",
                acting || !supportDraft.trim()
                  ? "cursor-not-allowed border-white/10 bg-white/[0.06] text-white/40"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
              )}
            >
              {acting ? "Submitting..." : "Send to support"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}