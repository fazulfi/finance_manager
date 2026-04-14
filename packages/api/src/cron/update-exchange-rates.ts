import { db } from "@finance/db";

import { upsertExchangeRates } from "../lib/exchange-rate.js";

async function main(): Promise<void> {
  const startedAt = new Date();
  console.log(`[update-exchange-rates] Started at ${startedAt.toISOString()}`);

  const result = await upsertExchangeRates(db);

  console.log(
    `[update-exchange-rates] Updated ${result.updated} rates for ${result.snapshotDate.toISOString()}`,
  );
}

main()
  .catch((error) => {
    console.error("[update-exchange-rates] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
