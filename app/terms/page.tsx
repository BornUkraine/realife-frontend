import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const LAST_UPDATED = "May 8, 2026";

export const metadata: Metadata = {
  title: "Terms & Conditions | Realife",
  description:
    "Terms and conditions for using Realife, including testnet use, NFT receipts, escrow, sellers, buyers, disputes, and marketplace rules.",
};

type LegalSection = {
  eyebrow?: string;
  title: string;
  body: ReactNode;
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

function LegalCard({ section, index }: { section: LegalSection; index: number }) {
  return (
    <GoldEdgeWrap>
      <section className="p-6 md:p-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            {section.eyebrow && (
              <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#d4af37]/75">
                {section.eyebrow}
              </div>
            )}
            <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
              {section.title}
            </h2>
          </div>
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/10 text-sm font-black text-[#f7e7a7] md:flex">
            {String(index + 1).padStart(2, "0")}
          </div>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-white/62 md:text-[15px]">
          {section.body}
        </div>
      </section>
    </GoldEdgeWrap>
  );
}

function BulletList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d4af37] shadow-[0_0_0_4px_rgba(212,175,55,0.10)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const sections: LegalSection[] = [
  {
    eyebrow: "Overview",
    title: "Acceptance of these Terms",
    body: (
      <>
        <p>
          These Terms & Conditions govern your access to and use of Realife, including the website,
          marketplace, NFT creation tools, protected order flows, testnet features, AI-assisted tools,
          and related services.
        </p>
        <p>
          By using Realife, connecting a wallet, signing in, creating a listing, minting an NFT-linked
          receipt, placing an order, or interacting with any Realife feature, you agree to these Terms.
          If you do not agree, do not use the platform.
        </p>
        <p className="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 p-4 text-[#f7e7a7]">
          This page is an MVP platform policy template and is not legal advice. Realife should have
          qualified counsel review these Terms before mainnet launch, paid commerce, and broad user onboarding.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Product status",
    title: "Testnet and mainnet status",
    body: (
      <>
        <p>
          Realife is currently presented as a live MVP/testnet product. Testnet actions may use test tokens,
          test contracts, non-production infrastructure, and experimental features. Testnet assets do not
          represent a guarantee of mainnet value, monetary value, future rewards, or future platform rights.
        </p>
        <BulletList
          items={[
            "Realife may change, pause, remove, or rebuild testnet features at any time.",
            "Testnet transactions can fail, sync slowly, or display incomplete data while the product is being improved.",
            "Mainnet commerce may require additional legal terms, compliance checks, supported-market rules, audits, and partner infrastructure.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Accounts",
    title: "Wallets, Google login, and user identity",
    body: (
      <>
        <p>
          Realife may support wallet login, external wallets, embedded wallets, Google/Web2 onboarding,
          and other authentication methods. Your Realife profile may be connected to one or more wallet
          addresses, login methods, or social/profile links.
        </p>
        <BulletList
          items={[
            "You are responsible for securing your wallet, private keys, recovery phrases, devices, and login credentials.",
            "Realife cannot recover an external wallet or reverse onchain actions that you authorize.",
            "Realife may use wallet addresses, login events, IP information, device data, and order history for security, anti-fraud, support, and marketplace integrity.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Marketplace role",
    title: "What Realife does and does not do",
    body: (
      <>
        <p>
          Realife is building a marketplace and trust layer for stablecoin commerce. The platform can help
          sellers create listings, buyers discover offers, orders move through escrow, and both sides use
          proof, confirmation, and dispute workflows.
        </p>
        <p>
          Unless specifically stated otherwise, Realife is not the seller of third-party goods or services.
          Sellers are responsible for their listings, claims, pricing, delivery, service performance,
          warranties, taxes, and legal compliance. Buyers are responsible for reviewing listing terms before purchasing.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Listings",
    title: "Seller responsibilities",
    body: (
      <>
        <p>
          Sellers must create accurate, lawful, and complete listings. A seller should clearly state what is
          being sold, whether it is a physical product, digital service, online session, local service, or other
          permitted offer, and what the buyer should expect.
        </p>
        <BulletList
          items={[
            "Describe the product or service honestly, including condition, location, delivery method, timeline, scope, revisions, and refund rules.",
            "Only list goods or services that you can legally sell and actually deliver.",
            "Do not misrepresent ownership, authenticity, brand affiliation, quality, delivery capability, location, or seller identity.",
            "Submit proof of delivery, proof of work, tracking, messages, or other evidence when required by the order flow.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Purchases",
    title: "Buyer responsibilities",
    body: (
      <>
        <p>
          Buyers must review listing details, seller terms, delivery rules, service scope, supported regions,
          deadlines, and refund conditions before purchasing. Buyers should not purchase prohibited items,
          illegal services, or offers they do not understand.
        </p>
        <BulletList
          items={[
            "Use the order room and platform messages to keep important order evidence inside Realife where possible.",
            "Inspect delivered goods or submitted service work within the relevant confirmation or dispute window.",
            "Do not open false disputes, claim non-delivery when an item arrived, or abuse escrow protection.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Tokenization",
    title: "NFT receipts, tokenized claims, and real-world rights",
    body: (
      <>
        <p>
          Realife uses NFTs as receipts, claims, access rights, proof, or transaction records connected to
          real-world commerce. An NFT-linked receipt can help represent what was purchased, what should be
          delivered, and what order state applies.
        </p>
        <p>
          Unless a specific listing or separate legal agreement says otherwise, an NFT receipt does not
          automatically mean legal title to a physical asset, equity, securities, intellectual property rights,
          future profit, or a guaranteed reward. The practical meaning of a tokenized claim can depend on the
          seller terms, category, jurisdiction, and final marketplace policy.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Escrow",
    title: "Protected orders and release of funds",
    body: (
      <>
        <p>
          Protected orders are designed so buyers do not blindly prepay and sellers do not work without
          payment confidence. Funds may be held in escrow until delivery, service completion, buyer confirmation,
          expiration of a deadline, or another accepted settlement condition.
        </p>
        <BulletList
          items={[
            "A seller may receive funds after completion, delivery, buyer confirmation, or another approved settlement state.",
            "If a dispute is opened, funds may remain in escrow while evidence is reviewed.",
            "Escrow logic, release paths, refund paths, and fees may differ between testnet, mainnet, service orders, delivery orders, and supported jurisdictions.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Fees",
    title: "Platform fees and seller tools",
    body: (
      <>
        <p>
          Realife&apos;s intended base business model is a fee on completed protected transactions. Fee details
          may change before or after mainnet launch, and higher-risk or higher-support categories may require
          different pricing, seller verification, deposits, insurance, or protection fees.
        </p>
        <p>
          Future seller tools, verification, promoted visibility, storefronts, analytics, AI credits, or other
          upgrades may be offered as paid features. Paid visibility must not be used to sell fake trust or bypass safety rules.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Rules",
    title: "Prohibited and restricted activity",
    body: (
      <>
        <p>
          Realife may restrict or prohibit categories that create legal, safety, fraud, abuse, sanctions, financial,
          health, or platform risk. Realife may remove listings, block orders, suspend accounts, or report abuse when needed.
        </p>
        <BulletList
          items={[
            "No illegal goods, stolen goods, counterfeit goods, weapons, explosives, dangerous substances, human exploitation, hate/extremist content, or regulated goods without approval.",
            "No scams, false delivery proof, fake seller identities, fake reviews, money laundering, sanctions evasion, market manipulation, or abusive dispute behavior.",
            "Some categories may require verification, manual approval, supported jurisdictions, restricted values, seller bonds, insurance, or additional terms.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "AI tools",
    title: "AI-assisted listings, visuals, and support",
    body: (
      <>
        <p>
          Realife may offer AI-assisted listing creation, metadata suggestions, image or video tools, translation,
          search, order support, and dispute triage. AI output can be incomplete or wrong. Sellers and buyers remain
          responsible for reviewing the content they publish or rely on.
        </p>
        <p>
          Do not use AI tools to create misleading listings, fake proof, impersonation, prohibited content, deceptive
          product claims, or unlawful material.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Content",
    title: "User content and intellectual property",
    body: (
      <>
        <p>
          You are responsible for content you upload or submit, including text, images, video, metadata, product
          descriptions, service terms, messages, delivery proof, and dispute evidence. You must have the rights needed
          to use that content.
        </p>
        <p>
          By submitting content to Realife, you grant Realife a permission to host, display, process, index, moderate,
          transform, and use that content as needed to operate the marketplace, create listings, support orders,
          prevent abuse, and improve the product.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Compliance",
    title: "KYC, verification, and supported markets",
    body: (
      <>
        <p>
          Realife may require verification for sellers, higher-value orders, higher-risk categories, business accounts,
          dispute-heavy accounts, or supported-market compliance. Verification may be performed by Realife or third-party providers.
        </p>
        <p>
          Realife may limit, pause, or refuse access in unsupported jurisdictions or for users, wallets, listings, or
          activity that creates legal, regulatory, sanctions, security, or platform risk.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Risk",
    title: "No financial, investment, or legal advice",
    body: (
      <>
        <p>
          Realife does not provide financial, investment, tax, legal, employment, or insurance advice. NFTs, wallets,
          stablecoins, smart contracts, testnet tokens, mainnet transactions, and marketplace commerce involve risk.
        </p>
        <p>
          No Realife feature should be understood as a promise of profit, a guaranteed airdrop, a token launch, or an
          investment opportunity. Realife&apos;s focus is protected commerce, not speculation.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Changes",
    title: "Updates, suspension, and contact",
    body: (
      <>
        <p>
          Realife may update these Terms, change features, remove listings, suspend accounts, restrict access, or modify
          marketplace rules as the product develops, especially before mainnet launch.
        </p>
        <p>
          For questions, support, or legal notices, contact Realife through the official website or official social channels.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.14),transparent_32%),radial-gradient(circle_at_88%_8%,rgba(255,255,255,0.06),transparent_30%),linear-gradient(180deg,#050505_0%,#070605_55%,#030303_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:52px_52px] opacity-[0.20]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
            <Link href="/" className="text-sm font-black tracking-[0.22em] text-[#f7e7a7]">
              REALIFE
            </Link>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
              <Link href="/faq" className="transition hover:text-[#f7e7a7]">FAQ</Link>
              <Link href="/privacy" className="transition hover:text-[#f7e7a7]">Privacy</Link>
              <Link href="/dispute-policy" className="transition hover:text-[#f7e7a7]">Dispute Policy</Link>
              <Link href="/app" className="rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/10 px-4 py-2 font-semibold text-[#f7e7a7] transition hover:bg-[#d4af37]/15">
                Open App
              </Link>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <section className="pb-10 pt-8 md:pb-14 md:pt-12">
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_4px_rgba(212,175,55,0.12)]" />
              Legal / Terms
            </Pill>
            <h1 className="mt-6 max-w-5xl text-5xl font-black tracking-tight md:text-7xl">
              Terms & Conditions.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/62 md:text-lg">
              Platform rules for using Realife, including testnet access, wallet onboarding, NFT receipts,
              protected orders, sellers, buyers, escrow, disputes, AI tools, and marketplace safety.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/45">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Last updated: {LAST_UPDATED}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">MVP / testnet policy</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Counsel review recommended before mainnet</span>
            </div>
          </section>
        </Reveal>

        <div className="grid gap-5 pb-16">
          {sections.map((section, index) => (
            <Reveal key={section.title}>
              <LegalCard section={section} index={index} />
            </Reveal>
          ))}
        </div>
      </div>
    </main>
  );
}
