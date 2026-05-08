import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const LAST_UPDATED = "May 8, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy | Realife",
  description:
    "Privacy policy for Realife, including wallet addresses, Google login, IP information, order data, AI tools, marketplace activity, and user rights.",
};

type PrivacySection = {
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

function PrivacyCard({ section, index }: { section: PrivacySection; index: number }) {
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

const sections: PrivacySection[] = [
  {
    eyebrow: "Overview",
    title: "What this Privacy Policy covers",
    body: (
      <>
        <p>
          This Privacy Policy explains how Realife may collect, use, store, protect, and share information
          when you use the Realife website, marketplace, wallet onboarding, NFT creation tools, protected
          order flows, AI-assisted tools, admin/support features, and related services.
        </p>
        <p className="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 p-4 text-[#f7e7a7]">
          This is an MVP privacy policy template. Before mainnet launch, paid commerce, broader analytics,
          KYC, or production onboarding, Realife should have this policy reviewed by qualified privacy/legal counsel.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Data we collect",
    title: "Account, wallet, and profile information",
    body: (
      <>
        <p>
          Depending on how you use Realife, we may collect or process account and identity-related information.
          This can include wallet addresses, embedded wallet provider information, login method, Google/Web2
          account information where supported, profile IDs, usernames, social links, connected addresses, and account status.
        </p>
        <BulletList
          items={[
            "Wallet address and chain/network information.",
            "Google or embedded wallet login information when you choose that flow.",
            "Profile details you provide, such as name, username, avatar, X/Twitter link, Discord link, or other public information.",
            "Admin or seller verification status where applicable.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Marketplace data",
    title: "Listings, orders, NFTs, and transaction information",
    body: (
      <>
        <p>
          Realife may collect information connected to marketplace activity: listings, NFT metadata, media, descriptions,
          categories, prices, delivery terms, service scope, wallet signatures, order states, protected escrow events,
          dispute messages, proof of delivery, proof of work, confirmations, refunds, and transaction hashes.
        </p>
        <p>
          Some blockchain activity is public by design. Wallet addresses, transaction hashes, token transfers, NFT mints,
          and smart contract interactions may be visible on public block explorers and cannot be fully deleted by Realife.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Security signals",
    title: "IP address, country, device, and login events",
    body: (
      <>
        <p>
          To operate a safer marketplace, Realife may collect technical and security signals such as IP address,
          approximate country/city from hosting or proxy headers, user agent, device/browser information, referrer,
          timestamps, login method, connected wallet, failed actions, support events, and suspicious activity signals.
        </p>
        <BulletList
          items={[
            "IP is used as a security and risk signal, not as the primary user identity.",
            "One user can have multiple IPs, and one IP can be shared by many users.",
            "These signals help detect abuse such as many accounts from one source, fake listings, suspicious disputes, or coordinated fraud.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "AI tools",
    title: "Information processed by AI-assisted features",
    body: (
      <>
        <p>
          Realife may use AI tools to help with listing creation, metadata, category suggestions, visual analysis,
          translation, search, order support, dispute triage, and seller/buyer assistance. When you use these tools,
          your prompts, uploaded content, listing details, images, videos, order text, and related metadata may be processed
          to provide the feature.
        </p>
        <p>
          Do not submit sensitive personal information, private keys, seed phrases, passwords, financial secrets, or confidential
          third-party information into AI tools.
        </p>
      </>
    ),
  },
  {
    eyebrow: "How we use data",
    title: "Why Realife uses information",
    body: (
      <>
        <p>Realife may use information to operate, protect, improve, and explain the platform.</p>
        <BulletList
          items={[
            "Create and manage profiles, wallet connections, listings, NFT receipts, and order rooms.",
            "Process marketplace activity, protected orders, delivery/service states, disputes, support, refunds, and admin review.",
            "Detect fraud, abuse, fake sellers, suspicious accounts, prohibited listings, and platform security risks.",
            "Improve AI-assisted listing/search tools, user experience, performance, reliability, and marketplace analytics.",
            "Communicate with users about orders, support, updates, safety, policy changes, and product status.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Sharing",
    title: "When information may be shared",
    body: (
      <>
        <p>
          Realife may share information when necessary to operate the platform, support orders, comply with law,
          prevent abuse, or use service providers. This can include infrastructure providers, database/hosting providers,
          wallet infrastructure providers, analytics providers, AI providers, storage/media providers, security tools,
          legal/compliance providers, verification providers, auditors, payment/custody partners, and support contractors.
        </p>
        <p>
          Order-related information may be visible to the buyer, seller, admins, moderators, or dispute reviewers when needed
          for fulfillment, support, safety, or dispute resolution.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Public data",
    title: "Blockchain and public marketplace visibility",
    body: (
      <>
        <p>
          Blockchain networks are public or semi-public systems. Onchain records may remain visible even if Realife removes
          or hides a listing from its interface. Public marketplace listings, NFT metadata, images, descriptions, wallet addresses,
          and transaction references may be indexed, cached, screenshotted, or copied by third parties.
        </p>
        <p>
          Avoid publishing information you do not want associated with a listing, wallet, profile, or order.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Cookies",
    title: "Cookies, local storage, and analytics",
    body: (
      <>
        <p>
          Realife may use cookies, local storage, wallet connection state, session storage, analytics tools, logs,
          and similar technologies to keep users signed in, remember preferences, connect wallets, improve performance,
          measure usage, detect errors, and secure the platform.
        </p>
        <p>
          You can control some browser storage through your browser settings, but disabling storage may break login,
          wallet connection, marketplace, or order features.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Retention",
    title: "How long information is kept",
    body: (
      <>
        <p>
          Realife may keep information for as long as needed to operate the platform, maintain order history, resolve disputes,
          detect fraud, comply with legal obligations, enforce policies, improve product reliability, and preserve security records.
        </p>
        <p>
          Some information, especially public blockchain records, transaction hashes, and onchain NFT activity, may not be removable
          by Realife because it exists outside Realife&apos;s controlled systems.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Security",
    title: "How information is protected",
    body: (
      <>
        <p>
          Realife aims to use reasonable technical and organizational measures to protect information. However, no system is perfectly secure,
          especially when using wallets, public blockchains, smart contracts, third-party providers, and experimental testnet infrastructure.
        </p>
        <BulletList
          items={[
            "Never share private keys, seed phrases, passwords, or signing secrets with Realife support or any third party.",
            "Be careful with phishing, fake domains, fake support accounts, and malicious wallet signatures.",
            "Use secure devices, strong passwords, two-factor authentication where available, and official links only.",
          ]}
        />
      </>
    ),
  },
  {
    eyebrow: "Your choices",
    title: "Access, correction, deletion, and objections",
    body: (
      <>
        <p>
          Depending on your location and applicable law, you may have rights to access, correct, delete, export, restrict,
          or object to certain processing of personal information. You may also be able to disconnect wallets, change profile details,
          remove optional social links, or request support review.
        </p>
        <p>
          Realife may need to keep some information for fraud prevention, dispute resolution, order records, legal compliance,
          security, or because the information exists on public blockchain networks.
        </p>
      </>
    ),
  },
  {
    eyebrow: "International",
    title: "Global users and transfers",
    body: (
      <>
        <p>
          Realife may be used by people in different countries. Information may be processed in countries where Realife,
          infrastructure providers, wallet providers, AI providers, hosting providers, or support partners operate.
        </p>
        <p>
          Future mainnet operations may include supported-market rules, jurisdiction restrictions, KYC/verification, compliance
          partners, and additional privacy notices depending on product scope.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Restrictions",
    title: "Children and prohibited use",
    body: (
      <>
        <p>
          Realife is not intended for children. Users must meet the minimum age required by applicable law and by Realife&apos;s
          future marketplace rules. Realife may restrict accounts, listings, or activity that violates law, safety rules,
          sanctions, marketplace policy, or platform integrity standards.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Contact",
    title: "Policy updates and questions",
    body: (
      <>
        <p>
          Realife may update this Privacy Policy as the platform evolves from testnet MVP to mainnet commerce, supported-market pilots,
          verification, audits, and production user onboarding.
        </p>
        <p>
          For privacy questions or requests, contact Realife through the official website or official social channels.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
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
              Legal / Privacy
            </Pill>
            <h1 className="mt-6 max-w-5xl text-5xl font-black tracking-tight md:text-7xl">
              Privacy Policy.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/62 md:text-lg">
              How Realife handles wallet addresses, Google/Web2 login, IP and device signals,
              listings, orders, NFT receipts, AI tools, support, and marketplace security data.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/45">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Last updated: {LAST_UPDATED}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Wallet + order privacy</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Public blockchain notice</span>
            </div>
          </section>
        </Reveal>

        <div className="grid gap-5 pb-16">
          {sections.map((section, index) => (
            <Reveal key={section.title}>
              <PrivacyCard section={section} index={index} />
            </Reveal>
          ))}
        </div>
      </div>
    </main>
  );
}
