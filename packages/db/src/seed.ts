/* eslint-disable no-console */
// packages/db/src/seed.ts
// Seed script — run with: pnpm --filter @finance/db db:seed
// Requires DATABASE_URL in packages/db/.env

import { db } from "./index.js";

async function main(): Promise<void> {
  console.log("🌱 Starting database seed...");

  // ── Default Categories ────────────────────────────────────────────────────
  // Seeded per-user on first login via tRPC auth router.
  // This script is for development/reset purposes only.

  const defaultIncomeCategories = [
    { name: "Salary", icon: "💼", color: "#22c55e" },
    { name: "Freelance", icon: "💻", color: "#16a34a" },
    { name: "Investment Returns", icon: "📈", color: "#15803d" },
    { name: "Other Income", icon: "💰", color: "#166534" },
  ];

  const defaultExpenseCategories = [
    { name: "Housing", icon: "🏠", color: "#ef4444" },
    { name: "Food & Dining", icon: "🍽️", color: "#dc2626" },
    { name: "Transportation", icon: "🚗", color: "#b91c1c" },
    { name: "Healthcare", icon: "🏥", color: "#f97316" },
    { name: "Education", icon: "📚", color: "#ea580c" },
    { name: "Entertainment", icon: "🎬", color: "#c2410c" },
    { name: "Shopping", icon: "🛍️", color: "#a855f7" },
    { name: "Utilities", icon: "💡", color: "#9333ea" },
    { name: "Insurance", icon: "🛡️", color: "#7c3aed" },
    { name: "Personal Care", icon: "💆", color: "#6d28d9" },
    { name: "Travel", icon: "✈️", color: "#3b82f6" },
    { name: "Subscriptions", icon: "📱", color: "#2563eb" },
    { name: "Savings", icon: "🏦", color: "#1d4ed8" },
    { name: "Investments", icon: "📊", color: "#1e40af" },
    { name: "Other Expenses", icon: "📌", color: "#64748b" },
  ];

  console.log(`  📂 Default income categories: ${defaultIncomeCategories.length}`);
  console.log(`  📂 Default expense categories: ${defaultExpenseCategories.length}`);
  console.log("  ℹ️  Categories are seeded per-user via the auth router on signup.");
  console.log("  ℹ️  No user records will be created by this script.");
  console.log("✅ Seed script completed successfully.");
}

main()
  .catch((error: unknown) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    void db.$disconnect();
  });
