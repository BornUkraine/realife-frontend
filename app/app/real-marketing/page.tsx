import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function GoldCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-[34px] p-px overflow-hidden",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))]",
        "shadow-[0_34px_130px_rgba(0,0,0,0.60)]",
        className
      )}
    >
      <div
        className={cx(
          "rounded-[34px] overflow-hidden border border-white/10",
          "bg-[#0b0a09]/30 backdrop-blur-2xl ring-1 ring-black/10"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[11px] font-semibold text-white/70">
      {children}
    </div>
  );
}

export default function RealMarketingPage() {
  return (
    <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-80 -right-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:56px_56px]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.65),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.26em] text-white/45 font-black">
              Real Marketing
            </div>

            <h1 className="mt-3 text-3xl md:text-5xl font-black tracking-tight">
              <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                Realife Marketing Hub
              </span>
            </h1>

            <p className="mt-4 max-w-3xl text-sm md:text-base text-white/60 leading-relaxed">
              Main storefront hub for Realife verticals. Right now the first live direction is{" "}
              <span className="text-amber-200 font-extrabold">Realife Crypto Cafe</span>. Later you can add
              delivery, travel, concerts, and other branded contracts here.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Pill>
                <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
                Live direction
              </Pill>
              <Pill>Realife Crypto Cafe</Pill>
              <Pill>More verticals soon</Pill>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link
              href="/app/trading"
              className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold transition shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
            >
              Trading
            </Link>

            <Link
              href="/app"
              className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold transition shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
            >
              App
            </Link>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GoldCard className="lg:col-span-2">
            <div className="p-8 md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-4 py-2 text-[11px] font-black text-black ring-1 ring-black/15">
                <span className="h-2 w-2 rounded-full bg-black/70" />
                Realife Crypto Cafe
              </div>

              <div className="mt-5 text-2xl md:text-4xl font-black tracking-tight text-white/95">
                Primary storefront for cafe products and branded NFT goods
              </div>

              <div className="mt-4 max-w-2xl text-sm md:text-base text-white/55 leading-relaxed">
                Products created through the admin cafe mint form should live inside the public cafe storefront.
                Trading stays separate for secondary listings, while this section works as the primary catalog.
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/app/real-marketing/realife-cafe"
                  className="px-6 py-3 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
                >
                  Open Realife Cafe
                </Link>

                <Link
                  href="/app/trading"
                  className="px-6 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-semibold hover:bg-white/10 transition backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  Open Trading →
                </Link>
              </div>
            </div>
          </GoldCard>

          <GoldCard>
            <div className="p-8">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/45 font-black">
                Roadmap
              </div>

              <div className="mt-4 space-y-3">
                {[
                  "Realife Crypto Cafe",
                  "Delivery",
                  "Travel Tours",
                  "Concerts",
                ].map((item, idx) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-extrabold text-white/90">{item}</div>
                      <div
                        className={cx(
                          "px-2.5 py-1 rounded-full text-[10px] font-black border",
                          idx === 0
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                            : "border-white/10 bg-white/[0.05] text-white/55"
                        )}
                      >
                        {idx === 0 ? "LIVE" : "SOON"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GoldCard>
        </div>

        <footer className="pt-10 text-[10px] font-black text-white/20 text-center uppercase tracking-[0.4em]">
          Realife Ecosystem • Real Marketing
        </footer>
      </div>
    </main>
  );
}