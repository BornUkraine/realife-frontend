import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  formatEther,
  formatUnits,
  getAddress,
  http,
  isAddress,
  parseEther,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FaucetAsset = "ETH" | "USDC";

const CHAIN_ID = baseSepolia.id;
const DEFAULT_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const COOLDOWN_HOURS = Number(process.env.FAUCET_COOLDOWN_HOURS || "24");
const MAX_IP_CLAIMS_PER_DAY = Number(process.env.FAUCET_MAX_CLAIMS_PER_IP_PER_DAY || "5");

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function normalizePrivateKey(raw?: string): `0x${string}` | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  const key = s.startsWith("0x") ? s : `0x${s}`;
  return /^0x[a-fA-F0-9]{64}$/.test(key) ? (key as `0x${string}`) : null;
}

function getClientIp(req: NextRequest) {
  const xf = req.headers.get("x-forwarded-for") || "";
  const firstForwarded = xf.split(",")[0]?.trim();

  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    firstForwarded ||
    "unknown"
  );
}

function hashIp(ip: string) {
  const secret =
    process.env.FAUCET_IP_HASH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "realife-dev-faucet-secret";

  return crypto.createHash("sha256").update(`${secret}:${ip}`).digest("hex");
}

function normalizeAsset(value: unknown): FaucetAsset | null {
  const s = String(value || "").trim().toUpperCase();
  if (s === "ETH" || s === "USDC") return s;
  return null;
}

function getRpcUrl() {
  return (
    process.env.BASE_SEPOLIA_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||
    process.env.RPC_URL ||
    "https://sepolia.base.org"
  );
}

function getClaimAmount(asset: FaucetAsset) {
  if (asset === "ETH") {
    const label = process.env.FAUCET_ETH_AMOUNT || "0.01";
    return { label, raw: parseEther(label), decimals: 18, tokenAddress: null as string | null };
  }

  const label = process.env.FAUCET_USDC_AMOUNT || "10";
  const tokenAddress = process.env.FAUCET_USDC_ADDRESS || DEFAULT_USDC_ADDRESS;
  return { label, raw: parseUnits(label, 6), decimals: 6, tokenAddress };
}

async function readBody(req: NextRequest) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  const body = await readBody(req);

  const asset = normalizeAsset(body.asset);
  if (!asset) {
    return json({ ok: false, error: "Choose ETH or USDC." }, 400);
  }

  const walletInput = String(body.walletAddress || body.address || "").trim();
  if (!isAddress(walletInput)) {
    return json({ ok: false, error: "Invalid wallet address." }, 400);
  }

  const walletAddress = getAddress(walletInput);
  const walletAddressLower = walletAddress.toLowerCase();
  const privateKey = normalizePrivateKey(process.env.FAUCET_PRIVATE_KEY);
  if (!privateKey) {
    return json(
      {
        ok: false,
        error: "Faucet wallet is not configured. Set FAUCET_PRIVATE_KEY in Railway env.",
      },
      500
    );
  }

  const amount = getClaimAmount(asset);

  if (asset === "USDC" && (!amount.tokenAddress || !isAddress(amount.tokenAddress))) {
    return json({ ok: false, error: "Invalid FAUCET_USDC_ADDRESS." }, 500);
  }

  const user = await prisma.user.findFirst({
    where: { walletAddress: { equals: walletAddressLower, mode: "insensitive" } },
    select: { id: true, walletAddress: true },
  });

  if (!user?.id) {
    return json(
      {
        ok: false,
        error: "Verify this wallet or sign in first, then request faucet funds.",
      },
      401
    );
  }

  const ip = getClientIp(req);
  const ipHash = hashIp(ip);
  const since = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);
  const userAgent = req.headers.get("user-agent") || "";

  const recentWalletClaim = await prisma.faucetClaim.findFirst({
    where: {
      walletAddress,
      asset,
      status: { in: ["PENDING", "SENT"] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentWalletClaim) {
    return json(
      {
        ok: false,
        error: `This wallet already claimed ${asset}. Try again after ${COOLDOWN_HOURS}h.`,
      },
      429
    );
  }

  const dailyIpClaims = await prisma.faucetClaim.count({
    where: {
      ipHash,
      asset,
      status: { in: ["PENDING", "SENT"] },
      createdAt: { gte: since },
    },
  });

  if (dailyIpClaims >= MAX_IP_CLAIMS_PER_DAY) {
    return json(
      {
        ok: false,
        error: `Too many ${asset} faucet claims from this network today.`,
      },
      429
    );
  }

  const account = privateKeyToAccount(privateKey);
  const rpcUrl = getRpcUrl();

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  let claimId: string | null = null;

  try {
    if (asset === "ETH") {
      const faucetEthBalance = await publicClient.getBalance({ address: account.address });
      if (faucetEthBalance <= amount.raw) {
        return json(
          {
            ok: false,
            error: `Faucet wallet has only ${formatEther(faucetEthBalance)} ETH. Top it up first.`,
          },
          503
        );
      }
    } else {
      const tokenAddress = getAddress(amount.tokenAddress!);
      const [faucetEthBalance, faucetUsdcBalance] = await Promise.all([
        publicClient.getBalance({ address: account.address }),
        publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [account.address],
        }),
      ]);

      if (faucetEthBalance <= 0n) {
        return json(
          { ok: false, error: "Faucet wallet needs Base Sepolia ETH to pay gas for USDC transfers." },
          503
        );
      }

      if (faucetUsdcBalance < amount.raw) {
        return json(
          {
            ok: false,
            error: `Faucet wallet has only ${formatUnits(faucetUsdcBalance, 6)} USDC. Top it up first.`,
          },
          503
        );
      }
    }

    const claim = await prisma.faucetClaim.create({
      data: {
        userId: user.id,
        walletAddress,
        ipHash,
        chainId: CHAIN_ID,
        asset,
        amountRaw: amount.raw,
        amountLabel: amount.label,
        tokenAddress: amount.tokenAddress ? getAddress(amount.tokenAddress) : null,
        status: "PENDING",
        userAgent: userAgent.slice(0, 500),
      },
      select: { id: true },
    });

    claimId = claim.id;

    let txHash: `0x${string}`;

    if (asset === "ETH") {
      txHash = await walletClient.sendTransaction({
        to: walletAddress,
        value: amount.raw,
      });
    } else {
      txHash = await walletClient.writeContract({
        address: getAddress(amount.tokenAddress!) as `0x${string}`,
        abi: erc20Abi,
        functionName: "transfer",
        args: [walletAddress, amount.raw],
      });
    }

    await prisma.faucetClaim.update({
      where: { id: claim.id },
      data: { txHash },
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
      timeout: 60_000,
    });

    const ok = receipt.status === "success";

    await prisma.faucetClaim.update({
      where: { id: claim.id },
      data: {
        status: ok ? "SENT" : "FAILED",
        error: ok ? null : "Transaction reverted or failed.",
      },
    });

    if (!ok) {
      return json({ ok: false, error: "Faucet transaction failed.", txHash }, 500);
    }

    return json({
      ok: true,
      asset,
      amount: amount.label,
      walletAddress,
      txHash,
      explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
    });
  } catch (e: any) {
    const message = e?.shortMessage || e?.message || "Faucet claim failed.";

    if (claimId) {
      await prisma.faucetClaim
        .update({
          where: { id: claimId },
          data: { status: "FAILED", error: String(message).slice(0, 2000) },
        })
        .catch(() => null);
    }

    return json(
      {
        ok: false,
        error: message,
      },
      500
    );
  }
}
