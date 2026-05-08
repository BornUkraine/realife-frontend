import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const LAST_UPDATED = "May 8, 2026";

export const metadata: Metadata = {
  title: "Dispute Policy | Realife",
  description:
    "Realife dispute policy for protected escrow orders, seller proof, buyer confirmation, services, physical goods, refunds, and manual review.",
};

type PolicySection = {
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

function PolicyCard({ section, index }: { section: PolicySection; index: number }) {
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

const sections: PolicySection[] = [
  {
    eyebrow: "Purpose",
    title: "Why Realife has a dispute policy",
    body: (
      <>
        <p>
          Realife is designed for protected stablecoin commerce. Escrow can hold funds, but real-world
          commerce still needs order evidence, delivery proof, service completion, deadlines, buyer confirmation,
          seller reputation, and human review for exceptional cases.
        </p>
        <p className="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 p-4 text-[#f7e7a7]">
          This Dispute Policy is an MVP platform policy template. It should be reviewed by qualified counsel
          and updated before mainnet, paid commerce, high-value orders, or regulated categories.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Core principle",
    title: "The smart contract is not the judge",
    body: (
      <>
        <p>
          A smart contract can hold funds and execute release or refund paths. It cannot fully judge whether a
          design was good enough, a physical item was damaged by a carrier, a seller packed correctly, a buyer
          is acting in bad faith, or a service matched the agreed scope.
        </p>
        <p>
          Realife uses a structured trust system: order terms, escrow state, seller proof, buyer response,
          deadlines, messages, account history, policy rules, and manual review when needed.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Before payment",
    title: "Clear terms must be locked before an order",
    body: (
      <>
        <p>
          The best dispute is the one prevented before payment. Sellers and buyers should make the order terms
          clear before funds enter escrow.
        </p>
        <BulletList
          items={[
            "For services: scope, deliverables, timeline, revision count, acceptance rules, refund conditions, and proof requirements.",
            "For physical goods: item description, condition, quantity, location, delivery method, shipping timeline, packaging expectations, tracking, and inspection rules.",
            "For local/offline services: city/area, appointment time, cancellation rules, proof of completion, safety rules, and supported service boundaries.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Default flow",
    title: "How protected order resolution works",
    body: (
      <>
        <p>
          Most orders should not need manual review. A normal protected order should move from payment to
          seller fulfillment, then buyer confirmation, then release of funds.
        </p>
        <BulletList
          items={[
            "Buyer pays and funds enter escrow.",
            "Seller delivers the product, performs the service, or submits proof of completion.",
            "Buyer confirms, requests revision, reports a problem, or opens a dispute within the applicable window.",
            "If there is no valid dispute and the order terms are satisfied, funds may be released according to the order logic.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Opening a dispute",
    title: "When a buyer may dispute an order",
    body: (
      <>
        <p>
          A buyer may open a dispute when there is a real issue with the order. The buyer must provide clear
          evidence and explain the problem inside the order flow where possible.
        </p>
        <BulletList
          items={[
            "Product not delivered or tracking does not support delivery.",
            "Wrong item, missing item, materially different condition, or damaged delivery.",
            "Service not delivered, incomplete work, missed deadline, or output materially different from agreed scope.",
            "Seller refuses agreed revisions, disappears, submits fake proof, or violates listing terms.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Seller proof",
    title: "What sellers should submit",
    body: (
      <>
        <p>
          Sellers should submit evidence that matches the type of order. Strong evidence reduces manual review,
          protects honest sellers, and helps buyers understand what happened.
        </p>
        <BulletList
          items={[
            "Services: files, links, screenshots, work logs, delivered assets, meeting proof, messages, milestone notes, and revision responses.",
            "Physical goods: product photos, packaging photos, shipping receipt, tracking number, carrier updates, delivery confirmation, and condition proof.",
            "Local/offline services: appointment proof, completion notes, buyer communication, photos/videos where appropriate and lawful, and agreed outcome evidence.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Buyer evidence",
    title: "What buyers should submit",
    body: (
      <>
        <p>
          Buyers should submit evidence quickly and clearly. A dispute should explain what was promised,
          what was received, what is missing, and what outcome the buyer requests.
        </p>
        <BulletList
          items={[
            "Photos or videos of damaged, missing, or incorrect goods immediately after delivery or pickup.",
            "Screenshots, files, messages, or notes showing that service work does not match the agreed scope.",
            "Clear requested outcome: revision, replacement, reshipment, partial refund, full refund, or other reasonable resolution.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Services",
    title: "Online service disputes",
    body: (
      <>
        <p>
          Service disputes are often subjective, so Realife focuses on scope versus delivery. If the seller delivered
          what was clearly agreed, funds may be released even if the buyer simply changed their mind. If the seller did
          not deliver the agreed scope, a revision, partial release, refund, or other action may be appropriate.
        </p>
        <BulletList
          items={[
            "Quality complaints should be tied to written scope, acceptance rules, examples, milestones, or revision terms.",
            "A buyer should give the seller a fair chance to submit agreed revisions if revisions were part of the order.",
            "A seller should not expand scope after payment unless both sides agree to new terms.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Physical goods",
    title: "Delivery and damaged item disputes",
    body: (
      <>
        <p>
          Physical commerce can fail for different reasons: seller fraud, poor packaging, carrier damage,
          buyer abuse, stolen packages, incorrect address, customs, or local delivery problems. Realife reviews the
          evidence path, not only one message from either side.
        </p>
        <BulletList
          items={[
            "If seller proof shows correct packaging and carrier damage appears likely, the resolution may involve carrier claim documentation or insurance.",
            "If seller proof is missing, weak, or inconsistent, a refund, partial refund, reshipment, seller reputation action, or seller bond action may apply.",
            "If buyer evidence is late, unclear, or inconsistent with tracking/proof, the order may still release to the seller.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Deadlines",
    title: "Response windows and inactivity",
    body: (
      <>
        <p>
          Realife may use deadlines to prevent funds from being locked forever. Buyers and sellers should respond
          within the order window, upload requested evidence, and keep important communication inside Realife when possible.
        </p>
        <BulletList
          items={[
            "Buyer inactivity after delivery or service submission may lead to release if no valid issue is raised.",
            "Seller inactivity after a dispute may lead to refund, partial refund, account action, or loss of seller protection.",
            "Deadlines may differ by category, value, delivery method, seller level, risk score, and mainnet policy.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Outcomes",
    title: "Possible dispute outcomes",
    body: (
      <>
        <p>
          Realife may support different outcomes depending on evidence, policy, order type, and final marketplace terms.
        </p>
        <BulletList
          items={[
            "Release funds to seller.",
            "Full refund to buyer.",
            "Partial refund or partial release.",
            "Revision request, resubmission, replacement, reshipment, or extended deadline.",
            "Carrier claim escalation, insurance path, seller bond/deposit action, account warning, listing removal, suspension, or ban.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Abuse",
    title: "False disputes, fake proof, and fraud",
    body: (
      <>
        <p>
          Realife may take action against users who abuse escrow or dispute systems. Trust protection must protect honest
          buyers and honest sellers, not create a weapon for fraud.
        </p>
        <BulletList
          items={[
            "Buyers must not claim non-delivery when an item arrived or demand refunds after receiving valid work.",
            "Sellers must not submit fake tracking, fake work, fake proof, misleading photos, or duplicate/counterfeit goods.",
            "Coordinated fraud, self-dealing, fake accounts, same-IP abuse, wallet cycling, review manipulation, or chargeback-style abuse can lead to account action.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Admins",
    title: "Manual review and trust operations",
    body: (
      <>
        <p>
          Realife may use admin review, trusted moderators, AI-assisted summaries, account history, IP/device signals,
          wallet activity, order timelines, and evidence checklists to prepare or decide dispute outcomes. Human review
          should be the exception, not the default for every order.
        </p>
        <p>
          Early mainnet pilots may use founder-led or moderator-assisted review while Realife learns from real order patterns.
          Over time, repeatable evidence standards, automation, seller reputation, and policy templates should reduce manual load.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Limits",
    title: "Unsupported categories and high-risk orders",
    body: (
      <>
        <p>
          Some categories may be prohibited, restricted, require seller verification, require deposits/bonds, require insurance,
          or be blocked until Realife has the right legal and operational process. High-value or fragile items, regulated goods,
          local services, and cross-border delivery may require extra rules.
        </p>
        <p>
          Realife may refuse to mediate disputes for prohibited items, illegal services, off-platform transactions, or orders
          intentionally moved outside Realife to avoid rules.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Testnet notice",
    title: "Current MVP/testnet limitations",
    body: (
      <>
        <p>
          During testnet, dispute features may be simulated, partially manual, or still under development. Testnet transactions,
          test tokens, demo orders, test NFTs, and test escrow flows are for product testing and do not guarantee mainnet policy,
          money value, future eligibility, or final dispute behavior.
        </p>
        <p>
          Before mainnet commerce, Realife should finalize legal terms, jurisdiction rules, supported categories, custody/payment
          structure, external audits, seller verification, dispute operations, and prohibited-item policy.
        </p>
      </>
    ),
  },
];

export default function DisputePolicyPage() {
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
              <Link href="/terms" className="transition hover:text-[#f7e7a7]">Terms</Link>
              <Link href="/privacy" className="transition hover:text-[#f7e7a7]">Privacy</Link>
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
              Trust / Disputes
            </Pill>
            <h1 className="mt-6 max-w-5xl text-5xl font-black tracking-tight md:text-7xl">
              Dispute Policy.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/62 md:text-lg">
              How Realife handles protected order disagreements: escrow state, seller proof, buyer evidence,
              service completion, physical delivery, deadlines, refunds, and exceptional manual review.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/45">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Last updated: {LAST_UPDATED}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Escrow + evidence</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Human review only when needed</span>
            </div>
          </section>
        </Reveal>

        <div className="grid gap-5 pb-16">
          {sections.map((section, index) => (
            <Reveal key={section.title}>
              <PolicyCard section={section} index={index} />
            </Reveal>
          ))}
        </div>
      </div>
    </main>
  );
}
