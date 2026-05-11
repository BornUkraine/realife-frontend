import Link from "next/link";
import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

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
      className={cx(
        "relative overflow-hidden rounded-[22px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.35),rgba(212,175,55,0.16),rgba(184,135,10,0.10))]",
        "shadow-[0_34px_130px_rgba(0,0,0,0.60)]",
        className
      )}
    >
      <div
        className={cx(
          "relative overflow-hidden rounded-[22px]",
          "border border-white/10 bg-[#0b0a09]/60 backdrop-blur-2xl",
          "ring-1 ring-black/10",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.12),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]"
        )}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M18.901 1.153h3.68l-8.041 9.19L24 22.847h-7.406l-5.8-7.584-6.64 7.584H.474l8.6-9.83L0 1.153h7.594l5.243 6.932 6.064-6.932Zm-1.29 19.494h2.04L6.486 3.24H4.298l13.313 17.407Z" />
    </svg>
  );
}

function ActionLink({
  href,
  children,
  primary = false,
  external = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
  external?: boolean;
}) {
  const commonProps = external
    ? { target: "_blank", rel: "noopener noreferrer" as const }
    : {};

  if (primary) {
    return (
      <Link
        href={href}
        {...commonProps}
        className="inline-flex items-center justify-center rounded-lg bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-3.5 py-2 text-xs font-extrabold text-black ring-1 ring-black/15 transition hover:brightness-110 shadow-[0_10px_36px_rgba(212,175,55,0.20)]"
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      {...commonProps}
      className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold transition hover:bg-white/10 backdrop-blur-2xl"
    >
      {children}
    </Link>
  );
}

function SectionTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: ReactNode;
  text: ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.24em] text-white/45 font-black">
        {eyebrow}
      </div>
      <div className="mt-3 text-2xl md:text-4xl font-black tracking-tight text-white/95">
        {title}
      </div>
      <div className="mt-4 max-w-2xl text-sm md:text-base text-white/60 leading-relaxed">
        {text}
      </div>
    </div>
  );
}

function ContactCard({
  badge,
  initials,
  title,
  handle,
  href,
  description,
  primaryLabel,
}: {
  badge: string;
  initials: string;
  title: string;
  handle: string;
  href: string;
  description: string;
  primaryLabel: string;
}) {
  return (
    <GoldEdgeWrap className="rounded-[22px]">
      <div className="relative p-4 md:p-5">
        <div className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#f7e7a7]/15 bg-white/[0.05] text-white/85 backdrop-blur-xl">
          <XIcon className="h-3.5 w-3.5" />
        </div>

        <div className="flex items-start justify-between gap-3 pr-12">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
            {badge}
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#f7e7a7]/20 bg-[linear-gradient(135deg,rgba(247,231,167,0.20),rgba(212,175,55,0.08),rgba(255,255,255,0.04))] text-sm font-black text-amber-100">
            {initials}
          </div>
        </div>

        <div className="mt-3 text-lg md:text-xl font-black tracking-tight text-white/95">
          {title}
        </div>

        <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-semibold text-amber-100/90">
          <XIcon className="h-3 w-3 text-white/80" />
          {handle}
        </div>

        <div className="mt-2.5 text-xs md:text-sm leading-relaxed text-white/60">
          {description}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <ActionLink href={href} primary external>
            <span className="inline-flex items-center gap-1.5">
              <XIcon className="h-3.5 w-3.5" />
              {primaryLabel}
            </span>
          </ActionLink>

          <ActionLink href={href} external>
            <span className="inline-flex items-center gap-1.5">
              <XIcon className="h-3.5 w-3.5 text-white/80" />
              View on X ↗
            </span>
          </ActionLink>
        </div>
      </div>
    </GoldEdgeWrap>
  );
}

export default function ContactsPage() {
  return (
    <div className="space-y-4">
      <Reveal>
        <GoldEdgeWrap className="rounded-[22px]">
          <div className="relative overflow-hidden p-4 md:p-5">
            <div className="pointer-events-none absolute -top-32 -right-32 h-[320px] w-[320px] rounded-full bg-[#d4af37]/14 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-32 h-[320px] w-[320px] rounded-full bg-white/[0.06] blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] shadow-[0_0_0_4px_rgba(212,175,55,0.12)]" />
                  Realife Contacts
                </Pill>

                <Pill>
                  <span className="inline-flex items-center gap-1.5 text-white/80 font-extrabold">
                    <XIcon className="h-3 w-3" />
                    Official Project
                  </span>
                </Pill>

                <Pill>
                  <span className="inline-flex items-center gap-1.5 text-white/80 font-extrabold">
                    <XIcon className="h-3 w-3" />
                    CEO Contact
                  </span>
                </Pill>
              </div>

              <h1 className="mt-3 text-2xl sm:text-3xl md:text-[2rem] font-black leading-[1.1] tracking-[-0.02em]">
                Realife{" "}
                <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                  Official Contacts
                </span>
              </h1>

              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/65 md:text-sm">
                Follow the official Realife pages to stay close to the brand, ecosystem updates, and CEO communication. More official channels can be added later — support, Telegram, email, partner channels.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <ActionLink
                  href="https://x.com/Realife_Crypto"
                  primary
                  external
                >
                  <span className="inline-flex items-center gap-1.5">
                    <XIcon className="h-3.5 w-3.5" />
                    Open Official X
                  </span>
                </ActionLink>

                <ActionLink href="https://x.com/Born__Voyage" external>
                  <span className="inline-flex items-center gap-1.5">
                    <XIcon className="h-3.5 w-3.5 text-white/80" />
                    Open CEO X
                  </span>
                </ActionLink>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={120}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ContactCard
            badge="Official Project"
            initials="RL"
            title="Realife Crypto"
            handle="@Realife_Crypto"
            href="https://x.com/Realife_Crypto"
            description="The main official page of the Realife project. Follow it for ecosystem updates, product direction, brand news and official announcements."
            primaryLabel="Follow Project"
          />

          <ContactCard
            badge="CEO"
            initials="BV"
            title="Born Voyage"
            handle="@Born__Voyage"
            href="https://x.com/Born__Voyage"
            description="The CEO page for founder updates, personal vision, project communication and direct connection to the leadership behind Realife."
            primaryLabel="Follow CEO"
          />
        </div>
      </Reveal>

      <Reveal delayMs={220}>
        <GoldEdgeWrap className="rounded-[22px]">
          <div className="p-4 md:p-5">
            <SectionTitle
              eyebrow="Stay Connected"
              title={
                <>
                  Official channels
                  <br />
                  for the Realife ecosystem
                </>
              }
              text={
                <>
                  As the ecosystem grows, this page can later include more
                  public contact points such as support channels, Telegram,
                  email, media, partnerships and community pages.
                </>
              }
            />

            <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="inline-flex items-center gap-2 text-sm font-extrabold text-white/92">
                  <XIcon className="h-4 w-4 text-white/80" />
                  Official Project
                </div>
                <div className="mt-1.5 text-xs leading-relaxed text-white/55">
                  Main updates, ecosystem news and brand direction.
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="inline-flex items-center gap-2 text-sm font-extrabold text-white/92">
                  <XIcon className="h-4 w-4 text-white/80" />
                  CEO Page
                </div>
                <div className="mt-1.5 text-xs leading-relaxed text-white/55">
                  Founder communication, vision and direct public presence.
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="text-sm font-extrabold text-white/92">
                  More Contacts Soon
                </div>
                <div className="mt-1.5 text-xs leading-relaxed text-white/55">
                  Telegram, support, email and other official channels can be
                  added later.
                </div>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={300}>
        <div className="pt-2 pb-6 flex flex-wrap items-center justify-between gap-4 text-xs text-white/45">
          <div>Realife Ecosystem</div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 opacity-60">
              <XIcon className="h-3.5 w-3.5" />
              Official X
            </span>
            <span className="inline-flex items-center gap-1.5 opacity-60">
              <XIcon className="h-3.5 w-3.5" />
              CEO
            </span>
            <span className="opacity-60">More contacts soon</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}