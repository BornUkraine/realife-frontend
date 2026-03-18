import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function norm(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  const s = String(addr);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function fmtDate(v?: Date | string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB");
}

function ipfsToHttp(uri?: string | null) {
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
    return `https://nftstorage.link/ipfs/${p}`;
  }

  if (u.startsWith("Qm") || u.startsWith("bafy")) {
    return `https://nftstorage.link/ipfs/${u}`;
  }

  return u;
}

function txUrl(chainId: number, txHash?: string | null) {
  if (!txHash) return null;
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${txHash}`;
  if (chainId === 8453) return `https://basescan.org/tx/${txHash}`;
  return null;
}

function deliveryLabel(v?: string | null) {
  switch (String(v || "")) {
    case "NOT_REQUIRED":
      return "Not required";
    case "PENDING":
      return "Order created";
    case "READY_TO_SHIP":
      return "Preparing shipment";
    case "SHIPPED":
      return "Shipped";
    case "DELIVERED":
      return "Delivered";
    case "CONFIRMED":
      return "Confirmed";
    case "RETURN_REQUESTED":
      return "Return requested";
    case "RETURNED":
      return "Returned";
    case "CANCELLED":
      return "Cancelled";
    default:
      return String(v || "—");
  }
}

function escrowLabel(v?: string | null) {
  switch (String(v || "")) {
    case "NOT_REQUIRED":
      return "Not required";
    case "PENDING":
      return "Pending";
    case "FUNDED":
      return "Payment protected";
    case "RELEASED":
      return "Released to seller";
    case "REFUNDED":
      return "Refunded";
    case "DISPUTED":
      return "Disputed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return String(v || "—");
  }
}

function deliveryTone(v?: string | null) {
  switch (String(v || "")) {
    case "CONFIRMED":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
    case "SHIPPED":
    case "DELIVERED":
    case "READY_TO_SHIP":
      return "border-sky-500/25 bg-sky-500/10 text-sky-200";
    case "RETURN_REQUESTED":
    case "RETURNED":
    case "CANCELLED":
      return "border-rose-500/25 bg-rose-500/10 text-rose-200";
    default:
      return "border-amber-500/25 bg-amber-500/10 text-amber-100";
  }
}

function escrowTone(v?: string | null) {
  switch (String(v || "")) {
    case "RELEASED":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
    case "FUNDED":
      return "border-sky-500/25 bg-sky-500/10 text-sky-200";
    case "REFUNDED":
    case "DISPUTED":
    case "CANCELLED":
      return "border-rose-500/25 bg-rose-500/10 text-rose-200";
    default:
      return "border-white/10 bg-white/[0.06] text-white/70";
  }
}

function sourceLabel(sourceType?: string | null, orderKind?: string | null) {
  if (sourceType === "STORE" && orderKind === "PRIMARY") return "PRIMARY STORE";
  if (sourceType === "MARKETPLACE" && orderKind === "SECONDARY") return "SECONDARY";
  return `${sourceType || "UNKNOWN"} / ${orderKind || "UNKNOWN"}`;
}

function currencyLabel(paymentToken?: string | null) {
  return paymentToken ? "USDT" : "ETH";
}

function formatRaw(raw?: bigint | string | null, decimals = 18) {
  try {
    if (raw == null) return "—";
    const v = BigInt(raw);
    const neg = v < 0n;
    const abs = neg ? -v : v;
    const base = 10n ** BigInt(decimals);
    const whole = abs / base;
    const frac = abs % base;
    if (frac === 0n) return `${neg ? "-" : ""}${whole.toString()}`;
    const fracStr = frac.toString().padStart(decimals, "0").slice(0, 6).replace(/0+$/, "");
    return `${neg ? "-" : ""}${whole.toString()}${fracStr ? `.${fracStr}` : ""}`;
  } catch {
    return String(raw || "—");
  }
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[30px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))]",
        "shadow-[0_24px_90px_rgba(0,0,0,0.55)]",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0a09]/25 backdrop-blur-2xl ring-1 ring-black/10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(212,175,55,0.11),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_120%,rgba(255,255,255,0.06),transparent_55%)]" />
        </div>
        <div className="relative z-10 p-6 md:p-7">{children}</div>
      </div>
    </div>
  );
}

const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
  process.env.SUPPORT_EMAIL ||
  "";

const SUPPORT_TELEGRAM =
  process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM ||
  process.env.SUPPORT_TELEGRAM ||
  "";

export default async function ProfileDeliveryPage() {
  const session = await getServerSession(authOptions);

  const viewerId =
    (session as any)?.user?.id ||
    (session as any)?.userId ||
    null;

  const viewerWallet = norm(
    (session as any)?.user?.walletAddress ||
      (session as any)?.walletAddress ||
      ""
  );

  if (!viewerId && !viewerWallet) {
    redirect("/app/profile");
  }

  const orWhere: any[] = [];
  if (viewerId) orWhere.push({ buyerId: viewerId });
  if (viewerWallet) orWhere.push({ buyerWallet: viewerWallet });

  if (!orWhere.length) {
    redirect("/app/profile");
  }

  const orders = await prisma.storeOrder.findMany({
    where: {
      deliveryRequired: true,
      OR: orWhere,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      createdAt: true,
      chainId: true,
      contract: true,
      tokenId: true,
      vertical: true,
      sourceType: true,
      orderKind: true,

      buyerWallet: true,
      sellerWallet: true,

      amount: true,
      unitPrice: true,
      totalPrice: true,
      paymentToken: true,

      deliveryRequired: true,
      physicalItem: true,
      officialItem: true,

      escrowStatus: true,
      deliveryStatus: true,

      shippingName: true,
      shippingPhone: true,
      shippingCountry: true,
      shippingCity: true,
      shippingAddress: true,
      shippingZip: true,

      trackingCode: true,
      trackingUrl: true,
      carrier: true,

      buyTxHash: true,

      noteBuyer: true,
      noteSeller: true,
      adminNote: true,
    },
  });

  const hydrated = await Promise.all(
    orders.map(async (order) => {
      const product = await prisma.realMarketingProduct.findUnique({
        where: {
          chainId_contract_tokenId: {
            chainId: order.chainId,
            contract: order.contract,
            tokenId: order.tokenId,
          },
        },
        select: {
          name: true,
          image: true,
          vertical: true,
        },
      });

      const mint = !product
        ? await prisma.mint.findUnique({
            where: {
              chainId_contract_tokenId: {
                chainId: order.chainId,
                contract: order.contract,
                tokenId: order.tokenId,
              },
            },
            select: {
              name: true,
              image: true,
            },
          })
        : null;

      return {
        ...order,
        productName: product?.name || mint?.name || `Delivery product #${order.tokenId}`,
        productImage: ipfsToHttp(product?.image || mint?.image || null),
        verticalResolved: product?.vertical || order.vertical,
      };
    })
  );

  const totalOrders = hydrated.length;
  const activeShipments = hydrated.filter((x) =>
    ["PENDING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"].includes(String(x.deliveryStatus || ""))
  ).length;

  const trackable = hydrated.filter((x) => x.trackingCode || x.trackingUrl).length;

  const issues = hydrated.filter(
    (x) =>
      x.escrowStatus === "DISPUTED" ||
      x.deliveryStatus === "RETURN_REQUESTED" ||
      x.deliveryStatus === "RETURNED"
  ).length;

  return (
    <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/12 blur-3xl animate-pulse" />
        <div className="absolute -bottom-80 -right-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:56px_56px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-10 space-y-6">
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">
                Private profile
              </div>
              <div className="mt-2 text-3xl md:text-4xl font-black tracking-tight">
                My Delivery
              </div>
              <div className="mt-2 text-[12px] text-white/55 max-w-2xl">
                Private buyer-side shipping and delivery view across store and future delivery-enabled NFT orders.
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/app/orders"
                className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 text-[12px] font-extrabold transition"
              >
                Open Orders Center
              </Link>

              <Link
                href="/app/profile"
                className="px-4 py-2 rounded-2xl text-[12px] font-extrabold text-black bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 hover:brightness-110 transition"
              >
                Profile home
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Orders</div>
              <div className="mt-1 text-lg font-black text-white/90">{totalOrders}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Active delivery</div>
              <div className="mt-1 text-lg font-black text-sky-200">{activeShipments}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Trackable</div>
              <div className="mt-1 text-lg font-black text-white/90">{trackable}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Issues</div>
              <div className="mt-1 text-lg font-black text-amber-100">{issues}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-black text-white/85 uppercase tracking-wider">
                Support / contact
              </div>
              <div className="mt-1 text-[12px] text-white/55">
                Use your order ID when contacting support about shipping.
              </div>
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Support email
              </div>
              <div className="mt-1 text-sm font-extrabold text-white/85 break-all">
                {SUPPORT_EMAIL || "Add SUPPORT_EMAIL / NEXT_PUBLIC_SUPPORT_EMAIL in env"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Support telegram
              </div>
              <div className="mt-1 text-sm font-extrabold text-white/85 break-all">
                {SUPPORT_TELEGRAM || "Add SUPPORT_TELEGRAM / NEXT_PUBLIC_SUPPORT_TELEGRAM in env"}
              </div>
            </div>
          </div>
        </Card>

        {hydrated.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <div className="text-lg font-black text-white/85">No delivery orders yet</div>
              <div className="mt-2 text-[13px] text-white/55">
                Delivery-enabled orders will appear here after purchase.
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {hydrated.map((order) => {
              const orderTxUrl = txUrl(order.chainId, order.buyTxHash);
              const nftHref = `/nft/${order.chainId}/${order.contract}/${encodeURIComponent(
                String(order.tokenId)
              )}`;
              const moneyLabel = currencyLabel(order.paymentToken);

              return (
                <Card key={order.id}>
                  <div className="flex flex-col lg:flex-row gap-5">
                    <div className="w-full lg:w-[180px] shrink-0">
                      <div className="aspect-square rounded-[24px] overflow-hidden border border-white/10 bg-black/30">
                        {order.productImage ? (
                          <img
                            src={order.productImage}
                            alt={order.productName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-white/25 font-black">
                            No media
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">
                            {String(order.verticalResolved || "delivery").toUpperCase()} ORDER
                          </div>
                          <div className="mt-2 text-xl font-black text-white/90 truncate">
                            {order.productName}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <div className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.06] text-[11px] font-black text-white/80">
                              {sourceLabel(order.sourceType, order.orderKind)}
                            </div>

                            <div
                              className={cx(
                                "px-3 py-1.5 rounded-full border text-[11px] font-black",
                                deliveryTone(order.deliveryStatus)
                              )}
                            >
                              {deliveryLabel(order.deliveryStatus)}
                            </div>

                            <div
                              className={cx(
                                "px-3 py-1.5 rounded-full border text-[11px] font-black",
                                escrowTone(order.escrowStatus)
                              )}
                            >
                              {escrowLabel(order.escrowStatus)}
                            </div>
                          </div>
                          <div className="mt-2 text-[12px] text-white/55">
                            Order ID: <span className="font-mono text-white/80">{order.id}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[12px] text-white/45">Total</div>
                          <div className="text-[16px] font-black text-amber-100">
                            {formatRaw(order.totalPrice, order.paymentToken ? 6 : 18)} {moneyLabel}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Token</div>
                          <div className="mt-1 text-[13px] font-extrabold text-white/85">#{order.tokenId}</div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Amount</div>
                          <div className="mt-1 text-[13px] font-extrabold text-white/85">
                            {order.amount.toString()}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Payment</div>
                          <div className="mt-1 text-[13px] font-extrabold text-white/85">{moneyLabel}</div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Created</div>
                          <div className="mt-1 text-[13px] font-extrabold text-white/85 truncate">
                            {fmtDate(order.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid md:grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                            Shipping recipient
                          </div>
                          <div className="mt-2 text-sm font-extrabold text-white/90">
                            {order.shippingName || "—"}
                          </div>
                          <div className="mt-1 text-[12px] text-white/65">{order.shippingPhone || "—"}</div>
                          <div className="mt-2 text-[12px] text-white/65 leading-relaxed">
                            {[
                              order.shippingCountry,
                              order.shippingCity,
                              order.shippingZip,
                              order.shippingAddress,
                            ]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                            Tracking
                          </div>
                          <div className="mt-2 text-sm font-extrabold text-white/90">
                            {order.carrier || "Carrier not set"}
                          </div>
                          <div className="mt-1 text-[12px] text-white/65">
                            Code: {order.trackingCode || "—"}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {order.trackingUrl ? (
                              <a
                                href={order.trackingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 text-[12px] font-extrabold transition"
                              >
                                Track package ↗
                              </a>
                            ) : (
                              <span className="text-[12px] text-white/45">
                                Tracking link not added yet.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {(order.adminNote || order.noteSeller || order.noteBuyer) ? (
                        <div className="mt-4 grid md:grid-cols-3 gap-3">
                          {order.noteBuyer ? (
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                                Buyer note
                              </div>
                              <div className="mt-2 text-[12px] text-white/75 whitespace-pre-wrap">
                                {order.noteBuyer}
                              </div>
                            </div>
                          ) : null}

                          {order.noteSeller ? (
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                                Seller note
                              </div>
                              <div className="mt-2 text-[12px] text-white/75 whitespace-pre-wrap">
                                {order.noteSeller}
                              </div>
                            </div>
                          ) : null}

                          {order.adminNote ? (
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                                Admin note
                              </div>
                              <div className="mt-2 text-[12px] text-white/75 whitespace-pre-wrap">
                                {order.adminNote}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href={nftHref}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-2xl text-[12px] font-extrabold text-black bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 hover:brightness-110 transition"
                        >
                          Open NFT
                        </Link>

                        {orderTxUrl ? (
                          <a
                            href={orderTxUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 text-[12px] font-extrabold transition"
                          >
                            Buy tx ↗
                          </a>
                        ) : null}

                        <Link
                          href="/app/orders"
                          className="inline-flex items-center justify-center px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 text-[12px] font-extrabold transition text-white/85"
                        >
                          Open Orders Center
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <footer className="pt-6 text-[10px] font-black text-white/20 text-center uppercase tracking-[0.4em]">
          Realife Ecosystem • Delivery
        </footer>
      </div>
    </main>
  );
}