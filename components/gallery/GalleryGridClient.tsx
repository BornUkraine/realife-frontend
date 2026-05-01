"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import NftMedia from "@/components/NftMedia";
import QuickList1155 from "@/components/trading/QuickList1155";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  const s = String(addr);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

type MarketType = "STANDARD" | "PROTECTED";

type FulfillmentType =
  | "PHYSICAL_GOOD"
  | "DIGITAL_SERVICE"
  | "ONLINE_SESSION"
  | "LOCAL_SERVICE";

type GalleryItem = {
  id: string;
  chainId: number;
  contract: string;
  tokenId: string;
  ownedAmount: string;
  updatedAt: string;
  name: string | null;
  tokenUri: string | null;
  kind: "image" | "video";
  media: string | null;
  poster: string | null;
  supply: string | null;

  isCafeNft: boolean;
  isStoreNft: boolean;
  isUser1155Nft: boolean;
  isDeliveryUserNft: boolean;

  deliveryEnabled?: boolean;
  physicalItemIncluded?: boolean;
  officialItem?: boolean;
  fulfillmentType?: FulfillmentType | string | null;
  category?: string | null;
  subcategory?: string | null;
  serviceCountry?: string | null;
  serviceCity?: string | null;
  serviceArea?: string | null;
  serviceLocationLabel?: string | null;

  secondaryMarketType?: MarketType;
  usesProtectedSecondaryMarket?: boolean;
  protectedSubtype?: FulfillmentType | string | null;
  protectedSubtypeLabel?: string | null;

  href: string;
};

type PreviewState = {
  src: string;
  kind: "image" | "video";
  poster?: string | null;
  alt?: string;
} | null;

type QuickListListedPayload = {
  listedAmount: string;
  remainingOwnedAmount: string | null;
  marketType: MarketType;
};

type GridToast = {
  id: string;
  title: string;
  text?: string;
};

function toBigIntSafe(v?: string | null) {
  try {
    if (!v) return 0n;
    return BigInt(v);
  } catch {
    return 0n;
  }
}

const quickListHoverClass =
  "opacity-100 transition-all duration-150 md:pointer-events-none md:translate-y-1 md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100";

const previewHoverClass =
  "opacity-100 transition-all duration-150 md:pointer-events-none md:translate-y-1 md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100";

function protectedSubtypeTone(subtype?: string | null) {
  const x = String(subtype || "").trim().toUpperCase();

  if (x === "PHYSICAL_GOOD") {
    return "border-violet-500/20 bg-violet-500/10 text-violet-100";
  }

  if (
    x === "DIGITAL_SERVICE" ||
    x === "ONLINE_SESSION" ||
    x === "LOCAL_SERVICE"
  ) {
    return "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-100";
  }

  return "border-white/10 bg-white/[0.06] text-white/80";
}


function cleanLocationValue(v?: string | null) {
  const s = String(v || "").trim();
  return s ? s : null;
}

function formatServiceLocation(input: {
  serviceCountry?: string | null;
  serviceCity?: string | null;
  serviceArea?: string | null;
}) {
  const country = cleanLocationValue(input.serviceCountry);
  const city = cleanLocationValue(input.serviceCity);
  const area = cleanLocationValue(input.serviceArea);
  const main = [city, country].filter(Boolean).join(", ");
  if (main && area) return main + " • " + area;
  return main || area || null;
}

function GridToastCard({ toast }: { toast: GridToast }) {
  return (
    <div className="pointer-events-auto min-w-[240px] max-w-[320px] overflow-hidden rounded-[22px] border border-white/12 bg-black/55 px-4 py-3 text-white/88 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-100">
        {toast.title}
      </div>
      {toast.text ? (
        <div className="mt-1 text-[12px] leading-relaxed text-white/70">
          {toast.text}
        </div>
      ) : null}
    </div>
  );
}

function EmptyGridState({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="col-span-full overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,rgba(247,231,167,0.16),rgba(212,175,55,0.07),rgba(184,135,10,0.05))] p-px shadow-[0_28px_110px_rgba(0,0,0,0.55)]">
      <div className="rounded-[32px] border border-white/10 bg-[#0b0a09]/46 p-6 text-center backdrop-blur-2xl md:p-8">
        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/40">
          {isOwner ? "Owner View" : "Gallery"}
        </div>
        <div className="mt-3 text-xl font-black tracking-tight text-white/90">
          {isOwner ? "No NFTs ready in this grid yet" : "No NFTs found"}
        </div>
        <div className="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-white/55">
          {isOwner
            ? "When you mint or keep inventory in your wallet, it will appear here. Quick list actions will also update this grid instantly."
            : "There are no items to show in this section yet."}
        </div>
      </div>
    </div>
  );
}

export default function GalleryGridClient({
  items,
  isOwner,
}: {
  items: GalleryItem[];
  isOwner: boolean;
}) {
  const [preview, setPreview] = useState<PreviewState>(null);
  const [gridItems, setGridItems] = useState(items);
  const [freshlyListed, setFreshlyListed] = useState<
    Record<string, QuickListListedPayload>
  >({});
  const [toasts, setToasts] = useState<GridToast[]>([]);

  useEffect(() => {
    setGridItems(items);
  }, [items]);

  const pushToast = useCallback((title: string, text?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, title, text }]);
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, 3600);
    }
  }, []);

  const handleQuickListed = useCallback(
    (itemId: string, payload: QuickListListedPayload) => {
      setGridItems((prev) => {
        const next = prev
          .map((item) => {
            if (item.id !== itemId) return item;

            let remaining = payload.remainingOwnedAmount;

            if (remaining == null) {
              const base = toBigIntSafe(item.ownedAmount);
              const listed = toBigIntSafe(payload.listedAmount);
              remaining = base > listed ? (base - listed).toString() : "0";
            }

            return {
              ...item,
              ownedAmount: remaining,
              secondaryMarketType: payload.marketType,
            };
          })
          .filter((item) => toBigIntSafe(item.ownedAmount) > 0n);

        return next;
      });

      setFreshlyListed((prev) => ({ ...prev, [itemId]: payload }));
      pushToast(
        "Listing created",
        payload.remainingOwnedAmount === "0"
          ? "Item moved out of your owner grid instantly."
          : "Owner balance and market badge were updated instantly."
      );

      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          setFreshlyListed((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
        }, 4500);
      }
    },
    [pushToast]
  );

  useEffect(() => {
    if (!preview) return;

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;

    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    const prevHtmlOverflow = html.style.overflow;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    html.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };

    window.addEventListener("keydown", onKey);

    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      html.style.overflow = prevHtmlOverflow;

      window.removeEventListener("keydown", onKey);

      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollY,
          left: 0,
          behavior: "auto",
        });
      });
    };
  }, [preview]);

  return (
    <>
      <div
        className="reveal grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
        style={{ animationDelay: "90ms" }}
      >
        {gridItems.length === 0 ? <EmptyGridState isOwner={isOwner} /> : null}

        {gridItems.map((x, index) => {
          const showProtectedBadge = x.secondaryMarketType === "PROTECTED";
          const showProtectedSubtype =
            showProtectedBadge && Boolean(x.protectedSubtypeLabel);
          const serviceLocationLabel =
            x.serviceLocationLabel ||
            formatServiceLocation({
              serviceCountry: x.serviceCountry,
              serviceCity: x.serviceCity,
              serviceArea: x.serviceArea,
            });
          const showServiceLocation =
            String(x.protectedSubtype || x.fulfillmentType || "").toUpperCase() ===
              "LOCAL_SERVICE" && Boolean(serviceLocationLabel);
          const justListed = freshlyListed[x.id];
          const priorityMedia = index < 4;

          return (
            <Link
              key={x.id}
              href={x.href}
              className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] shadow-[0_16px_48px_rgba(0,0,0,0.38)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.06]"
            >
              <div className="relative aspect-square w-full bg-black">
                {x.media ? (
                  <>
                    <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
                      {isOwner ? (
                        <div className={cx("z-30", quickListHoverClass)}>
                          <QuickList1155
                            chainId={x.chainId}
                            contract={x.contract}
                            tokenId={String(x.tokenId)}
                            maxAmountHint={String(x.ownedAmount)}
                            name={x.name}
                            deliveryEnabled={Boolean(x.deliveryEnabled)}
                            physicalItemIncluded={Boolean(
                              x.physicalItemIncluded
                            )}
                            fulfillmentType={
                              (x.fulfillmentType as FulfillmentType | null) ||
                              null
                            }
                            category={x.category || null}
                            subcategory={x.subcategory || null}
                            serviceCountry={x.serviceCountry || null}
                            serviceCity={x.serviceCity || null}
                            serviceArea={x.serviceArea || null}
                            marketTypeHint={x.secondaryMarketType || "STANDARD"}
                            preferredMarketType={
                              x.secondaryMarketType || "STANDARD"
                            }
                            onListed={(payload) =>
                              handleQuickListed(x.id, payload)
                            }
                          />
                        </div>
                      ) : null}

                      <div className={cx("z-20", previewHoverClass)}>
                        <button
                          type="button"
                          aria-label="Open full preview"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPreview({
                              src: x.media!,
                              kind: x.kind,
                              poster: x.kind === "video" ? x.poster : null,
                              alt: x.name || "NFT",
                            });
                          }}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-black/45 text-white/90 shadow-[0_10px_28px_rgba(0,0,0,0.30)] transition-all duration-150 hover:scale-[1.03] hover:bg-black/60 active:scale-[0.98]"
                        >
                          <span className="text-lg leading-none">⤢</span>
                        </button>
                      </div>
                    </div>

                    <NftMedia
                      src={x.media}
                      kind={x.kind}
                      alt={x.name || "NFT"}
                      poster={x.kind === "video" ? x.poster : null}
                      showControls={false}
                      fit="contain"
                      className="h-full w-full"
                      roundedClass="rounded-none"
                      mediaBgClass="bg-black"
                      priority={priorityMedia}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
                    />

                    <div className="absolute left-3 top-3 z-10 flex max-w-[78%] flex-col gap-2">
                      {isOwner ? (
                        <div className="w-fit rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-black tracking-[0.16em] text-amber-100">
                          OWNER VIEW
                        </div>
                      ) : null}

                      {x.kind === "video" ? (
                        <div className="w-fit rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold text-amber-100">
                          VIDEO
                        </div>
                      ) : null}

                      <div
                        className={cx(
                          "w-fit rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold",
                          x.isCafeNft
                            ? "text-amber-100"
                            : x.isStoreNft
                              ? "text-sky-200"
                              : x.isDeliveryUserNft
                                ? "text-violet-200"
                                : "text-emerald-200"
                        )}
                      >
                        {x.isCafeNft
                          ? "CAFE"
                          : x.isStoreNft
                            ? "STORE"
                            : x.isDeliveryUserNft
                              ? "DELIVERY"
                              : "EDITION"}
                      </div>

                      <div className="w-fit rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold text-white/75">
                        Owned x{x.ownedAmount}
                      </div>

                      {justListed ? (
                        <div className="w-fit rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.16)]">
                          JUST LISTED / SYNCING
                        </div>
                      ) : null}

                      {showProtectedBadge ? (
                        <div className="w-fit rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-100">
                          PROTECTED
                        </div>
                      ) : null}

                      {showProtectedSubtype ? (
                        <div
                          className={cx(
                            "w-fit rounded-full border px-2 py-1 text-[10px] font-bold",
                            protectedSubtypeTone(x.protectedSubtype)
                          )}
                        >
                          {x.protectedSubtypeLabel}
                        </div>
                      ) : null}
                      {showServiceLocation ? (
                        <div className="w-fit max-w-[180px] truncate rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-100">
                          {serviceLocationLabel}
                        </div>
                      ) : null}



                      {x.officialItem ? (
                        <div className="w-fit rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-100">
                          OFFICIAL
                        </div>
                      ) : null}
                    </div>

                    {x.supply ? (
                      <div className="absolute bottom-3 right-3 z-10 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold text-white/75">
                        Supply x{x.supply}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-bold text-white/25">
                    No media
                  </div>
                )}

                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.28)_0%,transparent_44%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              </div>

              <div className="p-5">
                <div className="truncate text-sm font-bold text-white/90">
                  {x.name || `Token #${x.tokenId}`}
                </div>

                <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px] text-white/40">
                  <span className="truncate">{shortAddr(x.contract)}</span>
                  <span className="font-mono">#{x.tokenId}</span>
                </div>
                {showServiceLocation ? (
                  <div className="mt-2 truncate text-[12px] font-semibold text-sky-100/85">
                    {serviceLocationLabel}
                  </div>
                ) : null}


                <div className="mt-3 flex flex-wrap gap-2">
                  {x.isCafeNft || x.isStoreNft ? (
                    <span
                      className={cx(
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold",
                        x.isCafeNft
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
                          : "border-sky-500/20 bg-sky-500/10 text-sky-200"
                      )}
                    >
                      {x.isCafeNft ? "Cafe storefront" : "NFT Store"}
                    </span>
                  ) : null}

                  {showProtectedBadge ? (
                    <span className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold text-violet-100">
                      Protected market
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold text-white/80">
                      Standard market
                    </span>
                  )}

                  {showProtectedSubtype ? (
                    <span
                      className={cx(
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold",
                        protectedSubtypeTone(x.protectedSubtype)
                      )}
                    >
                      {x.protectedSubtypeLabel}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 h-px bg-white/10" />

                <div className="mt-4 flex items-center justify-between text-[12px] font-bold text-amber-100/85 group-hover:text-amber-100">
                  <span>{justListed ? "Listed • View Details" : "View Details"}</span>
                  <span>→</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {toasts.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] flex justify-center px-4 sm:bottom-5 sm:justify-end">
          <div className="flex max-w-[92vw] flex-col gap-2">
            {toasts.map((toast) => (
              <GridToastCard key={toast.id} toast={toast} />
            ))}
          </div>
        </div>
      ) : null}

      {preview ? (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPreview(null);
            }}
            aria-label="Close"
            className="absolute right-4 top-4 z-[10000] inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/50 text-white shadow-[0_10px_30px_rgba(0,0,0,0.30)] transition duration-150 hover:scale-[1.03] hover:bg-black/70"
          >
            <span className="text-xl leading-none">✕</span>
          </button>

          <div className="pointer-events-none absolute inset-x-0 top-0 z-[10000]">
            <div className="mx-auto max-w-6xl px-5 pt-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] font-bold text-white/70 backdrop-blur-md shadow-[0_10px_35px_rgba(0,0,0,0.25)]">
                <span>Fullscreen Preview</span>
                <span className="text-white/30">•</span>
                <span
                  className={
                    preview.kind === "video"
                      ? "text-amber-100"
                      : "text-white/75"
                  }
                >
                  {preview.kind === "video" ? "VIDEO" : "IMAGE"}
                </span>
              </div>
            </div>
          </div>

          <div
            className="flex h-full w-full items-center justify-center p-4 sm:p-6 md:p-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="relative flex h-full w-full items-center justify-center">
              <NftMedia
                src={preview.src}
                kind={preview.kind}
                alt={preview.alt || "NFT"}
                poster={preview.kind === "video" ? preview.poster : null}
                showControls={true}
                fit="contain"
                className="h-full w-full"
                roundedClass="rounded-none"
                mediaBgClass="bg-black"
                priority
                sizes="100vw"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
