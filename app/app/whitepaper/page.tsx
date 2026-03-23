import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function Wrap({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[36px] p-px bg-[linear-gradient(135deg,rgba(247,231,167,0.35),rgba(212,175,55,0.16),rgba(184,135,10,0.10))] shadow-[0_40px_140px_rgba(0,0,0,0.65)]">
      <div className="rounded-[36px] border border-white/10 bg-[#0b0a09]/70 backdrop-blur-2xl">
        {children}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-14">
      <h2 className="text-2xl md:text-3xl font-black text-white/95">
        {title}
      </h2>

      <div className="mt-5 text-sm md:text-base text-white/65 leading-relaxed space-y-4">
        {children}
      </div>
    </div>
  );
}

export default function WhitepaperPage() {
  return (
    <div className="space-y-6">
      {/* HERO */}
      <Reveal>
        <Wrap>
          <div className="p-7 md:p-10 relative">
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[#d4af37]/10 blur-3xl rounded-full" />
            <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-white/[0.04] blur-3xl rounded-full" />

            <div className="relative">
              <div className="text-[11px] uppercase tracking-[0.25em] text-white/40 font-black">
                Realife Whitepaper
              </div>

              <h1 className="mt-5 text-4xl md:text-6xl font-black">
                NFTs backed by{" "}
                <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                  real life
                </span>
              </h1>

              <p className="mt-5 max-w-3xl text-white/70">
                Realife connects Web3 with real-world products, businesses,
                creativity and experiences — turning NFTs into something
                tangible, usable and valuable beyond the screen.
              </p>
            </div>
          </div>
        </Wrap>
      </Reveal>

      {/* CONTENT */}
      <Reveal delayMs={120}>
        <Wrap>
          <div className="p-7 md:p-10 max-w-4xl">

            <Section title="Abstract">
              <p>
                Realife is an ecosystem where the digital Web3 world connects
                with real business, creativity and social activity.
              </p>

              <p>
                Any idea, product, artwork, event or experience can be tokenized
                as an NFT and linked to its creator through verified authorship
                (X + on-chain proof).
              </p>

              <p className="font-extrabold text-white/90">
                NFTs are no longer abstract — they are tied to real value.
              </p>

              <p>
                Realife introduces a real-to-earn economy where online activity,
                real work and social participation convert into measurable
                on-chain rewards.
              </p>
            </Section>

            <Section title="Vision">
              <p className="font-extrabold text-white/90">
                The bridge between everyday life and the digital future.
              </p>

              <p>
                Realife moves Web3 beyond screens — into cafes, stores, food,
                fashion, travel and real experiences.
              </p>

              <p>
                Participation creates value you can touch, use and experience in
                the real world.
              </p>
            </Section>

            <Section title="Problem">
              <ul className="list-disc pl-6 space-y-2">
                <li>Crypto driven by speculation, not real value</li>
                <li>Lack of connection to real-world products</li>
                <li>No infrastructure for offline contributors</li>
                <li>Weak authorship verification</li>
              </ul>
            </Section>

            <Section title="Realife Solution">
              <ul className="list-disc pl-6 space-y-2">
                <li>Authorship verification (X + hash + on-chain)</li>
                <li>Tokenization of real-world products and actions</li>
                <li>Real-to-earn economy</li>
                <li>Integration with real businesses (cafes, stores, events)</li>
              </ul>
            </Section>

            <Section title="Social Workforce">
              <p>
                Realife introduces a new layer — connecting real-world workers
                with Web3.
              </p>

              <p>
                Tailors, builders, chefs, designers, engineers and other
                professionals can tokenize their work and enter the crypto
                economy.
              </p>
            </Section>

            <Section title="Architecture">
              <ul className="list-disc pl-6 space-y-2">
                <li>Frontend: React + Tailwind</li>
                <li>Backend: Node.js + PostgreSQL</li>
                <li>Storage: IPFS / Arweave</li>
                <li>Chains: Base + multichain support</li>
              </ul>
            </Section>

            <Section title="NFT System">
              <p>
                Users upload content, verify via X, mint NFTs and publish them
                into the Realife ecosystem.
              </p>

              <p>
                NFTs include metadata, charts, trading data and real-world
                linkage.
              </p>
            </Section>

            <Section title="Economy">
              <ul className="list-disc pl-6 space-y-2">
                <li>Minting fees</li>
                <li>Marketplace fees</li>
                <li>Partner reward pools</li>
                <li>Offline revenue (cafes, products, events)</li>
              </ul>
            </Section>

            <Section title="Offline Expansion">
              <p className="font-extrabold text-white/90">
                Crypto becomes real.
              </p>

              <ul className="list-disc pl-6 space-y-2">
                <li>Crypto cafes and food products</li>
                <li>Retail and branded goods</li>
                <li>Events and concerts</li>
                <li>Travel experiences</li>
              </ul>
            </Section>

            <Section title="Reputation System">
              <p>
                SBT badges define reputation, access and rewards inside the
                ecosystem.
              </p>
            </Section>

            <Section title="Roadmap">
              <ul className="list-disc pl-6 space-y-2">
                <li>MVP and NFT system</li>
                <li>Offline pilots (cafes, products)</li>
                <li>Multichain expansion</li>
                <li>Global hubs and DAO</li>
              </ul>
            </Section>

            <Section title="Conclusion">
              <p className="font-extrabold text-white/90">
                Realife builds the bridge between blockchain and real life.
              </p>

              <p>
                Where NFTs represent real value, real products and real
                experiences — not just digital speculation.
              </p>
            </Section>

          </div>
        </Wrap>
      </Reveal>
    </div>
  );
}