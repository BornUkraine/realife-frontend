export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#070606] text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-6 text-center">
        <div className="text-xs font-semibold text-white/60">404</div>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-white/65">
          This page doesn&apos;t exist.
        </p>

        <a
          href="/"
          className="mt-5 inline-flex w-full items-center justify-center px-5 py-3 rounded-2xl text-black font-extrabold
            bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]
            shadow-[0_18px_60px_rgba(212,175,55,0.18)]
            ring-1 ring-black/15 hover:brightness-110 transition"
        >
          Go home
        </a>
      </div>
    </main>
  );
}