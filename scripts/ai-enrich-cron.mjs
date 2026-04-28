const APP_URL =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://realife.live";

const SECRET = process.env.AI_ENRICH_BATCH_SECRET || "";

const LIMIT_RAW = process.env.AI_ENRICH_CRON_LIMIT || "10";
const LIMIT = Number.isFinite(Number(LIMIT_RAW)) ? Math.max(1, Number(LIMIT_RAW)) : 10;

async function main() {
  const base = APP_URL.replace(/\/$/, "");

  const url = new URL(`${base}/api/ai/nft-enrich/batch`);
  url.searchParams.set("dryRun", "false");
  url.searchParams.set("limit", String(LIMIT));
  url.searchParams.set("includeErrors", "true");

  if (SECRET) {
    url.searchParams.set("secret", SECRET);
  }

  const safeUrl = SECRET ? url.toString().replace(SECRET, "***") : url.toString();

  console.log(`[ai-enrich-cron] Calling ${safeUrl}`);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dryRun: false,
      limit: LIMIT,
      includeErrors: true,
    }),
  });

  const text = await res.text();

  console.log(`[ai-enrich-cron] status=${res.status}`);
  console.log(text);

  if (!res.ok) {
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("[ai-enrich-cron] done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[ai-enrich-cron] failed", err);
    process.exit(1);
  });