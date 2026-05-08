import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "FAQ | Realife",
  description:
    "Frequently asked questions about Realife, stablecoin escrow, NFT receipts, protected orders, services, delivery, and real-world commerce.",
};

type FAQItem = {
  q: string;
  a: ReactNode;
};

type FAQSection = {
  eyebrow: string;
  title: string;
  description: string;
  items: FAQItem[];
};

function Pill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
      {children}
    </div>
  );
}

function GoldEdgeWrap({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-[34px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.35),rgba(212,175,55,0.16),rgba(184,135,10,0.10))]",
        "shadow-[0_34px_130px_rgba(0,0,0,0.60)]",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden rounded-[34px]",
          "border border-white/10 bg-[#0b0a09]/60 backdrop-blur-2xl",
          "ring-1 ring-black/10",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.12),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]",
        ].join(" ")}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

const faqSections: FAQSection[] = [
  {
    eyebrow: "Essentials",
    title: "What Realife is",
    description:
      "The simple version: Realife turns stablecoin payments into protected real-world commerce orders.",
    items: [
      {
        q: "What is Realife?",
        a: (
          <>
            Realife is a stablecoin escrow marketplace for real-world goods and
            services. Buyers can pay with stablecoins, sellers can offer real
            products or services, and the order can be protected with escrow,
            delivery or service confirmation, and an NFT-linked receipt.
          </>
        ),
      },
      {
        q: "Is Realife only an NFT marketplace?",
        a: (
          <>
            No. Realife uses NFTs as receipts, claims, or transaction rights
            connected to real-world commerce. The goal is not speculation or
            collectible hype. The goal is to make blockchain useful for real
            products, services, work, delivery, and trusted settlement.
          </>
        ),
      },
      {
        q: "What can people buy or sell on Realife?",
        a: (
          <>
            Realife is designed for physical goods, digital services, online
            sessions, local or offline services, creative work, business
            services, travel offers, tickets, merch, fitness sessions,
            education, consulting, and other real-world value. Some categories
            may require verification, manual approval, or restricted rules.
          </>
        ),
      },
      {
        q: "Who is Realife for first?",
        a: (
          <>
            The first wedge is crypto-native sellers and buyers who already use
            wallets or stablecoins. This includes remote workers, developers,
            designers, marketers, moderators, creators, service providers,
            small sellers, DAOs, Web3 teams, and stablecoin users who need more
            protection than direct transfers or Telegram OTC deals.
          </>
        ),
      },
    ],
  },
  {
    eyebrow: "Tokenization",
    title: "NFT receipts and real-world rights",
    description:
      "In Realife, tokenization means attaching an onchain receipt or claim to a real order outcome.",
    items: [
      {
        q: "Why does Realife use NFTs?",
        a: (
          <>
            Realife uses NFTs to represent a receipt, claim, access right, or
            proof connected to a product, service, order, or outcome. The NFT is
            part of the transaction record. It helps show what was purchased,
            what should be delivered, and how the order moved through the
            Realife flow.
          </>
        ),
      },
      {
        q: "What is an NFT receipt?",
        a: (
          <>
            An NFT receipt is a tokenized record linked to a real-world order.
            It can represent the buyer&apos;s claim to a product, service,
            session, delivery, or completed outcome. It is not meant to be an
            empty picture. It is meant to connect digital ownership with a real
            commerce action.
          </>
        ),
      },
      {
        q: "Does the NFT mean I legally own a physical asset?",
        a: (
          <>
            The safest way to understand it is: the NFT can represent a
            transaction right, claim, receipt, access, or proof connected to a
            real-world order. Exact legal meaning can depend on the category,
            seller terms, jurisdiction, and future marketplace policy.
          </>
        ),
      },
      {
        q: "Can a service be tokenized?",
        a: (
          <>
            Yes. A service can be represented by an NFT-linked order or claim.
            For example, a design task, consulting session, fitness session,
            online class, marketing task, website work, or local service can
            have scope, price, delivery terms, proof, buyer confirmation, and
            dispute history connected to the order.
          </>
        ),
      },
    ],
  },
  {
    eyebrow: "Escrow",
    title: "How protected orders work",
    description:
      "Escrow is the trust layer between strangers: the buyer should not blindly prepay, and the seller should not work without payment confidence.",
    items: [
      {
        q: "How does escrow work on Realife?",
        a: (
          <>
            A buyer pays for a product or service, and the funds are held in
            escrow while the seller fulfills the order. After the product is
            delivered or the service is completed and confirmed, funds can be
            released to the seller. If something goes wrong, the order can move
            into a resolution path.
          </>
        ),
      },
      {
        q: "When does the seller get paid?",
        a: (
          <>
            The seller gets paid after the order reaches a successful outcome:
            delivery, completion, buyer confirmation, or another accepted
            settlement state. Realife is designed around completed commerce, not
            instant payout before the seller delivers.
          </>
        ),
      },
      {
        q: "What happens if buyer and seller disagree?",
        a: (
          <>
            If there is a dispute, funds stay in escrow while the issue is
            reviewed. Realife can use order state, seller proof, delivery proof,
            service evidence, deadlines, messages, buyer confirmation, account
            history, and manual review for exceptional cases.
          </>
        ),
      },
      {
        q: "Can every dispute be solved automatically by a smart contract?",
        a: (
          <>
            No. A smart contract can hold and release funds, but it cannot fully
            judge real-world quality, damaged goods, missing items, late
            delivery, or subjective service work. Realife combines smart
            contract logic with order evidence, policies, reputation, deadlines,
            and human review when needed.
          </>
        ),
      },
    ],
  },
  {
    eyebrow: "Services and delivery",
    title: "Goods, services, and order rooms",
    description:
      "Realife is built for real commerce flows, not only simple NFT listings.",
    items: [
      {
        q: "How do online services work?",
        a: (
          <>
            Before payment, the buyer and seller should understand scope,
            deliverables, timeline, revision rules, acceptance rules, and refund
            conditions. The seller then submits work or proof inside the order
            flow. The buyer can accept, request revision, or open a dispute
            before the deadline.
          </>
        ),
      },
      {
        q: "How do physical goods work?",
        a: (
          <>
            Physical goods can include product condition, packaging proof,
            shipping details, tracking, buyer inspection, and confirmation. For
            fragile or higher-risk items, Realife can require stronger seller
            rules, verification, deposits, insurance, or category restrictions.
          </>
        ),
      },
      {
        q: "What is a protected order room?",
        a: (
          <>
            A protected order room is the place where the order lifecycle is
            tracked: payment, NFT receipt, order state, seller proof, buyer
            confirmation, messages, revisions, dispute status, release, refund,
            or resolution.
          </>
        ),
      },
      {
        q: "Can sellers offer local or offline services?",
        a: (
          <>
            Yes. Realife can support local services such as fitness sessions,
            lessons, tours, photography, repairs, beauty services, cleaning,
            coaching, and other offline work. Local service listings can include
            country, city, and service area.
          </>
        ),
      },
    ],
  },
  {
    eyebrow: "Payments and wallets",
    title: "Stablecoins, wallets, and onboarding",
    description:
      "Realife starts crypto-native, but the product is designed to become easier for Web2 users over time.",
    items: [
      {
        q: "What currency does Realife use?",
        a: (
          <>
            Realife is designed around stablecoin commerce, especially USDC
            flows. Stablecoins make global settlement faster and more native to
            Web3 users, while escrow adds protection around real-world outcomes.
          </>
        ),
      },
      {
        q: "Do I need a wallet?",
        a: (
          <>
            For the current Web3 flow, users connect a wallet to mint, list,
            buy, or interact with protected orders. Realife is also preparing
            easier onboarding through Web2-style login and embedded wallets so
            normal users can use the product without learning every crypto step
            first.
          </>
        ),
      },
      {
        q: "What chain is Realife on now?",
        a: (
          <>
            The current live MVP runs on Base Sepolia testnet. Realife is not
            yet a mainnet commerce product. The next major step is security
            hardening, compliance planning, mainnet USDC readiness, and limited
            real transaction pilots.
          </>
        ),
      },
      {
        q: "Do users need real funds on testnet?",
        a: (
          <>
            No. The current MVP is for testing flows such as NFT creation,
            marketplace listings, trading, and protected escrow logic. Testnet
            usage should not require real mainnet funds.
          </>
        ),
      },
    ],
  },
  {
    eyebrow: "Trust and safety",
    title: "Rules, reviews, and compliance discipline",
    description:
      "Real-world commerce needs more than open posting. It needs rules, proof, and safety controls.",
    items: [
      {
        q: "Is Realife fully permissionless?",
        a: (
          <>
            Not for every flow. Real goods and services require safety rules,
            restricted categories, seller verification, dispute policy, and
            support paths. Some sellers, listings, or high-risk categories may
            need manual review or approval.
          </>
        ),
      },
      {
        q: "How does Realife reduce fraud?",
        a: (
          <>
            Realife can use wallet history, user profiles, seller verification,
            order evidence, delivery proof, service proof, buyer confirmation,
            dispute history, IP and country signals, admin review, and future
            reputation tools to detect suspicious behavior and improve trust.
          </>
        ),
      },
      {
        q: "What happens to prohibited or fake listings?",
        a: (
          <>
            Realife can remove fake, empty, unsafe, or prohibited listings and
            restrict risky categories. The platform is designed to become a
            trusted commerce layer, not an unmoderated place for anything.
          </>
        ),
      },
      {
        q: "Is Realife compliant today?",
        a: (
          <>
            Realife is currently a testnet MVP. Before scaling mainnet commerce,
            Realife needs legal review, marketplace terms, restricted category
            policy, supported-market strategy, seller verification rules,
            security audits, and custody or payment partner diligence where
            required.
          </>
        ),
      },
    ],
  },
  {
    eyebrow: "Business model",
    title: "How Realife makes money",
    description:
      "The business model is tied to completed protected commerce, not fake volume.",
    items: [
      {
        q: "What fee does Realife charge?",
        a: (
          <>
            The base model is a 2.5% fee on completed transactions. Realife
            earns when protected commerce closes successfully, so the platform
            is aligned with real buyer-seller outcomes.
          </>
        ),
      },
      {
        q: "Are there future paid seller tools?",
        a: (
          <>
            Yes, but only after real transaction demand exists. Future tools can
            include verification, storefronts, promoted listings, analytics,
            AI seller workflows, and risk-based protection fees for
            higher-support orders.
          </>
        ),
      },
      {
        q: "Will Realife launch a token?",
        a: (
          <>
            There is no token today and no guaranteed airdrop. Realife can use
            points, reputation, access, and rewards tied to real contribution.
            A token should only be explored later if it is legally safe and
            useful for rewards, governance, or participation.
          </>
        ),
      },
    ],
  },
  {
    eyebrow: "AI",
    title: "AI as a commerce assistant",
    description:
      "AI is useful, but it is not the core product. The core product is protected stablecoin commerce.",
    items: [
      {
        q: "How does Realife use AI?",
        a: (
          <>
            AI helps sellers create better listings faster: descriptions,
            categories, delivery terms, service scope, buyer-friendly wording,
            visual assets, translation, search, metadata, and order support. AI
            reduces friction, but escrow, NFT receipts, and order state are the
            core trust layer.
          </>
        ),
      },
      {
        q: "Can AI help with disputes?",
        a: (
          <>
            AI can help collect evidence, summarize buyer and seller claims,
            flag missing proof, check policy, and prepare cases for review. It
            should assist human decision-making, not blindly replace it for
            complex real-world disputes.
          </>
        ),
      },
    ],
  },
];

const quickStats = [
  "Stablecoin escrow",
  "NFT receipts",
  "Protected services",
  "Delivery flows",
  "Order rooms",
  "AI listing help",
  "Base Sepolia MVP",
  "2.5% completed transaction fee",
];

export default function FAQPage() {
  const year = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <Reveal>
        <GoldEdgeWrap className="rounded-[40px]">
          <div className="relative overflow-hidden p-7 md:p-10">
            <div className="pointer-events-none absolute -top-44 -right-44 h-[560px] w-[560px] rounded-full bg-[#d4af37]/14 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-44 -left-44 h-[560px] w-[560px] rounded-full bg-white/[0.06] blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                  Realife FAQ
                </Pill>
                <Pill>Stablecoin commerce</Pill>
                <Pill>NFT receipts</Pill>
                <Pill>Escrow + trust</Pill>
              </div>

              <h1 className="mt-5 max-w-5xl text-4xl font-black leading-[1.05] tracking-[-0.02em] md:text-6xl">
                Frequently asked questions about{" "}
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  Realife
                </span>
              </h1>

              <p className="mt-4 max-w-4xl text-sm leading-relaxed text-white/70 md:text-base">
                Realife is building a trust layer for stablecoin commerce:
                escrow, NFT-linked receipts, order states, delivery and service
                confirmation, and dispute paths for real-world goods and
                services.
              </p>

              <div className="mt-5 grid max-w-6xl grid-cols-2 gap-2 md:grid-cols-4">
                {quickStats.map((item) => (
                  <div
                    key={item}
                    className="rounded-[22px] border border-white/10 bg-white/[0.05] px-3 py-3 text-xs font-semibold leading-relaxed text-white/70"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/app/create"
                  className="rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-6 py-3 font-extrabold text-black ring-1 ring-black/15 transition hover:brightness-110 shadow-[0_18px_60px_rgba(212,175,55,0.20)]"
                >
                  Create NFT
                </Link>
                <Link
                  href="/app/trading"
                  className="rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 font-semibold backdrop-blur-2xl transition hover:bg-white/10 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  Open marketplace →
                </Link>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      {faqSections.map((section, sectionIndex) => (
        <Reveal key={section.title} delayMs={80 + sectionIndex * 40}>
          <GoldEdgeWrap className="rounded-[36px]">
            <section className="p-6 md:p-8">
              <div className="mb-5 max-w-3xl">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-100/60">
                  {section.eyebrow}
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.02em] text-white md:text-3xl">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {section.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {section.items.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-[26px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl transition hover:border-amber-300/20 hover:bg-white/[0.06] open:border-amber-300/25 open:bg-amber-500/[0.06]"
                  >
                    <summary className="cursor-pointer list-none text-sm font-extrabold leading-snug text-white marker:text-[#d4af37]">
                      <div className="flex items-start justify-between gap-4">
                        <span>{item.q}</span>
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-sm font-black text-amber-100/70 transition group-open:rotate-45 group-open:border-amber-300/30 group-open:text-amber-100">
                          +
                        </span>
                      </div>
                    </summary>
                    <div className="mt-4 border-t border-white/10 pt-4 text-sm leading-relaxed text-white/64">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          </GoldEdgeWrap>
        </Reveal>
      ))}

      <Reveal delayMs={240}>
        <GoldEdgeWrap className="rounded-[40px]">
          <div className="relative overflow-hidden p-7 md:p-10">
            <div className="pointer-events-none absolute -right-36 -top-36 h-[420px] w-[420px] rounded-full bg-[#d4af37]/12 blur-3xl" />
            <div className="relative max-w-4xl">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-100/60">
                Still early
              </div>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.02em] text-white md:text-4xl">
                Realife is live on testnet and moving toward mainnet commerce.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/65 md:text-base">
                The current MVP is for proving the product surface: minting,
                marketplace activity, protected order flows, wallet-based
                onboarding, AI-assisted listings, and admin tooling. Mainnet
                launch requires security hardening, compliance review, USDC
                settlement readiness, seller onboarding, and controlled pilots.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/app"
                  className="rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-6 py-3 font-extrabold text-black ring-1 ring-black/15 transition hover:brightness-110 shadow-[0_18px_60px_rgba(212,175,55,0.20)]"
                >
                  Enter Realife
                </Link>
                <Link
                  href="/app/faucet"
                  className="rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 font-semibold backdrop-blur-2xl transition hover:bg-white/10 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  Get test ETH →
                </Link>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={280}>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 pt-2 text-xs text-white/45">
          <div>© {year} Realife</div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="opacity-60">USDC commerce</span>
            <span className="opacity-60">Escrow</span>
            <span className="opacity-60">NFT receipts</span>
            <span className="opacity-60">Services</span>
            <span className="opacity-60">Delivery</span>
            <span className="opacity-60">Trust layer</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
